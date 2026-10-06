# Autenticação

Auth usa apenas e-mail e senha pelo Supabase. Não há username, OAuth, telefone ou login separado para cada perfil DEFYN.

## Fluxos

- **Criar conta:** envia e-mail/senha. Se confirmação de e-mail estiver ativa, `signUp` pode retornar usuário sem sessão; a UI informa confirmação pendente. Se a sessão vier imediatamente, o gate abre o app.
- **Entrar:** usa `signInWithPassword` e mantém sessão pelo cliente Supabase.
- **Recuperar:** envia link com `resetPasswordForEmail`; o retorno ao DEFYN é detectado pelo evento `PASSWORD_RECOVERY` e abre “Definir nova senha”.
- **Sair:** tenta sincronizar quando online sem bloquear indefinidamente. Com pendências, oferece **Sincronizar e sair** ou **Sair mesmo assim**; offline deixa claro que os dados continuam neste dispositivo.
- **Bootstrap/eventos:** `AuthSessionService` restaura a sessão e traduz `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED` e `PASSWORD_RECOVERY` para estado de aplicação.

O cliente persiste e renova a sessão com namespace `defyn-auth`. Tokens e objetos de sessão nunca são enviados ao console. Mensagens mostram erro útil sem imprimir credenciais.

## Troca de conta e cache local

Sem URL e Publishable Key, o app opera somente no modo local. Com ambas configuradas, usuários sem sessão veem Auth. Qualquer conta pode entrar em qualquer dispositivo ou navegador: não existe vínculo permanente do dispositivo a uma conta.

O IndexedDB mantém um cache local separado para cada conta que já entrou naquele navegador. Na troca de sessão, o cache da conta anterior é guardado localmente e o cache da conta atual é carregado automaticamente; no primeiro acesso, os dados são baixados da nuvem. Essa troca ocorre antes do conteúdo do app montar, portanto dados, fotos e registros de uma conta não aparecem para a próxima pessoa.

Dados locais legados, sem sincronização, continuam mostrando o resumo e exigem **Sincronizar meus dados** antes do primeiro upload. Logout não remove os caches locais nem a outbox da conta. Limpar os dados deste dispositivo remove todos os caches locais.

Uma instalação vazia ainda não preparada não abre onboarding offline: pede uma conexão inicial, conclui o pull e só então decide entre dados existentes e onboarding real. Restaurar backup limpa enrollment técnico e volta ao consentimento de merge. Limpar o dispositivo encerra a sessão depois de remover dados locais.

## URLs recomendadas para release

- Site URL: `https://defyn-gold.vercel.app`
- Redirect de produção: `https://defyn-gold.vercel.app/`
- Desenvolvimento: `http://localhost:5173/` e, quando usado, `http://127.0.0.1:5173/`

Recuperação usa a raiz atual com `?auth=recovery`; `detectSessionInUrl` entrega o evento ao SDK e a tela permite definir a nova senha. Não existe armazenamento manual de access token, sessão ou JWT fora do mecanismo oficial do cliente Supabase.

A validação de release cobre, em caixa de e-mail QA controlada: signup → confirmação → login e esqueci senha → link → nova senha → login. Tokens e URLs completas de confirmação nunca devem aparecer em logs ou evidências.
