# Backup e restauração

O envelope atual é `defyn-backup` v7. Ele contém perfis, metas, resumo diário opcional, hidratação, treino, rotina, sono, progresso e mídia local necessária. Nenhum conteúdo é enviado a servidor.

## Limpeza local segura

Em **Backup → Dados deste dispositivo**, **Limpar dados deste dispositivo** apaga somente o navegador atual. A ação exige `RESETAR`, destaca qualquer outbox pendente e deixa explícito que a nuvem não será apagada. O PWA permanece instalado; domínio e stores técnicas do IndexedDB v8 são limpos em uma transação.

## Compatibilidade e validação

Backups v1–v6 continuam aceitos. Coleções que não existiam na versão de origem entram vazias; o DEFYN não inventa dados. Antes de qualquer escrita, o arquivo é validado como JSON, formato, versão, perfis, referências entre registros, valores numéricos e mídia.

Mídia só aceita JPEG, PNG ou WebP em `data:` Base64. SVG, tipos arbitrários e payloads malformados são recusados antes da transação.

## Restauração segura

A restauração valida o backup por completo e então substitui as tabelas locais dentro de uma única transação IndexedDB. Se uma etapa falhar, a transação é abortada: não existe estado parcialmente restaurado. A tela mantém a atualização PWA bloqueada enquanto há arquivo pronto para substituir dados ou restauração em curso.

Exporte periodicamente e guarde o JSON em local seguro. O navegador pode limpar armazenamento local sob pressão de espaço.

## Conta e nuvem

Sincronização e backup resolvem problemas diferentes: o sync replica mudanças e tombstones; um backup independente permite voltar a um estado anterior. O backup local v7 permanece disponível com conta autenticada.

Na 1.1.0, a limpeza local continua sem chamar Supabase e é bloqueada enquanto houver outbox pendente. Após concluir, a sessão é encerrada para evitar um redownload imediato e sem contexto. No próximo login, dados já sincronizados podem ser baixados por pull inicial. Excluir conta/dados cloud continua fora de escopo.

Restore continua local e transacional: preserva o owner compatível, limpa fila/cursor/conflitos e não escreve na cloud. Ao recarregar, o DEFYN volta a oferecer **Sincronizar meus dados**; somente o consentimento gera nova outbox e merge por ID/revisão.

`localOwnerAccountId`, enrollment, outbox, metadata, cursores e conflitos não entram no JSON. Restaurar preserva o owner legítimo, limpa estado técnico antigo e exige bootstrap explícito para o conteúdo restaurado. O reset apaga também o owner e reinicia o gate como instalação vazia.
