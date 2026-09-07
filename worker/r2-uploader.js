// ============================================================
// Cloudflare Worker - API Cabral (R2 Upload + Login + Admin)
// ============================================================
// Instalar no painel da Cloudflare:
//  1. Dashboard Cloudflare -> Workers & Pages -> Create Worker.
//  2. Substitua o codigo pelo conteudo deste arquivo e clique em Deploy.
//  3. Em Settings > Variables and Secrets:
//     a) R2 Binding: IMAGES -> bucket R2 "produtos".
//     b) AUTH_USERS (SECRET): JSON com usuarios do dashboard. Ex:
//        [{"user":"admin@admin","pass":"SENHA_1"},{"user":"olavinho@admin","pass":"SENHA_2"}]
//     c) SESSION_SECRET (SECRET): string aleatoria p/ assinar o token de sessao.
//        Gere com: openssl rand -base64 32
//     d) SUPABASE_SERVICE_KEY (SECRET): chave service_role do Supabase
//        (Settings > API > service_role). Necessaria p/ o endpoint /admin.
//     e) SUPABASE_URL (plain text, opcional): URL do Supabase. Se vazio,
//        usa o valor padrao ja embutido abaixo.
//     f) UPLOAD_SECRET (opcional, legado): continua ok para /upload e /migrate,
//        mas o dashboard agora envia o token de sessao no lugar.
//  4. Bucket R2 "produtos": Public Access (r2.dev) habilitado.
//  5. /login e PUBLICO (sem secret) e valida contra AUTH_USERS. Retorna um
//     token de sessao (HMAC) usado depois em /admin, /upload e /migrate.
// ============================================================

const DEFAULT_SUPABASE_URL = 'https://lspvkbfesxqtdccbthyk.supabase.co';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const ADMIN_TABLES = new Set([
    'produtos', 'categorias', 'subcategorias', 'cupons', 'popups',
    'orcamentos', 'visitantes', 'visualizacoes_produto', 'buscas_ia'
]);
const ADMIN_ACTIONS = new Set(['select', 'insert', 'update', 'upsert', 'delete', 'count']);

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

// ------------------------------------------------------------
// Sessao (token HMAC assinado)
// ------------------------------------------------------------
async function signSession(user, secret) {
    try {
        const payload = btoa(JSON.stringify({
            u: user,
            e: Math.floor(Date.now() / 1000) + 86400
        }));
        const key = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
        const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
        return `${payload}.${sigB64}`;
    } catch (e) {
        return null;
    }
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

async function verifySession(token, secret) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 2) return null;
        const [p, s] = parts;
        const key = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
        );
        const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(p));
        const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
        if (!timingSafeEqual(sigB64, s)) return null;
        const payload = JSON.parse(atob(p));
        if (!payload.e || payload.e < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

// Autoriza: retorna { mode:'session', user } (token) ou { mode:'secret' } (UPLOAD_SECRET)
async function authorize(request, env) {
    const auth = request.headers.get('Authorization') || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token) return null;
    if (env.UPLOAD_SECRET && token === env.UPLOAD_SECRET) return { mode: 'secret' };
    if (env.SESSION_SECRET) {
        const session = await verifySession(token, env.SESSION_SECRET);
        if (session) return { mode: 'session', user: session.u };
    }
    return null;
}

// ------------------------------------------------------------
// Login (publico): valida AUTH_USERS e emite token de sessao
// ------------------------------------------------------------
async function handleLogin(request, env) {
    if (!env.AUTH_USERS) return json({ ok: false, error: 'not_configured' }, 503);
    if (!env.SESSION_SECRET) return json({ ok: false, error: 'session_not_configured' }, 503);

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return json({ ok: false, error: 'bad_request' }, 400);
    }

    const user = typeof body.user === 'string' ? body.user.trim().toLowerCase() : '';
    const pass = typeof body.pass === 'string' ? body.pass : '';
    if (!user || !pass) return json({ ok: false, error: 'missing_fields' }, 400);

    let users = [];
    try {
        users = JSON.parse(env.AUTH_USERS);
    } catch (e) {
        return json({ ok: false, error: 'server_config' }, 500);
    }
    if (!Array.isArray(users)) return json({ ok: false, error: 'server_config' }, 500);

    const valid = users.some(u =>
        String(u.user || '').trim().toLowerCase() === user &&
        String(u.pass || '') === pass
    );

    // Pequeno atraso para reduzir velocidade de brute force.
    await new Promise(r => setTimeout(r, 300));

    if (!valid) return json({ ok: false, error: 'invalid_credentials' }, 401);

    const token = await signSession(user, env.SESSION_SECRET);
    if (!token) return json({ ok: false, error: 'session_error' }, 500);
    return json({ ok: true, token, expiresIn: 86400 });
}

// ------------------------------------------------------------
// Admin: proxy para o Supabase com service_role (requer sessao)
// ------------------------------------------------------------
function validColumnsList(cols) {
    if (cols === '*') return true;
    const parts = String(cols).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return false;
    for (const c of parts) {
        if (!/^[a-z_][a-z0-9_]*$/i.test(c)) return false;
    }
    return true;
}

