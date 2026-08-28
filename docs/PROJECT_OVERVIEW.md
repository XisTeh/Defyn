# Visão do projeto

O DEFYN responde “como está meu acompanhamento hoje?” com treino, hidratação, direção nutricional manual, rotina e evolução. O IndexedDB continua local-first; a 1.1.0 replica dados estruturados e mídia privada entre dispositivos da mesma conta sem colocar a nuvem no caminho crítico da UI.

## Escopo atual

- Hoje: treino, água, metas, resumo manual, rotina e atalhos de progresso;
- Diário: resumo nutricional parcial por data, hidratação, sessão e corpo;
- Treinos: perfil, biblioteca, fichas, execução, timer, histórico e progressão;
- Progresso: peso, medidas, fotos, gráficos e tendências factuais;
- Rotina: horários habituais, sono e lembretes locais opt-in;
- Conta local: ficha/metas, perfis e backup transacional.

A conta usa e-mail/senha e pode conter várias pessoas/perfis DEFYN. Auth não transforma perfil em login nem cria perfil automaticamente. Instalação vazia baixa dados existentes; conteúdo local preexistente só é enviado após confirmação explícita. A versão atual é 1.1.0.

Alimentos, receitas, refeições, favoritos, planejamento alimentar e OCR não pertencem à interface atual. Registros antigos são apenas legado preservado para restauração compatível.
