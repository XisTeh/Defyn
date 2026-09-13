# Biblioteca de exercícios

O catálogo possui **332 exercícios**, cobrindo peitoral, costas/dorsais, lombar, trapézio, deltoides, braços, quadríceps, posteriores, glúteos, panturrilhas, tibial anterior, flexores do quadril, adutores, core, pescoço e corpo inteiro.

As variações são itens independentes para preservar histórico e carga próprios. O catálogo diferencia barra, barra W, trap bar, halteres, kettlebell, máquina, polia, Smith, landmine, leg press, peso corporal, elástico, fita de suspensão, argolas, medicine ball, bola suíça, roda abdominal, anilha, step, trenó e corda naval. Os 52 IDs originais foram preservados para manter fichas e históricos existentes compatíveis.

Cada `Exercise` possui nome normalizado, músculo principal/secundários, equipamentos, padrão de movimento, lateralidade, instruções curtas, métrica e referências opcionais de mídia.

## Imagens e fallbacks

Os 52 exercícios originais têm miniaturas PNG do DEFYN, mapeadas por `exerciseId` em `src/assets/exercises/exercise-media.ts`. Elas usam corpo/equipamento em grafite e o músculo principal em coral discreto. As 280 novas variações reutilizam a miniatura anatômica original mais próxima, determinada pelo movimento, equipamento, músculo e lateralidade, mantendo uma única linguagem visual e sem hotlink. O fallback de iniciais fica restrito a referências indisponíveis. `thumbnailMediaId` e `imageMediaId` continuam disponíveis para exercícios próprios.

## Exercícios próprios e favoritos

Exercícios próprios são persistidos em `exercises` com `isCustom` e `ownerProfileId`; outro perfil não os consulta. Favoritos ficam em `exerciseFavorites` com índice único `[profileId+exerciseId]`. Busca considera nome, rótulo do músculo e rótulo do equipamento; filtros incluem músculo, equipamento, favoritos e próprios.

O catálogo DEFYN e suas ilustrações estáticas são código do produto e não entram no backup. Somente exercícios próprios e suas referências pessoais são exportados. Nenhuma mídia externa foi incorporada, portanto não há licença de terceiros a declarar. Consulte `EXERCISE_ASSETS.md` para a matriz das ilustrações originais.
# Integração com a sessão

O detalhe do exercício pode ser aberto pela imagem no Modo Academia. Substituições filtram padrões musculares compatíveis e alteram somente o snapshot daquela sessão. Exercícios próprios continuam isolados pelo perfil.
