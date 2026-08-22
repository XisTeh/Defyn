# OCR nutricional 06.5

O fluxo de rótulos é carregado apenas dentro do módulo de Nutrição. Ele mantém a imagem local e executa, nesta ordem:

1. avaliação de nitidez e detecção conservadora do quadrilátero com maior concentração de bordas;
2. ajuste manual obrigatório disponível por quatro cantos;
3. transformação projetiva para uma tabela frontal, com rotação opcional;
4. grayscale com contraste ou limiar adaptativo baseado em média local integral;
5. passe Tesseract geral para cabeçalhos, linhas, palavras, confiança e bounding boxes;
6. passe restrito à região numérica, com whitelist de números, separadores, traço e `%`;
7. reconstrução da matriz pela posição X dos cabeçalhos e posição Y das linhas;
8. validação de proporção somente como alerta, sem preencher valores ausentes.

O parser numérico aceita apenas número decimal seguido opcionalmente de uma unidade conhecida. Não existe substituição global de `g`, `O`, `l` ou outras letras. O passe numérico tem precedência somente dentro de uma célula espacialmente identificada; o texto e os tokens do passe geral continuam disponíveis no objeto de debug em desenvolvimento.

As células distinguem valor numérico, `dash`, `notProvided` e `insignificantAmount`. Traço e a frase legal “não contém quantidades significativas” não entram nos cálculos como zero.

No telefone, cada nutriente é um card com todas as colunas identificadas e o status abaixo. A tabela desktop não é usada abaixo de 560 px, portanto a revisão não depende de scroll horizontal. Foto e dados permanecem alternáveis sem desmontar o formulário.

As imagens reais mencionadas no prompt 06.5 não estavam presentes no anexo recebido. Por isso, a regressão automatizada usa duas fixtures textuais equivalentes, e a primeira também inclui tokens e bounding boxes sintéticos em que o passe geral contém `409`, `359`, `49`, `189`, `89` e `29`. Um ensaio adicional no Chrome rasterizou as duas tabelas, inclinou a segunda, executou perspectiva → OCR real → parser e obteve todas as células esperadas nos dois casos. Esse ensaio sintético não substitui o QA físico das fotografias originais.

Medição do ensaio no aparelho de desenvolvimento: fixture limpa, 262 ms de imagem, 2.514 ms de OCR (incluindo primeiro carregamento do worker) e 4,7 ms de parser; fixture inclinada, 279 ms de imagem, 2.365 ms de OCR com worker reutilizado e 4,6 ms de parser. Os tempos variam conforme aparelho e resolução, e também ficam visíveis na revisão em modo de desenvolvimento.

Não foi adicionada dependência. O Tesseract e seus assets offline existentes continuam lazy-loaded e precacheados. Em comparação com a Production anterior ao 06.5, o bundle inicial aumentou 4.326 bytes sem compressão (1,06%) e o chunk lazy de Nutrição aumentou 11.370 bytes (22,49% somente nesse chunk sob demanda).
