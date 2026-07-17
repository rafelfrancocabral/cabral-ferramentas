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

let aiDetectedCategory = null;

function searchCatalog(query, category) {
    const products = getCatalogProducts();
    const q = normalize(query);
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return [];

    let pool = products;

    if (category && category.startsWith('_')) category = category.slice(1);
    if (category) {
        const catNorm = normalize(category);
        const catProducts = pool.filter(p => {
            const cat = normalize(p.categoria || '');
            const nome = normalize(p.nome || '');
            const desc = normalize(p.descricao || '');
            const kw = (p.palavraschave || p.palavrasChave || []).map(k => normalize(k)).join(' ');
            return cat.includes(catNorm) || nome.includes(catNorm) || desc.includes(catNorm) || kw.includes(catNorm);
        });
        if (catProducts.length > 0) pool = catProducts;
    }

    const scored = pool.map(p => {
        const kw = p.palavraschave || p.palavrasChave || [];
        const keywords = kw.join(' ');
        const nome = p.nome || '';
        const desc = p.descricao || '';
        const searchStr = normalize(`${nome} ${desc} ${keywords}`);
        let score = 0;
        let matchedWords = 0;
        for (const w of words) {
            const nomeNorm = normalize(nome);
            if (nomeNorm.includes(w)) { score += 3; matchedWords++; continue; }
            if (searchStr.includes(w)) { score += 1; matchedWords++; }
        }
        if (matchedWords === 0) return null;
        if (matchedWords < words.length * 0.3) return null;
        const matchRatio = matchedWords / words.length;
        if (matchRatio < 0.3 && words.length >= 2) return null;
        return { product: p, score, matchRatio };
    }).filter(Boolean);

    scored.sort((a, b) => b.score - a.score || b.matchRatio - a.matchRatio);

    return scored.map(s => s.product);
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
            if (detected.category) aiDetectedCategory = detected.category;
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
            aiDetectedCategory = detected.category;
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
            addAiMsg('Olá! Seja bem-vindo à <strong>Cabral Ferramentas</strong>. 😊<br><br>Sou o assistente virtual do nosso catálogo. Posso te ajudar a encontrar ferramentas, materiais e produtos para sua obra ou projeto.<br><br>Descreva o que precisa que eu busco no nosso catálogo.');
            return;
        }

        // No keywords — ask what they need
        aiState = 'gathering';
        aiSearchTerms = [...detected.keywords];
        addAiMsg('Para te ajudar melhor, pode me dizer <strong>qual produto</strong> precisa? Pode ser o nome, o uso ou até uma descrição do que procura.<br><br><em>Exemplo: "furadeira Bosch", "tinta para parede", "kit de chaves"</em>');
    }, 900);
}

function performAiSearch(terms) {
    const query = terms.join(' ');
    aiState = 'idle';
    const cat = aiDetectedCategory;
    aiDetectedCategory = null;
    addAiMsg('Efetuando busca em nosso catálogo...');
    setTimeout(() => {
        const results = searchCatalog(query, cat);
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
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select('*')
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar catálogo:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _catalogProducts = all.filter(p => p.visivel !== false);
    return _catalogProducts;
}

async function fetchCatalogCategories() {
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_CATEGORIES_TABLE)
            .select('*')
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

    const catCounts = {};
    products.forEach(p => {
        if (p.categoria) catCounts[p.categoria] = (catCounts[p.categoria] || 0) + 1;
    });
    const cats = Object.keys(catCounts).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    dropdownList.innerHTML = `<div class="catalog-dropdown-item${filter === 'all' ? ' active' : ''}" data-cat="all"><i class="fas fa-th-large"></i> Todas as Categorias<span class="cat-count">${products.length}</span></div>`;
    cats.forEach(cat => {
        dropdownList.innerHTML += `<div class="catalog-dropdown-item${filter === cat ? ' active' : ''}" data-cat="${cat}"><i class="fas fa-tag"></i> ${cat}<span class="cat-count">${catCounts[cat]}</span></div>`;
    });

    if (filter === 'all') {
        dropdownLabel.textContent = 'Todas as Categorias';
    } else {
        dropdownLabel.textContent = filter;
    }

    dropdownList.querySelectorAll('.catalog-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            dropdownList.querySelectorAll('.catalog-dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            dropdownLabel.textContent = item.dataset.cat === 'all' ? 'Todas as Categorias' : item.dataset.cat;
            dropdownBtn.classList.remove('open');
            dropdownList.classList.remove('open');
            renderCatalog(item.dataset.cat);
        });
    });

    if (dropdownBtn) {
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            dropdownBtn.classList.toggle('open');
            dropdownList.classList.toggle('open');
        };
    }

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

    const msg =
        `*Orçamento - Cabral Ferramentas*\n` +
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
        await db.from(SUPABASE_QUOTES_TABLE).insert({
            nome_cliente: name,
            telefone: phone,
            codigo_cliente: code,
            itens: itens,
            total: finalTotal,
            cupom: checkoutCouponCode || null,
            desconto: checkoutDiscount || 0,
            status: 'recebido',
            status_entrega: 'pendente'
        });

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
    initPromoPopup();
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

// ===========================
// Promo Popup
// ===========================
async function initPromoPopup() {
    try {
        const { data, error } = await db
            .from('popups')
            .select('*')
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
            img.src = product.imagens[0];
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
