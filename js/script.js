// ===========================
// Particles Background
// ===========================
function getThumbUrl(url) {
    if (!url || !url.includes('.webp')) return url;
    return url.replace('.webp', '_thumb.webp');
}
function getMainUrl(url) {
    if (!url) return url;
    return url.replace('_thumb.webp', '.webp');
}
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const count = window.innerWidth < 768 ? 20 : 40;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = particle.style.height = (Math.random() * 3 + 1) + 'px';
        particle.style.animationDuration = (Math.random() * 10 + 8) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        particle.style.opacity = Math.random() * 0.5 + 0.1;
        container.appendChild(particle);
    }
}
createParticles();

// ===========================
// Navbar Scroll Effect
// ===========================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===========================
// Mobile Menu
// ===========================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('active');
        navLinks.classList.remove('active');
        if (link.getAttribute('href') === '#produtos') {
            setTimeout(() => renderCatalog('all'), 100);
        }
    });
});

// ===========================
// Scroll Reveal Animation
// ===========================
function initScrollReveal() {
    const elements = document.querySelectorAll(
        '.about-card, .product-card, .contact-card, .feedback-card, .section-header, .ai-chat-box, .social-section'
    );
    elements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => observer.observe(el));
}
initScrollReveal();

// ===========================
// AI Assistant - Conversational Funnel
// ===========================
const aiInput = document.getElementById('aiInput');
const aiSendBtn = document.getElementById('aiSendBtn');
const aiMessages = document.getElementById('aiMessages');

const AI_SYSTEM_PROMPT = `Sua função é interpretar a intenção do cliente e transformar a mensagem em uma busca textual altamente eficaz no Supabase.
Você só pode usar produtos existentes no catálogo.
Nunca invente produtos.
Nunca sugira itens que não existam.

1. Interpretação da intenção (NLP)
Sempre analise a mensagem do cliente e identifique:
– o que ele quer comprar
– a categoria provável
– a marca provável
– o problema que quer resolver
– o projeto que quer executar
– sinônimos e termos relacionados

2. Expansão semântica (sem vetores)
Gere automaticamente:
– sinônimos
– termos equivalentes
– variações comuns de busca
– palavras relacionadas
Exemplo: "furadeira" → "perfurar", "broca", "parafusar", "ferramenta elétrica".

3. Conversão da intenção em consulta de busca
Transforme a intenção em uma consulta textual combinando:
– descrição
– categoria
– marca
– palavras‑chave
– sinônimos gerados
Use todos esses termos na busca interna do Supercode.

4. Regras de busca no Supabase
A busca deve considerar:
– nome
– descrição
– categoria
– marca
– palavras‑chave
– tags
Combine todos os campos para maximizar relevância.
Nunca retorne produtos sem relação com a intenção.

5. Regras de relevância
Priorize produtos que:
– correspondem à intenção principal
– pertencem à categoria identificada
– possuem palavras‑chave relacionadas
– aparecem em mais de um campo (ex.: descrição + palavras‑chave)

6. Quando o cliente abrir um produto
Mostre:
– nome
– marca
– descrição curta
– preço
– botão "Ver produto"
Depois sugira apenas complementos úteis, nunca similares.
Exemplo: furadeira → brocas, óculos de proteção, extensão elétrica.

7. Quando nenhum produto for encontrado
Diga:
"Nenhum produto encontrado para esta busca. Deseja tentar outra palavra?"

8. Proibições
– Não inventar produtos
– Não sugerir itens fora do catálogo
– Não responder com informações externas
– Não criar produtos fictícios

Objetivo final:
Ajudar o cliente a encontrar exatamente o que procura, usando busca textual inteligente, interpretação de intenção e expansão semântica.`;

const RELATED_PRODUCTS_MAP = {
    'tinta': ['pincel', 'rolo', 'bandeja', 'fita crepe', 'lixa', 'seladora', 'massa corrida', 'primer'],
    'furadeira': ['broca', 'oculos', 'bucha', 'parafuso', 'extensao'],
    'chave de fenda': ['jogo de chaves', 'alicate', 'maleta'],
    'martelo': ['cravo', 'prego', 'chave de fenda'],
    'serra': ['lamina', 'oculos', 'luva', 'regua'],
    'alicate': ['chave de fenda', 'jogo de chaves', 'fita isolante'],
    'lixadeira': ['lixa', 'oculos', 'mascara', 'luva'],
    'soldador': ['eletrodo', 'mascara', 'luva', 'massa'],
    'nivel': ['trena', 'prumo', 'regua'],
    'compressora': ['pistola', 'mangueira', 'acessorios'],
    'torneira': ['chave inglesa', 'veda rosca', 'fita teflon', 'chave grifo'],
    'vazamento': ['chave grifo', 'selante', 'veda rosca', 'conexao', 'tubo'],
    'pintura': ['pincel', 'rolo', 'bandeja', 'fita crepe', 'lixa'],
    'jardinagem': ['tesoura', 'enxada', 'regador', 'mangueira', 'aspersor'],
    'marcenaria': ['serra', 'formao', 'esquadro', 'lixa', 'sargento'],
    'mecanico': ['chave catraca', 'soquete', 'desengripante', 'jogo de chaves']
};

let aiSearchContext = null;
let _aiLastSearch = null;

function addAiMsg(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-bot'}`;
    const avatar = isUser
        ? '<div class="ai-msg-avatar"><i class="fas fa-user"></i></div>'
        : '<div class="ai-msg-avatar"><i class="fas fa-compass"></i></div>';
    div.innerHTML = `${avatar}<div class="ai-msg-bubble">${text}</div>`;
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return div;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-bot';
    div.id = 'aiTyping';
    div.innerHTML = '<div class="ai-msg-avatar"><i class="fas fa-compass"></i></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function removeTyping() {
    document.getElementById('aiTyping')?.remove();
}

