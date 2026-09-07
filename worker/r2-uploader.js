// ============================================================
// Cloudflare Worker - API Cabral (Upload R2 + Login autenticado)
// ============================================================
// Como instalar no painel da Cloudflare:
//  1. Dashboard Cloudflare -> Workers & Pages -> Create Worker.
//  2. Substitua o codigo pelo conteudo deste arquivo e clique em Deploy.
//  3. Em Settings > Variables and Secrets:
//     a) R2 Binding:
//        - Variable name: IMAGES
//        - R2 Bucket:      produtos   (crie o bucket R2 "produtos" antes)
//     b) (Opcional, recomendado) UPLOAD_SECRET: senha para /upload e /migrate.
//        Se criar, cole a mesma senha em js/r2-config.js.
//     c) (OBRIGATORIO para o login) AUTH_USERS: JSON com os usuarios e senhas
//        do dashboard. Cole como SECRET (nao como plain text). Exemplo:
//        [{"user":"admin@admin","pass":"SENHA_NOVA_1"},{"user":"olavinho@admin","pass":"SENHA_NOVA_2"}]
//  4. No bucket R2 "produtos": Settings > Public Access > enable
//     "r2.dev subdomain" (copia o endereco pub-xxxx.r2.dev) OU aponte um
//     dominio proprio (ex: imagens.cabralferramentas.com.br).
//  5. Cole a URL do Worker e a URL publica em js/r2-config.js.
//  6. O endpoint /login e PUBLICO (sem UPLOAD_SECRET) e valida apenas contra
//     o secret AUTH_USERS. As credenciais NAO ficam no HTML do site.
// ============================================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

// Valida credenciais do dashboard contra o secret AUTH_USERS.
// O endpoint /login e publico, porem so informa ok quando a dupla
// user/pass bate. Nenhuma credencial vaza para o cliente.
async function handleLogin(request, env) {
    if (!env.AUTH_USERS) {
        return json({ ok: false, error: 'not_configured' }, 503);
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return json({ ok: false, error: 'bad_request' }, 400);
    }

    const user = typeof body.user === 'string' ? body.user.trim().toLowerCase() : '';
    const pass = typeof body.pass === 'string' ? body.pass : '';
    if (!user || !pass) {
        return json({ ok: false, error: 'missing_fields' }, 400);
    }

    let users = [];
    try {
        users = JSON.parse(env.AUTH_USERS);
    } catch (e) {
        return json({ ok: false, error: 'server_config' }, 500);
    }
    if (!Array.isArray(users)) {
        return json({ ok: false, error: 'server_config' }, 500);
    }

    const valid = users.some(u =>
        String(u.user || '').trim().toLowerCase() === user &&
        String(u.pass || '') === pass
    );

    // Pequeno atraso para reduzir velocidade de brute force.
    await new Promise(r => setTimeout(r, 300));

    if (!valid) {
        return json({ ok: false, error: 'invalid_credentials' }, 401);
    }
    return json({ ok: true });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        // Login endpoint is PUBLIC: validates credentials against AUTH_USERS secret.
        if (url.pathname === '/login' && request.method === 'POST') {
            return await handleLogin(request, env);
        }

        // Everything else requires the upload secret (if configured).
        if (env.UPLOAD_SECRET) {
            const auth = request.headers.get('Authorization') || '';
            if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
                return json({ error: 'unauthorized' }, 401);
            }
        }

        try {
            if (url.pathname === '/health') {
                return json({ ok: true, hasBucket: !!env.IMAGES });
            }
            if (url.pathname === '/upload' && request.method === 'POST') {
                return await handleUpload(request, env);
            }
            if (url.pathname === '/migrate' && request.method === 'POST') {
                return await handleMigrate(request, env);
            }
        } catch (e) {
            return json({ error: e.message || 'internal error' }, 500);
        }

        return json({ error: 'not found' }, 404);
    }
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

async function handleUpload(request, env) {
    const form = await request.formData();
    const main = form.get('main');
    const thumb = form.get('thumb');
    const hash = (form.get('hash') || '').trim();

    if (!main || !thumb) return json({ error: 'main e thumb sao obrigatorios' }, 400);
    if (!/^[a-f0-9]{64}$/.test(hash)) return json({ error: 'hash invalido' }, 400);
    if (main.type !== 'image/webp' || thumb.type !== 'image/webp') {
        return json({ error: 'apenas imagens webp sao aceitas' }, 415);
    }
    if (main.size > MAX_FILE_BYTES || thumb.size > MAX_FILE_BYTES) {
        return json({ error: 'imagem muito grande (max 5MB)' }, 413);
    }

    const mainKey = `produtos/${hash}.webp`;
    const thumbKey = `produtos/${hash}_thumb.webp`;
    const meta = {
        httpMetadata: {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000, immutable'
        }
    };

    const existingMain = await env.IMAGES.head(mainKey);
    const existingThumb = await env.IMAGES.head(thumbKey);
    if (!existingMain) {
        await env.IMAGES.put(mainKey, main.stream(), meta);
    }
    if (!existingThumb) {
        await env.IMAGES.put(thumbKey, thumb.stream(), meta);
    }

    return json({ ok: true, keys: [mainKey, thumbKey] });
}

async function handleMigrate(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return json({ error: 'json invalido' }, 400);
    }
    const files = Array.isArray(body.files) ? body.files : [];
    if (files.length === 0) return json({ error: 'files obrigatorio' }, 400);
    if (files.length > 1000) return json({ error: 'maximo de 1000 arquivos por chamada' }, 400);

    const results = [];
    for (const f of files) {
        const dest = typeof f.destPath === 'string' ? f.destPath : '';
        const src = typeof f.sourceUrl === 'string' ? f.sourceUrl : '';
        const res = { destPath: dest, ok: false };

        if (!/^produtos\/[a-f0-9]+\.(webp)$/.test(dest)) {
            res.error = 'destPath invalido';
            results.push(res);
            continue;
        }
        if (!/^https:\/\/[^/]+\/storage\/v1\/object\/public\/produtos\/[a-f0-9]+\.webp$/.test(src)) {
            res.error = 'sourceUrl invalido';
            results.push(res);
            continue;
        }

        const existing = await env.IMAGES.head(dest);
        if (existing) {
            res.ok = true;
            res.skipped = true;
            results.push(res);
            continue;
        }

        const origin = await fetch(src);
        if (!origin.ok) {
            res.error = 'origem http ' + origin.status;
            results.push(res);
            continue;
        }

        const meta = {
            httpMetadata: {
                contentType: origin.headers.get('Content-Type') || 'image/webp',
                cacheControl: 'public, max-age=31536000, immutable'
            }
        };
        await env.IMAGES.put(dest, origin.body, meta);
        res.ok = true;
        results.push(res);
    }

    return json({ results });
}
