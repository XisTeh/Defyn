# Testes

Vitest cobre regras de domínio, casos de uso, migrations, backup, PWA e contratos de navegação. A suíte é determinística: datas relevantes são fixadas nos testes e não há dependência de rede ou dados reais do usuário.

Cobertura de integridade inclui perfis e isolamento, hidratação, resumo diário, rotina, sono, treino, descanso, progresso, fotos, backup/restauração, migrations v2–v9 e atualização PWA segura.

A suíte local cobre outbox, ordem topológica, retry, idempotência, cursor paginado, tombstone, conflito, merge sem colisão, offline, dois dispositivos, isolamento de conta, treino completo, MIME/assinatura, path privado, upload antes da metadata, delete seguro, cache offline, bootstrap retomável, primeiro login offline, restore e proteção de limpeza. A criação de UUID também é validada com e sem `crypto.randomUUID()`, incluindo UUID v4, variante RFC 4122, ausência de `Math.random`, hidratação e outbox. O wake-up Realtime é testado com sinal remoto sem materializar payload, debounce, self-event, reconexão, encerramento de canal, troca de conta e serialização de pull. Nenhum teste unitário acessa Supabase real.

Runners separados usam somente fixtures QA e publishable key: `npm run test:rls:remote` (34 verificações), `npm run test:sync:remote` (16 cenários estruturados, incluindo reconvergência de conflito e snapshot semântico com dois perfis) e `npm run test:media:remote` (10 cenários de avatar/foto/cache/retry/delete/isolamento). Todos fazem cleanup e nunca imprimem credenciais ou sessão.

O ownership da instalação possui cobertura para dados legacy sem owner, confirmação com conta A, persistência no logout, retorno de A, bloqueio de B, ausência de exposição de snapshot, retorno posterior de A, reset, instalação vazia e proteção contra troca silenciosa. A UI só monta `App` quando a decisão é `allowed`.

RLS possui suíte separada em `supabase/tests/database/rls_isolation.test.sql`. Ela cria contas sintéticas A/B em uma transação, prova leitura/escrita própria, bloqueio de leitura/edição/exclusão cruzadas e bloqueio de filho usando perfil alheio, então executa rollback. Rode em Supabase local com `supabase db reset` e `supabase test db`; Docker é necessário apenas para esse teste local, não para o frontend.

Para a prova operacional no projeto remoto, crie `.env.qa.local` (ignorado pelo Git) com `DEFYN_QA_A_EMAIL`, `DEFYN_QA_A_PASSWORD`, `DEFYN_QA_B_EMAIL` e `DEFYN_QA_B_PASSWORD`, além da URL/Publishable Key de `.env.local`. Execute `npm run test:rls:remote`, `npm run test:sync:remote` e `npm run test:media:remote`. Os runners cobrem respectivamente 34 casos RLS/Storage, 16 cenários D1/D2 estruturados e 10 cenários de mídia privada. Usam sessões comuns, removem fixtures no `finally` e nunca imprimem credenciais, tokens ou sessões.

O patch 1.0.1 acrescenta cobertura para reset de todas as coleções locais, exportação válida após reset e contrato do Planejamento habitual: sete colunas sem scroll em desktop e rolagem preservada em telas estreitas.

## Validação de release

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

O QA físico complementar não usa nem apaga dados reais: siga `PHYSICAL_DEVICE_CHECKLIST.md` em um perfil de teste ou com operações não destrutivas.

O runner Node prova a convergência do Sync Engine, mas não reproduz lifecycle/throttling de browser mobile nem substitui o teste físico de wake-up PC ↔ celular sem reload após a migration Realtime ser aplicada.
