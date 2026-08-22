# Testes

Os testes Vitest cobrem regras puras e casos de uso.

Estado atual após as correções 06.3: **185 testes em 35 arquivos**, todos aprovados. A entrega 06.2 tinha 178 testes; foram adicionados 7 testes para lock aninhado, acionador de perfil sem hamburger, lista de perfis sem duplicação, CTA/estrutura rolável do OCR, sessão manual sem mutação do plano, descanso com ação manual e footer horizontal do editor.

## Cobertura

- 29 testes originais de nutrição e porções;
- hidratação 30/35/40 ml/kg, manual, precisão e inválidos;
- criação de duas pessoas, troca/persistência do ativo, referência inválida e exclusão;
- água por perfil/dia, registro, edição e exclusão;
- agregação do dashboard sem misturar diário, target ou água;
- progresso consultado explicitamente por perfil;
- dia local e virada de data sem apagar histórico;
- backup válido, inválidos, versão e round-trip;
- migration v1 → v2 preservando perfil e definindo hidratação/ativo.
- parser brasileiro: vírgulas, porção, 100 g/ml, macros, fibra, açúcares, sódio, ausência e corrupção;
- busca normalizada, valores ausentes, porções inválidas e proportionalidade;
- diário: refeições padrão, adicionar, editar, mover, snapshot e isolamento perfil/dia;
- receitas: soma, rendimento, fração e inválidos;
- planejador: presets, restrições, indisponibilidade, determinismo e porção inviável;
- hidratação: janela, tolerância, estados, meta e checkpoints;
- mídia: referências/órfãos; migration v2 → v3; backups legados compatíveis.
- biblioteca e gerador de treino em 3/4/6 dias, academia/casa, evitados e determinismo;
- sessão: ownership, snapshot, início, registro/edição/remoção, descanso por timestamp, retomada, pulo, substituição e conclusão;
- dupla progressão, migration v3 → v4 e backup v1/v2 → v3 com round-trip de treinos.
- períodos locais, validação corporal e tendência por duas janelas de sete dias;
- nutrição por meta histórica, hidratação sem zeros inventados e volume de treino por unidade;
- migration v4 → v5 e backup v1/v2/v3 → v4 com validação de referências corporais e mídia.
- manifest de ilustrações: 52/52 exercícios-base com `exerciseId`, asset PNG lógico e pose únicos;
- capacidades de dispositivo, estados de instalação, pressão de armazenamento e decimal brasileiro;
- wake lock/notificação opt-in sem chamadas quando não suportados;
- política offline que aceita shell/chunks/OCR/miniaturas e rejeita mídia pessoal;
- mensagens de etapas OCR e fixture com colunas por porção/100 g ambíguas.
- parser OCR adicional: `100 g | porção | %VD`, desalinhamento, ponto decimal e campos parciais.
- drawer mobile: modo único, rotas completas, estado ativo e fechamento por navegação/overlay/Escape;
- entrada OCR: câmera traseira, galeria sem `capture` e estágios imagem/revisão/manual;
- cinco estados da Home de Treinos e seus CTAs operacionais;
- contrato do botão compartilhado para variantes, densidade e classes contextuais.
- lock de documento com múltiplos overlays sem liberação prematura;
- sessão avulsa em descanso preservando integralmente o plano e a agenda;
- estrutura do OCR com body rolável, footer persistente, safe area e `dvh`;
- contratos mobile de header/drawer e ações horizontais do editor de ficha.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

O QA manual complementa testes puros conforme `MOBILE_QA.md`, nos viewports 320/360/375/390/430, 768/820/1024 e 1280/1366/1440/1920. Câmera, instalação, safe areas, suspensão e notificação físicas ainda precisam ser conferidas em aparelho real.
