# Sistema de progresso

## Objetivo

O progresso reúne histórico corporal, fotos, alimentação, hidratação e treinos sem produzir diagnóstico, nota moral ou promessa de resultado. Todo cálculo é determinístico, explicável e executado no dispositivo do perfil ativo.

## Navegação e períodos

As áreas são Visão geral, Corpo, Fotos, Nutrição e Treinos. Os presets de 7, 30 e 90 dias, 6 meses, 1 ano e tudo geram um intervalo de datas locais compartilhado por repositories e agregadores.

## Agregação

- peso usa registros corporais do perfil e médias móveis comparáveis de sete dias;
- nutrição agrupa somente dias com diário e resolve o snapshot de meta ativo em cada data;
- hidratação agrupa somente dias com água e calcula a meta daquele dia com configuração e peso conhecido;
- treino inclui somente sessões concluídas para duração, séries, volume e recordes;
- kg e lb permanecem separados; exercícios por tempo ou peso corporal não criam volume convencional falso.

Dias sem registro permanecem sem dado e não entram como zero. Insights são no máximo quatro frases derivadas dessas agregações.

## Responsabilidade

Salvar peso nunca atualiza `UserProfile`, calorias, macros ou hidratação. A interface oferece “Revisar ficha e metas” como ação explícita. Não há IMC interpretado, composição corporal estimada, análise de foto por IA ou inferência clínica.

## Acessibilidade

Gráficos SVG possuem nome textual, pontos focalizáveis e uma lista equivalente. Barras semanais possuem descrição agregada e lista para tecnologia assistiva. Cor nunca é o único meio de transmitir um valor.

No mobile, fotos têm câmera/galeria, prévia e orientação por categoria sem forçar `capture="environment"`. A foto de perfil mantém fluxo e ownership próprios; trocar avatar não altera galeria de progresso.
