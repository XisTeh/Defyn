# Lembretes locais

Lembretes de água, treino, check-in e sono são opt-in por perfil. A permissão do navegador só é solicitada pelo botão “Autorizar notificações”. Estados tratados: `default`, `granted`, `denied` e `unsupported`.

O coordenador é best-effort e roda enquanto o navegador mantém o aplicativo ativo. Não existe backend, push remoto ou promessa de execução com o app fechado. A interface informa essa limitação.

Supressões determinísticas:

- janela silenciosa, inclusive quando cruza meia-noite;
- snooze persistido por tipo;
- água após meta, registro recente ou durante treino ativo;
- treino concluído ou em andamento;
- preferência desativada.

O usuário pode silenciar todos por uma hora, pelo restante do dia ou até o dia seguinte. Disparos recebem cooldown persistido para impedir repetição agressiva.
