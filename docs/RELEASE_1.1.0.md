# DEFYN 1.1.0

## Destaques

- autenticação por e-mail/senha, confirmação e recuperação pelo Supabase Auth;
- isolamento local por conta e RLS remoto para as 15 tabelas atuais;
- sincronização local-first multi-dispositivo com outbox, pull incremental, retry, tombstones e resolução de conflitos;
- wake-up por Supabase Realtime, mantendo o Sync Engine como fonte de verdade;
- avatar e fotos de progresso em bucket privado, com cache Blob offline e download lazy;
- UUID v4 seguro em contextos sem `crypto.randomUUID()`, usando `crypto.getRandomValues()`;
- IndexedDB v8 aditivo e backup v7 compatível, sem reset de dados existentes.

## Segurança e escopo

O frontend recebe somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Não usa `service_role`, Secret Key, credencial administrativa nem bypass de RLS. Catálogo de alimentos, receitas, refeições detalhadas, favoritos alimentares, planejamento alimentar e OCR continuam fora do produto e do schema remoto; `nutrition_summaries` permanece por atender ao Diário manual atual.

## Validação

- RLS/Auth/Storage: matriz remota 34/34;
- sincronização D1/D2: matriz remota 16/16;
- mídia privada: matriz remota 10/10;
- QA físico local/LAN: confirmação de conta, recuperação de senha, bootstrap, sync PC ↔ celular sem reload, mídia, conflitos, logout e reset/rebuild.

Os gates finais de lint, TypeScript, 287/287 testes, build e audit de produção passaram antes do commit; o smoke da URL pública é executado depois do deploy. A aprovação definitiva de uso diário depende do checklist físico em Production no PC e no celular.
