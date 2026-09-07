const SUPABASE_URL = 'https://lspvkbfesxqtdccbthyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcHZrYmZlc3hxdGRjY2J0aHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjczNzcsImV4cCI6MjA5OTM0MzM3N30.G4yCkazFSP-tBOg_lad7XqCdWpzz-6hp3Nyg6regjMQ';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// Proxy administrativo (Cloudflare Worker)
// Todas as operacoes sensiveis/escritas passam pelo Worker, que
// usa a service_role do Supabase. O cliente nunca detem esse poder.
// ============================================================
const ADMIN_WORKER_URL = 'https://cabral-r2-uploader.rafaelfrancocabral.workers.dev';

function getAdminToken() {
    try { return localStorage.getItem('cabral_session') || ''; } catch (e) { return ''; }
}

function clearAdminSession() {
    try {
        localStorage.removeItem('cabral_session');
        localStorage.removeItem('cabral_auth');
    } catch (e) {}
}

async function adminFetch(action, table, opts = {}) {
    const token = getAdminToken();
    if (!token) {
        return { data: null, error: { message: 'Sessao ausente. Faca login novamente.', code: 'no_session' } };
    }
    try {
        const resp = await fetch(ADMIN_WORKER_URL + '/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ action, table, ...opts })
        });
        let body = null;
        try { body = await resp.json(); } catch (e) {}
        if (resp.status === 401) {
            clearAdminSession();
            window.location.href = 'login.html';
            return { data: null, error: { message: 'Sessao expirada' } };
        }
        if (!resp.ok) {
            return { data: null, error: body || { message: 'Falha no admin (' + resp.status + ')' } };
        }
        return body || { data: null, error: null };
    } catch (e) {
        return { data: null, error: { message: e.message || 'Falha de rede' } };
    }
}

// Mini-ORM com API parecida com supabase-js (thenable).
function adminDb(table) {
    const ctx = {
        filters: [], orderBy: null, ascending: true, range: null,
        columns: '*', count: false, method: null, payload: null, onConflict: null
    };

    function addFilter(op, col, val) {
        ctx.filters.push([col, op, val]);
    }

    const builder = {
        select(cols, opts) {
            ctx.columns = (cols === undefined || cols === null) ? '*' : String(cols);
            if (opts && opts.count === 'exact') {
                ctx.count = true;
                ctx.method = 'count';
            }
            return builder;
        },
        eq(col, val) { addFilter('eq', col, val); return builder; },
        neq(col, val) { addFilter('neq', col, val); return builder; },
        gt(col, val) { addFilter('gt', col, val); return builder; },
        gte(col, val) { addFilter('gte', col, val); return builder; },
        lt(col, val) { addFilter('lt', col, val); return builder; },
        lte(col, val) { addFilter('lte', col, val); return builder; },
        ilike(col, val) { addFilter('ilike', col, val); return builder; },
        in(col, vals) { addFilter('in', col, vals); return builder; },
        not(col, op, vals) {
            if (op === 'in') addFilter('not.in', col, vals);
            else addFilter('neq', col, vals);
            return builder;
        },
        order(col, opts) {
            ctx.orderBy = col;
            ctx.ascending = !opts || opts.ascending !== false;
            return builder;
        },
        range(fromVal, toVal) {
            ctx.range = [fromVal, toVal];
            return builder;
        },
        insert(payload) { ctx.method = 'insert'; ctx.payload = payload; return builder; },
        upsert(payload, opts) {
            ctx.method = 'upsert';
            ctx.payload = payload;
            if (opts && opts.onConflict) ctx.onConflict = opts.onConflict;
            return builder;
        },
        update(payload) { ctx.method = 'update'; ctx.payload = payload; return builder; },
        delete() { ctx.method = 'delete'; return builder; },
        then(resolve, reject) {
            return execute().then(resolve, reject);
        }
    };

    async function execute() {
        if (ctx.method === 'count') {
            return adminFetch('count', table, { filters: ctx.filters });
        }
        if (ctx.method) {
            return adminFetch(ctx.method, table, {
                filters: ctx.filters,
                payload: ctx.payload,
                onConflict: ctx.onConflict
            });
        }
        return adminFetch('select', table, {
            columns: ctx.columns,
            filters: ctx.filters,
            orderBy: ctx.orderBy,
            ascending: ctx.ascending,
            range: ctx.range
        });
    }

    return builder;
}

const SUPABASE_PRODUCTS_TABLE = 'produtos';
const SUPABASE_CATEGORIES_TABLE = 'categorias';
const SUPABASE_SUBCATEGORIES_TABLE = 'subcategorias';
const SUPABASE_QUOTES_TABLE = 'orcamentos';
const SUPABASE_VISITORS_TABLE = 'visitantes';
const SUPABASE_VIEWS_TABLE = 'visualizacoes_produto';
const SUPABASE_STORAGE_BUCKET = 'produtos';
const SUPABASE_POPUPS_TABLE = 'popups';
const SUPABASE_SEARCH_CACHE_TABLE = 'busca_cache';
const SUPABASE_AI_SEARCHES_TABLE = 'buscas_ia';
const SUPABASE_COUPONS_TABLE = 'cupons';

// Visitors cache
let _visitorsCache = [];

async function loadVisitors() {
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await adminDb(SUPABASE_VISITORS_TABLE)
            .select('id, session_id, page, created_at')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar visitantes:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _visitorsCache = all;
    return _visitorsCache;
}

function getVisitors() {
    return _visitorsCache;
}

// Product views cache
let _viewsCache = [];

async function loadViews() {
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await adminDb(SUPABASE_VIEWS_TABLE)
            .select('id, produto_id, produto_nome, created_at')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar visualizações:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _viewsCache = all;
    return _viewsCache;
}

function getViews() {
    return _viewsCache;
}
