# ZERO A 2 STUDIO v0.8.2 — Biblioteca de peças aprimorada

Esta atualização parte da v0.8.1 e mantém o motor React + Konva, o recorte local, os projetos do IndexedDB, o backup ZIP e as duas proporções independentes.

## Novidades

- Cards de peças compactados de aproximadamente 169–185 px para cerca de **142–148 px de altura**, mantendo duas colunas e as imagens originais sem distorção.
- Aba **Peças → Adicionar peça**: importe arquivos **SVG, PNG, JPG e WebP**, podendo selecionar até 12 de uma vez, até 12 MB cada.
- Os itens importados aparecem em **Minhas peças**, com miniatura, botão para inserir e botão separado para remover da biblioteca.
- Biblioteca personalizada salva no **IndexedDB deste navegador**, sem conexão com servidores externos, e disponível nos outros projetos criados no mesmo endereço local.
- Ao inserir uma peça, o editor incorpora a arte à camada; o **backup ZIP completo do projeto** continua incluindo essa arte, mesmo que seja removida depois da biblioteca.
- Imagens raster grandes são reduzidas localmente ao importar para limitar consumo de armazenamento; proporções são preservadas. SVGs são filtrados para retirar scripts e referências externas.

## Instalar a atualização sem perder os modelos locais

1. Faça um **Backup completo ZIP** dos projetos importantes no editor.
2. Extraia `zero-a-2-studio-v082-atualizacao.zip` em `C:\Users\jccme\OneDrive\Documentos\code_projects`, substituindo os arquivos dentro de `thumbnail-studio`.
3. **Não exclua** `thumbnail-studio/public/models` nem `thumbnail-studio/node_modules`.
4. No PowerShell, dentro de `thumbnail-studio`, execute `npm run build` e, se compilar, `npm run dev`.
5. Acesse `http://127.0.0.1:5173` e pressione `Ctrl + F5`.

## Teste sugerido

Abra **Peças** e confira se as peças nativas aparecem em duas colunas, um pouco menores. Escolha **Adicionar peça**, selecione um SVG ou PNG, e clique na nova miniatura de **Minhas peças** para inserir no canvas. Atualize a página e veja se a peça continua na biblioteca. Salve um **Backup completo ZIP** do projeto contendo a peça e importe-o, validando a restauração.

**Importante:** a biblioteca pessoal é local ao navegador; exportar um projeto inclui as peças **utilizadas naquele projeto**, não todas as peças não utilizadas da biblioteca. Apagar os dados do site pode apagar a biblioteca pessoal. Uma cópia separada dos SVG/PNG originais é recomendada.

## Estado da validação

As alterações foram conferidas por inspeção, TypeScript isolado do novo módulo, compilação sintática (transpile) e integridade dos ZIPs. O `npm run build` completo depende de instalar as bibliotecas no ambiente Windows e deve ser executado pelo usuário.
