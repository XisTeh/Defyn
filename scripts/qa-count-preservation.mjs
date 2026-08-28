export const QA_DOMAIN_TABLES = [
  'defyn_profiles', 'profile_settings', 'nutrition_targets', 'nutrition_summaries',
  'hydration_entries', 'routine_days', 'sleep_records', 'training_plans',
  'workout_sessions', 'workout_sets', 'progress_records', 'check_ins', 'media_metadata',
];

export async function snapshotQaCounts(client, accountId) {
  const account = await client.from('accounts').select('id', { count: 'exact', head: true }).eq('id', accountId);
  if (account.error) throw new Error(`Contagem accounts falhou (${safeError(account.error)}).`);
  const counts = { accounts: account.count ?? 0 };
  for (const table of QA_DOMAIN_TABLES) {
    const result = await client.from(table).select('id', { count: 'exact', head: true }).eq('account_id', accountId);
    if (result.error) throw new Error(`Contagem ${table} falhou (${safeError(result.error)}).`);
    counts[table] = result.count ?? 0;
  }
  return counts;
}

export function assertQaCountsPreserved(before, after, label) {
  const changed = Object.keys(before).filter((table) => before[table] !== after[table]);
  if (changed.length) throw new Error(`Preservação QA ${label} falhou nas tabelas: ${changed.join(', ')}.`);
  console.log(`Preservação QA ${label}: PASS`);
  console.table(Object.entries(before).map(([table, count]) => ({ table, before: count, after: after[table] })));
}

function safeError(error) {
  return `${error?.code ?? 'remote_error'}/${error?.status ?? 'unknown'}`;
}
