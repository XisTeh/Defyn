# Motores de estimativas

O domínio não depende de React.

## Nutrição

Métodos: Harris–Benedict original e Mifflin–St Jeor. GET é `TMB × fator`. Objetivos aceitam déficit, manutenção, superávit ou meta absoluta. Macros aceitam g/kg, valores absolutos ou configuração manual. Proteína/carboidrato usam 4 kcal/g; gordura, 9 kcal/g.

A interface recomenda Mifflin–St Jeor para perfis novos e apresenta Harris–Benedict original como método clássico; as duas opções continuam sendo estimativas. Os fatores preservados são leve 1,3, moderada 1,5 e alta 1,7, explicados por rotina total e não apenas por dias de academia.

O motor mantém precisão e rejeita números não finitos, medidas incoerentes, meta não positiva e carboidrato negativo. Arredondamento pertence à apresentação.

## Hidratação

`calculateHydrationTarget` aceita:

- estimativa por peso com presets 30, 35 ou 40 ml/kg;
- meta manual em mililitros.

O padrão migrado é 35 ml/kg, tratado explicitamente como estimativa configurável. Peso, ml/kg, meta manual e registros devem ser finitos e positivos. Alterar peso pode mudar TMB, macros por kg e água; a edição da ficha mostra novas prévias antes da confirmação e cria novo snapshot nutricional.

O ritmo diário é uma heurística do DEFYN: progresso esperado entre acordar/dormir com tolerância de `max(200 ml, 8% da meta)`. Estados: no ritmo, pouco/bem abaixo, acima, atingida e fora da janela. Não é prescrição nem regra clínica universal.

O motor calcula somente direção e metas. Não cria alimentos, refeições, cardápios ou recomendações.
