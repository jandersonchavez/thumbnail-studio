# Publicar ZERO A 2 STUDIO no GitHub Pages

Este pacote inclui `.github/workflows/pages.yml`. Ele nao modifica React, Konva, IndexedDB ou os templates.

1. Descompacte o ZIP em `C:\Users\jccme\OneDrive\Documentos\code_projects` para criar `thumbnail-studio\.github\workflows\pages.yml`.
2. Abra https://github.com/jandersonchavez/thumbnail-studio/settings/pages e, em **Build and deployment > Source**, selecione **GitHub Actions**.
3. No PowerShell, dentro de `thumbnail-studio`, execute cada comando em uma linha:

   `git add .github/workflows/pages.yml`

   `git commit -m "ci: publicar ZERO A 2 STUDIO no GitHub Pages"`

   `git push origin main`

4. Acompanhe a execucao em https://github.com/jandersonchavez/thumbnail-studio/actions .
5. Ao terminar com sucesso, acesse https://jandersonchavez.github.io/thumbnail-studio/ .

## Detalhes

- GitHub Actions instala dependencias, executa o script `models:setup` e compila com `--base=/thumbnail-studio/`.
- `public/models` continua fora do Git. Os modelos entram somente no artefato `dist` publicado.
- O site e publico. Os projetos continuam em IndexedDB **no navegador e dispositivo de cada visitante**; exporte backup ZIP/JSON dos projetos importantes.
- GitHub Pages nao permite configurar headers HTTP customizados. A remocao por WASM que depender de `SharedArrayBuffer`/multithreading pode falhar ou funcionar com desempenho reduzido. Teste em dispositivo real; caso necessario, use uma hospedagem com headers COOP/COEP ou ajuste o runtime para uma thread.
- Existem alertas de vulnerabilidades em dependencias e questoes de licenca do IMG.LY a avaliar antes de usar o projeto em producao.
