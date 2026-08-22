# Modelo de dados

Entidades persistidas usam IDs estáveis, datas ISO serializáveis e auditoria.

## Ownership

| Escopo global | Escopo de perfil |
| --- | --- |
| `Food`, `Recipe`, catálogo DEFYN de `Exercise`, `LocalMedia` necessário | `NutritionTargetSnapshot`, `DiaryEntry`, `MealCategory`, `FavoriteMeal`, `FoodPreference`, `WaterEntry`, `ProgressRecord`, `ProgressPhotoMetadata`, `TrainingProfile`, exercícios próprios, favoritos, planos, sessões e séries |

Todo dado pessoal possui `profileId`. As consultas de repositories também exigem esse identificador.

## Perfil

`UserProfile` contém ficha metabólica, objetivo, atividade, macros, `NutritionPlanningPreferences`, `HydrationConfiguration`, `HydrationRoutine` e referência opcional de avatar. Alergias, intolerâncias, restrições, evitados e “não gosto” são listas distintas e opcionais.

## Alimentos e porções

`Food` é global, inclui origem, `nameNormalized`, texto de busca, porção declarada, porções explícitas, nutrientes opcionais e referências de imagem/rótulo. `nutritionLabel` opcional preserva porções por embalagem, porção declarada, colunas originais de 100 g/ml, porção, `%VD`, origem/estado das células e base canônica. O conjunto aceita kcal/kJ, macros, açúcares, gorduras, fibra, sódio e nutrientes adicionais extensíveis. Ausente permanece `undefined`; zero significa valor conhecido como zero. `FoodPreference` é por perfil.

## Receitas e refeições favoritas

Receita guarda ingredientes e snapshot nutricional de total/porção. Refeição favorita guarda um conjunto de snapshots e pertence a um perfil.

## Mídia

`LocalMedia` guarda kind, ownership, MIME, dimensões, bytes e Blob. Avatares são limitados a 512 px; rótulos, a 1600 px. Remoção de perfil/foto remove blobs relacionados.

## Hidratação

`WaterEntry` representa um evento, não um total mutável: `profileId`, `occurredAt`, `localDate` e `amountMl`. O total diário é sempre agregado. `localDate` preserva a intenção do dia local e fornece índice confiável.

## Histórico

Targets preservam entrada e resultado por período. Itens consumidos congelam quantidade e nutrientes no `ConsumedItemSnapshot`, evitando alterações retroativas quando alimento ou receita é corrigido.

O envelope de backup contém todas as coleções persistentes e a preferência de perfil ativo.

## Progresso corporal e fotos

`ProgressRecord` possui data local, instante, origem (`manual`, `check-in`, migration ou integração futura), peso opcional, medidas parciais e nota. `ProgressPhotoMetadata` possui categoria, referência opcional a `LocalMedia` e vínculo opcional ao check-in. Os campos legados `date` e `angle` são aceitos apenas na cadeia de migração.

IndexedDB v5 indexa `[profileId+localDate]` em registros e fotos, além de categoria, mídia e check-in. A migration v4 → v5 deriva data local e categoria sem apagar peso, medidas ou referências antigas.

## Treinos

`TrainingProfile` descreve objetivo, experiência, dias, duração, local, equipamentos e unidades. `WorkoutPlan` guarda versões de templates; prescrições referenciam exercício e configuram séries, faixa, carga, descanso e notas sem duplicar o catálogo.

Templates aceitam nome livre. `WorkoutSession` congela a versão, o nome do treino e snapshots mínimos dos exercícios; renomear a ficha afeta sessões futuras, nunca o histórico. `WorkoutSetLog` preserva nome, alvo, carga/unidade, reps ou segundos, RIR opcional, conclusão e timestamps. Consultas pessoais exigem `profileId` mesmo quando também recebem `sessionId` ou `exerciseId`.