function normalize(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// ===========================
// Motor de busca do assistente (indexado via AiSearch)
// ===========================
const AI_RESULT_LIMIT = 8;
const AI_CATALOG_LIMIT = 2000;
const AI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AI_LOCAL_CACHE_KEY = 'cabral_ai_search_v3';

let _catalogSearchPool = null;
let _aiIndex = null;

async function getAiIndex() {
    if (!_aiIndex) {
        const pool = await ensureCatalogSearchPool();
        _aiIndex = AiSearch.buildSearchIndex(pool);
    }
    return _aiIndex;
}

function buildSearchCacheKey(query) {
    return AiSearch.normalize(query);
}

async function ensureCatalogSearchPool() {
    if (_catalogSearchPool) return _catalogSearchPool;
    const PAGE_SIZE = 1000;
    const fields = 'id, codigo, nome, marca, categoria, subcategoria, preco, unidade, imagens, palavraschave, visivel, estoque, isdestaque, ispromocao, precopromocional';
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select(fields)
            .eq('visivel', true)
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar pool de busca:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _catalogSearchPool = all;
    return _catalogSearchPool;
}

// ---- Cache híbrido (localStorage + Supabase) ----
function getAiLocalCache() {
    try { return JSON.parse(localStorage.getItem(AI_LOCAL_CACHE_KEY)) || {}; } catch (e) { return {}; }
}

function saveAiLocalCache(cache) {
    try {
        const keys = Object.keys(cache);
        if (keys.length > 300) {
            const sorted = keys.slice().sort((a, b) => (cache[b].ts || 0) - (cache[a].ts || 0)).slice(0, 300);
            const trimmed = {};
            for (const k of sorted) trimmed[k] = cache[k];
            cache = trimmed;
        }
        localStorage.setItem(AI_LOCAL_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
}

async function fetchSearchCacheRow(key) {
    try {
        const { data, error } = await db
            .from(SUPABASE_SEARCH_CACHE_TABLE)
            .select('query_normalized, result_codigos, total, hits')
            .eq('query_normalized', key)
            .limit(1);
        if (error || !data || data.length === 0) return null;
        return data[0];
    } catch (e) { return null; }
}

async function saveSearchCacheRow(key, terms, codigos) {
    try {
        await db.from(SUPABASE_SEARCH_CACHE_TABLE).upsert({
            query_normalized: key,
            termos: (terms || []).join(' '),
            result_codigos: JSON.stringify(codigos),
            total: codigos.length,
            updated_at: new Date().toISOString()
        }, { onConflict: 'query_normalized' });
    } catch (e) {}
}

async function bumpSearchCacheHits(key, hits) {
    try {
        await db.from(SUPABASE_SEARCH_CACHE_TABLE)
            .update({ hits: (hits || 0) + 1, updated_at: new Date().toISOString() })
            .eq('query_normalized', key);
    } catch (e) {}
}

function resolveCachedAiProducts(codigos, index) {
    if (!Array.isArray(codigos)) return [];
    const out = [];
    for (const c of codigos) {
        const p = index.byCode.get(c);
        if (p) out.push(p);
        if (out.length >= AI_RESULT_LIMIT) break;
    }
    return out;
}

async function searchCatalog(query, category, limit) {
    limit = limit || AI_RESULT_LIMIT;
    const q = AiSearch.normalize(query);
    const cacheKey = buildSearchCacheKey(q);
    const index = await getAiIndex();
    const rawTerms = AiSearch.extractKeywords(q);
    if (rawTerms.length === 0) return [];

    // Buscas completas (ex.: "ver todos no catálogo") não usam cache — pegam o conjunto inteiro
    if (limit !== AI_RESULT_LIMIT) {
        return AiSearch.searchIndex(index, q, category, limit);
    }

    // 1) Cache local (instantâneo no navegador)
    const localCache = getAiLocalCache();
    const cached = localCache[cacheKey];
    if (cached && Array.isArray(cached.codigos) && Date.now() - (cached.ts || 0) < AI_CACHE_TTL_MS) {
        const resolved = resolveCachedAiProducts(cached.codigos, index);
        if (resolved.length > 0) return resolved;
    }

    // 2) Cache compartilhado (Supabase — aprende com todos os clientes)
    const row = await fetchSearchCacheRow(cacheKey);
    if (row) {
        let codigos = [];
        try { codigos = JSON.parse(row.result_codigos || '[]'); } catch (e) {}
        const resolved = resolveCachedAiProducts(codigos, index);
        if (resolved.length > 0) {
            localCache[cacheKey] = { codigos, ts: Date.now() };
            saveAiLocalCache(localCache);
            bumpSearchCacheHits(cacheKey, row.hits || 0);
            return resolved;
        }
    }

    // 3) Busca indexada (exato + prefixo + fuzzy + sinônimos)
    const results = AiSearch.searchIndex(index, q, category, limit);
    const codigos = results.map(p => p.codigo).filter(Boolean);
    localCache[cacheKey] = { codigos, ts: Date.now() };
    saveAiLocalCache(localCache);
    if (codigos.length > 0) saveSearchCacheRow(cacheKey, rawTerms, codigos);
    return results;
}

function extractKeywords(text) {
    return AiSearch.extractKeywords(text);
}

function detectCategory(text) {
    const n = normalize(text);
    const categories = {
        'tinta': ['tinta', 'pintura', 'pintar', 'cor', 'pincel', 'rolo', 'verniz', 'seladora', 'massa corrida', 'primer'],
        'broca': ['broca', 'perfurar', 'furar', 'furo'],
        'eletrica': ['eletric', 'fio', 'cabo', 'disjuntor', 'tomada', 'interruptor', 'quadro', 'lampada', 'led'],
        'hidraulica': ['hidraulic', 'tubo', 'cano', 'agua', 'vazamento', 'registro', 'bomba', 'pvc', 'torneira'],
        'ferro': ['ferro', 'aco', 'metal', 'inox', 'solda', 'eletrodo'],
        'madeira': ['madeira', 'compensado', 'mdf', 'movel', 'serra', 'lixadeira', 'plaina'],
        'concreto': ['concreto', 'cimento', 'alvenaria', 'tijolo', 'bloco', 'areia', 'brita', 'argamassa', 'rejunte'],
        'porcelanato': ['porcelanato', 'ceramica', 'piso', 'azulejo', 'revestimento'],
        '_epi': ['epi', 'capacete', 'luva', 'oculos', 'seguranca', 'cinto', 'bota', 'mascara', 'protetor'],
        'jardim': ['jardim', 'mangueira', 'regador', 'planta', 'grama', 'adubo'],
        'limpeza': ['limpeza', 'limpar', 'desinfetante', 'detergente', 'balde', 'vassoura']
    };
    for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(kw => n.includes(kw))) return cat;
    }
    return null;
}

const aiVagueKeywords = {
    'kit': 'Temos vários kits. Qual tipo? (chaves, brocas, ferramentas em geral...)',
    'rolo': 'Que tipo de rolo? (tinta, lã de carneiro, espuma, textura...)',
    'broca': 'Qual tipo de broca? (concreto, madeira, metal, vídea, aço rápido...)',
    'chave': 'Qual chave? (fenda, philips, sextavado, allen, combinada, soquete...)',
    'serra': 'Qual serra? (mármore, circular, sabre, copo, tico-tico...)',
    'lixa': 'Qual lixa? (grão baixo ou alto, tela, ferro, madeira...)',
    'tinta': 'Qual tipo de tinta? (látex, acrílica, esmalte, spray...)',
    'parafuso': 'Qual parafuso? (madeira, máquina, chipboard, bucha...)',
    'martelo': 'Qual tipo? (unha, borracha, marreta...)',
    'pincel': 'Qual pincel? (cerda, trincha, pincel para pintura...)',
    'ferramenta': 'Temos muitas ferramentas. Pode dizer qual? (furadeira, parafusadeira, serra, chave...)',
    'ferramentas': 'Temos muitas ferramentas. Pode dizer qual? (furadeira, parafusadeira, serra, chave...)',
    'disco': 'Qual disco? (corte, desbaste, diamantado, serra...)'
};

function aiVagueMatch(keywords) {
    for (const kw of keywords) {
        if (aiVagueKeywords[kw]) return kw;
    }
    return null;
}

function hasGreeting(text) {
    return /^(ola|bom dia|boa noite|boa tarde|hello|hi|fala|eai|e ai|salve)/.test(normalize(text));
}

function handleAiInput() {
    const val = aiInput.value.trim();
    if (!val) return;

    addAiMsg(val, true);
    aiInput.value = '';

    showTyping();

    setTimeout(() => {
        removeTyping();

        const keywords = AiSearch.extractKeywords(val);
        const category = detectCategory(val);
        const hasGreet = hasGreeting(val);
        const context = (aiSearchContext && (Date.now() - aiSearchContext.ts) < 180000) ? aiSearchContext : null;

        if (keywords.length === 0) {
            if (hasGreet) {
                addAiMsg('Olá, sou o Cabral. Nosso catálogo tem centenas de itens. Diga o que precisa e eu faço a busca por você — descrição, marca, categoria ou palavras‑chave.');
            } else {
                addAiMsg('Para te ajudar melhor, pode me dizer <strong>qual produto</strong> precisa? Pode ser o nome, o uso ou até uma descrição.<br><br><em>Exemplo: "furadeira Bosch", "tinta para parede", "kit de chaves"</em>');
            }
            return;
        }

        // Busca direta: 1+ palavras específicas. Só abre funil se for termo único e vago.
        const vague = keywords.length === 1 ? aiVagueMatch(keywords) : null;
        if (vague && !context) {
            aiSearchContext = { terms: keywords, category, ts: Date.now() };
            addAiMsg(aiVagueKeywords[vague]);
            return;
        }

        if (context) {
            aiSearchContext = null;
            performAiSearch([...new Set([...context.terms, ...keywords])], context.category || category);
            return;
        }

        performAiSearch(keywords, category);
    }, 900);
}

function performAiSearch(terms, category) {
    const query = terms.join(' ');
    _aiLastSearch = { query, category };
    addAiMsg('Buscando no catálogo...');
    setTimeout(async () => {
        try {
            const { products, matchedQuery, total } = await aiProgressiveSearch(query, category);
            if (products.length > 0) {
                let text;
                if (matchedQuery === query) {
                    text = `Encontrei <strong>${total}</strong> produto(s) para "<strong>${escapeHtml(query)}</strong>".`;
                } else {
                    text = `Não achei resultado exato para "<strong>${escapeHtml(query)}</strong>".<br>Encontrei <strong>${total}</strong> opção(ões) para "<strong>${escapeHtml(matchedQuery)}</strong>".`;
                }
                const msg = addAiMsg(text);
                appendAiCatalogButton(msg, '<i class="fas fa-th-large"></i> Ver todos no catálogo', async () => {
                    window.scrollToProduct();
                    try {
                        const last = _aiLastSearch;
                        const { products: all } = last
                            ? await aiProgressiveSearch(last.query, last.category, AI_CATALOG_LIMIT)
                            : { products: [] };
                        renderSearchResults(all);
                    } catch (e) {
                        addAiMsg('Ocorreu um erro ao abrir o catálogo. Tente novamente.');
                    }
                });
            } else {
                const msg = addAiMsg(`Não encontrei nada para "<strong>${escapeHtml(query)}</strong>" no catálogo.<br><br>Você pode reformular a busca com outros termos, ou navegar pelo catálogo completo abaixo.`);
                appendAiCatalogButton(msg, '<i class="fas fa-th-large"></i> Ver catálogo completo', () => window.scrollToProduct());
            }
        } catch (e) {
            console.error('Erro na busca do assistente:', e);
            addAiMsg('Ocorreu um erro na busca. Pode tentar novamente?');
        }
    }, 800);
}

async function aiProgressiveSearch(query, category, limit) {
    limit = limit || AI_RESULT_LIMIT;
    const index = await getAiIndex();
    const keywords = AiSearch.extractKeywords(query);
    if (keywords.length === 0) return { products: [], matchedQuery: query, total: 0 };

    const full = await searchCatalog(query, category, limit);
    if (full.length > 0) {
        const total = limit === AI_RESULT_LIMIT ? AiSearch.searchIndex(index, query, category, index.products.length).length : full.length;
        return { products: full, matchedQuery: query, total };
    }

    // Relaxa: remove os termos mais raros primeiro, mantendo os mais comuns
    const sorted = keywords.slice().sort((a, b) => AiSearch.termFrequency(index, b) - AiSearch.termFrequency(index, a));
    for (let keep = sorted.length - 1; keep >= 1; keep--) {
        const relaxed = sorted.slice(0, keep).join(' ');
        const res = await searchCatalog(relaxed, category, limit);
        if (res.length > 0) {
            const total = limit === AI_RESULT_LIMIT ? AiSearch.searchIndex(index, relaxed, category, index.products.length).length : res.length;
            return { products: res, matchedQuery: relaxed, total };
        }
    }
    return { products: [], matchedQuery: query, total: 0 };
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function appendAiCatalogButton(msg, html, onClick) {
    const bubble = msg.querySelector('.ai-msg-bubble');
    const btn = document.createElement('button');
    btn.className = 'ai-results-catalog-btn';
    btn.innerHTML = html;
    btn.onclick = onClick;
    bubble.appendChild(btn);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function renderSearchResults(products) {
    const secAll = document.getElementById('catalogAll');
    const allGrid = document.getElementById('gridAll');
    const secDestaques = document.getElementById('catalogDestaques');
    const secPromos = document.getElementById('catalogPromos');
    const empty = document.getElementById('catalogEmpty');
    if (!secAll || !allGrid) return;
    secDestaques.style.display = 'none';
    secPromos.style.display = 'none';
    secAll.style.display = '';
    if (products.length === 0) {
        allGrid.innerHTML = '';
        empty.style.display = '';
        empty.querySelector('p').textContent = 'Nenhum produto encontrado';
        empty.querySelector('span').textContent = 'Tente outras palavras-chave';
    } else {
        empty.style.display = 'none';
        secAll.querySelector('.catalog-subtitle').innerHTML = `<i class="fas fa-search"></i> ${products.length} resultado(s) encontrado(s)`;
        renderProductGrid(products, allGrid);
    }
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.scrollToProduct = function(productId) {
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

if (aiSendBtn) aiSendBtn.addEventListener('click', handleAiInput);
if (aiInput) {
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAiInput();
    });
}

// ===========================
// Smooth scroll for anchor links
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===========================
// Product card hover glow effect
// ===========================
document.querySelectorAll('.product-card, .about-card, .contact-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// ===========================
// Active nav link on scroll
// ===========================
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${current}`) {
            link.style.color = 'var(--accent)';
        }
    });
});

// ===========================
// Logo animation on hover
// ===========================
const logoIcon = document.querySelector('.logo-icon');
if (logoIcon) {
    logoIcon.addEventListener('mouseenter', () => {
        logoIcon.style.transform = 'rotate(360deg)';
        logoIcon.style.transition = 'transform 0.5s ease';
    });
    logoIcon.addEventListener('mouseleave', () => {
        logoIcon.style.transform = 'rotate(0deg)';
    });
}

// ===========================
// E-commerce Catalog
// ===========================
const CART_KEY = 'cabral_cart';

let _catalogProducts = [];
let _catalogCategories = [];
let _catalogAllLoaded = false;
let _catalogPage = 0;
let _categoryProductsCache = {};
let _categoryCounts = {};
const CATALOG_PAGE_SIZE = 100;

async function fetchCatalogProducts(initial = false) {
    if (_catalogAllLoaded && !initial) return _catalogProducts;

    if (initial) {
        const selectFields = 'id, codigo, nome, marca, categoria, subcategoria, preco, unidade, imagens, palavraschave, visivel, estoque, isdestaque, ispromocao, precopromocional';

        // 1) All destaque + promo
        const { data: promoData } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select(selectFields)
            .eq('visivel', true)
            .or('isdestaque.eq.true,ispromocao.eq.true')
            .order('id', { ascending: true });

        const promoProducts = (promoData || []).filter(p => p.visivel !== false);
        const usedIds = new Set(promoProducts.map(p => p.id));
        const usedCats = new Set(promoProducts.map(p => p.categoria).filter(Boolean));

        // 2) 1 representative per missing category (with photo preferred)
        const missingCats = _catalogCategories.filter(c => !usedCats.has(c.nome));
        const catRepresentatives = [];
        for (const cat of missingCats) {
            // Try with photo first
            let { data } = await db
                .from(SUPABASE_PRODUCTS_TABLE)
                .select(selectFields)
                .eq('visivel', true)
                .eq('categoria', cat.nome)
                .not('imagens', 'eq', '{}')
                .not('imagens', 'is', null)
                .limit(1);
            if (!data || data.length === 0) {
                // Fallback: any product from this category
                ({ data } = await db
                    .from(SUPABASE_PRODUCTS_TABLE)
                    .select(selectFields)
                    .eq('visivel', true)
                    .eq('categoria', cat.nome)
                    .limit(1));
            }
            if (data && data.length > 0 && !usedIds.has(data[0].id)) {
                catRepresentatives.push(data[0]);
                usedIds.add(data[0].id);
            }
        }

        // 3) Fill remaining slots from general pool
        const slotsLeft = CATALOG_PAGE_SIZE - promoProducts.length - catRepresentatives.length;
        let remainingProducts = [];
        if (slotsLeft > 0) {
            const { data } = await db
                .from(SUPABASE_PRODUCTS_TABLE)
                .select(selectFields)
                .eq('visivel', true)
                .order('id', { ascending: true })
                .range(0, CATALOG_PAGE_SIZE * 2);
            if (data) {
                remainingProducts = data
                    .filter(p => !usedIds.has(p.id))
                    .slice(0, slotsLeft);
            }
        }

        _catalogProducts = [...promoProducts, ...catRepresentatives, ...remainingProducts];
        _catalogAllLoaded = _catalogProducts.length < CATALOG_PAGE_SIZE;
        if (!_catalogAllLoaded) _catalogPage = 1;
    } else {
        const from = _catalogPage * CATALOG_PAGE_SIZE;
        const { data, error } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select('id, codigo, nome, marca, categoria, preco, unidade, imagens, palavraschave, visivel, estoque, isdestaque, ispromocao, precopromocional')
            .eq('visivel', true)
            .order('id', { ascending: true })
            .range(from, from + CATALOG_PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar catálogo:', error); return _catalogProducts; }
        if (!data || data.length === 0) { _catalogAllLoaded = true; return _catalogProducts; }
        _catalogProducts = _catalogProducts.concat(data);
        if (data.length < CATALOG_PAGE_SIZE) _catalogAllLoaded = true;
        else _catalogPage++;
    }
    return _catalogProducts;
}

async function fetchCatalogCategories() {
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_CATEGORIES_TABLE)
            .select('id, nome')
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar categorias:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _catalogCategories = all;
    return _catalogCategories;
}

function getCatalogProducts() {
    return _catalogProducts;
}

function getCatalogCategories() {
    return _catalogCategories;
}

async function fetchCategoryCounts() {
    const PAGE_SIZE = 1000;
    let from = 0;
    const counts = {};
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select('categoria')
            .eq('visivel', true)
            .range(from, from + PAGE_SIZE - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        data.forEach(p => { if (p.categoria) counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _categoryCounts = counts;
    return counts;
}

async function fetchCategoryProducts(category) {
    if (_categoryProductsCache[category]) return _categoryProductsCache[category];
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select('id, codigo, nome, marca, categoria, preco, unidade, imagens, palavraschave, visivel, estoque, isdestaque, ispromocao, precopromocional')
            .eq('categoria', category)
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar categoria:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data.filter(p => p.visivel !== false));
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _categoryProductsCache[category] = all;
    return all;
}

function normalizeProduct(p) {
    return {
        ...p,
        palavrasChave: p.palavraschave || p.palavrasChave || [],
        isDestaque: p.isdestaque || p.isDestaque || false,
        isPromocao: p.ispromocao || p.isPromocao || false,
        precoPromocional: p.precopromocional || p.precoPromocional || 0
    };
}

function getCart() {
    const data = localStorage.getItem(CART_KEY);
    if (!data) return [];
    try { return JSON.parse(data); } catch(e) { return []; }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
renderCartSidebar();

window.debugSearch = async function(q) {
    const products = await ensureCatalogSearchPool();
    console.log('Total produtos:', products.length);
    products.forEach(p => {
        const kw = p.palavraschave || p.palavrasChave || [];
        if (kw.length > 0) {
            console.log(p.nome, '→', kw);
        }
    });
    if (q) {
        console.log('--- Busca: "' + q + '" ---');
        const results = await searchCatalog(q);
        results.forEach(p => console.log('  ✓', p.nome));
        if (results.length === 0) console.log('  ✗ Nenhum resultado');
    }
};
}

function updateCartBadge() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function formatPrice(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function unitLabel(unit) {
    const u = (unit || '').trim();
    return u ? '/' + u.toLowerCase() : '';
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function renderCatalog(filter = 'all') {
    const products = getCatalogProducts();
    const allCategories = getCatalogCategories();
    const dropdownList = document.getElementById('catalogDropdownList');
    const dropdownLabel = document.getElementById('catalogDropdownLabel');
    const dropdownBtn = document.getElementById('catalogDropdownBtn');
    const destaques = document.getElementById('gridDestaques');
    const promos = document.getElementById('gridPromos');
    const allGrid = document.getElementById('gridAll');
    const secDestaques = document.getElementById('catalogDestaques');
    const secPromos = document.getElementById('catalogPromos');
    const secAll = document.getElementById('catalogAll');
    const empty = document.getElementById('catalogEmpty');

    if (!dropdownList || !allGrid) return;

    const catCounts = _categoryCounts;
    const totalProducts = Object.values(catCounts).reduce((s, c) => s + c, 0);
    const cats = allCategories.map(c => c.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    dropdownList.innerHTML = `<div class="catalog-dropdown-item${filter === 'all' ? ' active' : ''}" data-cat="all"><i class="fas fa-th-large"></i> Todas as Categorias<span class="cat-count">${totalProducts}</span></div>`;
    cats.forEach(cat => {
        const count = catCounts[cat] || 0;
        dropdownList.innerHTML += `<div class="catalog-dropdown-item${filter === cat ? ' active' : ''}" data-cat="${cat}"><i class="fas fa-tag"></i> ${cat}<span class="cat-count">${count}</span></div>`;
    });

    if (filter === 'all') {
        dropdownLabel.textContent = 'Todas as Categorias';
    } else {
        dropdownLabel.textContent = filter;
    }

    dropdownList.querySelectorAll('.catalog-dropdown-item').forEach(item => {
        item.addEventListener('click', async () => {
            dropdownList.querySelectorAll('.catalog-dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            dropdownLabel.textContent = item.dataset.cat === 'all' ? 'Todas as Categorias' : item.dataset.cat;
            dropdownBtn.classList.remove('open');
            dropdownList.classList.remove('open');
            if (item.dataset.cat !== 'all') {
                allGrid.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--accent);"></i><p style="margin-top:8px;color:var(--text-muted);">Carregando produtos...</p></div>';
                secAll.style.display = '';
                secDestaques.style.display = 'none';
                secPromos.style.display = 'none';
            }
            await renderCatalog(item.dataset.cat);
        });
    });

    if (dropdownBtn) {
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            dropdownBtn.classList.toggle('open');
            dropdownList.classList.toggle('open');
        };
    }

    let filtered;
    if (filter === 'all') {
        filtered = [...products];
    } else {
        filtered = await fetchCategoryProducts(filter);
    }

    if (filtered.length === 0) {
        secDestaques.style.display = 'none';
        secPromos.style.display = 'none';
        secAll.style.display = '';
        secAll.querySelector('.catalog-subtitle').innerHTML = `<i class="fas fa-tag"></i> ${filter === 'all' ? 'Produtos' : filter}`;
        allGrid.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;"><i class="fas fa-box-open" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:8px;"></i>Nenhum produto encontrado${filter !== 'all' ? ' nesta categoria' : ''}</div>`;
        return;
    }

    empty.style.display = 'none';
    filtered.sort((a, b) => {
        const aPriority = (a.isdestaque || a.isDestaque) ? 2 : (a.ispromocao || a.isPromocao) ? 1 : 0;
        const bPriority = (b.isdestaque || b.isDestaque) ? 2 : (b.ispromocao || b.isPromocao) ? 1 : 0;
        if (bPriority !== aPriority) return bPriority - aPriority;
        const aHasImg = a.imagens && a.imagens.length > 0 ? 1 : 0;
        const bHasImg = b.imagens && b.imagens.length > 0 ? 1 : 0;
        if (bHasImg !== aHasImg) return bHasImg - aHasImg;
        return Math.random() - 0.5;
    });
    secDestaques.style.display = 'none';
    secPromos.style.display = 'none';
    secAll.style.display = '';
    secAll.querySelector('.catalog-subtitle').innerHTML = filter === 'all' ? '<i class="fas fa-boxes-stacked"></i> Produtos' : `<i class="fas fa-tag"></i> ${filter}`;
    renderProductGrid(filtered, document.getElementById('gridAll'));
    const loader = document.getElementById('catalogLoadMore');
    if (loader) loader.style.display = (filter === 'all' && !_catalogAllLoaded) ? '' : 'none';
}

(function initCatalogDropdown() {
    document.addEventListener('click', (e) => {
        const btn = document.getElementById('catalogDropdownBtn');
        const list = document.getElementById('catalogDropdownList');
        if (btn && list && !btn.contains(e.target) && !list.contains(e.target)) {
            btn.classList.remove('open');
            list.classList.remove('open');
        }
    });
})();

function renderProductGrid(products, container, append = false) {
    if (!container) return;
    if (!append) container.innerHTML = '';

    products.forEach(rawProduct => {
        const product = normalizeProduct(rawProduct);
        const hasPromo = product.isPromocao && product.precoPromocional > 0;
        const price = hasPromo ? product.precoPromocional : product.preco;
        const img = (product.imagens && product.imagens.length > 0) ? product.imagens[0].replace('.webp', '_thumb.webp') : '';
        const stockClass = product.estoque <= 0 ? 'out' : '';

        const badges = [];
        if (product.isDestaque) badges.push('<span class="catalog-badge destaque"><i class="fas fa-star"></i> Destaque</span>');
        if (product.isPromocao) badges.push('<span class="catalog-badge promo"><i class="fas fa-fire"></i> Promoção</span>');

        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = `
            <div class="catalog-card-img" onclick="openProductModal(${product.id})">
                ${img ? `<img src="${img}" alt="${product.nome}" loading="lazy" onerror="this.onerror=null;this.src='${product.imagens[0]}'">` : '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-image" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:8px;"></i> Sem imagem</div>'}
                ${badges.length ? `<div class="catalog-card-badges">${badges.join('')}</div>` : ''}
            </div>
            <div class="catalog-card-body">
                <span class="catalog-card-cat">${product.categoria || ''}</span>
                <span class="catalog-card-code">${product.codigo ? 'CÓD ' + product.codigo : ''}</span>
                <h4 class="catalog-card-name" onclick="openProductModal(${product.id})" style="cursor:pointer;">${product.nome}</h4>
                <span class="catalog-card-brand">${product.marca || ''}</span>
                <div class="catalog-card-pricing">
                    ${hasPromo ? `<span class="catalog-card-price-old">${formatPrice(product.preco)}</span>` : ''}
                    <span class="catalog-card-price ${hasPromo ? '' : 'no-promo'}">${formatPrice(price)}</span>
                    <span class="catalog-card-unit">${unitLabel(product.unidade)}</span>
                </div>
                <div class="catalog-card-actions" onclick="event.stopPropagation()">
                    <div class="catalog-qty">
                        <button onclick="event.stopPropagation();catalogQtyChange(this, -1)"><i class="fas fa-minus"></i></button>
                        <input type="number" value="1" min="1" max="${product.estoque || 99}" data-pid="${product.id}">
                        <button onclick="event.stopPropagation();catalogQtyChange(this, 1)"><i class="fas fa-plus"></i></button>
                    </div>
                    <button class="btn-add-cart" onclick="event.stopPropagation();addToCart(${product.id}, this)" ${product.estoque <= 0 ? 'disabled style="opacity:0.4;pointer-events:none;"' : ''}>
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.catalogQtyChange = function(btn, delta) {
    const input = btn.parentElement.querySelector('input');
    let val = parseInt(input.value) || 1;
    val = Math.max(1, Math.min(parseInt(input.max) || 99, val + delta));
    input.value = val;
};

window.addToCart = function(productId, btnEl) {
    const products = getCatalogProducts();
    const rawProduct = products.find(p => p.id === productId);
    if (!rawProduct || rawProduct.estoque <= 0) return;
    const product = normalizeProduct(rawProduct);

    const card = btnEl.closest('.catalog-card');
    const qtyInput = card.querySelector('.catalog-qty input');
    const qty = parseInt(qtyInput.value) || 1;

    const cart = getCart();
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.qty = Math.min(existing.qty + qty, product.estoque);
    } else {
        const img = (product.imagens && product.imagens.length > 0) ? product.imagens[0].replace('.webp', '_thumb.webp') : '';
        const hasPromo = product.isPromocao && product.precoPromocional;
        cart.push({
            id: product.id,
            codigo: product.codigo || '',
            nome: product.nome,
            preco: hasPromo ? product.precoPromocional : product.preco,
            imagem: img,
            qty: qty,
            estoque: product.estoque
        });
    }

    saveCart(cart);
    qtyInput.value = 1;

    const original = btnEl.innerHTML;
    btnEl.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
    btnEl.style.background = '#2ed573';
    setTimeout(() => {
        btnEl.innerHTML = original;
        btnEl.style.background = '';
    }, 1200);
};

function renderCartSidebar() {
    const cart = getCart();
    const items = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');
    const totalEl = document.getElementById('cartTotal');

    if (!items) return;

    if (cart.length === 0) {
        items.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>Seu carrinho está vazio</p></div>';
        footer.style.display = 'none';
        return;
    }

    footer.style.display = '';
    let total = 0;

    items.innerHTML = cart.map(item => {
        const subtotal = item.preco * item.qty;
        total += subtotal;
        return `
        <div class="cart-item">
            <div class="cart-item-img">
                ${item.imagem ? `<img src="${item.imagem}" alt="${item.nome}" onerror="this.onerror=null;this.src=this.src.replace('_thumb.webp','.webp')">` : '<i class="fas fa-box" style="color:var(--text-muted);"></i>'}
            </div>
            <div class="cart-item-info">
                <div class="cart-item-code">${item.codigo ? 'CÓD ' + item.codigo : ''}</div>
                <div class="cart-item-name">${item.nome}</div>
                <div class="cart-item-price">${formatPrice(item.preco)}</div>
                <div class="cart-item-controls">
                    <div class="catalog-qty">
                        <button onclick="cartQtyChange(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                        <input type="number" value="${item.qty}" min="1" max="${item.estoque}" readonly>
                        <button onclick="cartQtyChange(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');

    totalEl.textContent = formatPrice(total);
}

window.cartQtyChange = function(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, Math.min(item.estoque || 99, item.qty + delta));
    saveCart(cart);
};

window.removeFromCart = function(id) {
    const cart = getCart().filter(i => i.id !== id);
    saveCart(cart);
};

// Cart sidebar toggle
const cartBtn = document.getElementById('navCartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartCloseBtn = document.getElementById('cartClose');

function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

if (cartBtn) cartBtn.addEventListener('click', openCart);
if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// Auto-open cart if redirected from product page
if (new URLSearchParams(window.location.search).get('openCart') === '1') {
    setTimeout(() => { openCart(); }, 500);
    history.replaceState(null, '', window.location.pathname);
}

// Privacy Policy Modal
const privacyLink = document.getElementById('privacyPolicyLink');
const privacyOverlay = document.getElementById('privacyOverlay');
const privacyClose = document.getElementById('privacyClose');
if (privacyLink && privacyOverlay) {
    privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        privacyOverlay.style.display = 'flex';
    });
    if (privacyClose) privacyClose.addEventListener('click', () => privacyOverlay.style.display = 'none');
    privacyOverlay.addEventListener('click', (e) => { if (e.target === privacyOverlay) privacyOverlay.style.display = 'none'; });
}

// WhatsApp checkout
let checkoutSubtotal = 0;
let checkoutDiscount = 0;
let checkoutCouponCode = '';

const cartCheckout = document.getElementById('cartCheckout');
if (cartCheckout) {
    cartCheckout.addEventListener('click', () => {
        const cart = getCart();
        if (cart.length === 0) return;

        closeCart();

        const checkoutItems = document.getElementById('checkoutItems');
        checkoutSubtotal = 0;
        checkoutDiscount = 0;
        checkoutCouponCode = '';

        checkoutItems.innerHTML = `
            <div class="checkout-items-header">
                <span>#</span>
                <span>Produto</span>
                <span class="checkout-items-header-code">Código</span>
                <span>Qtd</span>
                <span style="text-align:right;">Subtotal</span>
            </div>
            ${cart.map((item, i) => {
                const subtotal = item.preco * item.qty;
                checkoutSubtotal += subtotal;
                return `
                <div class="checkout-item">
                    <span class="checkout-item-num">${i + 1}</span>
                    <span class="checkout-item-name">${item.nome}</span>
                    <span class="checkout-item-code">${item.codigo ? 'CÓD ' + item.codigo : '—'}</span>
                    <span class="checkout-item-qty">${item.qty}x</span>
                    <span class="checkout-item-price">${formatPrice(subtotal)}</span>
                </div>`;
            }).join('')}
        `;

        document.getElementById('checkoutSubtotal').textContent = formatPrice(checkoutSubtotal);
        document.getElementById('checkoutTotal').textContent = formatPrice(checkoutSubtotal);
        document.getElementById('checkoutTotalRow').style.display = 'none';
        document.getElementById('checkoutCouponMsg').textContent = '';
        document.getElementById('checkoutCoupon').value = '';
        document.getElementById('checkoutPhoneMsg').textContent = '';
        checkoutKnownName = null;
        checkoutClientCode = null;

        const checkoutOverlay = document.getElementById('checkoutOverlay');
        checkoutOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        document.getElementById('checkoutName').focus();
    });
}

document.getElementById('checkoutClose')?.addEventListener('click', () => {
    document.getElementById('checkoutOverlay').classList.remove('active');
    document.body.style.overflow = '';
});

document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.getElementById('checkoutPhone')?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 6) v = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    else if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    else if (v.length > 0) v = `(${v}`;
    e.target.value = v;
});

