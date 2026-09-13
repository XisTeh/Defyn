# Arquitetura

```text
React UI (features / app)
          ↓
Application (casos de uso)
          ↓
Domain (regras e contratos)
          ↓
Repositories
          ↓ (entidade + outbox, mesma transação)
IndexedDB / Dexie v9
          ↓
Sync Engine → Supabase PostgreSQL/RLS

PWA e service worker operam em paralelo ao shell do navegador.
```

O projeto separa composição (`app`), casos de uso (`application`), regras e contratos (`domain`), interface React (`features`) e persistência (`infrastructure`). A interface não consulta IndexedDB diretamente.

## Fluxos ativos

- Hoje combina metas, resumo diário, água, rotina e treino;
- Diário grava somente `DailyNutritionSummary` manual por perfil e data;
- Rotina persiste horários, sono e preferências de lembrete por perfil;
- Treino preserva fichas versionadas, snapshots, sessões e séries;
- Progresso agrega registros corporais, fotos, hidratação, treino e resumo manual;
- Backup valida o envelope e restaura todos os stores em transação.

Stores IndexedDB de alimentos, receitas e diário por refeições são legado isolado: participam apenas de migrations locais, backup/restauração e exclusão explícita de perfil, sem rota nem módulo React ativo. Eles não possuem tabelas Supabase e não entrarão no sync.

## Sincronização e mídia 1.1.1

```text
Dispositivo A: React → repositories → IndexedDB v9
                                 ↕ Sync Engine
                    Supabase Auth + PostgreSQL/RLS
                                 ↕ Sync Engine
Dispositivo B: React → repositories → IndexedDB v9
```

`infrastructure/supabase` é o único ponto que cria o cliente. `application/auth` mantém o contrato e o estado de sessão fora de `App.tsx`. Sem configuração, `AuthBoundary` entrega o app local atual; com URL e Publishable Key válidas, exige sessão. Configuração parcial falha com uma mensagem controlada.

Os repositories continuam sendo a única dependência da UI. Gravações sincronizáveis persistem entidade e outbox na mesma transação. O coordinator faz push ordenado, pull incremental, retry e resolução de conflito fora dos módulos de produto. Assim, treino ativo, diário, hidratação e demais operações continuam independentes de conexão.

Antes de montar `App`, o gate de Auth resolve o ownership da instalação. A ordem é `sessão → owner local → App/repositories`; estados pendente, legacy não confirmado, owner divergente ou erro nunca renderizam o conteúdo. Isso protege duas contas usadas no mesmo navegador sem transformar IndexedDB em armazenamento remoto.

Uma instalação vazia faz pull inicial antes de montar o app. Dados estruturados locais preexistentes exigem confirmação explícita; o bootstrap gera a outbox, envia pais antes dos filhos e só então faz pull/merge. `navigator.locks` serializa execuções entre abas e `BroadcastChannel` acorda as demais sem criar loops.

## PWA

Vite carrega Diário, Treinos, Progresso, Rotina e Backup por chunks. Workbox precacheia shell, chunks, CSS, fontes, ícones e 242 miniaturas de exercícios; nunca mídia pessoal. `autoUpdate` adia reload durante sessão de academia, bootstrap, sync crítico, conflito ou fluxos críticos já existentes.

Mídia segue `Blob local → outbox media_metadata → Storage privado → metadata remota`. No recebimento, metadata chega pelo pull incremental; avatar baixa primeiro, fotos recentes em background limitado e histórico sob demanda. O dashboard nunca aguarda foto histórica. Validação de assinatura/MIME acontece tanto no upload quanto no download.
