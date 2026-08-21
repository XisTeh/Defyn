# Arquitetura

```text
React / features
       ↓
application / casos de uso e agregações
       ↓
domain / entidades, contratos e regras puras
       ↑
infrastructure / IndexedDB e transações
```

## Multi-profile

`ProfileSessionService` resolve e valida `activeProfileId`. Se a preferência aponta para um perfil removido, seleciona outro existente ou limpa a referência. A troca não recarrega a página.

Repositories recebem `profileId` explicitamente nas consultas de targets, diário, hidratação, progresso e treinos. `GetTodayDashboardService` agrega somente o perfil e o dia local solicitados; cards React não consultam stores de forma independente. Exercícios base são compartilhados; exercícios próprios carregam `ownerProfileId`.

`DeleteProfileService` usa um gateway transacional para apagar perfil, targets, diário, categorias, água, progresso, perfil de treino, favoritos, planos, sessões, séries, exercícios próprios e mídia relacionada. Alimentos, receitas e exercícios base globais não participam do cascade.

## Alimentação e diário

`NutritionWorkspace` compõe telas; regras ficam em domínio/aplicação. `FoodService` valida e normaliza o catálogo global. `DiaryService` cria refeições padrão e congela `ConsumedItemSnapshot`, por isso editar alimento/receita não altera histórico. Favoritos de alimento e refeições reutilizáveis possuem `profileId`.

## Mídia e OCR

`MediaRepository` persiste blobs otimizados e metadados. React recebe URLs temporárias, nunca blobs acoplados ao estado global. `image-processing` usa `createImageBitmap` e Canvas. OCR é importação dinâmica: Tesseract, worker, core compatível e modelo `por` são servidos localmente; `NutritionLabelParser` é puro e testável sem câmera.

## Planejamento

O planejador é determinístico, sem rede. Presets distribuem metas por refeição e filtros usam apenas restrições inseridas pelo usuário. Metadados distinguem preset/heurística de fórmula.

## Treinos

`TrainingService` concentra início/retomada, snapshot, registro de série, descanso, substituição e conclusão. O gerador e a progressão são funções puras. `WorkoutPlan` versiona templates; `WorkoutSession` congela a versão usada e `WorkoutSetLog` persiste cada série imediatamente.

O dashboard consulta apenas treino/sessão do dia. Treino não retroalimenta calorias, evitando dupla contagem do fator de atividade.

## Progresso

`ProgressService` compõe repositories de progresso, diário, targets, água e treinos. Regras de tendência e agregação ficam em `domain/progress/analytics.ts`, sem dependência de React ou IndexedDB. A tela recebe um único `ProgressOverview`, evitando cálculos divergentes por card.

Fotos seguem `MediaRepository`: metadata e blob são persistidos separadamente, resolvidos sob demanda e excluídos juntos. Check-ins apenas vinculam IDs; não duplicam bytes. Nenhum registro de peso dispara atualização de perfil ou target.

## Shell

A sidebar desktop adapta da referência somente a hierarquia: perfil no topo, ação principal e navegação agrupada. O mobile usa header de perfil, bottom navigation e sheets acessíveis. `ProfileSetup` é reutilizado no onboarding, criação e edição.

`ProfileAvatar` resolve mídia local por referência e faz fallback seguro para iniciais; nenhuma tela de perfil implementa leitura de Blob própria. A ficha mantém as mesmas áreas na alternância de objetivo: manutenção apresenta ajuste somente leitura de 0 kcal, enquanto déficit/superávit reutilizam o mesmo input positivo.

O design monocromático não é um tema alternável: tokens semânticos fornecem o canvas preto técnico, vidro escuro e superfícies cinza-gelo de contraste. `DefynSelect` monta o listbox em portal no `body`, acima de modais pela escala de z-index, e mantém variantes light/dark compatíveis sem alterar modelos ou persistência. A API controlada mantém valor e regras no componente chamador.

## Atualização otimista

Água é aplicada imediatamente no estado do dashboard. Em falha de persistência, a lista e o total anteriores são restaurados e um erro é exibido.

## PWA

O shell registra o service worker em modo de confirmação e consulta sessão ativa antes de recarregar uma atualização. Instalação, standalone, câmera, notificações, wake lock, compartilhamento e armazenamento passam pela estratégia central de capacidades.

Treinos, Progresso, Alimentação/Receitas e Backup são chunks lazy com fallback visual. O bundle inicial não importa Tesseract; worker, core e português (~5,4 MB) continuam locais e entram no precache. Mídia pessoal permanece no IndexedDB e nunca entra no cache estático.
