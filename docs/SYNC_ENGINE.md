# Sync Engine 1.1.0

## Fluxo

```text
UI → caso de uso → repository → IndexedDB + outbox → Sync Engine → Supabase
                                      ↑                         ↓
                                      └──── pull incremental ───┘
```

A UI nunca aguarda rede para considerar uma ação salva. IndexedDB v8 é o armazenamento operacional; Supabase replica os dados estruturados entre instalações da mesma conta.

## Outbox

`syncOutbox` é persistente e particionada por `accountId`. Cada item guarda entidade, ID estável, perfil, operação `UPSERT`/`DELETE`, snapshot, criação, tentativas, última tentativa, próxima tentativa e erro seguro. A chave conta/tipo/ID coalesce alterações sucessivas. Entidade e evento são gravados na mesma transação Dexie; o evento só sai após confirmação remota.

## Push

O coordinator exige sessão válida e usa o UUID autenticado como `account_id`; a UI não fornece owner remoto. A ordem é perfil → preferências/configurações → entidades filhas → plano → sessão → séries. Deletes usam a ordem inversa. Inserts usam UUID client-side; updates exigem a `revision` observada. Reexecução de operação confirmada não cria uma segunda linha.

## Pull e cursor

Cada tabela/conta possui cursor `(updated_at,id)`. O pull ordena e pagina em lotes de 100, avançando o cursor após cada materialização local. `updated_at` e `revision` vêm do PostgreSQL. Uma instalação vazia conclui pull inicial antes de montar os módulos; não há `SELECT *` de todas as tabelas a cada foco.

## Wake-up entre dispositivos, retry e conectividade

Falha mantém outbox e dado local. O backoff dobra de 2 segundos até 5 minutos; cinco falhas marcam `ERROR`, mas não descartam a operação. Sync é solicitado após mutação, evento `online`, retorno ao foreground e intervalo moderado de 60 segundos. **Tentar novamente** libera imediatamente o próximo retry.

Depois de uma sessão autenticada e bootstrap concluído, um único canal Supabase Realtime recebe bindings Postgres Changes para as 15 tabelas atuais, sempre filtrados pela conta atual. O sinal não contém uma alteração aplicada diretamente: ele passa por um debounce de 900 ms e acorda o mesmo `SyncEngine`, que executa push/outbox e pull incremental por cursor/revisão. Assim, PC e celular convergem em poucos segundos mesmo quando timers de mobile são throttled. Eventos próprios podem gerar um pull extra inofensivo, mas não um loop: pull não cria outbox, o scheduler agrupa sinais e mantém no máximo um pull em execução com no máximo uma continuação pendente.

Ao receber `SUBSCRIBED` novamente após reconexão, o canal agenda catch-up pull. O canal é removido no logout/unmount e recriado para outra conta. `visibilitychange`, `online`, lock entre abas e polling moderado continuam como fallback; Realtime não é fonte de verdade nem substitui o modo offline.

## Tombstones

DELETE remove o item da UI/local, conserva seu snapshot na outbox e atualiza `deleted_at` remoto. Outros dispositivos recebem o tombstone e ocultam/removem o registro local. Não há garbage collector agressivo na 1.1.0.

## Conflitos

Eventos com IDs diferentes coexistem. Para o mesmo ID, update usa comparação otimista de revisão. Se a nuvem mudou após a revisão local conhecida, `syncConflicts` preserva payload local, payload remoto e revisão. A UI oferece **Usar deste dispositivo** ou **Usar da nuvem**. Sessão de treino local ativa nunca é substituída no meio da execução; divergência vira conflito.

## Bootstrap local

Instalação vazia ativa sync e baixa a conta. Dados existentes vinculados exibem contagens de perfis, treinos, registros e progresso. Somente **Sincronizar meus dados** gera a outbox inicial. Nenhum lado é apagado antes do upload; depois do push ocorre pull/merge.

## Multi-tab

`navigator.locks` permite um sync por origin. Se outra aba possui o lock, a fila permanece no IndexedDB compartilhado; `BroadcastChannel` acorda abas sem formar loop de mensagens. Há fallback seguro quando essas APIs não existem. Realtime pode acordar várias abas, mas o lock continua impedindo workers concorrentes; a aba que não obteve lock recebe o anúncio da conclusão e atualiza sua UI a partir do IndexedDB compartilhado.

## Status

Estados visíveis: **Sincronizado**, **Sincronizando…**, **Offline · N alterações pendentes**, **Erro de sincronização** e **Conflito**. Erros sempre informam que os dados continuam salvos no dispositivo.

## Escopo

Sincronizam as 14 entidades estruturadas e `media_metadata`. Para mídia, o engine envia o objeto privado antes da metadata e remove o objeto antes do tombstone. Avatares e fotos permanecem local-first; o cache lazy é descrito em `MEDIA_SYNC.md`. `foods`, `recipes`, `diaryEntries` legado e OCR nunca entram no engine. Backup manual continua independente e mantém formato v7.

Uma instalação vazia só libera a aplicação depois do primeiro pull concluído. Se nunca foi preparada e estiver offline, mostra a necessidade de uma conexão inicial em vez de piscar onboarding. Bootstrap com dados locais é idempotente, inclui fotos depois dos perfis e pode ser retomado porque cada operação permanece na outbox até confirmação.
