# Arquitetura de sincronização

```text
IndexedDB local ↔ Sync Engine ↔ Supabase ↔ Sync Engine ↔ IndexedDB local
```

A 1.1.0 inclui o engine e a mídia privada no mesmo fluxo. Repositories continuam locais; nenhuma ação cotidiana aguarda Supabase para ser considerada salva.

## Escopo remoto do produto atual

O sync cobre as 15 tabelas da fundação, incluindo `media_metadata`; binários usam separadamente o bucket privado. Stores locais legados de alimentos, receitas e diário por refeições não entram na outbox, no push, no pull nem no schema Supabase. Backup/restauração continua preservando esses registros antigos sem transformá-los em dados cloud.

`nutrition_summaries` permanece sincronizável porque representa o Diário atual: valores manuais independentes de calorias e macros por perfil/data. Isso não reintroduz catálogo ou planejamento alimentar.

## Identidade e granularidade

Cada entidade sincronizável nasce offline com `createUuid()`: usa `crypto.randomUUID()` quando existe e, em HTTP LAN ou runtimes compatíveis sem essa API, gera UUID v4 com `crypto.getRandomValues()`. Push é UPSERT pelo mesmo UUID e pode ser repetido sem duplicar. Mudanças são registro por registro; nunca existe “o banco inteiro mais recente vence”. `account_id` vem da sessão e `profile_id` referencia um perfil da mesma conta.

## Metadados locais

`syncMetadata` guarda por conta/tipo/ID: `state`, `lastSyncedAt`, `remoteRevision`, `deletedAt` e `syncError`. Estados: `LOCAL_ONLY`, `PENDING_UPLOAD`, `SYNCED`, `PENDING_DELETE`, `CONFLICT` e `ERROR`.

A outbox persistente contém `UPSERT`/`DELETE`, conta, tipo/ID, perfil, snapshot, timestamp, tentativas, próxima tentativa e erro seguro. Alterar um registro grava IndexedDB e outbox na mesma transação; operações repetidas do mesmo registro são coalescidas.

## Push, pull e relógio

- push ordena perfis antes de filhos, planos antes de sessões e sessões antes de séries; deletes usam ordem inversa;
- pull usa cursor composto `(updated_at, id)` por tipo de entidade;
- `updated_at` e `revision` remotos são definidos pelo servidor, evitando depender do relógio do celular;
- `deleted_at` é tombstone; GC só poderá remover tombstones depois de uma janela segura e conhecimento dos dispositivos;
- falha de rede mantém alteração local pendente e nunca bloqueia uso normal.

## Conflitos iniciais

- eventos naturalmente append-only, como água e séries concluídas: merge por UUID;
- configuração única por perfil: comparar `remoteRevision`; conflito concorrente não é sobrescrito silenciosamente;
- snapshots históricos de treino: preservar a versão usada pela sessão;
- exclusão versus edição: manter tombstone e apresentar resolução quando houver edição concorrente não observada.

O Modo Academia sempre persiste localmente. Sessão ativa, rascunhos, timer e conclusão nunca dependem de conexão. A UI mostra **Sincronizado**, **Sincronizando…**, **Offline · N alterações pendentes**, **Conflito** ou **Erro de sincronização**, sempre lembrando que os dados permanecem neste dispositivo.

## Evolução para múltiplas contas locais

A 1.1.0 vincula uma instalação a uma única conta por vez. Isso resolve o caso principal — uma conta em vários dispositivos — sem duplicar bancos locais. Se o produto precisar suportar várias contas offline no mesmo perfil de navegador, a evolução deverá particionar stores ou bancos por `account_id`; remover o gate sem essa partição reabriria vazamento local entre sessões.
