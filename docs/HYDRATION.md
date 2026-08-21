# Hidratação

## Meta e ritmo

A meta continua configurável: manual ou estimativa por peso (30/35/40 ml/kg). O ritmo é independente da alimentação e calcula a fração transcorrida entre horários habituais de acordar/dormir.

`esperado = meta × fração da janela acordado`

A tolerância DEFYN é `max(200 ml, 8% da meta)`. Ela evita cobrança minuto a minuto. Estados: dentro do ritmo, um pouco abaixo, bem abaixo, acima, meta atingida e fora da janela. Essa tolerância é heurística de produto, não referência clínica universal.

Checkpoints opcionais mostram progresso cumulativo aproximado em 33%, 67% e 100%. Água registrada continua composta por eventos imutáveis com `profileId`, `localDate` e horário.

## Lembretes

O perfil armazena preferência de lembrete, mas a versão atual apenas calcula o estado. Navegadores/PWAs não garantem execução periódica em segundo plano, especialmente iOS, sem push/servidor. A interface documenta essa limitação e não agenda timers falsamente confiáveis.

## Segurança de comunicação

O módulo orienta ritmo, não prescreve ingestão em intervalos curtos e não interpreta condições clínicas. Bebidas e líquidos de alimentos não entram automaticamente na água.
