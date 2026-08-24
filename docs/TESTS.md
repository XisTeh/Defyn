# Testes

Vitest cobre regras de domínio, casos de uso, migrations, backup, PWA e contratos de navegação. A suíte é determinística: datas relevantes são fixadas nos testes e não há dependência de rede ou dados reais do usuário.

Cobertura de integridade inclui perfis e isolamento, hidratação, resumo diário, rotina, sono, treino, descanso, progresso, fotos, backup/restauração, migrations v2–v7 e atualização PWA segura.

O patch 1.0.1 acrescenta cobertura para reset de todas as coleções locais, exportação válida após reset e contrato do Planejamento habitual: sete colunas sem scroll em desktop e rolagem preservada em telas estreitas.

## Validação de release

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

O QA físico complementar não usa nem apaga dados reais: siga `PHYSICAL_DEVICE_CHECKLIST.md` em um perfil de teste ou com operações não destrutivas.
