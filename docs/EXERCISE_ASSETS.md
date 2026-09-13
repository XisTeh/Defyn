# Ativos de exercícios

As ilustrações de exercícios são **ativos originais DEFYN**. Não foram copiadas da imagem de referência nem obtidas de bibliotecas, bancos de imagens ou URLs de terceiros. A referência orientou apenas a linguagem visual: corpo e equipamento grafite, músculo-alvo em coral queimado, fundo claro e sem texto.

## Estratégia

- Miniaturas PNG anatômicas originais geradas localmente, recortadas em `src/assets/exercises/generated/thumbnails/`; não há requisição de imagem nem hotlink.
- O manifesto `exercise-media.ts` associa os 52 exercícios originais às ilustrações; `exercise-images.ts` carrega o arquivo local correspondente em build-time. O catálogo expandido reutiliza essas miniaturas anatômicas por movimento e equipamento para manter o mesmo padrão visual.
- Os ativos são estáticos do aplicativo, não entram no IndexedDB nem nos backups. Como fazem parte do bundle, já estão disponíveis no cache do app instalado/offline.
- As 52 miniaturas PNG entram no precache estático; mídia de exercício personalizada continua pessoal no IndexedDB e não é adicionada ao service worker.
- Exercícios personalizados conservam `thumbnailMediaId`/`imageMediaId`; sem mídia própria, recebem a miniatura anatômica mais próxima pelo padrão cadastrado. Iniciais aparecem somente quando a referência do exercício está indisponível.

## Matriz de cobertura

| Exercise ID | Exercício | Asset PNG local | Existe |
| --- | --- | --- | --- |
| defyn-exercise-01 | Supino reto com barra | `supino-reto-barra` | Sim |
| defyn-exercise-02 | Supino reto com halteres | `supino-reto-halteres` | Sim |
| defyn-exercise-03 | Supino inclinado com halteres | `supino-inclinado-halteres` | Sim |
| defyn-exercise-04 | Chest press | `chest-press` | Sim |
| defyn-exercise-05 | Crucifixo com halteres | `crucifixo-halteres` | Sim |
| defyn-exercise-06 | Crossover na polia | `crossover-polia` | Sim |
| defyn-exercise-07 | Flexão de braços | `flexao-bracos` | Sim |
| defyn-exercise-08 | Puxada frontal | `puxada-frontal` | Sim |
| defyn-exercise-09 | Barra fixa | `barra-fixa` | Sim |
| defyn-exercise-10 | Remada baixa | `remada-baixa` | Sim |
| defyn-exercise-11 | Remada curvada com barra | `remada-curvada-barra` | Sim |
| defyn-exercise-12 | Remada unilateral com halter | `remada-unilateral-halter` | Sim |
| defyn-exercise-13 | Remada máquina articulada | `remada-maquina-articulada` | Sim |
| defyn-exercise-14 | Pulldown com braços estendidos | `pulldown-bracos-estendidos` | Sim |
| defyn-exercise-15 | Desenvolvimento com halteres | `desenvolvimento-halteres` | Sim |
| defyn-exercise-16 | Desenvolvimento na máquina | `desenvolvimento-maquina` | Sim |
| defyn-exercise-17 | Elevação lateral | `elevacao-lateral` | Sim |
| defyn-exercise-18 | Crucifixo inverso | `crucifixo-inverso` | Sim |
| defyn-exercise-19 | Face pull | `face-pull` | Sim |
| defyn-exercise-20 | Rosca direta com barra | `rosca-direta-barra` | Sim |
| defyn-exercise-21 | Rosca alternada | `rosca-alternada` | Sim |
| defyn-exercise-22 | Rosca martelo | `rosca-martelo` | Sim |
| defyn-exercise-23 | Rosca Scott | `rosca-scott` | Sim |
| defyn-exercise-24 | Tríceps corda | `triceps-corda` | Sim |
| defyn-exercise-25 | Tríceps barra | `triceps-barra` | Sim |
| defyn-exercise-26 | Tríceps francês | `triceps-frances` | Sim |
| defyn-exercise-27 | Tríceps testa | `triceps-testa` | Sim |
| defyn-exercise-28 | Agachamento livre | `agachamento-livre` | Sim |
| defyn-exercise-29 | Agachamento goblet | `agachamento-goblet` | Sim |
| defyn-exercise-30 | Agachamento no smith | `agachamento-smith` | Sim |
| defyn-exercise-31 | Leg press 45° | `leg-press-45` | Sim |
| defyn-exercise-32 | Cadeira extensora | `cadeira-extensora` | Sim |
| defyn-exercise-33 | Afundo com halteres | `afundo-halteres` | Sim |
| defyn-exercise-34 | Passada | `passada` | Sim |
| defyn-exercise-35 | Cadeira flexora | `cadeira-flexora` | Sim |
| defyn-exercise-36 | Mesa flexora | `mesa-flexora` | Sim |
| defyn-exercise-37 | Stiff com barra | `stiff-barra` | Sim |
| defyn-exercise-38 | Levantamento terra romeno com halteres | `terra-romeno-halteres` | Sim |
| defyn-exercise-39 | Levantamento terra | `levantamento-terra` | Sim |
| defyn-exercise-40 | Hip thrust | `hip-thrust` | Sim |
| defyn-exercise-41 | Ponte de glúteos | `ponte-gluteos` | Sim |
| defyn-exercise-42 | Cadeira abdutora | `cadeira-abdutora` | Sim |
| defyn-exercise-43 | Cadeira adutora | `cadeira-adutora` | Sim |
| defyn-exercise-44 | Panturrilha em pé | `panturrilha-em-pe` | Sim |
| defyn-exercise-45 | Panturrilha sentado | `panturrilha-sentado` | Sim |
| defyn-exercise-46 | Panturrilha unilateral | `panturrilha-unilateral` | Sim |
| defyn-exercise-47 | Prancha frontal | `prancha-frontal` | Sim |
| defyn-exercise-48 | Abdominal supra | `abdominal-supra` | Sim |
| defyn-exercise-49 | Elevação de pernas | `elevacao-pernas` | Sim |
| defyn-exercise-50 | Abdominal na polia | `abdominal-polia` | Sim |
| defyn-exercise-51 | Encolhimento com halteres | `encolhimento-halteres` | Sim |
| defyn-exercise-52 | Rosca de punho | `rosca-punho` | Sim |

O teste `src/assets/exercises/exercise-media.test.ts` falha se um dos 52 exercícios ilustrados perder o manifesto, se um asset for repetido ou se os IDs históricos forem alterados. As variações expandidas são verificadas separadamente e todas precisam resolver uma miniatura PNG anatômica.
# Uso no Modo Academia

A sessão reutiliza o mesmo pipeline de imagem da biblioteca. Assets originais são preferidos; a ilustração técnica e, por fim, iniciais por grupo muscular formam os fallbacks offline sem bloquear o registro.