document.getElementById('checkoutCouponApply')?.addEventListener('click', () => {
    const code = document.getElementById('checkoutCoupon').value.trim().toUpperCase();
    const msgEl = document.getElementById('checkoutCouponMsg');
    if (!code) { msgEl.textContent = 'Digite o código do cupom'; msgEl.className = 'checkout-coupon-msg error'; return; }

    const coupons = JSON.parse(localStorage.getItem('cabral_coupons') || '[]');
    const coupon = coupons.find(c => c.code === code && c.active);
    if (!coupon) { msgEl.textContent = 'Cupom não encontrado ou inativo'; msgEl.className = 'checkout-coupon-msg error'; return; }

    if (coupon.expiry) {
        const expDate = new Date(coupon.expiry);
        if (new Date() > expDate) { msgEl.textContent = 'Este cupom expirou'; msgEl.className = 'checkout-coupon-msg error'; return; }
    }

    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
        msgEl.textContent = 'Este cupom atingiu o limite de uso'; msgEl.className = 'checkout-coupon-msg error'; return;
    }

    if (coupon.minPurchase > 0 && checkoutSubtotal < coupon.minPurchase) {
        msgEl.textContent = `Compra mínima: ${formatPrice(coupon.minPurchase)}`; msgEl.className = 'checkout-coupon-msg error'; return;
    }

    if (coupon.type === 'percent') {
        checkoutDiscount = checkoutSubtotal * (coupon.value / 100);
    } else {
        checkoutDiscount = Math.min(coupon.value, checkoutSubtotal);
    }

    checkoutCouponCode = code;
    const finalTotal = checkoutSubtotal - checkoutDiscount;

    document.getElementById('checkoutTotalRow').style.display = '';
    document.getElementById('checkoutTotal').textContent = formatPrice(finalTotal);
    msgEl.innerHTML = `<i class="fas fa-check-circle"></i> Cupom "${code}" aplicado! Desconto: -${formatPrice(checkoutDiscount)}`;
    msgEl.className = 'checkout-coupon-msg success';
});

