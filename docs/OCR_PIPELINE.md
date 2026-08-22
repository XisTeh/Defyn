# Pipeline OCR local

1. A pessoa escolhe **Tirar foto** ou **Escolher da galeria**; câmera usa `capture=environment` quando suportado e galeria nunca força captura.
2. A tela apresenta orientação e prévia antes de processar. É possível girar 90°, aplicar recorte central de 0–24% e ativar contraste conservador.
3. A ação **Ler tabela** aplica EXIF, rotação, recorte, limite de 2000 px e compressão WebP. Selecionar a imagem sozinho não dispara OCR.
4. Tesseract é importado somente nesse momento. Worker, core LSTM e português vêm de `/ocr`, sem CDN; o worker é reutilizado entre leituras.
5. A interface mostra preparação, carregamento, reconhecimento percentual e tempo de carregamento/reconhecimento, além de permitir cancelar.
6. O parser brasileiro extrai porção, energia, macros, fibra, açúcares e sódio mesmo com linhas quebradas e separadores irregulares.
7. Colunas `100 g/ml`, porção declarada e `%VD` são separadas. Porção declarada é a seleção inicial; 100 g permanece disponível para revisão explícita.
8. Campos ausentes permanecem indefinidos. A revisão humana é obrigatória e nada é salvo automaticamente.

A foto otimizada existe apenas durante a revisão por padrão. Ela só entra no `MediaRepository` se a pessoa marcar explicitamente “Guardar a imagem otimizada junto do alimento”. Texto e imagem nunca são enviados a servidor.

O parser não escolhe silenciosamente entre colunas ambíguas e não inventa campo ausente. Vírgula e ponto decimal são aceitos, mas o valor final continua responsabilidade da revisão. Fixtures automatizadas cobrem rótulos com `100 g | porção | %VD`, desalinhamento e informações parciais.

## Telemetria local da tentativa

A revisão exibe tempo total, decode, transformação, codificação WebP, carregamento/reuso do worker, reconhecimento e parser. Em QA no navegador com uma imagem PNG pequena usada somente para aferir o pipeline:

- primeira tentativa: 0,33 s total; imagem 24 ms; worker 0,10 s; reconhecimento 0,20 s; parser 0,7 ms;
- worker reutilizado: 0,19 s total; imagem 21 ms; worker 0 ms; reconhecimento 0,17 s; parser 0,4 ms.

Isso valida a instrumentação e a reutilização do worker, não a precisão nem o tempo de uma fotografia grande em aparelho físico. O próximo QA deve registrar os números mostrados pelo próprio formulário usando câmera e galeria reais.
