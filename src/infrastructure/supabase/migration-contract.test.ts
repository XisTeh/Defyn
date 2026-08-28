import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/202608270001_defyn_foundation.sql'), 'utf8');
const realtimeMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/202608280001_defyn_realtime_wakeup.sql'), 'utf8');
const personalTables = [
  'defyn_profiles', 'account_preferences', 'profile_settings', 'nutrition_targets', 'nutrition_summaries',
  'hydration_entries', 'routine_days', 'sleep_records', 'training_plans', 'workout_sessions', 'workout_sets',
  'progress_records', 'check_ins', 'media_metadata',
];
const discontinuedCloudTables = ['foods', 'recipes', 'diary_entries'];
const remoteTables = ['accounts', ...personalTables];

describe('contrato da migration Supabase', () => {
  it('declara exatamente as 15 tabelas do produto atual', () => {
    const declaredTables = Array.from(migration.matchAll(/create table if not exists public\.([a-z_]+)/gi), (match) => match[1]);
    expect(declaredTables).toEqual(remoteTables);
    expect(remoteTables).toHaveLength(15);
  });

  it('inclui todas as tabelas pessoais no ciclo obrigatório de RLS', () => {
    for (const table of personalTables) expect(migration).toContain(`'${table}'`);
    expect(migration).toContain('alter table public.%I enable row level security');
  });

  it('não cria tabelas cloud para domínios alimentares removidos do produto', () => {
    for (const table of discontinuedCloudTables) {
      expect(migration).not.toMatch(new RegExp(`create table if not exists public\\.${table}\\b`, 'i'));
      expect(migration).not.toMatch(new RegExp(`public\\.${table}\\b`, 'i'));
    }
  });

  it('cria políticas distintas para select, insert, update e delete', () => {
    for (const operation of ['select', 'insert', 'update', 'delete']) expect(migration).toContain(`'_${operation}_own'`);
    expect(migration).toContain('with check (account_id = (select auth.uid()))');
    expect(remoteTables.length * 4).toBe(60);
  });

  it('usa FK composta para bloquear profile de outra conta', () => {
    expect(migration).toContain('foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id)');
  });

  it('mantém storage privado e restringe a primeira pasta ao account id', () => {
    expect(migration).toContain("values ('defyn-media', 'defyn-media', false");
    expect(migration).toContain("(storage.foldername(name))[1] = (select auth.uid()::text)");
  });

  it('publica somente as tabelas atuais como sinal de wake-up Realtime', () => {
    for (const table of remoteTables) expect(realtimeMigration).toContain(`'${table}'`);
    for (const table of discontinuedCloudTables) expect(realtimeMigration).not.toContain(`'${table}'`);
    expect(realtimeMigration).toContain('alter publication supabase_realtime add table public.%I');
    expect(realtimeMigration).not.toContain('create policy');
  });
});
