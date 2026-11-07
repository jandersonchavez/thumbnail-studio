# ZERO A 2 STUDIO v0.8.7 — Publicação com imagens no GitHub Pages

Esta atualização parte da **v0.8.6** e corrige caminhos de arquivos estáticos quando o site é publicado em `https://jandersonchavez.github.io/thumbnail-studio/`.

## O que estava errado

Alguns templates armazenam `/demo-person.svg`, `/zero2players-logo.png`, `/react-background.svg` etc. No `localhost` isso funciona, mas no GitHub Pages essas URLs apontam para a raiz `jandersonchavez.github.io/`, fora da subpasta do repositório. A imagem de exemplo do rosto, o logo e certos fundos podiam desaparecer. O Vite **não reescreve** strings criadas dinamicamente em templates ou salvas no IndexedDB.

## Correção

- `src/lib/publicAssets.ts` resolve os arquivos da pasta `public` usando `import.meta.env.BASE_URL` **somente no momento de carregar**. Isso mantém backups e projetos salvos compatíveis com `localhost` e GitHub Pages.
- A correção abrange o canvas, fundos, paleta, a interface, o recorte e a exportação de backup ZIP com imagens.
- Os SVGs e PNG padrão estão incluídos em `public/` e o workflow **falha de propósito** se algum deles não estiver no artefato `dist/`.
- O GitHub Actions baixa os pesos IMG.LY e WASM durante o deploy, sem enviar fotos dos usuários para servidores.

## Como atualizar

1. Exporte no editor **Projetos → Backup completo ZIP** e faça cópia do código atual.
2. Extraia `zero-a-2-studio-v087-atualizacao.zip` na pasta `C:\Users\jccme\OneDrive\Documentos\code_projects` e permita substituir os arquivos em `thumbnail-studio`.
3. No PowerShell, dentro de `thumbnail-studio`, execute separadamente:

   - `npm run check:assets`
   - `npm run build`
   - `npm run check:dist`
   - `git status --short`
   - `git add .`
   - `git commit -m "fix: corrigir assets no GitHub Pages v0.8.7"`
   - `git push origin main`

4. Em **Actions**, confirme o sucesso do workflow. Em **Settings → Pages**, selecione **GitHub Actions** como origem. A página ficará em `https://jandersonchavez.github.io/thumbnail-studio/`.
5. Use **Ctrl+F5** e teste os templates **Oficial**, **Co-Op** e **React**. Confirme rosto de exemplo, segundo rosto azul, logo e os fundos.

## URLs para testar depois do deploy

- `https://jandersonchavez.github.io/thumbnail-studio/demo-person.svg`
- `https://jandersonchavez.github.io/thumbnail-studio/demo-person-blue.svg`
- `https://jandersonchavez.github.io/thumbnail-studio/zero2players-logo.png`
- `https://jandersonchavez.github.io/thumbnail-studio/react-background.svg`

Estas URLs devem servir imagens, não retornar 404. O último teste precisa ser realizado após o GitHub publicar o site; não é possível garantir um deploy remoto antes disso.

## Observações

- Não faça `git add public/models` (os pesos ficam ignorados pelo Git e são baixados no workflow).
- A IA local pode depender de recursos do navegador que o GitHub Pages não oferece, especialmente cabeçalhos para WASM multithread; teste separadamente a remoção de fundo no site.
- O GitHub não guarda os projetos pessoais do usuário: eles permanecem no IndexedDB do navegador. Guarde backups ZIP.
- Não publique como produto comercial sem revisar a licença do IMG.LY e o alerta de segurança transitivo de dependências.
