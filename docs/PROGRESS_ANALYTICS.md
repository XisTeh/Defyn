# Analítica de progresso

## Nutrição

Entradas do diário são agrupadas por `date`. Somente dias com uma ou mais entradas participam das médias. O alvo é o `NutritionTargetSnapshot` vigente ao meio-dia da data local, preservando mudanças históricas de ficha. São calculadas média calórica, diferença para meta, médias de macros e dias que atingiram proteína.

## Hidratação

Eventos são somados por `localDate`. A meta usa a configuração de hidratação do perfil e o peso corporal mais recente conhecido naquela data, com fallback para o peso atual da ficha. Dias sem água não são tratados como zero.

## Treinos

Sessões concluídas fornecem frequência, duração, séries e aderência à agenda do plano ativo. Volume convencional soma carga × repetições somente para kg ou lb, mantendo unidades separadas. Recordes por exercício incluem melhor carga, repetições e volume observados, sem afirmar recorde absoluto quando o histórico é parcial.

## Insights

`buildInsights` usa somente resultados das funções puras e retorna no máximo quatro mensagens: tendência de peso, dias nutricionais, hidratação média e treinos concluídos. Ausência de dados gera orientação neutra, nunca punição, prescrição ou conclusão clínica.

