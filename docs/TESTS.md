# Testes

Etapa 09 adiciona cobertura de sono simples e cruzando meia-noite, média sem ausência como zero, janela silenciosa cruzando meia-noite, cooldown/snooze, meta de água, treino concluído/ativo, marcos 25/50/75/100 e importação de backup v6 para v7.

Vitest cobre domínio e casos de uso. A Etapa 07 mantém regressões de hidratação, perfis, treino, timer, progresso, fotos, backup e PWA, e adiciona:

- criação/edição de resumo por perfil e data;
- isolamento entre perfis e datas;
- campos opcionais e diferença entre zero/ausência;
- decimal brasileiro;
- médias independentes no Progresso;
- backup v6 e leitura compatível de backups antigos;
- migration aditiva v5 → v6;
- navegação sem áreas alimentares e política offline sem OCR.

Validação obrigatória:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

O QA visual complementa a suíte nos viewports descritos em `MOBILE_PWA.md` e confirma ausência de overflow horizontal, drawer utilizável, sessão de treino retomável e nenhuma confirmação manual de atualização.
# Cobertura da Etapa 08

Os testes cobrem sessão manual em descanso, prevenção de duplicata, retomada após nova instância, rascunho e conclusão no mesmo log, edição/remoção, timestamp de descanso, pulo, substituição, ordem temporária, finalização, cancelamento, snapshots de nome, progressão, recordes sem mistura de unidade e isolamento por perfil. O PWA testa ativação automática com reload protegido durante a sessão.