let checkoutKnownName = null;
let checkoutClientCode = null;

function generateClientCode(telefone) {
    const digits = (telefone || '').replace(/\D/g, '');
    const hash = digits.split('').reduce((sum, d) => sum + parseInt(d), 0);
    const suffix = digits.slice(-4).padStart(4, '0');
    const code = (hash * 7 + parseInt(suffix.slice(0, 2)) * 3) % 9999;
    return 'C-' + String(code).padStart(4, '0');
}

function generatePickupCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

async function checkPhoneRegistered(phone) {
    const phoneMsg = document.getElementById('checkoutPhoneMsg');
    const nameInput = document.getElementById('checkoutName');
    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10) { phoneMsg.textContent = ''; checkoutKnownName = null; checkoutClientCode = null; return; }

    checkoutClientCode = generateClientCode(phone);

    try {
        const { data } = await db
            .from(SUPABASE_QUOTES_TABLE)
            .select('nome_cliente')
            .eq('telefone', raw)
            .order('id', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            const registeredName = data[0].nome_cliente;
            checkoutKnownName = registeredName;
            const typedName = nameInput.value.trim();
            if (typedName && normalize(typedName) !== normalize(registeredName)) {
                phoneMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Este telefone esta cadastrado para <strong>${registeredName}</strong>. Utilize o nome correto.`;
            } else {
                phoneMsg.innerHTML = `<i class="fas fa-info-circle"></i> Cliente encontrado: <strong>${registeredName}</strong>`;
                phoneMsg.style.color = 'var(--accent)';
            }
        } else {
            checkoutKnownName = null;
            phoneMsg.textContent = '';
        }
    } catch (err) {
        checkoutKnownName = null;
        phoneMsg.textContent = '';
    }
}

document.getElementById('checkoutPhone')?.addEventListener('blur', (e) => {
    checkPhoneRegistered(e.target.value);
});

document.getElementById('checkoutName')?.addEventListener('input', () => {
    const phoneMsg = document.getElementById('checkoutPhoneMsg');
    const phone = document.getElementById('checkoutPhone').value.replace(/\D/g, '');
    if (phone.length >= 10 && checkoutKnownName) {
        const typedName = document.getElementById('checkoutName').value.trim();
        if (typedName && normalize(typedName) !== normalize(checkoutKnownName)) {
            phoneMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> Este telefone esta cadastrado para <strong>${checkoutKnownName}</strong>. Utilize o nome correto.`;
            phoneMsg.style.color = '#ff6b6b';
        } else if (typedName && normalize(typedName) === normalize(checkoutKnownName)) {
            phoneMsg.innerHTML = `<i class="fas fa-check-circle"></i> Nome confirmado!`;
            phoneMsg.style.color = '#51cf66';
        }
    }
});

