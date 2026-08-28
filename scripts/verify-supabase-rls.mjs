import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const environment = { ...loadEnv('qa', process.cwd(), ''), ...process.env };
const requiredKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'DEFYN_QA_A_EMAIL', 'DEFYN_QA_A_PASSWORD', 'DEFYN_QA_B_EMAIL', 'DEFYN_QA_B_PASSWORD'];
const missing = requiredKeys.filter((key) => !environment[key]);
if (missing.length) throw new Error(`Variáveis locais ausentes: ${missing.join(', ')}. Nenhum teste remoto foi executado.`);

const url = environment.VITE_SUPABASE_URL;
const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const clientA = createClient(url, publishableKey, clientOptions);
const clientB = createClient(url, publishableKey, clientOptions);
const anonClient = createClient(url, publishableKey, clientOptions);
const rows = [];
const cleanupPaths = { A: new Set(), B: new Set() };
const cleanupProfileIds = { A: new Set(), B: new Set() };
const cleanupHydrationIds = { A: new Set(), B: new Set() };
let profileA;
let profileB;
const authenticated = { A: false, B: false };

function record(operation, actor, expected, passed, obtained) {
  rows.push({ operation, actor, expected, obtained, status: passed ? 'PASS' : 'FAIL' });
  if (!passed) throw new Error(`VULNERABILIDADE/BLOQUEIO: ${operation} (${actor}) — obtido: ${obtained}`);
}

function count(data) { return Array.isArray(data) ? data.length : 0; }
function denied(result) { return Boolean(result.error) || count(result.data) === 0; }
function localDate() { return new Date().toISOString().slice(0, 10); }

async function signIn(client, email, password, actor) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    const diagnostic = [error?.code, error?.status].filter(Boolean).join('/');
    throw new Error(`Login QA ${actor} falhou${diagnostic ? ` (${diagnostic})` : ''}. Revise somente as credenciais locais dessa conta.`);
  }
  authenticated[actor] = true;
  return data.user;
}

async function createFixture(client, accountId, label) {
  const profile = { id: crypto.randomUUID(), account_id: accountId, name: `QA Profile ${label}`, payload: { qa: true } };
  cleanupProfileIds[label].add(profile.id);
  const profileInsert = await client.from('defyn_profiles').insert(profile).select('id,account_id,name').single();
  record('own insert', label, 'permitido', !profileInsert.error && profileInsert.data?.id === profile.id, profileInsert.error ? 'recusado' : 'inserido');
  if (profileInsert.error) throw profileInsert.error;

  const fixtures = await Promise.all([
    client.from('hydration_entries').insert({ id: crypto.randomUUID(), account_id: accountId, profile_id: profile.id, local_date: localDate(), occurred_at: new Date().toISOString(), amount_ml: 123, payload: { qa: true } }),
    client.from('workout_sessions').insert({ id: crypto.randomUUID(), account_id: accountId, profile_id: profile.id, local_date: localDate(), status: 'qa', payload: { qa: true } }),
    client.from('progress_records').insert({ id: crypto.randomUUID(), account_id: accountId, profile_id: profile.id, local_date: localDate(), occurred_at: new Date().toISOString(), payload: { qa: true } }),
  ]);
  if (fixtures.some((result) => result.error)) throw new Error(`Não foi possível preparar fixtures remotas da conta ${label}.`);
  return profile;
}

async function rowMatrix(actor, client, accountId, ownProfile, otherClient, otherAccountId, otherProfile) {
  const ownSelect = await client.from('defyn_profiles').select('id').eq('id', ownProfile.id);
  record('own select', actor, '1 registro', !ownSelect.error && count(ownSelect.data) === 1, ownSelect.error ? 'erro' : `${count(ownSelect.data)} registro(s)`);

  const ownUpdate = await client.from('defyn_profiles').update({ name: `QA Profile ${actor} Updated` }).eq('id', ownProfile.id).select('id');
  record('own update', actor, 'permitido', !ownUpdate.error && count(ownUpdate.data) === 1, ownUpdate.error ? 'recusado' : `${count(ownUpdate.data)} alterado(s)`);

  const crossSelect = await client.from('defyn_profiles').select('id').eq('id', otherProfile.id);
  record('cross select', actor, 'zero/bloqueado', denied(crossSelect), crossSelect.error ? 'bloqueado' : `${count(crossSelect.data)} registro(s)`);

  const crossUpdate = await client.from('defyn_profiles').update({ name: `FORBIDDEN ${actor}` }).eq('id', otherProfile.id).select('id');
  const otherAfterUpdate = await otherClient.from('defyn_profiles').select('name').eq('id', otherProfile.id).single();
  const updateBlocked = denied(crossUpdate) && !otherAfterUpdate.error && !String(otherAfterUpdate.data?.name).startsWith('FORBIDDEN');
  record('cross update', actor, 'nenhuma alteração', updateBlocked, crossUpdate.error ? 'bloqueado' : `${count(crossUpdate.data)} alterado(s)`);

  const crossDelete = await client.from('defyn_profiles').delete().eq('id', otherProfile.id).select('id');
  const otherAfterDelete = await otherClient.from('defyn_profiles').select('id').eq('id', otherProfile.id);
  const deleteBlocked = denied(crossDelete) && !otherAfterDelete.error && count(otherAfterDelete.data) === 1;
  record('cross delete', actor, 'nenhuma exclusão', deleteBlocked, crossDelete.error ? 'bloqueado' : `${count(crossDelete.data)} excluído(s)`);

  const forgedId = crypto.randomUUID();
  cleanupProfileIds[actor === 'A' ? 'B' : 'A'].add(forgedId);
  const forged = await client.from('defyn_profiles').insert({ id: forgedId, account_id: otherAccountId, name: `FORGED ${actor}` }).select('id');
  record('forged account_id', actor, 'recusado', Boolean(forged.error), forged.error ? 'recusado' : 'aceito indevidamente');

  const foreignChildId = crypto.randomUUID();
  cleanupHydrationIds[actor].add(foreignChildId);
  const foreignChild = await client.from('hydration_entries').insert({ id: foreignChildId, account_id: accountId, profile_id: otherProfile.id, local_date: localDate(), occurred_at: new Date().toISOString(), amount_ml: 1 }).select('id');
  record('foreign profile_id', actor, 'recusado', Boolean(foreignChild.error), foreignChild.error ? 'recusado' : 'aceito indevidamente');
}

