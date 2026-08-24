# DEFYN

DEFYN 1.0 é um aplicativo pessoal, local-first e responsivo para treino e acompanhamento diário. Cada instalação suporta múltiplos perfis isolados, sem conta, backend ou sincronização automática.

## Recursos

- Hoje, Diário manual, hidratação, rotina e sono;
- fichas, biblioteca de exercícios e Modo Academia com retomada e descanso;
- progresso de peso, medidas e fotos locais;
- perfis, metas e backup/restauração transacional;
- PWA instalável, offline e com atualização automática segura.

OCR nutricional, catálogo de alimentos, receitas e planejamento alimentar detalhado foram removidos deliberadamente. Dados legados só permanecem para compatibilidade de IndexedDB e backup.

## Stack

React 19, TypeScript, Vite, Dexie/IndexedDB, `vite-plugin-pwa`, Vitest e ESLint.

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

## Dados, privacidade e recuperação

Os dados e fotos ficam no dispositivo. Não há upload automático, analytics ou backend. Exporte backups regularmente em **Backup** e guarde o JSON em local seguro; a importação substitui os dados locais somente depois de validação integral.

Para recuperar dados, abra **Backup**, escolha um JSON exportado pelo DEFYN, revise a confirmação e restaure. O backup atual é v7; ele é independente da versão do app (1.0.0) e do schema IndexedDB (v7).

## PWA

O app pode ser instalado pelo navegador e abre offline após o primeiro carregamento. Atualizações de deploy são aplicadas automaticamente quando não há sessão ou formulário crítico aberto. Notificações, instalação e execução em segundo plano dependem do navegador e do sistema.

Consulte [visão do projeto](docs/PROJECT_OVERVIEW.md), [backup](docs/BACKUP_AND_RESTORE.md), [release 1.0](docs/RELEASE_1.0.md) e o [checklist físico](docs/PHYSICAL_DEVICE_CHECKLIST.md).
