# Pipeline OCR local

1. A pessoa escolhe **Abrir câmera** ou **Escolher da galeria**; câmera usa captura traseira para rótulos quando suportada.
2. A tela apresenta orientação de enquadramento e prévia, com troca de fonte sem salvar.
3. `optimizeImage` aplica orientação, limita a 1600 px e comprime em WebP.
4. Tesseract é importado somente nesse momento. Worker, core LSTM e português vêm de `/ocr`, sem CDN.
5. Estados técnicos são traduzidos em preparação da imagem, carregamento do OCR, português offline e leitura percentual.
6. O parser brasileiro extrai porção, referência, energia, macros, fibra, açúcares e sódio.
7. Porção ausente, poucos campos e presença simultânea de coluna por porção/100 g geram avisos.
8. A revisão humana é obrigatória. Nada é salvo automaticamente.

A foto otimizada existe apenas durante a revisão por padrão. Ela só entra no `MediaRepository` se a pessoa marcar explicitamente “Guardar a imagem otimizada junto do alimento”. Texto e imagem nunca são enviados a servidor.

O parser não escolhe silenciosamente entre colunas ambíguas e não inventa campo ausente. Vírgula e ponto decimal são aceitos, mas o valor final continua responsabilidade da revisão.
