# Acompanhamento corporal

## Registros

`ProgressRecord` representa uma observação no tempo. Campos centrais: `profileId`, `localDate`, `occurredAt`, origem, peso opcional, medidas opcionais, nota e auditoria. Peso aceita decimal com ponto ou vírgula; valores não finitos, não positivos ou evidentemente inválidos são rejeitados.

Medidas suportadas: cintura, abdômen, peito/tórax, quadril, pescoço, braços, coxas, panturrilhas e percentual de gordura informado manualmente. Um check-in pode ser parcial e conter somente peso, algumas medidas, uma foto ou uma observação.

## Tendência de peso

A tendência compara a média dos últimos sete dias com os sete anteriores. Cada janela exige ao menos dois registros. Diferença absoluta inferior a 0,15 kg é apresentada como estável; com dados insuficientes, a aplicação explica que ainda não calcula tendência.

Esse limiar é de apresentação e não tem significado clínico. A meta opcional vem de `UserProfile.targetWeightKg` e é apenas uma linha de referência.

## CRUD e ownership

Leitura, edição e exclusão sempre exigem `profileId`. Excluir um check-in remove transacionalmente o registro, metadados de foto vinculados e blobs correspondentes. Registros manuais são removidos isoladamente.

