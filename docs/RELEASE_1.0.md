# DEFYN 1.0

## Patch 1.0.1

- Corrige o Planejamento habitual para distribuir os sete dias na largura disponível em desktop, sem barra de rolagem interna.
- Mantém a rolagem horizontal funcional apenas em tablet e celular, com a barra visual oculta.
- Adiciona reset local seguro em **Backup → Dados locais**. A confirmação exige `RESETAR`, limpa os dados transacionais do IndexedDB v7 e retorna ao onboarding, sem tocar nos arquivos estáticos/PWA.
- Mantém compatibilidade de banco e backup em v7.
- Validação automatizada: 201 testes.
- commit e data de publicação: preenchidos pela tag anotada `v1.0.1`.

## Release

- App: 1.0.1;
- IndexedDB: v7;
- backup: `defyn-backup` v7;
- validação: 197 testes automatizados, lint, TypeScript, build e auditoria de dependências de produção;
- commit e data de publicação original: preenchidos pela tag anotada `v1.0.0`.

## Núcleo entregue

Hoje, Diário manual, Rotina, hidratação, sono, Treinos, Modo Academia, Progresso, Ficha e metas, Perfis, Backup e PWA offline/local-first.

## Decisões de produto

Os dados são locais por padrão. Não há conta, backend, upload automático, analytics, sincronização ou prescrição médica. OCR nutricional, catálogo de alimentos, receitas e planejamento alimentar detalhado permanecem fora do produto.

## Limitações reais

- não há sincronização entre dispositivos;
- backup manual é responsabilidade da pessoa usuária;
- notificações, instalação, câmera, wake lock e segundo plano dependem de navegador e plataforma;
- não há integração automática com wearables ou serviços de saúde.

## Futuro opcional

Sincronização opcional, integrações de saúde, exportações adicionais e análises incrementais podem ser avaliadas em versões 1.x, sem compromisso de entrega.
