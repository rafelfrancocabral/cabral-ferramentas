// ===========================
// Theme Toggle (Day / Night)
// ===========================
(function() {
    const saved = localStorage.getItem('cabral_site_theme');
    if (saved === 'light') document.body.classList.add('light-mode');

    document.getElementById('themeToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('cabral_site_theme', isLight ? 'light' : 'dark');
    });
})();

// ===========================
// Particles Background
// ===========================
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
// Load Site Theme from Dashboard
// ===========================
function loadSiteTheme() {
    try {
        const theme = JSON.parse(localStorage.getItem('cabral_site_theme'));
        if (theme) {
            const root = document.documentElement;
            if (theme.accent) root.style.setProperty('--accent', theme.accent);
            if (theme.bg) root.style.setProperty('--bg-primary', theme.bg);
            if (theme.fontColor) root.style.setProperty('--text-primary', theme.fontColor);
        }
    } catch (e) {}
}
loadSiteTheme();

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

let aiState = 'idle';
let aiSearchTerms = [];

function addAiMsg(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-bot'}`;
    const avatar = isUser
        ? '<div class="ai-msg-avatar"><i class="fas fa-user"></i></div>'
        : '<div class="ai-msg-avatar"><i class="fas fa-robot"></i></div>';
    div.innerHTML = `${avatar}<div class="ai-msg-bubble">${text}</div>`;
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return div;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-bot';
    div.id = 'aiTyping';
    div.innerHTML = '<div class="ai-msg-avatar"><i class="fas fa-robot"></i></div><div class="ai-typing"><span></span><span></span><span></span></div>';
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function removeTyping() {
    document.getElementById('aiTyping')?.remove();
}

function normalize(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function searchCatalog(query) {
    const products = getCatalogProducts();
    const q = normalize(query);
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return [];

    return products.filter(p => {
        const kw = p.palavraschave || p.palavrasChave || [];
        const keywords = kw.join(' ');
        const nome = p.nome || '';
        const desc = p.descricao || '';
        const searchStr = normalize(`${nome} ${desc} ${keywords}`);
        if (words.some(w => searchStr.includes(w))) return true;
        const kwNorm = kw.map(k => normalize(k));
        return kwNorm.some(k => words.some(w => k.includes(w)));
    });
}

function extractKeywords(text) {
    const stopWords = ['ola', 'bom', 'boa', 'dia', 'noite', 'tarde', 'preciso', 'quero', 'gostaria', 'pode', 'me', 'meu', 'minha', 'um', 'uma', 'para', 'pra', 'com', 'sem', 'que', 'tem', 'tenho', 'estou', 'voce', 'voces', 'poderia', 'ajuda', 'ajudar', 'obrigado', 'obrigada', 'por', 'favor', 'isso', 'entao', 'mais', 'bem', 'muito', 'qual', 'onde', 'como', 'ja', 'ainda', 'sempre', 'talvez', 'precisar', 'buscar', 'procurar', 'saber', 'achar', 'encontrar', 'produto', 'produtos', 'coisa', 'algo', 'kit', 'cabral', 'ferramentas', 'vcs', 'vc', 'tb', 'tbm', 'ai', 'ei', 'ta', 'to', 'nos', 'aqui', 'ali', 'la', 'neles', 'delas', 'deles', 'ate', 'desde', 'entre', 'apos', 'contra', 'sob', 'sobre', 'nao', 'num', 'numa', 'sao', 'todo', 'toda', 'esse', 'essa', 'esses', 'essas', 'este', 'esta', 'aquele', 'aquela', 'lhe', 'lhes', 'se', 'si', 'consigo', 'convosco', 'perante', 'tras'];
    const normalized = normalize(text).replace(/[^\w\s]/g, '');
    return normalized.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w));
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

const followUpQuestions = {
    tinta: 'Qual superfície você vai pintar? (parede, madeira, metal, etc.)',
    broca: 'Qual tipo de superfície quer perfurar? (concreto, madeira, metal, alvenaria...)',
    eletrica: 'O que precisa exatamente? (fios, disjuntores, tomadas, iluminação...)',
    hidraulica: 'Qual o problema ou necessidade? (vazamento, nova instalação, troca de registro...)',
    ferro: 'Vai cortar, soldar ou desbastar?',
    madeira: 'Qual trabalho vai fazer? (corte, lixamento, montagem...)',
    concreto: 'É para construção, reparo ou acabamento?',
    porcelanato: 'Vai instalar ou precisa de material de assentamento?',
    _epi: 'Qual tipo de EPI precisa? (capacete, luvas, óculos...)',
    jardim: 'O que precisa para o jardim?',
    limpeza: 'Qual tipo de produto de limpeza procura?'
};

function hasGreeting(text) {
    return /^(ola|bom dia|boa noite|boa tarde|hello|hi|fala|eai|e ai|salve)/.test(normalize(text));
}

function detectSearchTerms(text) {
    return { keywords: extractKeywords(text), category: detectCategory(text) };
}

function handleAiInput() {
    const val = aiInput.value.trim();
    if (!val) return;

    addAiMsg(val, true);
    aiInput.value = '';

    showTyping();

    setTimeout(() => {
        removeTyping();
        const detected = detectSearchTerms(val);
        const hasGreet = hasGreeting(val);

        // Already gathering — accumulate info
        if (aiState === 'gathering') {
            if (detected.keywords.length > 0) aiSearchTerms.push(...detected.keywords);
            const uniqueTerms = [...new Set(aiSearchTerms)];
            if (uniqueTerms.length >= 2) { performAiSearch(uniqueTerms); return; }
            const cat = detected.category || detectCategory(aiSearchTerms.join(' '));
            if (cat && followUpQuestions[cat]) {
                addAiMsg(followUpQuestions[cat]);
            } else {
                addAiMsg('Pode me dar mais detalhes? Por exemplo: <strong>nome do produto</strong>, <strong>uso</strong> ou <strong>marca</strong> que procura.');
            }
            return;
        }

        // Has product keywords — go to funnel or search
        if (detected.keywords.length >= 2) {
            aiState = 'gathering';
            aiSearchTerms = [...detected.keywords];
            if (detected.category && followUpQuestions[detected.category]) {
                addAiMsg(`Entendi! Você procura algo na área de <strong>${detected.category}</strong>.<br><br>${followUpQuestions[detected.category]}`);
            } else {
                performAiSearch([...new Set(aiSearchTerms)]);
            }
            return;
        }

        // Greeting + keywords — go to funnel
        if (hasGreet && detected.keywords.length > 0) {
            aiState = 'gathering';
            aiSearchTerms = [...detected.keywords];
            addAiMsg('Claro! Sobre o que você precisa? Pode me dar mais detalhes para eu buscar no catálogo.');
            return;
        }

        // Greeting only — welcome
        if (hasGreet) {
            addAiMsg('Olá! Seja bem-vindo à <strong>Cabral Ferramentas</strong>. 😊<br><br>Como posso te ajudar hoje? Descreva o que precisa que eu encontro no nosso catálogo.');
            return;
        }

        // No keywords — ask what they need
        aiState = 'gathering';
        aiSearchTerms = [...detected.keywords];
        addAiMsg('Para te ajudar melhor, pode me dizer <strong>qual produto</strong> precisa? Pode ser o nome, o uso ou até uma descrição do que procura.');
    }, 900);
}

function performAiSearch(terms) {
    const query = terms.join(' ');
    aiState = 'idle';
    addAiMsg('Efetuando busca em nosso catálogo...');
    setTimeout(() => {
        const results = searchCatalog(query);
        if (results.length > 0) {
            addAiMsg(`Encontramos <strong>${results.length}</strong> produto(s) relacionado(s) a sua busca. Redirecionando para o catálogo...`);
            setTimeout(() => { renderSearchResults(results); aiSearchTerms = []; }, 1500);
        } else {
            addAiMsg(`Nenhum produto encontrado para "<strong>${query}</strong>".<br><br>Pode reformular sua busca? Tente usar palavras-chave diferentes.`);
            aiSearchTerms = [];
        }
    }, 1200);
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

async function fetchCatalogProducts() {
    const { data, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .select('*')
        .order('id', { ascending: true });
    if (error) { console.error('Erro ao carregar catálogo:', error); return []; }
    _catalogProducts = (data || []).filter(p => p.visivel !== false);
    return _catalogProducts;
}

async function fetchCatalogCategories() {
    const { data, error } = await db
        .from(SUPABASE_CATEGORIES_TABLE)
        .select('*')
        .order('id', { ascending: true });
    if (error) { console.error('Erro ao carregar categorias:', error); return []; }
    _catalogCategories = data || [];
    return _catalogCategories;
}

function getCatalogProducts() {
    return _catalogProducts;
}

function getCatalogCategories() {
    return _catalogCategories;
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

window.debugSearch = function(q) {
    const products = getCatalogProducts();
    console.log('Total produtos:', products.length);
    products.forEach(p => {
        const kw = p.palavraschave || p.palavrasChave || [];
        if (kw.length > 0) {
            console.log(p.nome, '→', kw);
        }
    });
    if (q) {
        console.log('--- Busca: "' + q + '" ---');
        const results = searchCatalog(q);
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

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function renderCatalog(filter = 'all') {
    const products = getCatalogProducts();
    const tabs = document.getElementById('catalogTabs');
    const destaques = document.getElementById('gridDestaques');
    const promos = document.getElementById('gridPromos');
    const allGrid = document.getElementById('gridAll');
    const secDestaques = document.getElementById('catalogDestaques');
    const secPromos = document.getElementById('catalogPromos');
    const secAll = document.getElementById('catalogAll');
    const empty = document.getElementById('catalogEmpty');

    if (!tabs || !allGrid) return;

    const cats = [...new Set(products.map(p => p.categoria).filter(Boolean))];
    tabs.innerHTML = '<button class="catalog-tab active" data-cat="all"><i class="fas fa-th-large"></i> Todos</button>';
    cats.forEach(cat => {
        tabs.innerHTML += `<button class="catalog-tab" data-cat="${cat}"><i class="fas fa-tag"></i> ${cat}</button>`;
    });

    tabs.querySelectorAll('.catalog-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.querySelectorAll('.catalog-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCatalog(tab.dataset.cat);
        });
    });

    let filtered = filter === 'all' ? [...products] : products.filter(p => p.categoria === filter);

    if (filtered.length === 0) {
        secDestaques.style.display = 'none';
        secPromos.style.display = 'none';
        secAll.style.display = 'none';
        empty.style.display = '';
        return;
    }

    empty.style.display = 'none';
    const shuffled = shuffleArray(filtered);
    secDestaques.style.display = 'none';
    secPromos.style.display = 'none';
    secAll.style.display = '';
    secAll.querySelector('.catalog-subtitle').innerHTML = '<i class="fas fa-boxes-stacked"></i> Produtos';
    renderProductGrid(shuffled, document.getElementById('gridAll'));
}

function renderProductGrid(products, container) {
    if (!container) return;
    container.innerHTML = '';

    products.forEach(rawProduct => {
        const product = normalizeProduct(rawProduct);
        const hasPromo = product.isPromocao && product.precoPromocional;
        const price = hasPromo ? product.precoPromocional : product.preco;
        const img = (product.imagens && product.imagens.length > 0) ? product.imagens[0] : '';
        const stockClass = product.estoque <= 0 ? 'out' : '';

        const badges = [];
        if (product.isDestaque) badges.push('<span class="catalog-badge destaque"><i class="fas fa-star"></i> Destaque</span>');
        if (product.isPromocao) badges.push('<span class="catalog-badge promo"><i class="fas fa-fire"></i> Promoção</span>');

        const card = document.createElement('div');
        card.className = 'catalog-card';
        card.innerHTML = `
            <div class="catalog-card-img" onclick="openProductModal(${product.id})">
                ${img ? `<img src="${img}" alt="${product.nome}" loading="lazy">` : '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-image" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:8px;"></i> Sem imagem</div>'}
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
        const img = (product.imagens && product.imagens.length > 0) ? product.imagens[0] : '';
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
                ${item.imagem ? `<img src="${item.imagem}" alt="${item.nome}">` : '<i class="fas fa-box" style="color:var(--text-muted);"></i>'}
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

// WhatsApp checkout
const cartCheckout = document.getElementById('cartCheckout');
if (cartCheckout) {
    cartCheckout.addEventListener('click', () => {
        const cart = getCart();
        if (cart.length === 0) return;

        closeCart();

        const checkoutItems = document.getElementById('checkoutItems');
        const checkoutTotal = document.getElementById('checkoutTotal');
        let total = 0;

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
                total += subtotal;
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

        checkoutTotal.textContent = formatPrice(total);

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

document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim().replace(/\D/g, '');
    if (!name || !phone || phone.length < 10) return;

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

    let itemsMsg = '';
    cart.forEach((item, i) => {
        const subtotal = item.preco * item.qty;
        const code = item.codigo ? `CÓD ${item.codigo}` : '';
        itemsMsg += `${i + 1}. ${code ? code + ' | ' : ''}${item.nome}\n    Qtd: ${item.qty}x ${formatPrice(item.preco)} = ${formatPrice(subtotal)}\n`;
    });

    const msg = `*ORÇAMENTO — CABRAL FERRAMENTAS*\n\n` +
        `*Cliente:* ${name}\n` +
        `*Telefone:* ${phone}\n` +
        `*Data:* ${dateStr} às ${timeStr}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*Produtos:*\n\n` +
        itemsMsg + `\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*TOTAL: ${formatPrice(total)}*\n\n` +
        `Favor confirmar disponibilidade e enviar forma de pagamento. Obrigado!`;

    const wppNum = '5512997144504';
    window.open(`https://wa.me/${wppNum}?text=${encodeURIComponent(msg)}`, '_blank');

    // Save quote to Supabase
    try {
        await db.from(SUPABASE_QUOTES_TABLE).insert({
            nome_cliente: name,
            telefone: phone,
            itens: itens,
            total: total,
            status: 'recebido',
            status_entrega: 'pendente'
        });
    } catch (err) {
        console.error('Erro ao salvar orçamento:', err);
    }

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
    await Promise.all([fetchCatalogProducts(), fetchCatalogCategories()]);
    renderCatalog();
    renderBrands();
    renderFooterCategories();
    updateCartBadge();
    renderCartSidebar();
    console.log(`Catálogo: ${_catalogProducts.length} produtos, ${_catalogCategories.length} categorias`);
    trackVisitor();
})();

function renderBrands() {
    const track = document.getElementById('brandsTrack');
    if (!track) return;
    const brands = [...new Set(_catalogProducts.map(p => p.marca).filter(Boolean))].sort();
    if (!brands.length) return;
    const items = brands.map(b => `<div class="brand-item"><div class="brand-name">${b}</div></div>`).join('');
    track.innerHTML = items + items;
}

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