document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim().replace(/\D/g, '');
    if (!name || !phone || phone.length < 10) return;

    if (checkoutKnownName && normalize(name) !== normalize(checkoutKnownName)) {
        const phoneMsg = document.getElementById('checkoutPhoneMsg');
        phoneMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> O nome informado nao corresponde ao cadastrado para este telefone. Utilize <strong>${checkoutKnownName}</strong>.`;
        phoneMsg.style.color = '#ff6b6b';
        document.getElementById('checkoutName').focus();
        return;
    }

    const cart = getCart();
    if (cart.length === 0) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let total = 0;
    const itens = cart.map((item, i) => {
        const subtotal = item.preco * item.qty;
        total += subtotal;
        return {
            codigo: item.codigo || '',
            nome: item.nome,
            quantidade: item.qty,
            preco: item.preco,
            subtotal: subtotal
        };
    });

    const finalTotal = total - checkoutDiscount;

    let itemsMsg = '';
    cart.forEach((item, i) => {
        const subtotal = item.preco * item.qty;
        const code = item.codigo ? `(${item.codigo})` : '';
        itemsMsg += `  ${i + 1}. ${item.nome} ${code}\n      ${item.qty}x ${formatPrice(item.preco)} .......... ${formatPrice(subtotal)}\n`;
    });

    let couponMsg = '';
    if (checkoutDiscount > 0 && checkoutCouponCode) {
        couponMsg =
            `\n  Cupom: _${checkoutCouponCode}_\n` +
            `  Subtotal: ${formatPrice(checkoutSubtotal)}\n` +
            `  Desconto: -${formatPrice(checkoutDiscount)}\n`;
    }

    const code = checkoutClientCode || generateClientCode(phone);
    const pickupCode = generatePickupCode();

    const msg =
        `*Orçamento - Cabral Ferramentas*\n` +
        `........................................\n\n` +
        `  *codigo de retirada: ${pickupCode}*\n` +
        `  _Confirme este codigo na retirada em loja._\n\n` +
        `........................................\n\n` +
        `  *cliente:* _${name}_\n` +
        `  *codigo:* _${code}_\n` +
        `  *telefone:* _${phone}_\n` +
        `  *data:* _${dateStr} | ${timeStr}_\n\n` +
        `........................................\n\n` +
        `  *itens*\n\n` +
        itemsMsg + `\n` +
        `........................................\n` +
        couponMsg +
        `\n  *total: ${formatPrice(finalTotal)}*\n\n` +
        `........................................\n\n` +
        `_Por favor confirmar disponibilidade do produto e formas de pagamento._`;

    const wppNum = '5512997144504';
    window.open(`https://wa.me/${wppNum}?text=${encodeURIComponent(msg)}`, '_blank');

    // Save quote to Supabase
    try {
        const quoteData = {
            nome_cliente: name,
            telefone: phone,
            codigo_cliente: code,
            codigo_retirada: pickupCode,
            itens: itens,
            total: finalTotal,
            status: 'recebido',
            status_entrega: 'pendente'
        };
        if (checkoutCouponCode) quoteData.cupom = checkoutCouponCode;
        if (checkoutDiscount > 0) quoteData.desconto = checkoutDiscount;
        try {
            await db.from(SUPABASE_QUOTES_TABLE).insert(quoteData);
        } catch (errCol) {
            // Coluna codigo_retirada pode ainda nao existir no banco: salva sem ela
            const { codigo_retirada, ...baseData } = quoteData;
            await db.from(SUPABASE_QUOTES_TABLE).insert(baseData);
        }

        // Update coupon usage count
        if (checkoutCouponCode && checkoutDiscount > 0) {
            const coupons = JSON.parse(localStorage.getItem('cabral_coupons') || '[]');
            const idx = coupons.findIndex(c => c.code === checkoutCouponCode);
            if (idx !== -1) {
                coupons[idx].currentUses = (coupons[idx].currentUses || 0) + 1;
                localStorage.setItem('cabral_coupons', JSON.stringify(coupons));
            }
        }
    } catch (err) {
        console.error('Erro ao salvar orçamento:', err);
    }

    checkoutDiscount = 0;
    checkoutCouponCode = '';
    checkoutSubtotal = 0;
    checkoutKnownName = null;
    checkoutClientCode = null;

    cart = [];
    saveCart(cart);
    updateCartBadge();
    renderCartSidebar();

    document.getElementById('checkoutOverlay').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('checkoutForm').reset();
});

