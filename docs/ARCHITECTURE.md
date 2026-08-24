# Arquitetura

```text
React UI (features / app)
          ↓
Application (casos de uso)
          ↓
Domain (regras e contratos)
          ↓
Repositories
          ↓
IndexedDB / Dexie

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

Stores de alimentos, receitas e diário por refeições são legado isolado: participam apenas de migrations, backup/restauração e exclusão explícita de perfil, sem rota nem módulo React ativo.

## PWA

Vite carrega Diário, Treinos, Progresso, Rotina e Backup por chunks. Workbox precacheia shell, chunks, CSS, fontes, ícones e 52 miniaturas de exercícios; nunca mídia pessoal. `autoUpdate` ativa a versão nova sem prompt e o cliente só adia reload durante sessão de academia ou fluxo crítico marcado de rotina, instalação ou backup.
