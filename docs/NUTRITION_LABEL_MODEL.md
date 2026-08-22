# Modelo de tabela nutricional

`Food.nutritionLabel` é um campo opcional, aditivo e versionado. Alimentos antigos continuam válidos com apenas `Food.nutrients`.

## Estrutura

`NutritionLabel` registra porções por embalagem, porção declarada, texto bruto e uma lista de colunas. Cada coluna informa tipo (`amount` ou `daily-value`), base em g/ml, origem (`explicit` ou `derived`), valores, `%VD` e estado por célula (`confirmed`, `probable`, `review` ou `missing`).

O conjunto principal inclui kcal, kJ, carboidratos, açúcares totais/adicionados, proteínas, gorduras totais/saturadas/trans, fibra e sódio. `NutrientValues.other` mantém o modelo extensível para micronutrientes sem nova quebra de schema.

## Regra de cálculo

Uma coluna explícita de 100 g/ml é sempre a base canônica. Se ela não existir, o DEFYN deriva 100 g/ml da porção declarada e identifica coluna e base como derivadas. Valores impressos nunca são recalculados nem sobrescritos: isso preserva os arredondamentos do fabricante.

Toda quantidade consumida usa `nutritionForAmount(base, baseAmount, requestedAmount)`, que escala o conjunto completo, inclusive mg, kJ e nutrientes extensíveis. Campos ausentes permanecem `undefined`; somente um zero realmente lido ou informado é zero.

Validações de energia/macros e proporcionalidade entre colunas geram avisos e estado de revisão. Elas não corrigem dados silenciosamente.
