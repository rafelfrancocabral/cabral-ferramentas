# Cabral Ferramentas

Site/catálogo da Cabral Ferramentas (HTML, CSS e JavaScript puro, sem build).

## Rodar localmente neste Mac

Não há dependências para instalar. Basta servir a pasta com um servidor HTTP estático:

```bash
cd ~/Documents/Cabral/cabral-ferramentas
./dev.sh
```

Depois abra:

- Site: <http://127.0.0.1:8123/index.html>
- Login do painel: <http://127.0.0.1:8123/login.html>
- Dashboard: <http://127.0.0.1:8123/dashboard.html>
- Página de produto: <http://127.0.0.1:8123/produto.html?id=...>

Use `127.0.0.1` em vez de `localhost` neste Mac: a porta 8000 já está ocupada por um servidor do projeto javadistribuidora, e `localhost` pode resolver para IPv6 e cair nesse outro servidor. O `dev.sh` já usa a porta 8123 por esse motivo.

Se quiser usar outra porta:

```bash
PORT=3000 ./dev.sh
```

> As rotas bonitas do `vercel.json` (`/produto`, `/login`, `/dashboard`) funcionam apenas no deploy da Vercel. No servidor local, acesse os arquivos `.html` diretamente.

## Estrutura

| Arquivo/pasta | Função |
| --- | --- |
| `index.html`, `login.html`, `produto.html`, `dashboard.html` | Páginas do site |
| `css/`, `js/`, `img/` | Estilos, lógica e imagens |
| `sql/` | Migrações do Supabase |
| `worker/r2-uploader.js` | Cloudflare Worker (login, proxy admin e upload R2) |
| `vercel.json` | Rewrites, cache e headers do deploy |

## Serviços externos

As integrações já estão apontadas para os serviços da conta:

- **Supabase**: URL e chave anônima em `js/supabase-config.js`.
- **Cloudflare Worker**: URL em `js/supabase-config.js` (`ADMIN_WORKER_URL`) e em `js/r2-config.js` (`R2_WORKER_URL`).
- **R2**: URL pública do bucket em `js/r2-config.js` (`R2_PUBLIC_BASE_URL`).

Os segredos do Worker (senhas de login, `SESSION_SECRET`, `SUPABASE_SERVICE_KEY`) ficam apenas no painel da Cloudflare — nunca neste repositório.

## Deploy

Neste Mac, `gh`, `vercel` e `wrangler` já estão instalados e autenticados.

- **Site (Vercel)**: `vercel --prod` na raiz do projeto. Na primeira vez, pode ser necessário `vercel link` para associar este diretório ao projeto existente.
- **Worker (Cloudflare)**: `wrangler deploy worker/r2-uploader.js` (respeite as variáveis/segredos já configurados no painel).

## Observações

O `.gitignore` ignora `scripts/` e `Cabralferramentas/`. Se essas pastas existiam apenas no outro computador, elas **não** foram para o GitHub e precisam ser recriadas/copiadas manualmente, se ainda forem necessárias.

O repositório remoto é `git@github.com:rafelfrancocabral/cabral-ferramentas.git` (branch `main`).
