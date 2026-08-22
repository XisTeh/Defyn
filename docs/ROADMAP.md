# Roadmap

## Concluído — etapas 01, 02 e 03

- motor nutricional e modelos históricos;
- PWA local-first;
- múltiplos perfis e seleção persistida;
- shell desktop/mobile;
- dashboard Hoje com agregação real;
- hidratação por perfil e dia, com edição/exclusão;
- IndexedDB v2 e migration segura;
- backup/restauração JSON transacional;
- gestão de perfis e documentação/testes.
- catálogo de alimentos, porções, favoritos e OCR local revisado;
- diário completo por data/refeição, receitas e refeições favoritas;
- planejamento determinístico e hidratação por ritmo;
- foto de perfil/mídia local, IndexedDB v3 e backup v2.

## Concluído — etapa 04

- perfil e dados de treino isolados por pessoa;
- biblioteca inicial, favoritos, exercícios próprios e fallbacks;
- fichas versionadas, presets determinísticos de 1–6 dias e agenda semanal;
- execução mobile, séries/cargas, timer por timestamp, retomada, substituição e histórico;
- dupla progressão conservadora, integração no Hoje, IndexedDB v4 e backup v3.

## Concluído — etapa 05

- peso, medidas e check-ins parciais com CRUD e tendência de sete dias;
- fotos locais otimizadas, categorias e comparação antes/depois sem IA;
- agregações históricas reais de nutrição e hidratação sem transformar ausência em zero;
- frequência, duração, séries, volume convencional e evolução por exercício;
- IndexedDB v5, backup v4 e compatibilidade com v1/v2/v3.

## Concluído — etapa 06

- manifest/ícones instaláveis, orientação iOS e atualização sem interromper treino ativo;
- estratégia central de câmera, notificações, wake lock, compartilhamento, standalone e armazenamento;
- câmera/galeria, prévia, etapas locais e revisão reforçada no OCR;
- fotos corporais mobile, sessão de academia persistente e recursos opt-in;
- chunks lazy, precache documentado, testes de capacidades e matriz de QA responsivo.

## Concluído — etapa 06.1 Mobile Rescue

- shell mobile com bottom nav estável, safe areas, sheets, foco e detecção de teclado virtual;
- fotos de perfil/corpo/rótulo com câmera e galeria separadas, prévia e confirmação;
- OCR local com rotação, recorte, contraste opcional, worker reutilizado e parser multicoluna;
- Hoje, Diário, Ficha, Progresso e Treinos compactados sem regressão desktop;
- QA real em 320/360/375/390/430, tablets e desktop 1280/1920, sem overflow horizontal.

## Concluído — etapa 06.2 Mobile UX Rebuild

- bottom nav removida e substituída por drawer lateral completo, acessível e rolável;
- controles críticos padronizados e cabeçalhos mobile alinhados;
- OCR reorganizado para câmera, galeria ou manual antes de revelar o formulário;
- sheet do Diário reconstruído para busca, seleção, quantidade, macros e CTA;
- Home de Treinos com cinco estados operacionais, cards completos e sessão mais direta;
- QA em 320/360/375/390/430 e 1280/1440/1920 sem regressão desktop.

## Concluído — etapa 06.3 QA mobile físico

- perfil/avatar como único acionador do drawer e lista de perfis organizada com scroll independente;
- sheet OCR com body rolável e CTA persistente em galeria e câmera;
- ações do editor de ficha horizontais e controles de reordenação com alvo de toque consistente;
- sessão avulsa iniciável em dia de descanso sem alterar cronograma ou aderência planejada;
- regressão em telefones de 320–430 px, tablet, desktop e smoke offline do build de produção.

## Próxima grande etapa

Recomendação: **DEFYN 07 — Rotina, agenda e lembretes inteligentes**. Calendário, rotinas e lembretes devem respeitar as limitações documentadas de execução em segundo plano. Scanner de código de barras, sincronização e integrações externas continuam posteriores.
