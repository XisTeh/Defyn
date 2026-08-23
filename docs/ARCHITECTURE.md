# Arquitetura

O projeto separa composição (`app`), casos de uso (`application`), regras/contratos (`domain`), experiências React (`features`) e persistência (`infrastructure`).

## Fluxos ativos

- `TodayDashboard` combina target ativo, `DailyNutritionSummary`, água e treino do dia;
- `DailyTrackingWorkspace` consulta explicitamente um perfil e uma data;
- `ProgressService` agrega resumos, água, corpo e treino por período;
- `TrainingService` preserva ficha versionada, snapshots e sessão persistente;
- `BackupService` valida o envelope e o gateway transaciona todos os stores.

O módulo principal não instancia repositórios de alimentos, receitas ou diário por refeições. As tabelas legadas permanecem apenas no schema/migrations, backup e exclusão explícita do perfil. Fotos de perfil e progresso continuam usando a infraestrutura genérica de imagens.

## PWA

Vite gera chunks lazy para Diário, Treinos, Progresso e Backup. O Workbox precacheia shell, chunks, CSS, fontes, ícones e miniaturas de exercícios. Binários OCR não existem mais. `registerType: autoUpdate` ativa a versão nova sem prompt; o cliente adia somente o reload visual enquanto o Modo Academia estiver ativo.
