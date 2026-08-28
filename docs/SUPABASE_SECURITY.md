# Segurança do Supabase

## Pode estar no cliente

- Project URL;
- Publishable Key (`sb_publishable_...`).

Esses valores identificam o projeto, mas não concedem acesso irrestrito. A proteção vem da sessão Auth do usuário, `auth.uid()`, ownership explícito e RLS.

## Nunca pode estar no cliente

- Secret Key ou `service_role`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- senha ou URL administrativa do PostgreSQL;
- JWT signing secret;
- access/refresh token administrativo;
- personal access token.

Nada dessa lista pode aparecer em `src`, `public`, `VITE_*`, HTML, bundle, documentação pública com valor real, console, localStorage manual ou Git.

## Ownership e RLS

`accounts.id = auth.users.id`. Todas as tabelas pessoais usam `account_id`; tabelas de perfil também usam `profile_id`. Existem políticas separadas de SELECT, INSERT, UPDATE e DELETE:

- `USING (account_id = auth.uid())` limita linhas visíveis/editáveis/removíveis;
- `WITH CHECK (account_id = auth.uid())` bloqueia inserts de outra conta e troca de owner em update;
- `accounts` usa `id = auth.uid()`;
- `anon` tem grants revogados; `authenticated` recebe apenas CRUD nas tabelas da aplicação.

RLS não é a única barreira relacional. A FK composta `(account_id, profile_id) → defyn_profiles(account_id, id)` impede que a conta A insira um filho com UUID de perfil da conta B, mesmo se descobrir esse UUID. Relações de séries/sessões e sessões/planos repetem o mesmo princípio.

## Storage

`defyn-media` é privado. O caminho obrigatório é `<account_id>/<profile_id>/<media_id>.<ext>`. Políticas no `storage.objects` validam que a primeira pasta é `auth.uid()` para leitura, inserção, atualização e exclusão. A aplicação usa sessão autenticada para upload/download; nunca torna o bucket público.

A 1.1.0 usa download autenticado e persiste somente `storage_path`; signed URL nunca é identidade nem estado durável. MIME permitido pelo bucket e assinatura binária validada na aplicação limitam uploads a JPEG/PNG/WebP. SVG pessoal é recusado. Retry preserva o mesmo UUID/path e não cria múltiplos objetos.

O runner `test:media:remote` prova que a conta B não lista, baixa, sobrescreve nem apaga objetos da conta A. O frontend continua usando somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Verificação

A migration habilita RLS nas 15 tabelas do schema remoto, revoga `anon` e cria 4 políticas por tabela: 60 políticas de dados. O bucket acrescenta 4 políticas de Storage, totalizando 64 políticas da fundação. A suíte SQL A/B valida isolamento diretamente no banco. A interface nunca é considerada uma fronteira de segurança.

Não existem grants, policies, FKs ou tabelas remotas para `foods`, `recipes` ou `diary_entries`; o legado alimentar local não participa da superfície cloud.

## Isolamento local não substitui RLS

RLS protege registros remotos; `localOwnerAccountId` protege o IndexedDB compartilhado pelo mesmo navegador. O gate local nunca é usado como evidência de isolamento cloud e não muda `account_id` remoto. As duas barreiras são independentes e obrigatórias.

O gateway de push ignora ownership fornecido pela UI: `account_id` é sempre o UUID da sessão autenticada recebido pelo boundary. A outbox também é particionada por esse UUID. `profile_id` vem da entidade local vinculada e continua validado pela FK composta/RLS. O frontend usa apenas Publishable Key; os runners remotos usam sessões QA comuns e nunca `service_role`.
