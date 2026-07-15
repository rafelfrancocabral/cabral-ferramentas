const SUPABASE_URL = 'https://lspvkbfesxqtdccbthyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcHZrYmZlc3hxdGRjY2J0aHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjczNzcsImV4cCI6MjA5OTM0MzM3N30.G4yCkazFSP-tBOg_lad7XqCdWpzz-6hp3Nyg6regjMQ';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SUPABASE_PRODUCTS_TABLE = 'produtos';
const SUPABASE_CATEGORIES_TABLE = 'categorias';
const SUPABASE_QUOTES_TABLE = 'orcamentos';
const SUPABASE_VISITORS_TABLE = 'visitantes';
const SUPABASE_VIEWS_TABLE = 'visualizacoes_produto';
const SUPABASE_STORAGE_BUCKET = 'produtos';
const SUPABASE_POPUPS_TABLE = 'popups';

// Visitors cache
let _visitorsCache = [];

async function loadVisitors() {
    const { data, error } = await db.from(SUPABASE_VISITORS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 9999);
    if (error) {
        console.error('Erro ao carregar visitantes:', error);
        return [];
    }
    _visitorsCache = data || [];
    return _visitorsCache;
}

function getVisitors() {
    return _visitorsCache;
}

// Product views cache
let _viewsCache = [];

async function loadViews() {
    const { data, error } = await db.from(SUPABASE_VIEWS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 9999);
    if (error) {
        console.error('Erro ao carregar visualizações:', error);
        return [];
    }
    _viewsCache = data || [];
    return _viewsCache;
}

function getViews() {
    return _viewsCache;
}
