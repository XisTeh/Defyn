# SQL do Supabase

As migrations em `migrations/` são a fonte versionada do banco remoto. Execute-as em ordem cronológica com `supabase db push` depois de vincular o projeto. Para um ambiente local com Docker e Supabase CLI, use `supabase start`, `supabase db reset` e `supabase test db`.

O frontend normal não depende de Docker nem da CLI. Não cole credenciais administrativas em migrations, arquivos `.env` versionados ou comandos salvos no repositório.

Depois de aplicar as migrations, gere novamente os tipos:

```powershell
npx supabase gen types typescript --linked --schema public | Set-Content src/infrastructure/supabase/database.types.ts
```

Os testes de RLS em `tests/database/` são transacionais: criam contas sintéticas, validam isolamento e executam rollback.
