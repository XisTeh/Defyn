-- DEFYN 1.1C: Postgres Changes is an invalidation signal for the normal sync pull.
-- Apply through the approved Supabase migration flow; this migration does not alter RLS.
do $$
declare table_name text;
begin
  foreach table_name in array array['accounts','defyn_profiles','account_preferences','profile_settings','nutrition_targets','nutrition_summaries','hydration_entries','routine_days','sleep_records','training_plans','workout_sessions','workout_sets','progress_records','check_ins','media_metadata']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
