# Biblioteca de exercícios

O catálogo inicial possui **52 exercícios** comuns, cobrindo peitoral, costas/dorsais, trapézio, deltoides, braços, quadríceps, posteriores, glúteos, panturrilhas, adutores e core.

Cada `Exercise` possui nome normalizado, músculo principal/secundários, equipamentos, padrão de movimento, lateralidade, instruções curtas, métrica e referências opcionais de mídia.

## Imagens e fallbacks

Os 52 exercícios-base têm miniaturas PNG originais do DEFYN, mapeadas por `exerciseId` em `src/assets/exercises/exercise-media.ts`. Elas usam corpo/equipamento em grafite e o músculo principal em coral discreto. Não há hotlink ou requisição externa. `thumbnailMediaId` e `imageMediaId` continuam disponíveis para exercícios próprios; sem imagem própria ou sem mapeamento, o bloco de iniciais por grupo muscular é o fallback seguro.

## Exercícios próprios e favoritos

Exercícios próprios são persistidos em `exercises` com `isCustom` e `ownerProfileId`; outro perfil não os consulta. Favoritos ficam em `exerciseFavorites` com índice único `[profileId+exerciseId]`. Busca considera nome, rótulo do músculo e rótulo do equipamento; filtros incluem músculo, equipamento, favoritos e próprios.

O catálogo DEFYN e suas ilustrações estáticas são código do produto e não entram no backup. Somente exercícios próprios e suas referências pessoais são exportados. Nenhuma mídia externa foi incorporada, portanto não há licença de terceiros a declarar. Consulte `EXERCISE_ASSETS.md` para a matriz completa.
