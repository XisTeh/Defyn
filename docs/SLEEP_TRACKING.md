# Registro de sono

O sono é um fato opcional, não uma pontuação. `SleepRecord` contém perfil, data local, início, despertar, duração em minutos e nota opcional.

Convenção: `localDate` é a data local do despertar. A duração usa instantes completos, portanto atravessa meia-noite e mudanças de offset sem subtrair apenas relógios. O domínio rejeita despertar anterior, datas inválidas e intervalos acima de 24 horas.

Sem registro é exibido como “Sem registro” e nunca como zero. Médias incluem somente durações positivas realmente registradas. Não há diagnóstico, recomendação clínica, nota de qualidade ou inferência causal.
