# Biblioteca de exercícios

O catálogo publicado possui **244 exercícios de uso frequente**, cobrindo peitoral, costas/dorsais, lombar, trapézio, deltoides, manguito rotador, braços, quadríceps, posteriores, glúteos, panturrilhas, adutores e core.

As variações são itens independentes para preservar histórico e carga próprios. O catálogo diferencia barra, barra W, trap bar, halteres, kettlebell, máquina, polia, Smith, landmine, leg press, peso corporal, elástico, fita de suspensão, argolas, medicine ball, bola suíça, roda abdominal, anilha, step, trenó e corda naval. Os 52 IDs originais foram preservados para manter fichas e históricos existentes compatíveis.

Cada `Exercise` possui nome normalizado, músculo principal/secundários, equipamentos, padrão de movimento, lateralidade, instruções curtas, métrica e referências opcionais de mídia.

## Imagens e fallbacks

Cada um dos 244 exercícios publicados possui seu próprio arquivo PNG, correspondente ao nome, movimento e equipamento. As miniaturas usam anatomia em tons de cinza, equipamento grafite e músculo principal em coral discreto. Não há reutilização de uma miniatura entre exercícios diferentes nem hotlink. `thumbnailMediaId` e `imageMediaId` continuam disponíveis para exercícios próprios.

## Exercícios próprios e favoritos

Exercícios próprios são persistidos em `exercises` com `isCustom` e `ownerProfileId`; outro perfil não os consulta. Favoritos ficam em `exerciseFavorites` com índice único `[profileId+exerciseId]`. Busca considera nome, rótulo do músculo e rótulo do equipamento; filtros incluem músculo, equipamento, favoritos e próprios.

O catálogo DEFYN e suas ilustrações estáticas são código do produto e não entram no backup. Somente exercícios próprios e suas referências pessoais são exportados. Nenhuma mídia externa foi incorporada, portanto não há licença de terceiros a declarar. Consulte `EXERCISE_ASSETS.md` para a matriz das ilustrações originais.
# Integração com a sessão

O detalhe do exercício pode ser aberto pela imagem no Modo Academia. Substituições filtram padrões musculares compatíveis e alteram somente o snapshot daquela sessão. Exercícios próprios continuam isolados pelo perfil.
