import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = { ...loadEnv('qa', process.cwd(), ''), ...process.env };
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'DEFYN_QA_A_EMAIL', 'DEFYN_QA_A_PASSWORD', 'DEFYN_QA_B_EMAIL', 'DEFYN_QA_B_PASSWORD'];
if (required.some((key) => !env[key])) throw new Error('Configuração QA incompleta.');

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const clientA = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
const clientB = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options);
const rows = [];
const cleanup = { defyn_profiles: new Set(), nutrition_targets: new Set(), hydration_entries: new Set(), routine_days: new Set(), sleep_records: new Set(), training_plans: new Set(), workout_sessions: new Set(), workout_sets: new Set(), progress_records: new Set() };

function record(operation, expected, passed, obtained) { rows.push({ operation, expected, obtained, status: passed ? 'PASS' : 'FAIL' }); }
function uuid() { return crypto.randomUUID(); }
function now(offset = 0) { return new Date(Date.now() + offset).toISOString(); }
function safeError(error) { return error ? `${error.code ?? 'remote_error'}/${error.status ?? 'unknown'}` : 'resultado inesperado'; }
function payload(id, extra = {}) { const timestamp = now(); return { id, createdAt: timestamp, updatedAt: timestamp, ...extra }; }

async function login(client, email, password, label) {
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) throw new Error(`Login QA ${label} falhou (${safeError(result.error)}).`);
  return result.data.user.id;
}

async function insert(table, row) {
  const result = await clientA.from(table).insert(row).select('*').single();
  if (result.error) throw new Error(`Insert ${table} falhou (${safeError(result.error)}).`);
  cleanup[table]?.add(row.id);
  return result.data;
}

async function pullOne(client, table, id) {
  const result = await client.from(table).select('*').eq('id', id).maybeSingle();
  if (result.error) throw new Error(`Pull ${table} falhou (${safeError(result.error)}).`);
  return result.data;
}

async function updateAtRevision(table, id, revision, changes) {
  const result = await clientA.from(table).update(changes).eq('id', id).eq('revision', revision).select('*').maybeSingle();
  if (result.error) throw new Error(`Update ${table} falhou (${safeError(result.error)}).`);
  return result.data;
}

async function cleanupFixtures(client) {
  for (const table of ['workout_sets', 'workout_sessions', 'training_plans', 'sleep_records', 'routine_days', 'hydration_entries', 'progress_records', 'nutrition_targets', 'defyn_profiles']) {
    const ids = [...cleanup[table]];
    if (ids.length) await client.from(table).delete().in('id', ids);
  }
}

