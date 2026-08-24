# QA responsivo

O baseline automatizado cobre lint, tipos, testes e build. A inspeção de layout de release deve usar os viewports 320×800, 360×800, 390×844, 430×932, 768×1024, 1366×768 e 1920×1080.

Critérios: sem overflow horizontal, drawer e diálogos com foco/teclado, alvos de toque legíveis, safe area respeitada, Modo Academia sem navegação global concorrente e conteúdo rolável sem esconder ações.

Esta etapa não declara teste em aparelho físico. A checagem de câmera, teclado nativo, instalação, suspensão em segundo plano, wake lock, notificações e offline real deve seguir `PHYSICAL_DEVICE_CHECKLIST.md`.