// Product Modal
function openProductModal(productId) {
    window.location.href = `produto.html?id=${productId}`;
}

window.switchModalImage = function(src, thumbEl) {
    document.getElementById('modalImg').src = src;
    document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
};

const modalClose = document.getElementById('modalClose');
if (modalClose) {
    modalClose.addEventListener('click', () => {
        document.getElementById('productModal').classList.remove('active');
        document.getElementById('modalVideo').src = '';
        document.body.style.overflow = '';
    });
}

document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('productModal')) {
        document.getElementById('productModal').classList.remove('active');
        document.getElementById('modalVideo').src = '';
        document.body.style.overflow = '';
    }
});

document.getElementById('modalQtyMinus')?.addEventListener('click', () => {
    const input = document.getElementById('modalQty');
    input.value = Math.max(1, parseInt(input.value) - 1);
});
document.getElementById('modalQtyPlus')?.addEventListener('click', () => {
    const input = document.getElementById('modalQty');
    input.value = Math.min(parseInt(input.max) || 99, parseInt(input.value) + 1);
});

// Image Zoom
const zoomOverlay = document.getElementById('zoomOverlay');
document.getElementById('zoomBtn')?.addEventListener('click', () => {
    const src = document.getElementById('modalImg').src;
    document.getElementById('zoomImg').src = src;
    zoomOverlay.classList.add('active');
});

