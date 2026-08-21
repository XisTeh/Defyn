# Planejador alimentar

## O que faz

Recebe meta calórica/macros ativa, número/horários de refeições, catálogo e restrições informadas. Retorna alvos aproximados por refeição, alimentos compatíveis, excluídos, avisos e metadados explicativos. Tudo é puro, determinístico e offline.

Presets DEFYN:

- `balanced`: mesma razão por refeição;
- `main-meals-larger`: reserva fração maior para almoço/jantar;
- personalizado está modelado para evolução, mas a interface atual expõe os dois presets seguros.

Energia e macros usam a mesma razão; valores internos preservam precisão e a interface arredonda. Sugestão proporcional é recusada fora do intervalo de porções razoáveis configurado no algoritmo.

## Restrições

Prioridade é excluir compatibilidades textuais detectadas nas listas fornecidas pela pessoa e nos allergens/tags do alimento. Alergia, intolerância, restrição, evitado e “não gosto” não são mesclados no perfil. Como o catálogo pode ter metadados incompletos, o filtro é aviso/apoio e não garantia médica.

## Limitações

Não prescreve dieta, não diagnostica, não avalia qualidade quando faltam fibra/sódio/açúcar/gordura saturada, não inventa alimento e não promete fechar metas exatamente. A interface usa “meta”, “aproximadamente” e “sugestão”. Não há IA ou chamada externa.
