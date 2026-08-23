# DEFYN

DEFYN é um aplicativo pessoal, local-first e responsivo para treinos e acompanhamento diário. Uma instalação suporta várias pessoas com metas, hidratação, fichas, sessões, peso, medidas e fotos isolados, sem conta, servidor ou sincronização.

## Funcionalidades

- dashboard Hoje priorizando treino, hidratação, metas nutricionais, resumo manual e progresso;
- Diário por data com síntese nutricional opcional, água, treinos e registros corporais;
- metas de TMB, GET, calorias, proteína, carboidratos, gorduras e água;
- perfil de treino, 52 exercícios-base, exercícios próprios, fichas versionadas e agenda;
- sessão persistente com séries, cargas, timer, histórico e progressão determinística;
- progresso de peso, medidas, fotos, treino, hidratação e médias por campo informado;
- IndexedDB v6, backup JSON v6 compatível com backups v1–v5 e PWA offline;
- atualização PWA automática e imediata após deploy, sem confirmação do usuário.

Catálogo de alimentos, receitas, planejamento alimentar, OCR e diário por refeições foram descontinuados na Etapa 07. Os stores legados continuam fisicamente preservados e seguem no backup, mas não são carregados pela interface principal.

## Tecnologias

React 19, TypeScript, Vite, Dexie/IndexedDB, `vite-plugin-pwa`, Vitest e ESLint. Não há backend, OCR ou biblioteca de UI.

## Execução e qualidade

Requer Node.js 20.19+ ou 22.12+ e npm 10+.

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Estimativas são pontos de partida configuráveis, não diagnóstico ou prescrição médica.