document.getElementById('zoomClose')?.addEventListener('click', () => {
    zoomOverlay.classList.remove('active');
});

zoomOverlay?.addEventListener('click', (e) => {
    if (e.target === zoomOverlay) {
        zoomOverlay.classList.remove('active');
    }
});

// Escape key closes modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('productModal')?.classList.remove('active');
        document.getElementById('modalVideo').src = '';
        zoomOverlay?.classList.remove('active');
        closeCart();
        document.body.style.overflow = '';
    }
});

// Init
(async function initCatalog() {
    await Promise.all([fetchCatalogProducts(true), fetchCatalogCategories(), fetchCategoryCounts()]);
    renderCatalog();
    renderFooterCategories();
    updateCartBadge();
    renderCartSidebar();
    const loader = document.getElementById('catalogLoadMore');
    if (loader) loader.style.display = _catalogAllLoaded ? 'none' : '';
    console.log(`Catálogo: ${Object.values(_categoryCounts).reduce((s,c)=>s+c,0)} produtos, ${_catalogCategories.length} categorias`);
    trackVisitor();
    initPromoPopup();
})();

// Infinite scroll
let _loadingMore = false;
let _renderedCount = 0;
async function loadMoreProducts() {
    if (_loadingMore || _catalogAllLoaded) return;
    _loadingMore = true;
    const loader = document.getElementById('catalogLoadMore');
    if (loader) loader.style.display = '';
    const prevCount = _catalogProducts.length;
    await fetchCatalogProducts(false);
    const newProducts = _catalogProducts.slice(prevCount);
    if (newProducts.length > 0) {
        const grid = document.getElementById('gridAll');
        if (grid) renderProductGrid(newProducts, grid, true);
    }
    _loadingMore = false;
    if (loader) loader.style.display = _catalogAllLoaded ? 'none' : '';
}
window.addEventListener('scroll', () => {
    if (_catalogAllLoaded) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        loadMoreProducts();
    }
});

