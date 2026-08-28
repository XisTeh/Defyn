import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { assertQaCountsPreserved, snapshotQaCounts } from './qa-count-preservation.mjs';

const env = { ...loadEnv('qa', process.cwd(), ''), ...process.env };
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'DEFYN_QA_A_EMAIL', 'DEFYN_QA_A_PASSWORD', 'DEFYN_QA_B_EMAIL', 'DEFYN_QA_B_PASSWORD'];
if (required.some((key) => !env[key])) throw new Error('Configuração QA incompleta.');

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const clientA = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
const clientB = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
const bucket = 'defyn-media';
const rows = [];
const paths = new Set();
const metadataIds = new Set();
const profileIds = new Set();
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));

function record(operation, expected, passed, obtained) { rows.push({ operation, expected, obtained, status: passed ? 'PASS' : 'FAIL' }); }
function safeError(error) { return error ? `${error.code ?? 'remote_error'}/${error.status ?? 'unknown'}` : 'resultado inesperado'; }
function uuid() { return crypto.randomUUID(); }
function now(offset = 0) { return new Date(Date.now() + offset).toISOString(); }
function equalBytes(left, right) { return left.length === right.length && left.every((value, index) => value === right[index]); }

async function login(client, email, password, label) {
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) throw new Error(`Login QA ${label} falhou (${safeError(result.error)}).`);
  return result.data.user.id;
}

async function createProfile(client, accountId, label) {
  const id = uuid(); profileIds.add(id);
  const result = await client.from('defyn_profiles').insert({ id, account_id: accountId, name: `QA Media ${label}`, payload: { qa: true } }).select('*').single();
  if (result.error) throw new Error(`Perfil QA ${label} não pôde ser criado (${safeError(result.error)}).`);
  return result.data;
}

function metadata(profileId, mediaId, kind, path, extra = {}) {
  const timestamp = now();
  return { id: mediaId, profileId, kind, ownerType: kind === 'profile-avatar' ? 'profile' : 'progress', ownerId: kind === 'profile-avatar' ? profileId : extra.photoId, storagePath: path, mimeType: 'image/png', sizeBytes: png.byteLength, width: 1, height: 1, createdAt: timestamp, updatedAt: timestamp, ...extra };
}

async function upload(client, path) {
  paths.add(path);
  return client.storage.from(bucket).upload(path, png, { contentType: 'image/png', upsert: false });
}

async function cleanup() {
  if (paths.size) await clientA.storage.from(bucket).remove([...paths]);
  if (metadataIds.size) await clientA.from('media_metadata').delete().in('id', [...metadataIds]);
  if (profileIds.size) {
    await clientA.from('defyn_profiles').delete().in('id', [...profileIds]);
    await clientB.from('defyn_profiles').delete().in('id', [...profileIds]);
  }
}

