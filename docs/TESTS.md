# Testes

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
