# Pipeline OCR local

1. A pessoa escolhe **Tirar foto** ou **Escolher da galeria**; câmera usa `capture=environment` quando suportado e galeria nunca força captura.
2. A tela apresenta orientação e prévia antes de processar. É possível girar 90°, aplicar recorte central de 0–24% e ativar contraste conservador.
3. A ação **Ler tabela** aplica EXIF, rotação, recorte, limite de 2000 px e compressão WebP. Selecionar a imagem sozinho não dispara OCR.
4. Tesseract é importado somente nesse momento. Worker, core LSTM e português vêm de `/ocr`, sem CDN; o worker é reutilizado entre leituras.
5. A interface mostra preparação, carregamento, reconhecimento percentual e tempo de carregamento/reconhecimento, além de permitir cancelar.
6. O OCR devolve texto e linhas com bounding boxes. O parser agrupa por coordenada vertical, ordena as células por x e então extrai porção, energia, macros, gorduras, fibra, açúcares e sódio.
7. Colunas `100 g/ml`, porção declarada e `%VD` são persistidas separadamente. Uma coluna explícita de 100 g/ml é a base de cálculo; quando ausente, a base 100 é derivada da porção e identificada como tal.
8. Campos ausentes permanecem indefinidos. A revisão humana é obrigatória e nada é salvo automaticamente.

A foto otimizada existe apenas durante a revisão por padrão. Ela só entra no `MediaRepository` se a pessoa marcar explicitamente “Guardar a imagem otimizada junto do alimento”. Texto e imagem nunca são enviados a servidor.

O parser não escolhe silenciosamente entre colunas ambíguas e não inventa campo ausente. Vírgula e ponto decimal são aceitos, mas o valor final continua responsabilidade da revisão. Fixtures automatizadas cobrem rótulos com `100 g | porção | %VD`, desalinhamento e informações parciais.

Antes do OCR, uma análise local e leve observa resolução e bordas. Foto pequena ou pouco nítida recebe orientação para aproximar, alinhar, evitar reflexo e preencher o quadro. No desktop, foto e tabela editável ficam lado a lado; no mobile, foto acima e tabela com rolagem horizontal interna.

## Telemetria local da tentativa

A revisão exibe tempo total, decode, transformação, codificação WebP, carregamento/reuso do worker, reconhecimento e parser. Em QA no navegador com uma imagem PNG pequena usada somente para aferir o pipeline:

- primeira tentativa: 0,33 s total; imagem 24 ms; worker 0,10 s; reconhecimento 0,20 s; parser 0,7 ms;
- worker reutilizado: 0,19 s total; imagem 21 ms; worker 0 ms; reconhecimento 0,17 s; parser 0,4 ms.

Isso valida a instrumentação e a reutilização do worker, não a precisão nem o tempo de uma fotografia grande em aparelho físico. O próximo QA deve registrar os números mostrados pelo próprio formulário usando câmera e galeria reais.

No QA 06.4, uma fixture sintética de 1400×1800 px com `100 g | 60 g | %VD` levou **2,54 s** no build de produção local: 132 ms de imagem, 0,11 s de carga do motor, 2,30 s de reconhecimento e 1,7 ms de parser. A leitura preservou as três colunas e kcal/kJ; um erro deliberadamente observado na linha de gordura trans foi corrigido na tabela e reaberto com `0 | 0 | —`, confirmado. Isso não substitui fotografia física.
