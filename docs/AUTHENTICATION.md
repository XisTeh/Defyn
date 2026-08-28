# Autenticação

Auth usa apenas e-mail e senha pelo Supabase. Não há username, OAuth, telefone ou login separado para cada perfil DEFYN.

## Fluxos

- **Criar conta:** envia e-mail/senha. Se confirmação de e-mail estiver ativa, `signUp` pode retornar usuário sem sessão; a UI informa confirmação pendente. Se a sessão vier imediatamente, o gate abre o app.
- **Entrar:** usa `signInWithPassword` e mantém sessão pelo cliente Supabase.
- **Recuperar:** envia link com `resetPasswordForEmail`; o retorno ao DEFYN é detectado pelo evento `PASSWORD_RECOVERY` e abre “Definir nova senha”.
- **Sair:** tenta sincronizar quando online sem bloquear indefinidamente. Com pendências, oferece **Sincronizar e sair** ou **Sair mesmo assim**; offline deixa claro que os dados continuam neste dispositivo.
- **Bootstrap/eventos:** `AuthSessionService` restaura a sessão e traduz `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED` e `PASSWORD_RECOVERY` para estado de aplicação.

O cliente persiste e renova a sessão com namespace `defyn-auth`. Tokens e objetos de sessão nunca são enviados ao console. Mensagens mostram erro útil sem imprimir credenciais.

## Gate de transição e ownership local

Sem URL e Publishable Key, o app opera somente no modo local. Com ambas configuradas, usuários sem sessão veem Auth. Depois do login, IndexedDB continua operacional e o conteúdo só é montado depois da verificação do owner local da instalação.

- instalação vazia e sem owner: vincula automaticamente à conta autenticada antes de abrir o app;
- dados 1.0.x e sem owner: exige confirmação explícita de que pertencem à conta atual;
- mesma conta: libera normalmente;
- conta diferente: bloqueia todo o conteúdo local e oferece apenas sair/orientação para outro dispositivo ou perfil do navegador.

O vínculo de ownership é local. Em seguida, a enrollment do sync é automática somente para instalação vazia; dados existentes mostram resumo e exigem **Sincronizar meus dados**. Logout não remove owner, dados nem outbox. A troca de sessão desmonta o conteúdo anterior antes da nova decisão, evitando exibir nomes, fotos ou registros da conta anterior. Uma instalação continua pertencendo a uma conta por vez.

Uma instalação vazia ainda não preparada não abre onboarding offline: pede uma conexão inicial, conclui o pull e só então decide entre dados existentes e onboarding real. Restaurar backup limpa enrollment técnico e volta ao consentimento de merge. Limpar o dispositivo encerra a sessão depois de remover dados locais.

## URLs recomendadas para release

- Site URL: `https://defyn-gold.vercel.app`
- Redirect de produção: `https://defyn-gold.vercel.app/`
- Desenvolvimento: `http://localhost:5173/` e, quando usado, `http://127.0.0.1:5173/`

Recuperação usa a raiz atual com `?auth=recovery`; `detectSessionInUrl` entrega o evento ao SDK e a tela permite definir a nova senha. Não existe armazenamento manual de access token, sessão ou JWT fora do mecanismo oficial do cliente Supabase.

A validação de release cobre, em caixa de e-mail QA controlada: signup → confirmação → login e esqueci senha → link → nova senha → login. Tokens e URLs completas de confirmação nunca devem aparecer em logs ou evidências.
