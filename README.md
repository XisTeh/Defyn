# DEFYN

DEFYN é um aplicativo pessoal, local-first e responsivo para alimentação, hidratação e acompanhamento de treinos. Uma instalação mantém várias pessoas com metas, diário, fichas, cargas, fotos e históricos isolados, sem conta, servidor, IA remota ou sincronização.

A interface adota uma base neutra inspirada no Puzoto Design: conteúdo cinza-claro, navegação em preto técnico, painéis translúcidos, linhas arquitetônicas e cartões escuros de alto contraste. Cores semânticas identificam macros, hidratação, estados e alertas. A influência greco-espartana e vikinga aparece de forma discreta em escudos, anéis, proporção e geometria, com componentes próprios acessíveis.

## Funcionalidades atuais

- múltiplos perfis locais e seletor de perfil ativo persistido;
- dashboard Hoje com metas, consumo real do diário e hidratação;
- catálogo compartilhado de alimentos, busca normalizada, porções e favoritos por perfil;
- captura de rótulo e OCR português totalmente local, sempre com revisão humana;
- diário por data/refeição, snapshots, edição, movimento, remoção com undo e cópia de ontem;
- receitas, refeições favoritas e planejamento determinístico de metas;
- foto de perfil e mídia otimizada no IndexedDB;
- ritmo de hidratação pela janela acordado, com tolerância e checkpoints;
- registro, edição e exclusão de água por dia local;
- ficha nutricional reutilizada para criar e editar perfis;
- snapshots históricos de metas;
- gestão e exclusão transacional de dados por perfil;
- backup JSON v4 com mídia necessária e importação compatível com v1/v2/v3;
- PWA com funcionamento offline;
- instalação contextual Android/iOS, atualização segura durante treino e indicador real de conexão;
- câmera/galeria separadas, OCR local revisado e retenção opcional da foto do rótulo;
- wake lock e alertas de descanso opt-in quando suportados;
- módulos pesados carregados por demanda e diagnóstico de armazenamento no backup;
- progresso corporal completo com peso, medidas, check-ins, fotos locais, tendências e comparações;
- agregações reais de nutrição, hidratação e treino, com dias não registrados preservados como ausência de dado;
- perfil de treino, biblioteca com 52 exercícios, favoritos e exercícios próprios por pessoa;
- fichas versionadas, agenda semanal e gerador determinístico de 1 a 6 dias;
- treino do dia, sessão mobile, séries/cargas, descanso por timestamp, histórico e progressão sugerida;
- IndexedDB v5 com migration aditiva e fotos de progresso isoladas por perfil.

## Tecnologias

React 19, TypeScript, Vite, Dexie/IndexedDB, `vite-plugin-pwa`, Tesseract.js 7, Vitest e ESLint. Não há backend ou biblioteca de UI.

## Requisitos e execução

- Node.js 20.19+ ou 22.12+
- npm 10+

```bash
npm install
npm run dev
```

## Qualidade e produção

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

## Estrutura

```text
src/
  app/              composição, sessão e navegação
  application/      perfis, dashboard, hidratação e backup
  domain/           regras, entidades e contratos puros
  features/         shell e experiências funcionais
  infrastructure/   IndexedDB v5, migrations e gateways
  shared/           tokens, datas locais e utilitários
docs/                decisões técnicas reais
templates/           referências visuais sem uso em runtime
```

Os detalhes de mobile, capacidades, OCR, cache e QA ficam em `docs/MOBILE_PWA.md`, `docs/DEVICE_CAPABILITIES.md`, `docs/OCR_PIPELINE.md`, `docs/OFFLINE_STRATEGY.md` e `docs/MOBILE_QA.md`.

Código de barras por câmera, notificações confiáveis em segundo plano, recomendações médicas e sincronização continuam fora do escopo. Estimativas e sugestões não constituem prescrição.
