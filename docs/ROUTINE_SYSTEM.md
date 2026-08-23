# Sistema de rotina

A Rotina é semanal, local-first e isolada por `profileId`. Cada `RoutineDay` representa segunda a domingo e aceita horários opcionais de acordar, treino e dormir. Ausência permanece `undefined`; nunca é convertida em `00:00`.

O treino é referenciado por `workoutTemplateId`. Nome, foco e alterações continuam vindo da versão ativa da ficha, evitando cópias divergentes. O editor permite copiar uma configuração para dias selecionados, criando registros independentes por dia.

No Hoje, a rotina aparece em posição estável como contexto do dia. A hidratação usa os horários do dia quando disponíveis e recorre à configuração anterior do perfil somente como fallback. O Diário incorpora o sono real; Progresso calcula quantidade de dias e média apenas sobre registros existentes.

Persistência v7: `routineProfiles`, `routineDays`, `sleepRecords` e `reminderSnoozes`. A interface usa `RoutineService` e repositórios; não acessa IndexedDB diretamente.
