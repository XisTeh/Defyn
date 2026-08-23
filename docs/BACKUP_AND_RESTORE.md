# Backup e restauração

O formato atual é `defyn-backup` v6. A exportação inclui todas as coleções atuais e legadas, inclusive `dailyNutritionSummaries` e mídia serializada em data URL.

Backups v1–v5 são aceitos. Ao importar uma versão anterior, `dailyNutritionSummaries` começa vazio; alimentos, receitas e diário legado são preservados como recebidos, sem conversão automática. A restauração valida perfis, referências, mídia, treinos e valores nutricionais não negativos antes da transação.

O restore substitui o estado local somente após validação integral. O usuário deve guardar o JSON em local seguro: o DEFYN não mantém cópia remota.
