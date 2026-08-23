# QA final — Etapa 10

## Ambiente e verificações automatizadas

- `npm run lint`: aprovado;
- `npm run typecheck`: aprovado;
- `npm run test`: aprovado (197 testes);
- `npm run build`: aprovado;
- `npm audit --omit=dev`: 0 vulnerabilidades de produção.

## Integridade e privacidade

- backup v7 validado antes da transação; referências de perfil, treino, progresso e mídia são verificadas;
- teste de round-trip exportar → serializar → restaurar cobre dados estruturados; teste adicional recusa mídia SVG/data URL não permitido;
- mídia permanece local, com JPEG/PNG/WebP aceitos no backup;
- troca de perfil é interrompida se o perfil atual tiver treino ativo;
- nenhum serviço remoto, segredo ou telemetria foi adicionado.

## PWA e acessibilidade

- worker é `autoUpdate`, sem banner ou confirmação manual;
- atualização aguarda sessão de academia, diálogos de rotina, instalação iOS e backup/restauração críticos;
- o observador acompanha remoção do bloqueador e aplica o update pendente após encerramento seguro;
- diálogos de rotina, modo academia e instalação iOS têm foco inicial, Tab cíclico, Escape, retorno de foco e bloqueio de rolagem;
- componentes nativos de arquivo permanecem visualmente ocultos e são acionados por controles do design system.

## Limite de QA manual

Não há navegador físico conectado a este ambiente de automação. A validação manual de câmera, instalação iOS/Android, interrupção real durante upload e resize físico deve ser executada nos dispositivos-alvo antes de uma certificação operacional final.
