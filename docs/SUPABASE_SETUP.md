# Configurar o Supabase

Este guia configura Auth, banco, isolamento, sync estruturado e mídia privada do DEFYN 1.1.0.

## 1. Criar o projeto

1. Entre em [supabase.com](https://supabase.com) e clique em **New project**.
2. Escolha organização, nome e região próximos dos usuários.
3. Defina uma senha forte para o banco e guarde-a em um gerenciador de senhas. Essa senha nunca vai para o frontend.
4. Aguarde o projeto ficar disponível.

## 2. Copiar somente os dois valores públicos

No Dashboard, abra **Connect** ou **Project Settings → API** e localize:

- **Project URL** → `VITE_SUPABASE_URL`;
- **Publishable key**, normalmente iniciada por `sb_publishable_` → `VITE_SUPABASE_PUBLISHABLE_KEY`.

Não copie Secret Key, `service_role`, senha do banco, JWT signing secret ou personal access token para o app.

## 3. Configurar o desenvolvimento local

Na raiz do projeto, crie `.env.local` copiando `.env.example` e preencha somente:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUBSTITUA_AQUI
```

`.env.local` está ignorado pelo Git. Reinicie `npm run dev` após alterar variáveis. Para voltar temporariamente ao modo local, remova os dois valores; deixar apenas um é erro de configuração intencional.

## 4. Aplicar migrations versionadas

Tenha Supabase CLI disponível e, na raiz do projeto:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O login da CLI pode usar uma credencial administrativa local ao terminal. Nunca salve essa credencial em `.env.local`, Git, Vercel ou arquivos do frontend. `db push` aplica a foundation e a migration posterior `202608280001_defyn_realtime_wakeup.sql`, incluindo tabelas, triggers, RLS, grants, bucket privado e publication de Realtime.

### Schema esperado após a migration

Devem existir exatamente estas 15 tabelas da aplicação em `public`: `accounts`, `defyn_profiles`, `account_preferences`, `profile_settings`, `nutrition_targets`, `nutrition_summaries`, `hydration_entries`, `routine_days`, `sleep_records`, `training_plans`, `workout_sessions`, `workout_sets`, `progress_records`, `check_ins` e `media_metadata`.

Não devem existir `foods`, `recipes` ou `diary_entries`. Esses stores são apenas legado local de compatibilidade e não serão sincronizados. `nutrition_summaries` deve existir, pois atende ao Diário manual atual.

Depois, gere tipos alinhados ao projeto:

```powershell
npx supabase gen types typescript --linked --schema public | Set-Content src/infrastructure/supabase/database.types.ts
```

### Realtime para wake-up multi-device

`202608280001_defyn_realtime_wakeup.sql` adiciona as 15 tabelas atuais à publication `supabase_realtime`. Ela não modifica RLS, não cria policy e não torna nenhum dado público: o cliente mantém um canal autenticado filtrado por `account_id` (ou `accounts.id`) e usa o evento apenas para pedir o pull incremental normal. Aplique-a somente pelo fluxo de migration aprovado; não execute SQL manual avulso. Sem essa migration aplicada, sync continua seguro por `online`, foreground e polling, mas um celular em background pode não atualizar em poucos segundos.

## 5. Configurar Auth URLs

No Dashboard, abra **Authentication → URL Configuration**:

1. para produção, configure **Site URL** como `https://defyn-gold.vercel.app`;
2. autorize o redirect exato usado por login/recuperação: `https://defyn-gold.vercel.app/` (o código retorna à raiz com `?auth=recovery`);
3. para desenvolvimento, autorize `http://localhost:5173/` e, se utilizado, `http://127.0.0.1:5173/`;
4. não use wildcard amplo em produção; previews devem ser adicionados somente quando forem realmente habilitados e com o menor padrão compatível;
4. mantenha o provedor **Email** ativo;
5. decida se confirmação de e-mail fica habilitada. Ambos os estados são tratados pelo app.

Os requisitos de senha são definidos em **Authentication** no Dashboard; o frontend não inventa uma regra diferente.

## 6. Configurar a Vercel para produção

Em **Project Settings → Environment Variables**, adicione somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para o ambiente desejado. Nunca adicione uma chave secreta/service role como `VITE_*`.

Adicione na Vercel, para Production e apenas nos Previews desejados: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Nenhuma secret/service role é necessária ou permitida no frontend. Sem as variáveis, o build continua no modo local.

## 7. Testar

1. execute `npm run dev`;
2. crie uma conta com e-mail de QA e observe se aparece confirmação pendente quando habilitada;
3. confirme, entre, recarregue e valide a sessão persistida;
4. use **Esqueci minha senha**, abra o link e defina uma nova senha;
5. saia e entre novamente;
6. crie contas QA A/B sem dados pessoais e execute o teste de RLS local descrito em `docs/TESTS.md`;
7. execute `npm run test:sync:remote` para a prova D1/D2 da conta QA;
8. confirme no Dashboard que `defyn-media` está **Private**;
9. após aplicar a migration Realtime, mantenha PC e celular online na mesma conta: altere um registro no PC e confirme que o celular atualiza sem toque ou reload; repita no sentido inverso.

Se dados locais existirem, o app mostra o resumo, incluindo fotos, e só gera o bootstrap remoto após **Sincronizar meus dados**. **Agora não** mantém o uso local sem upload. Uma instalação vazia executa pull inicial antes de decidir onboarding; se estiver offline no primeiro acesso, pede uma conexão inicial. Avatar e fotos usam `defyn-media` privado depois dos registros que dependem do perfil.