async function run() {
  let accountA; let accountB; let baselineA; let baselineB;
  try {
    [accountA, accountB] = await Promise.all([
      login(clientA, env.DEFYN_QA_A_EMAIL, env.DEFYN_QA_A_PASSWORD, 'A'),
      login(clientB, env.DEFYN_QA_B_EMAIL, env.DEFYN_QA_B_PASSWORD, 'B'),
    ]);
    [baselineA, baselineB] = await Promise.all([snapshotQaCounts(clientA, accountA), snapshotQaCounts(clientB, accountB)]);
    const [profileA] = await Promise.all([createProfile(clientA, accountA, 'A'), createProfile(clientB, accountB, 'B')]);
    const device1 = new Map(); const device2 = new Map();

    const avatarId = uuid(); const avatarPath = `${accountA}/${profileA.id}/${avatarId}.png`;
    device1.set(avatarId, png);
    const avatarUpload = await upload(clientA, avatarPath);
    record('D1 avatar upload privado', 'upload permitido', !avatarUpload.error, avatarUpload.error ? 'recusado' : 'enviado');
    const avatarPayload = metadata(profileA.id, avatarId, 'profile-avatar', avatarPath);
    metadataIds.add(avatarId);
    const avatarMetadata = await clientA.from('media_metadata').insert({ id: avatarId, account_id: accountA, profile_id: profileA.id, kind: 'profile-avatar', storage_path: avatarPath, mime_type: 'image/png', payload: avatarPayload }).select('*').single();
    record('D1 media_metadata avatar', 'metadata criada', !avatarMetadata.error, avatarMetadata.error ? 'recusada' : 'criada');

    const avatarPull = await clientA.from('media_metadata').select('*').eq('id', avatarId).single();
    const avatarDownload = await clientA.storage.from(bucket).download(avatarPath);
    const avatarBytes = avatarDownload.data ? new Uint8Array(await avatarDownload.data.arrayBuffer()) : new Uint8Array();
    if (!avatarPull.error && !avatarDownload.error) device2.set(avatarId, avatarBytes);
    record('D2 pull + download avatar', 'conteúdo idêntico', equalBytes(png, avatarBytes), avatarBytes.length ? 'validado' : 'ausente');
    const offlineAvatar = device2.get(avatarId);
    record('D2 avatar offline em cache local', 'abre sem rede', Boolean(offlineAvatar && equalBytes(png, offlineAvatar)), offlineAvatar ? 'cache disponível' : 'cache ausente');

    const photoId = uuid(); const photoPath = `${accountA}/${profileA.id}/${photoId}.png`; const photoMetadataId = photoId;
    const photoUpload = await upload(clientA, photoPath);
    const photoPayload = metadata(profileA.id, photoId, 'progress-photo', photoPath, { photoId: uuid(), progressPhoto: { id: uuid(), profileId: profileA.id, localDate: '2026-08-27', occurredAt: now(), category: 'front', mediaId: photoId, createdAt: now(), updatedAt: now() } });
    metadataIds.add(photoMetadataId);
    const photoMetadata = await clientA.from('media_metadata').insert({ id: photoMetadataId, account_id: accountA, profile_id: profileA.id, kind: 'progress-photo', storage_path: photoPath, mime_type: 'image/png', payload: photoPayload }).select('*').single();
    record('D1 foto de progresso local-first → cloud', 'objeto + metadata', !photoUpload.error && !photoMetadata.error, photoUpload.error || photoMetadata.error ? 'incompleto' : 'completo');

    const retry = await clientA.storage.from(bucket).upload(photoPath, png, { contentType: 'image/png', upsert: false });
    const listed = await clientA.storage.from(bucket).list(`${accountA}/${profileA.id}`, { search: `${photoId}.png` });
    record('retry idempotente do upload', 'um objeto lógico', Boolean(retry.error) && !listed.error && listed.data?.filter((item) => item.name === `${photoId}.png`).length === 1, `${listed.data?.filter((item) => item.name === `${photoId}.png`).length ?? 0} objeto(s)`);

    const pulledPhoto = await clientA.from('media_metadata').select('*').eq('id', photoMetadataId).single();
    const downloadedPhoto = await clientA.storage.from(bucket).download(photoPath);
    const photoBytes = downloadedPhoto.data ? new Uint8Array(await downloadedPhoto.data.arrayBuffer()) : new Uint8Array();
    if (!pulledPhoto.error && !downloadedPhoto.error) device2.set(photoId, photoBytes);
    record('D2 pull + cache da foto', 'foto disponível', equalBytes(png, photoBytes), photoBytes.length ? 'validada' : 'ausente');

    const [crossList, crossDownload, crossOverwrite, crossDelete] = await Promise.all([
      clientB.storage.from(bucket).list(`${accountA}/${profileA.id}`, { search: `${avatarId}.png` }),
      clientB.storage.from(bucket).download(avatarPath),
      clientB.storage.from(bucket).upload(avatarPath, png, { contentType: 'image/png', upsert: true }),
      clientB.storage.from(bucket).remove([avatarPath]),
    ]);
    const avatarStillThere = await clientA.storage.from(bucket).download(avatarPath);
    const crossBlocked = (crossList.error || crossList.data?.length === 0) && Boolean(crossDownload.error) && Boolean(crossOverwrite.error) && (Boolean(crossDelete.error) || !avatarStillThere.error);
    record('Conta B lista/baixa/sobrescreve/apaga A', 'tudo bloqueado', crossBlocked && accountA !== accountB && !avatarStillThere.error, crossBlocked ? 'bloqueado' : 'acesso indevido');

    const removed = await clientA.storage.from(bucket).remove([photoPath]);
    const tombstone = await clientA.from('media_metadata').update({ deleted_at: now(1) }).eq('id', photoMetadataId).eq('revision', photoMetadata.data?.revision ?? 1).select('*').single();
    const afterDelete = await clientA.storage.from(bucket).list(`${accountA}/${profileA.id}`, { search: `${photoId}.png` });
    if (!tombstone.error) device1.delete(photoId);
    const objectAbsent = !afterDelete.error && afterDelete.data?.every((item) => item.name !== `${photoId}.png`);
    record('D2 delete → tombstone + objeto removido', 'sem órfão', !removed.error && !tombstone.error && objectAbsent && !device1.has(photoId), objectAbsent ? 'removido e propagado' : 'órfão presente');

    const repeatedDelete = await clientA.storage.from(bucket).remove([photoPath]);
    record('delete repetido idempotente', 'não bloqueia fila', !repeatedDelete.error || String(repeatedDelete.error.message).toLowerCase().includes('not found'), repeatedDelete.error ? 'já ausente' : 'confirmado');

    console.table(rows);
    if (rows.some((item) => item.status !== 'PASS')) throw new Error('A matriz remota de mídia encontrou falha.');
  } finally {
    await cleanup();
    if (baselineA && accountA) assertQaCountsPreserved(baselineA, await snapshotQaCounts(clientA, accountA), 'Media/A');
    if (baselineB && accountB) assertQaCountsPreserved(baselineB, await snapshotQaCounts(clientB, accountB), 'Media/B');
    await Promise.allSettled([clientA.auth.signOut(), clientB.auth.signOut()]);
  }
}

await run();
