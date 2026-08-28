-- DEFYN 1.1A: account ownership, granular sync schema, RLS and private media.
-- No personal data is included. Apply through the Supabase migration flow.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.defyn_profiles (
  id uuid primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  unique (account_id, id)
);

create table if not exists public.account_preferences (
  id uuid primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  preference_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  unique (account_id, preference_key), unique (account_id, id)
);

create table if not exists public.profile_settings (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  unique (account_id, profile_id), unique (account_id, id)
);

create table if not exists public.nutrition_targets (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, starts_at timestamptz not null, ends_at timestamptz, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade, unique (account_id, id)
);

create table if not exists public.nutrition_summaries (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, local_date date not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  unique (account_id, profile_id, local_date), unique (account_id, id)
);

create table if not exists public.hydration_entries (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, local_date date not null, occurred_at timestamptz not null, amount_ml integer not null check (amount_ml >= 0), payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade, unique (account_id, id)
);

create table if not exists public.routine_days (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, day_of_week smallint not null check (day_of_week between 0 and 6), payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  unique (account_id, profile_id, day_of_week), unique (account_id, id)
);

create table if not exists public.sleep_records (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, local_date date not null, sleep_started_at timestamptz not null, woke_at timestamptz not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  unique (account_id, profile_id, local_date), unique (account_id, id), check (woke_at > sleep_started_at)
);

create table if not exists public.training_plans (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, status text not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade, unique (account_id, id)
);

create table if not exists public.workout_sessions (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, plan_id uuid, local_date date not null, status text not null, started_at timestamptz, completed_at timestamptz, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  foreign key (account_id, plan_id) references public.training_plans(account_id, id), unique (account_id, id)
);

create table if not exists public.workout_sets (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, session_id uuid not null, exercise_id text not null, set_index integer not null check (set_index >= 0), payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  foreign key (account_id, session_id) references public.workout_sessions(account_id, id) on delete cascade, unique (account_id, id)
);

create table if not exists public.progress_records (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, local_date date not null, occurred_at timestamptz not null, weight_kg numeric, measurements jsonb, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade, unique (account_id, id)
);

create table if not exists public.check_ins (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, local_date date not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade, unique (account_id, id)
);

create table if not exists public.media_metadata (
  id uuid primary key, account_id uuid not null, profile_id uuid not null, kind text not null, storage_path text not null, mime_type text, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, revision bigint not null default 1 check (revision > 0),
  foreign key (account_id, profile_id) references public.defyn_profiles(account_id, id) on delete cascade,
  unique (account_id, storage_path), unique (account_id, id), check (storage_path like account_id::text || '/' || profile_id::text || '/%')
);

create index if not exists defyn_profiles_pull_idx on public.defyn_profiles(account_id, updated_at, id);
create index if not exists hydration_profile_date_idx on public.hydration_entries(account_id, profile_id, local_date);
create index if not exists workout_sessions_profile_date_idx on public.workout_sessions(account_id, profile_id, local_date);
create index if not exists progress_profile_date_idx on public.progress_records(account_id, profile_id, local_date);

create or replace function public.touch_sync_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if tg_table_name <> 'accounts' then new.revision = old.revision + 1; end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['accounts','defyn_profiles','account_preferences','profile_settings','nutrition_targets','nutrition_summaries','hydration_entries','routine_days','sleep_records','training_plans','workout_sessions','workout_sets','progress_records','check_ins','media_metadata']
  loop
    execute format('drop trigger if exists touch_sync_record on public.%I', table_name);
    execute format('create trigger touch_sync_record before update on public.%I for each row execute function public.touch_sync_record()', table_name);
  end loop;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();
insert into public.accounts(id) select id from auth.users on conflict (id) do nothing;

alter table public.accounts enable row level security;
drop policy if exists accounts_select_own on public.accounts;
drop policy if exists accounts_insert_own on public.accounts;
drop policy if exists accounts_update_own on public.accounts;
drop policy if exists accounts_delete_own on public.accounts;
create policy accounts_select_own on public.accounts for select to authenticated using (id = (select auth.uid()));
create policy accounts_insert_own on public.accounts for insert to authenticated with check (id = (select auth.uid()));
create policy accounts_update_own on public.accounts for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy accounts_delete_own on public.accounts for delete to authenticated using (id = (select auth.uid()));

do $$
declare table_name text;
begin
  foreach table_name in array array['defyn_profiles','account_preferences','profile_settings','nutrition_targets','nutrition_summaries','hydration_entries','routine_days','sleep_records','training_plans','workout_sessions','workout_sets','progress_records','check_ins','media_metadata']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (account_id = (select auth.uid()))', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (account_id = (select auth.uid()))', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()))', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (account_id = (select auth.uid()))', table_name || '_delete_own', table_name);
  end loop;
end $$;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.accounts, public.defyn_profiles, public.account_preferences, public.profile_settings, public.nutrition_targets, public.nutrition_summaries, public.hydration_entries, public.routine_days, public.sleep_records, public.training_plans, public.workout_sessions, public.workout_sets, public.progress_records, public.check_ins, public.media_metadata to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('defyn-media', 'defyn-media', false, 15728640, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists defyn_media_select_own on storage.objects;
drop policy if exists defyn_media_insert_own on storage.objects;
drop policy if exists defyn_media_update_own on storage.objects;
drop policy if exists defyn_media_delete_own on storage.objects;
create policy defyn_media_select_own on storage.objects for select to authenticated using (bucket_id = 'defyn-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy defyn_media_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'defyn-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy defyn_media_update_own on storage.objects for update to authenticated using (bucket_id = 'defyn-media' and (storage.foldername(name))[1] = (select auth.uid()::text)) with check (bucket_id = 'defyn-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy defyn_media_delete_own on storage.objects for delete to authenticated using (bucket_id = 'defyn-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
