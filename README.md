# DEFYN

DEFYN 1.1.0 é um aplicativo pessoal, local-first e responsivo para treino e acompanhamento diário. A versão inclui Auth, isolamento por conta, sincronização estruturada, wake-up Realtime e mídia privada entre dispositivos, mantendo o IndexedDB como armazenamento operacional.

## Recursos

- Hoje, Diário manual, hidratação, rotina e sono;
- fichas, biblioteca de exercícios e Modo Academia com retomada e descanso;
- progresso de peso, medidas e fotos locais-first com cópia privada sincronizada;
- perfis, metas e backup/restauração transacional;
- PWA instalável, offline e com atualização automática segura.

OCR nutricional, catálogo de alimentos, receitas e planejamento alimentar detalhado foram removidos deliberadamente. Dados legados só permanecem para compatibilidade de IndexedDB e backup.

## Stack

React 19, TypeScript, Vite, Dexie/IndexedDB, Supabase JS, `vite-plugin-pwa`, Vitest e ESLint.

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:rls:remote
npm run test:sync:remote
npm run test:media:remote
npm run build
npm run preview
npm audit --omit=dev
```

Copie `.env.example` para `.env.local` somente quando quiser validar Auth. Sem as duas variáveis, o app permanece no modo local atual. Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` válidas, o gate de e-mail/senha é ativado. Nunca use chave secreta, service role, senha do banco ou JWT signing secret em variável `VITE_*`.

## Dados, privacidade e recuperação

O IndexedDB continua sendo o armazenamento operacional. Toda mutação é confirmada localmente e entra numa outbox persistente; o sync envia depois e recupera alterações por cursor incremental. Dados locais preexistentes só entram na nuvem após **Sincronizar meus dados**. Exporte backups regularmente: sincronização não substitui uma cópia independente.

Para recuperar dados, abra **Backup**, escolha um JSON exportado pelo DEFYN, revise a confirmação e restaure. O backup continua v7; ele é independente da versão do app (1.1.0) e do schema IndexedDB (v8). Stores técnicas de sync não entram no JSON.

Avatar e fotos de progresso usam o bucket privado `defyn-media`, cache Blob offline e download lazy. Consulte `docs/MEDIA_SYNC.md`.

Em **Backup → Dados deste dispositivo**, a limpeza apaga somente este navegador após confirmação digitada e nunca chama exclusão cloud. Pendências são destacadas antes da ação.

## PWA

O app pode ser instalado pelo navegador e abre offline após o primeiro carregamento. Atualizações de deploy são aplicadas automaticamente quando não há sessão ou formulário crítico aberto. Notificações, instalação e execução em segundo plano dependem do navegador e do sistema.

Consulte [configuração do Supabase](docs/SUPABASE_SETUP.md), [autenticação](docs/AUTHENTICATION.md), [segurança](docs/SUPABASE_SECURITY.md), [arquitetura de sync](docs/SYNC_ARCHITECTURE.md), [engine de sync](docs/SYNC_ENGINE.md), [visão do projeto](docs/PROJECT_OVERVIEW.md) e [backup](docs/BACKUP_AND_RESTORE.md).
