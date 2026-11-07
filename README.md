# ZERO A 2 STUDIO v0.8.5 — Correção do quadro e dos controles

A atualização corrige dois problemas da versão 0.8.4: (1) quadros de seleção muito maiores que a pessoa após remover o fundo e (2) travamentos ou saltos ao arrastar controles de tamanho.

## Mudanças

- **Ajustar quadro ao conteúdo visível**: selecione uma fotografia/PNG e clique nesse botão no painel da direita. O editor calcula os limites dos pixels com transparência (alfa), move e reduz o quadro selecionável para a área realmente ocupada. O arquivo original é mantido e o recorte pode ser desfeito/reeditado. É especialmente útil para fotos recortadas de projetos criados nas versões anteriores.
- **Enquadramento automático no novo recorte de fundo**: quando a IA remove o fundo ou você confirma uma máscara manual, o quadro ajusta-se à silhueta, preservando o contorno branco e a posição aproximada da pessoa.
- **Controle de Contorno otimizado**: ao arrastar a barra de espessura, ela atualiza o número imediatamente, mas recalcula o PNG somente quando você solta o controle. Teclas de seta também continuam funcionando. Isso evita dezenas de recomposições pesadas por segundo. Processamentos antigos não substituem escolhas mais recentes.
- **Alça de zoom do canvas mais estável**: durante o arrasto, aparece um retângulo pontilhado de prévia. O canvas Konva só é redimensionado quando você solta a alça. A resolução real de exportação não muda.
- Mantidos: projetos no IndexedDB, backups ZIP, formatos YouTube/TikTok, biblioteca de peças, seleção múltipla e exportação.

## Atualizar a v0.8.4 no Windows

1. No editor atual, faça **Projetos → Backup completo ZIP** do projeto importante e guarde esse arquivo no PC.
2. Faça uma cópia de segurança da pasta `thumbnail-studio`.
3. Extraia o arquivo `zero-a-2-studio-v085-atualizacao.zip` na pasta `C:\Users\jccme\OneDrive\Documentos\code_projects` e autorize a substituição dos arquivos na pasta `thumbnail-studio`.
4. **Não apague** as pastas `node_modules`, `public/models` nem os dados locais do navegador.
5. Na pasta `thumbnail-studio`, execute `npm run build` e, se passar, `npm run dev`.
6. Atualize a página com `Ctrl + F5`.

## Testes de regressão recomendados

1. **Foto antiga com seleção enorme**: abra o mesmo projeto do bug, selecione a pessoa, clique **Ajustar quadro ao conteúdo visível** e verifique se as alças agora ficam próximas da silhueta. O comando tem efeito somente em imagens com margens transparentes.
2. **Novo recorte**: carregue uma fotografia, remova o fundo, confirme a máscara e veja se a seleção encolhe ao tamanho da pessoa sem cortar o contorno branco.
3. **Espessura do contorno**: arraste a barra rapidamente de 0 a 15 e solte. A interface não deve tentar gerar uma nova imagem a cada pixel de movimento. Verifique a borda depois do processamento.
4. **Tamanho visual do canvas**: arraste o canto amarelo da thumbnail. A prévia pontilhada deve seguir o cursor; solte para aplicar o novo zoom. Clique em Ajustar à tela para restaurar.
5. Exporte a thumbnail; confirme resolução 1280×720 (YT) ou 720×1280 (TikTok). Alterne formatos, faça F5 e verifique que projetos e suas duas composições continuam salvos.

## Estado da validação

A sintaxe dos módulos TS/TSX foi verificada e os arquivos de geometria/transparência passaram no TypeScript isolado. Não foi possível instalar as dependências npm neste ambiente, portanto **o build React/Vite completo e os testes de interação no navegador ainda precisam ser feitos no computador do usuário**. Sem novas dependências npm.
