# Backup e restauração

O envelope atual é `defyn-backup` v7. Ele contém perfis, metas, resumo diário opcional, hidratação, treino, rotina, sono, progresso e mídia local necessária. Nenhum conteúdo é enviado a servidor.

## Reset local seguro

Em **Backup → Dados locais**, o botão **Resetar DEFYN neste dispositivo** apaga os dados somente do navegador/dispositivo atual. A ação exige a digitação de `RESETAR`, recomenda exportar um backup antes e não é acionada por atualização, deploy ou migração. O reset mantém os arquivos estáticos e o PWA instalados, limpa os dados do IndexedDB v7 em uma única transação e leva o aplicativo ao onboarding inicial.

## Compatibilidade e validação

Backups v1–v6 continuam aceitos. Coleções que não existiam na versão de origem entram vazias; o DEFYN não inventa dados. Antes de qualquer escrita, o arquivo é validado como JSON, formato, versão, perfis, referências entre registros, valores numéricos e mídia.

Mídia só aceita JPEG, PNG ou WebP em `data:` Base64. SVG, tipos arbitrários e payloads malformados são recusados antes da transação.

## Restauração segura

A restauração valida o backup por completo e então substitui as tabelas locais dentro de uma única transação IndexedDB. Se uma etapa falhar, a transação é abortada: não existe estado parcialmente restaurado. A tela mantém a atualização PWA bloqueada enquanto há arquivo pronto para substituir dados ou restauração em curso.

Exporte periodicamente e guarde o JSON em local seguro. O navegador pode limpar armazenamento local sob pressão de espaço.
