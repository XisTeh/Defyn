begin;

-- Contas sintéticas, sem dados pessoais. O rollback final remove tudo.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'qa-a@example.invalid', extensions.crypt('qa-password-a', extensions.gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'qa-b@example.invalid', extensions.crypt('qa-password-b', extensions.gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.defyn_profiles(id, account_id, name) values ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'QA A');
insert into public.hydration_entries(id, account_id, profile_id, local_date, occurred_at, amount_ml) values ('12000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', current_date, now(), 300);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into public.defyn_profiles(id, account_id, name) values ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'QA B');
insert into public.hydration_entries(id, account_id, profile_id, local_date, occurred_at, amount_ml) values ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', current_date, now(), 500);

do $$ begin
  if (select count(*) from public.defyn_profiles) <> 1 then raise exception 'RLS: B leu perfil de A'; end if;
  if (select count(*) from public.hydration_entries) <> 1 then raise exception 'RLS: B leu hidratação de A'; end if;
end $$;

do $$ declare affected integer; begin
  update public.defyn_profiles set name = 'tentativa' where id = '11000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS: B editou perfil de A'; end if;
end $$;
do $$ declare affected integer; begin
  delete from public.hydration_entries where id = '12000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS: B apagou registro de A'; end if;
end $$;

do $$ begin
  begin
    insert into public.hydration_entries(id, account_id, profile_id, local_date, occurred_at, amount_ml)
    values ('23000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', current_date, now(), 250);
    raise exception 'RLS/FK: B inseriu filho no perfil de A';
  exception when foreign_key_violation or insufficient_privilege or check_violation then null;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.defyn_profiles) <> 1 then raise exception 'RLS: A leu perfil de B'; end if;
  if (select count(*) from public.hydration_entries) <> 1 then raise exception 'RLS: A leu hidratação de B'; end if;
end $$;

do $$ declare affected integer; begin
  update public.defyn_profiles set name = 'tentativa' where id = '21000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS: A editou perfil de B'; end if;
end $$;
do $$ declare affected integer; begin
  delete from public.hydration_entries where id = '22000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS: A apagou registro de B'; end if;
end $$;
do $$ begin
  begin
    insert into public.hydration_entries(id, account_id, profile_id, local_date, occurred_at, amount_ml)
    values ('13000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002', current_date, now(), 250);
    raise exception 'RLS/FK: A inseriu filho no perfil de B';
  exception when foreign_key_violation or insufficient_privilege or check_violation then null;
  end;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin
    perform 1 from public.defyn_profiles limit 1;
    raise exception 'GRANT: anon conseguiu consultar dados pessoais';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