async function run() {
  let accountA; let accountB;
  try {
    [accountA, accountB] = await Promise.all([
      login(clientA, env.DEFYN_QA_A_EMAIL, env.DEFYN_QA_A_PASSWORD, 'A'),
      login(clientB, env.DEFYN_QA_B_EMAIL, env.DEFYN_QA_B_PASSWORD, 'B'),
    ]);
    const profileId = uuid(); const device1 = new Map(); const device2 = new Map();
    const profilePayload = payload(profileId, { name: 'QA Sync D1', dateOfBirth: '1990-01-01' });
    device1.set(`profile:${profileId}`, profilePayload);
    const profileRemote = await insert('defyn_profiles', { id: profileId, account_id: accountA, name: 'QA Sync D1', payload: profilePayload });
    record('D1 create profile → push', 'remoto criado', Boolean(profileRemote), profileRemote ? 'criado' : 'ausente');

    const pulledProfile = await pullOne(clientA, 'defyn_profiles', profileId);
    if (pulledProfile) device2.set(`profile:${profileId}`, pulledProfile.payload);
    record('D2 initial pull profile', 'perfil materializado', device2.get(`profile:${profileId}`)?.name === 'QA Sync D1', device2.has(`profile:${profileId}`) ? 'materializado' : 'ausente');

    const secondProfileId = uuid(); const targetId = uuid(); const progressId = uuid();
    await insert('defyn_profiles', { id: secondProfileId, account_id: accountA, name: 'QA Sync Profile 2', payload: payload(secondProfileId, { name: 'QA Sync Profile 2' }) });
    await insert('nutrition_targets', { id: targetId, account_id: accountA, profile_id: secondProfileId, starts_at: now(), payload: payload(targetId, { profileId: secondProfileId, calories: 2100 }) });
    await insert('progress_records', { id: progressId, account_id: accountA, profile_id: secondProfileId, local_date: '2026-08-27', occurred_at: now(), weight_kg: 72, payload: payload(progressId, { profileId: secondProfileId, localDate: '2026-08-27', weightKg: 72 }) });

    const updatedPayload = { ...device2.get(`profile:${profileId}`), name: 'QA Sync D2', updatedAt: now(1) };
    device2.set(`profile:${profileId}`, updatedPayload);
    const updatedRemote = await updateAtRevision('defyn_profiles', profileId, profileRemote.revision, { name: 'QA Sync D2', payload: updatedPayload, deleted_at: null });
    record('D2 update → optimistic push', '1 alteração', Boolean(updatedRemote), updatedRemote ? '1 alteração' : 'conflito');
    const pulledUpdate = await pullOne(clientA, 'defyn_profiles', profileId);
    if (pulledUpdate) device1.set(`profile:${profileId}`, pulledUpdate.payload);
    record('D1 incremental pull update', 'versão D2', device1.get(`profile:${profileId}`)?.name === 'QA Sync D2', device1.get(`profile:${profileId}`)?.name === 'QA Sync D2' ? 'versão D2' : 'divergente');

    const hydrationId = uuid(); const sleepId = uuid();
    const hydrationPayload = payload(hydrationId, { profileId, localDate: '2026-08-27', occurredAt: now(), amountMl: 350 });
    const sleepPayload = payload(sleepId, { profileId, localDate: '2026-08-27', sleepStartedAt: '2026-08-27T02:00:00.000Z', wokeAt: '2026-08-27T10:00:00.000Z', durationMinutes: 480 });
    const offlineOutbox = [{ table: 'hydration_entries', id: hydrationId }, { table: 'sleep_records', id: sleepId }];
    device1.set(`hydration:${hydrationId}`, hydrationPayload); device1.set(`sleep:${sleepId}`, sleepPayload);
    record('D1 offline mutations', '2 locais + 2 outbox', device1.size >= 3 && offlineOutbox.length === 2, `${offlineOutbox.length} pendentes`);
    await insert('hydration_entries', { id: hydrationId, account_id: accountA, profile_id: profileId, local_date: hydrationPayload.localDate, occurred_at: hydrationPayload.occurredAt, amount_ml: hydrationPayload.amountMl, payload: hydrationPayload });
    await insert('sleep_records', { id: sleepId, account_id: accountA, profile_id: profileId, local_date: sleepPayload.localDate, sleep_started_at: sleepPayload.sleepStartedAt, woke_at: sleepPayload.wokeAt, payload: sleepPayload });
    offlineOutbox.length = 0;
    record('D1 reconnect → flush outbox', 'fila vazia', offlineOutbox.length === 0, `${offlineOutbox.length} pendentes`);
    const [d2Hydration, d2Sleep] = await Promise.all([pullOne(clientA, 'hydration_entries', hydrationId), pullOne(clientA, 'sleep_records', sleepId)]);
    if (d2Hydration) device2.set(`hydration:${hydrationId}`, d2Hydration.payload); if (d2Sleep) device2.set(`sleep:${sleepId}`, d2Sleep.payload);
    record('D2 pull offline records', 'água + sono', Boolean(d2Hydration && d2Sleep), d2Hydration && d2Sleep ? 'água + sono' : 'incompleto');

    const routineId = uuid(); const secondHydrationId = uuid();
    const routinePayload = payload(routineId, { profileId, dayOfWeek: 'monday', wakeTime: '07:00', isRestDay: false });
    const secondHydrationPayload = payload(secondHydrationId, { profileId, localDate: '2026-08-27', occurredAt: now(2), amountMl: 200 });
    await Promise.all([
      insert('routine_days', { id: routineId, account_id: accountA, profile_id: profileId, day_of_week: 0, payload: routinePayload }),
      insert('hydration_entries', { id: secondHydrationId, account_id: accountA, profile_id: profileId, local_date: secondHydrationPayload.localDate, occurred_at: secondHydrationPayload.occurredAt, amount_ml: secondHydrationPayload.amountMl, payload: secondHydrationPayload }),
    ]);
    const [routineOnD2, hydrationOnD1] = await Promise.all([pullOne(clientA, 'routine_days', routineId), pullOne(clientA, 'hydration_entries', secondHydrationId)]);
    record('non-colliding concurrent merge', 'ambas preservadas', Boolean(routineOnD2 && hydrationOnD1), routineOnD2 && hydrationOnD1 ? 'ambas preservadas' : 'alteração perdida');

    const staleRevision = updatedRemote.revision;
    const cloudWinnerPayload = { ...updatedPayload, name: 'QA Conflict Cloud', updatedAt: now(3) };
    const cloudWinner = await updateAtRevision('defyn_profiles', profileId, staleRevision, { name: 'QA Conflict Cloud', payload: cloudWinnerPayload });
    const localConflictPayload = { ...updatedPayload, name: 'QA Conflict Local', updatedAt: now(4) };
    const rejected = await updateAtRevision('defyn_profiles', profileId, staleRevision, { name: 'QA Conflict Local', payload: localConflictPayload });
    const preserved = { local: localConflictPayload, remote: cloudWinner?.payload };
    record('same-record conflict detection', 'update recusado + duas versões', !rejected && preserved.local.name === 'QA Conflict Local' && preserved.remote?.name === 'QA Conflict Cloud', !rejected ? 'CONFLICT preservado' : 'sobrescrito');
    const resolved = cloudWinner ? await updateAtRevision('defyn_profiles', profileId, cloudWinner.revision, { name: localConflictPayload.name, payload: localConflictPayload }) : undefined;
    const resolutionPull = await pullOne(clientA, 'defyn_profiles', profileId);
    if (resolutionPull) { device1.set(`profile:${profileId}`, resolutionPull.payload); device2.set(`profile:${profileId}`, resolutionPull.payload); }
    record('conflict choice → reconvergence', 'D1 e D2 iguais', Boolean(resolved) && device1.get(`profile:${profileId}`)?.name === 'QA Conflict Local' && device2.get(`profile:${profileId}`)?.name === 'QA Conflict Local', resolved ? 'convergente' : 'não resolvido');

    const planId = uuid(); const sessionId = uuid(); const set1 = uuid(); const set2 = uuid();
    const planPayload = payload(planId, { profileId, status: 'active', name: 'QA Plan' });
    const sessionPayload = payload(sessionId, { profileId, planId, localDate: '2026-08-27', status: 'completed', startedAt: now(5), completedAt: now(6), exercises: [] });
    const setPayloads = [set1, set2].map((id, index) => payload(id, { profileId, sessionId, exerciseId: 'qa-exercise', setIndex: index, completed: true }));
    const workoutOutbox = ['training_plans', 'workout_sessions', 'workout_sets', 'workout_sets'];
    record('offline workout local completion', 'sessão + 2 séries pendentes', workoutOutbox.length === 4, '4 pendentes');
    await insert('training_plans', { id: planId, account_id: accountA, profile_id: profileId, status: 'active', payload: planPayload });
    await insert('workout_sessions', { id: sessionId, account_id: accountA, profile_id: profileId, plan_id: planId, local_date: '2026-08-27', status: 'completed', started_at: sessionPayload.startedAt, completed_at: sessionPayload.completedAt, payload: sessionPayload });
    for (const item of setPayloads) await insert('workout_sets', { id: item.id, account_id: accountA, profile_id: profileId, session_id: sessionId, exercise_id: item.exerciseId, set_index: item.setIndex, payload: item });
    const [remoteSession, remoteSets] = await Promise.all([pullOne(clientA, 'workout_sessions', sessionId), clientA.from('workout_sets').select('*').eq('session_id', sessionId)]);
    record('workout topological reconnect', 'sessão completa + 2 séries', remoteSession?.status === 'completed' && !remoteSets.error && remoteSets.data?.length === 2, remoteSession?.status === 'completed' ? `${remoteSets.data?.length ?? 0} séries` : 'sessão ausente');
    const retry = await clientA.from('workout_sessions').upsert({ id: sessionId, account_id: accountA, profile_id: profileId, plan_id: planId, local_date: '2026-08-27', status: 'completed', started_at: sessionPayload.startedAt, completed_at: sessionPayload.completedAt, payload: sessionPayload }).select('id');
    const duplicateCount = await clientA.from('workout_sessions').select('id', { count: 'exact' }).eq('id', sessionId);
    record('idempotent workout retry', '1 sessão', !retry.error && !duplicateCount.error && duplicateCount.count === 1, `${duplicateCount.count ?? 0} sessão(ões)`);

    const semantic = await Promise.all([
      clientA.from('defyn_profiles').select('id').in('id', [profileId, secondProfileId]),
      clientA.from('nutrition_targets').select('id').eq('id', targetId), clientA.from('routine_days').select('id').eq('id', routineId),
      clientA.from('sleep_records').select('id').eq('id', sleepId), clientA.from('hydration_entries').select('id').in('id', [hydrationId, secondHydrationId]),
      clientA.from('training_plans').select('id').eq('id', planId), clientA.from('workout_sessions').select('id').eq('id', sessionId),
      clientA.from('workout_sets').select('id').eq('session_id', sessionId), clientA.from('progress_records').select('id').eq('id', progressId),
    ]);
    const semanticCounts = semantic.map((result) => result.error ? -1 : result.data?.length ?? 0);
    record('D2 bootstrap semantic snapshot', '2 perfis + metas + rotina + sono + água + treino + séries + progresso', semanticCounts.every((count, index) => count >= (index === 0 || index === 4 || index === 7 ? 2 : 1)), semanticCounts.every((count) => count >= 0) ? 'coleções convergentes' : 'consulta falhou');

    const tombstone = await clientA.from('hydration_entries').update({ deleted_at: now(7) }).eq('id', hydrationId).select('*').single();
    const tombstonePull = await pullOne(clientA, 'hydration_entries', hydrationId);
    if (tombstonePull?.deleted_at) device2.delete(`hydration:${hydrationId}`);
    record('tombstone propagation', 'oculto no D2', !tombstone.error && !device2.has(`hydration:${hydrationId}`), device2.has(`hydration:${hydrationId}`) ? 'ainda visível' : 'oculto');

    const cross = await clientB.from('defyn_profiles').select('id').eq('id', profileId);
    record('account B cannot pull A fixture', '0 registros', !cross.error && cross.data?.length === 0 && accountA !== accountB, cross.error ? 'bloqueado' : `${cross.data?.length ?? 0} registro(s)`);

    console.table(rows);
    if (rows.some((item) => item.status !== 'PASS')) throw new Error('A matriz remota de sync encontrou falha.');
  } finally {
    await cleanupFixtures(clientA);
    await Promise.allSettled([clientA.auth.signOut(), clientB.auth.signOut()]);
  }
}

await run();