function renderFooterCategories() {
    const container = document.getElementById('footerCategories');
    if (!container || !_catalogCategories.length) return;
    const max = 8;
    const visible = _catalogCategories.slice(0, max);
    let html = visible.map(c => `<a href="#produtos">${c.nome}</a>`).join('');
    if (_catalogCategories.length > max) {
        html += `<a href="#produtos" class="footer-more">Outras →</a>`;
    }
    container.innerHTML = html;
}

// Track visitor in Supabase
async function trackVisitor() {
    try {
        let sessionId = sessionStorage.getItem('cabral_session');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            sessionStorage.setItem('cabral_session', sessionId);
        }
        await db.from(SUPABASE_VISITORS_TABLE).insert({
            session_id: sessionId,
            page: window.location.pathname
        });
    } catch (err) {
        console.error('Erro ao rastrear visitante:', err);
    }
}

// ===========================
// Promo Popup
// ===========================
async function initPromoPopup() {
    try {
        const { data, error } = await db
            .from('popups')
            .select('id, titulo, mensagem, tipo, produto_codigo, preco_original, preco_promocional, imagem_url, botao_texto, botao_link, ativo, ordem, data_inicio, data_fim')
            .eq('ativo', true)
            .order('ordem', { ascending: true })
            .range(0, 9999);

        if (error) {
            console.error('[Popup] Erro Supabase:', error.message);
            return;
        }

        console.log('[Popup] Popups encontrados:', data ? data.length : 0, data);

        if (!data || data.length === 0) return;

        const now = new Date();
        const valid = data.filter(p => {
            if (p.data_inicio && new Date(p.data_inicio) > now) return false;
            if (p.data_fim && new Date(p.data_fim) < now) return false;
            return true;
        });

        console.log('[Popup] Válidos após filtro de data:', valid.length, valid);

        if (valid.length === 0) return;

        setTimeout(() => showPromoPopup(valid[0]), 2000);
    } catch (err) {
        console.error('[Popup] Erro ao carregar popups:', err);
    }
}

function showPromoPopup(popup) {
    const overlay = document.getElementById('promoPopupOverlay');
    const card = document.getElementById('promoPopupCard');
    if (!overlay || !card) return;

    document.getElementById('promoPopupBadge').textContent = popup.tipo === 'promocao' ? 'Oferta do Dia' : (popup.titulo || 'Aviso');
    document.getElementById('promoPopupTitle').textContent = popup.titulo || '';
    document.getElementById('promoPopupMsg').textContent = popup.mensagem || '';

    const pricing = document.getElementById('promoPopupPricing');
    const oldPrice = document.getElementById('promoPopupOldPrice');
    const newPrice = document.getElementById('promoPopupNewPrice');

    if (popup.tipo === 'promocao' && popup.preco_original) {
        pricing.style.display = 'flex';
        oldPrice.textContent = 'R$ ' + parseFloat(popup.preco_original).toFixed(2).replace('.', ',');
        newPrice.textContent = popup.preco_promocional ? 'R$ ' + parseFloat(popup.preco_promocional).toFixed(2).replace('.', ',') : '';
    } else {
        pricing.style.display = 'none';
    }

    const imgWrap = document.getElementById('promoPopupImageWrap');
    const img = document.getElementById('promoPopupImg');
    if (popup.tipo === 'promocao' && popup.produto_codigo) {
        const product = _catalogProducts.find(p => p.codigo && p.codigo.toLowerCase() === popup.produto_codigo.toLowerCase());
        if (product && product.imagens && product.imagens.length > 0) {
            img.src = product.imagens[0].replace('.webp', '_thumb.webp');
            img.onerror = function() { this.onerror = null; this.src = product.imagens[0]; };
            imgWrap.style.display = '';
        } else {
            imgWrap.style.display = 'none';
        }
    } else if (popup.imagem_url) {
        img.src = popup.imagem_url;
        imgWrap.style.display = '';
    } else {
        imgWrap.style.display = 'none';
    }

    const btn = document.getElementById('promoPopupBtn');
    btn.textContent = popup.botao_texto || 'Ver Produto';
    if (popup.tipo === 'promocao' && popup.produto_codigo) {
        const product = _catalogProducts.find(p => p.codigo && p.codigo.toLowerCase() === popup.produto_codigo.toLowerCase());
        btn.href = product ? '#produtos' : (popup.botao_link || '#');
        btn.onclick = function(e) {
            if (product) {
                e.preventDefault();
                closePromoPopup();
                openProductModal(product);
            }
        };
    } else {
        btn.href = popup.botao_link || '#';
        btn.onclick = function() { closePromoPopup(); };
    }

    overlay.style.display = 'flex';

    const progressBar = document.getElementById('promoPopupProgressBar');
    progressBar.style.animation = 'none';
    progressBar.offsetHeight;
    progressBar.style.animation = 'popupProgress 8s linear forwards';

    const fadeTimer = setTimeout(() => closePromoPopup(), 8000);

    document.getElementById('promoPopupClose').onclick = function() {
        clearTimeout(fadeTimer);
        closePromoPopup();
    };

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            clearTimeout(fadeTimer);
            closePromoPopup();
        }
    });

    sessionStorage.setItem('cabral_popup_shown', '1');
}

function closePromoPopup() {
    const overlay = document.getElementById('promoPopupOverlay');
    if (overlay) {
        overlay.style.animation = 'popupFadeIn 0.3s ease reverse';
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.style.animation = '';
        }, 280);
    }
}
