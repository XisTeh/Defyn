# Roadmap

## V1.0 implementado

- Patch 1.0.1: planejamento habitual sem scrollbar em desktop e reset local seguro por dispositivo, com backup v7/IndexedDB v7 preservados.

- Perfis locais isolados, metas, hidratação e PWA offline;
- resumo nutricional manual diário, sem catálogo alimentar na interface;
- treino completo e Modo Academia com retomada, descanso e histórico;
- progresso corporal, medidas, fotos locais e tendências explicáveis;
- rotina semanal, sono factual e lembretes locais opt-in;
- backup v7 transacional e atualização PWA automática segura;
- hardening, validação de mídia, acessibilidade de diálogos e QA automatizado (Etapa 10).

## V1.1 implementado

- 1.1A: cliente Supabase central, Auth, schema remoto, ownership, RLS e storage privado, validados pela matriz remota 34/34.
- 1.1B: IndexedDB v8, outbox persistente, bootstrap guiado, push/pull incremental, retry/idempotência, tombstone, conflitos, status e treino offline multi-device.
- 1.1C: mídia privada local-first, cache offline lazy, bootstrap/primeiro dispositivo, reset/restore seguros e wake-up Realtime. Retenção/GC agressivo e exclusão de conta cloud continuam decisões separadas.

## Futuro opcional

Melhorias incrementais de agenda e lembretes locais podem evoluir dentro dos limites de execução em segundo plano do navegador.

## Fora de escopo atual

Integrações externas, scanner/OCR, IA, diagnóstico médico e recomendações clínicas permanecem fora do escopo. A 1.1.0 sincroniza apenas avatar e fotos de progresso pessoais.