async function handleAdmin(request, env) {
    const auth = await authorize(request, env);
    if (!auth || auth.mode !== 'session') return json({ error: 'unauthorized' }, 401);
    if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'service_key_not_configured' }, 503);

    let body;
    try {
        body = await request.json();
    } catch (e) {
        return json({ error: 'bad_request' }, 400);
    }
    body = body || {};

    const table = body.table;
    const action = body.action;
    if (!ADMIN_TABLES.has(table)) return json({ error: 'table_forbidden' }, 403);
    if (!ADMIN_ACTIONS.has(action)) return json({ error: 'action_forbidden' }, 403);

    const baseUrl = (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
    const url = new URL(`${baseUrl}/rest/v1/${table}`);
    const headers = {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
    };

    // Filtros -> query params do PostgREST
    const filters = Array.isArray(body.filters) ? body.filters : [];
    for (const f of filters) {
        if (!Array.isArray(f) || f.length < 2) continue;
        const [col, op] = f;
        const val = f[2];
        if (!/^[a-z_][a-z0-9_]*$/i.test(String(col))) return json({ error: 'invalid_column' }, 400);
        const scalarOps = { eq: 'eq', neq: 'neq', gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte', ilike: 'ilike', like: 'like' };
        if (scalarOps[op]) {
            url.searchParams.append(String(col), `${scalarOps[op]}.${String(val)}`);
        } else if (op === 'in' || op === 'not.in') {
            const arr = Array.isArray(val) ? val : [val];
            url.searchParams.append(String(col), `${op}.(${arr.map(v => String(v)).join(',')})`);
        } else {
            return json({ error: 'invalid_op' }, 400);
        }
    }

    // COUNT (lightweight, para badges/painel)
    if (action === 'count') {
        url.searchParams.set('select', 'id');
        const resp = await fetch(url, {
            method: 'HEAD',
            headers: { ...headers, Prefer: 'count=exact', Range: '0-0' }
        });
        if (!resp.ok) return json({ count: 0, error: `supabase ${resp.status}` }, 500);
        const cr = resp.headers.get('content-range') || '';
        const parts = cr.split('/');
        const count = parts.length === 2 ? parseInt(parts[1], 10) : 0;
        return json({ count: isNaN(count) ? 0 : count, error: null });
    }

    const returning = 'return=representation';
    let resp;

    switch (action) {
        case 'select': {
            const cols = String(body.columns || '*');
            if (!validColumnsList(cols)) return json({ error: 'invalid_column' }, 400);
            url.searchParams.set('select', cols);
            if (body.orderBy && /^[a-z_][a-z0-9_]*$/i.test(String(body.orderBy))) {
                const dir = body.ascending === false ? 'desc' : 'asc';
                url.searchParams.append('order', `${body.orderBy}.${dir}`);
            }
            if (Array.isArray(body.range) && body.range.length === 2) {
                const from = Math.max(0, parseInt(body.range[0], 10) || 0);
                const to = Math.max(0, parseInt(body.range[1], 10) || 0);
                url.searchParams.set('offset', String(from));
                url.searchParams.set('limit', String(Math.max(1, to - from + 1)));
            }
            resp = await fetch(url, { headers });
            if (!resp.ok) return json({ data: null, error: { message: `supabase ${resp.status}` } }, resp.status);
            const data = await resp.json();
            return json({ data, error: null });
        }
        case 'insert':
        case 'upsert': {
            if (action === 'upsert') {
                if (body.onConflict) url.searchParams.set('on_conflict', String(body.onConflict));
                headers['Prefer'] = `${returning},resolution=merge-duplicates`;
            } else {
                headers['Prefer'] = returning;
            }
            resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body.payload || {}) });
            break;
        }
        case 'update': {
            headers['Prefer'] = returning;
            resp = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body.payload || {}) });
            break;
        }
        case 'delete': {
            resp = await fetch(url, { method: 'DELETE', headers });
            break;
        }
        default:
            return json({ error: 'action_forbidden' }, 403);
    }

    if (!resp.ok) {
        let msg = `supabase ${resp.status}`;
        try {
            const j = await resp.json();
            if (j && j.message) msg = j.message;
        } catch (e) {}
        return json({ data: null, error: { message: msg } }, resp.status);
    }

    let out = null;
    if (action === 'insert' || action === 'upsert' || action === 'update') {
        try {
            out = await resp.json();
        } catch (e) {}
    }
    return json({ data: out, error: null });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        // Login endpoint is PUBLIC.
        if (url.pathname === '/login' && request.method === 'POST') {
            return await handleLogin(request, env);
        }

        // /admin exige sessao valida (login real).
        if (url.pathname === '/admin') {
            return await handleAdmin(request, env);
        }

        // Demais endpoints aceitam sessao valida OU UPLOAD_SECRET.
        const auth = await authorize(request, env);
        if (!auth) {
            return json({ error: 'unauthorized' }, 401);
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