async function anonMatrix() {
  for (const table of ['accounts', 'defyn_profiles', 'hydration_entries', 'workout_sessions', 'progress_records']) {
    const result = await anonClient.from(table).select('id').limit(1);
    record(`anon select ${table}`, 'ANON', 'zero/acesso negado', denied(result), result.error ? 'acesso negado' : `${count(result.data)} registro(s)`);
  }
}

async function uploadOwnFixture(client, accountId, profileId, actor) {
  const path = `${accountId}/${profileId}/${crypto.randomUUID()}.png`;
  const result = await client.storage.from('defyn-media').upload(path, new TextEncoder().encode(`DEFYN QA ${actor}`), { contentType: 'image/png', upsert: false });
  record('storage own insert', actor, 'permitido', !result.error, result.error ? 'recusado' : 'inserido');
  cleanupPaths[actor].add(path);
  return path;
}

async function storageMatrix(actor, client, ownAccountId, ownProfile, otherClient, otherAccountId, otherProfile, otherPath) {
  const ownPath = await uploadOwnFixture(client, ownAccountId, ownProfile.id, actor);
  const ownDownload = await client.storage.from('defyn-media').download(ownPath);
  record('storage own select', actor, 'permitido', !ownDownload.error, ownDownload.error ? 'recusado' : 'permitido');

  const crossList = await client.storage.from('defyn-media').list(`${otherAccountId}/${otherProfile.id}`, { search: otherPath.split('/').at(-1) });
  record('storage cross list', actor, 'zero/bloqueado', denied(crossList), crossList.error ? 'bloqueado' : `${count(crossList.data)} objeto(s)`);

  const forgedPath = `${otherAccountId}/${otherProfile.id}/${crypto.randomUUID()}.png`;
  const crossInsert = await client.storage.from('defyn-media').upload(forgedPath, new Uint8Array([1]), { contentType: 'image/png', upsert: false });
  cleanupPaths[actor === 'A' ? 'B' : 'A'].add(forgedPath);
  record('storage cross insert', actor, 'recusado', Boolean(crossInsert.error), crossInsert.error ? 'recusado' : 'aceito indevidamente');

  const crossUpdate = await client.storage.from('defyn-media').upload(otherPath, new Uint8Array([2]), { contentType: 'image/png', upsert: true });
  record('storage cross update', actor, 'recusado', Boolean(crossUpdate.error), crossUpdate.error ? 'recusado' : 'aceito indevidamente');

  const crossDelete = await client.storage.from('defyn-media').remove([otherPath]);
  const otherStillReads = await otherClient.storage.from('defyn-media').download(otherPath);
  const deleteBlocked = Boolean(crossDelete.error) || !otherStillReads.error;
  record('storage cross delete', actor, 'objeto preservado', deleteBlocked && !otherStillReads.error, crossDelete.error ? 'recusado' : otherStillReads.error ? 'objeto removido' : 'nenhuma exclusão');
  return ownPath;
}

async function cleanup(client, actor) {
  if (!authenticated[actor]) return;
  if (cleanupPaths[actor].size) await client.storage.from('defyn-media').remove([...cleanupPaths[actor]]);
  if (cleanupHydrationIds[actor].size) await client.from('hydration_entries').delete().in('id', [...cleanupHydrationIds[actor]]);
  if (cleanupProfileIds[actor].size) await client.from('defyn_profiles').delete().in('id', [...cleanupProfileIds[actor]]);
  await client.auth.signOut();
}

try {
  let userA;
  let userB;
  const loginErrors = [];
  try { userA = await signIn(clientA, environment.DEFYN_QA_A_EMAIL, environment.DEFYN_QA_A_PASSWORD, 'A'); }
  catch (error) { loginErrors.push(error instanceof Error ? error.message : 'Login QA A falhou.'); }
  try { userB = await signIn(clientB, environment.DEFYN_QA_B_EMAIL, environment.DEFYN_QA_B_PASSWORD, 'B'); }
  catch (error) { loginErrors.push(error instanceof Error ? error.message : 'Login QA B falhou.'); }
  if (loginErrors.length || !userA || !userB) throw new Error(loginErrors.join(' | '));
  if (userA.id === userB.id) throw new Error('As credenciais QA A/B pertencem à mesma conta.');

  profileA = await createFixture(clientA, userA.id, 'A');
  profileB = await createFixture(clientB, userB.id, 'B');
  await rowMatrix('A', clientA, userA.id, profileA, clientB, userB.id, profileB);
  await rowMatrix('B', clientB, userB.id, profileB, clientA, userA.id, profileA);
  await anonMatrix();

  const pathB = await uploadOwnFixture(clientB, userB.id, profileB.id, 'B');
  await storageMatrix('A', clientA, userA.id, profileA, clientB, userB.id, profileB, pathB);
  const pathA = [...cleanupPaths.A][0];
  await storageMatrix('B', clientB, userB.id, profileB, clientA, userA.id, profileA, pathA);
} finally {
  await cleanup(clientA, 'A');
  await cleanup(clientB, 'B');
  console.table(rows);
}
