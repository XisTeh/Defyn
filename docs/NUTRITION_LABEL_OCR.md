# OCR de tabela nutricional

## Arquitetura

1. Controles separados oferecem câmera traseira e galeria conforme a capacidade detectada, com fallback explícito.
2. `image-processing` valida JPEG/PNG/WebP (até 20 MB), aplica orientação via `createImageBitmap`, reduz a 1600 px e comprime WebP.
3. `local-ocr` faz import dinâmico de Tesseract.js 7.
4. Worker (~111 KB), core LSTM compatível (~3,90 MB) e português `best_int` (~1,39 MB) são assets locais; não há CDN.
5. `NutritionLabelParser` interpreta texto separadamente.
6. A tela mostra prévia, progresso por etapas e avisos de porção/coluna ambígua.
7. A revisão exige confirmação; OCR nunca salva sozinho. A imagem só é retida se a pessoa optar.

O modelo `best_int` reduz o peso em relação ao modelo português completo (~6,76 MB). O core não-SIMD favorece compatibilidade, com custo de velocidade. O bundle inicial não contém o engine; o precache PWA soma aproximadamente 5,4 MB brutos.

## Parser

Prioriza termos brasileiros: valor energético/energia, porção, 100 g/ml, carboidratos, açúcares, proteínas, gorduras, fibra e sódio. Vírgula/ponto decimal, g/mg/ml/kcal são aceitos. Campos não encontrados ficam vazios. Texto parcial gera aviso.

## Offline e privacidade

Produção precacheia os três assets no service worker. Depois da primeira carga/instalação concluída, OCR não depende de rede. Imagem e texto ficam no dispositivo; por padrão o rótulo otimizado é descartado ao fechar. Persistência exige a opção “Guardar a imagem otimizada junto do alimento”.

## Teste em smartphone

`npm run dev -- --host 0.0.0.0` expõe apenas na LAN. APIs de câmera exigem contexto seguro; `localhost` é confiável no próprio computador, mas IP HTTP da LAN pode limitar APIs no celular. Para QA real use preview HTTPS confiável/PWA instalada; não desative segurança nem instale certificado inseguro.

Referências técnicas: [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), licenças Apache-2.0 (engine) e MIT (modelo empacotado).
