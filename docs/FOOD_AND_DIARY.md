# Alimentos e diário

## Catálogo

Alimentos são globais no dispositivo. Nome, marca, categoria e código alimentam `searchTextNormalized`; acentos, caixa e espaços não impedem busca. A origem (`manual`, `nutrition-label-ocr`, etc.) acompanha os números. Favorito é `FoodPreference` por perfil.

Porção base é a referência proporcional. Porções convenientes armazenam conversão explícita, por exemplo “1 fatia = 25 g”; nenhuma equivalência é inferida sem peso/volume informado. Nutrientes ausentes permanecem ausentes.

Antes de salvar, nome/marca e barcode são comparados com o catálogo. Semelhança não bloqueia: a pessoa pode usar o existente ou salvar mesmo assim.

## Diário

Ownership é `(profileId, localDate)`. A data é uma chave local `AAAA-MM-DD`, sem conversão UTC. Refeições padrão são criadas apenas quando ainda não há categorias; categorias extras podem ser adicionadas.

Ao adicionar alimento/receita, o DEFYN cria `ConsumedItemSnapshot` com nome, origem, versão, quantidade e nutrientes proporcionais. Edição do catálogo/receita não reescreve o passado. Quantidade é reescalada a partir do próprio snapshot; item pode ser movido e removido com undo.

O dashboard agrega somente o diário de hoje do perfil ativo. Favoritar refeição congela seus itens; “copiar ontem” replica uma refeição específica sem tocar em outras datas.

## Limites atuais

Código de barras pode ser digitado e consultado localmente. Scanner por câmera não é exibido porque ainda não há implementação confiável cross-browser. Não existe base externa de produtos.
