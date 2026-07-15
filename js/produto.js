(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get('id'));
    const content = document.getElementById('ppContent');

    if (!productId) {
        content.innerHTML = `<div class="pp-not-found"><i class="fas fa-exclamation-triangle"></i><p>Produto não encontrado</p><a href="index.html#produtos" class="pp-back"><i class="fas fa-arrow-left"></i> Voltar aos produtos</a></div>`;
        return;
    }

    function formatPrice(v) {
        return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function normalize(p) {
        return {
            ...p,
            palavrasChave: p.palavraschave || p.palavrasChave || [],
            isDestaque: p.isdestaque || p.isDestaque || false,
            isPromocao: p.ispromocao || p.isPromocao || false,
            precoPromocional: p.precopromocional || p.precoPromocional || 0
        };
    }

    async function loadProduct() {
        const { data, error } = await db.from('produtos').select('*').eq('id', productId).eq('visivel', true).single();
        if (error || !data) {
            content.innerHTML = `<div class="pp-not-found"><i class="fas fa-exclamation-triangle"></i><p>Produto não encontrado</p><a href="index.html#produtos" class="pp-back"><i class="fas fa-arrow-left"></i> Voltar aos produtos</a></div>`;
            return;
        }

        const product = normalize(data);
        const hasPromo = product.isPromocao && product.precoPromocional;
        const price = hasPromo ? product.precoPromocional : product.preco;
        const images = (product.imagens && product.imagens.length > 0) ? product.imagens : [''];

        document.title = product.nome + ' — Cabral Ferramentas';

        // Track view
        db.from('visualizacoes_produto').insert({ produto_id: product.id, produto_nome: product.nome }).then(() => {}).catch(() => {});

        let videoHtml = '';
        if (product.video && product.video.trim()) {
            let videoSrc = product.video.trim();
            if (videoSrc.includes('watch?v=')) videoSrc = videoSrc.replace('watch?v=', 'embed/');
            else if (videoSrc.includes('youtu.be/')) videoSrc = videoSrc.replace('youtu.be/', 'www.youtube.com/embed/');
            videoHtml = `<div class="pp-video-wrap"><iframe src="${videoSrc}" allowfullscreen></iframe></div>`;
        }

        content.innerHTML = `
        <div class="product-page-inner">
            <div class="pp-gallery">
                <a href="index.html#produtos" class="pp-back"><i class="fas fa-arrow-left"></i> Voltar aos produtos</a>
                <img class="pp-main-img" id="ppMainImg" src="${images[0]}" alt="${product.nome}">
                <div class="pp-thumbs" id="ppThumbs">
                    ${images.map((img, i) => `<img class="pp-thumb ${i === 0 ? 'active' : ''}" src="${img}" alt="${product.nome}" onclick="ppSwitchImg('${img}', this)">`).join('')}
                </div>
                ${videoHtml}
            </div>
            <div class="pp-info">
                <span class="pp-category">${product.categoria || ''}</span>
                <h1 class="pp-title">${product.nome}</h1>
                <div class="pp-brand">${product.marca || ''}</div>
                <div class="pp-code">${product.codigo ? 'CÓD ' + product.codigo : ''}</div>
                <p class="pp-desc">${product.descricao || product.descricaoCompleta || ''}</p>
                <div class="pp-pricing">
                    ${hasPromo ? `<span class="pp-price-old">${formatPrice(product.preco)}</span>` : ''}
                    <span class="pp-price ${hasPromo ? '' : 'no-promo'}">${formatPrice(price)}</span>
                </div>
                <div class="pp-qty-row">
                    <label>Quantidade</label>
                    <div class="pp-qty-control">
                        <button class="pp-qty-btn" onclick="ppQtyChange(-1)"><i class="fas fa-minus"></i></button>
                        <input class="pp-qty-input" type="number" id="ppQty" value="1" min="1" max="${product.estoque || 99}">
                        <button class="pp-qty-btn" onclick="ppQtyChange(1)"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
                <button class="pp-add-btn" id="ppAddBtn" onclick="ppAddToCart()">
                    <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                </button>
            </div>
        </div>
        <div class="pp-related" id="ppRelated" style="display:none;">
            <h2><i class="fas fa-thumbs-up"></i> Produtos Relacionados</h2>
            <div class="pp-related-grid" id="ppRelatedGrid"></div>
        </div>`;

        window._ppProduct = product;
        window._ppPrice = price;
        window._ppImages = images;

        loadRelated(product.categoria, product.id, product.nome);
    }

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

    async function loadRelated(category, currentId, productName) {
        if (!category) return;
        const catNorm = normalize(category);
        const { data } = await db.from('produtos').select('*').eq('visivel', true).range(0, 9999);
        if (!data || data.length <= 1) return;

        let related = data.filter(p => p.id !== currentId && (p.estoque || 0) > 0);

        const complementTerms = [];
        for (const [key, comps] of Object.entries(RELATED_PRODUCTS_MAP)) {
            if (normalize(category).includes(normalize(key)) || (productName && normalize(productName).includes(normalize(key)))) {
                complementTerms.push(...comps);
            }
        }

        if (complementTerms.length > 0) {
            const complements = related.filter(p => {
                const searchStr = normalize(`${p.nome || ''} ${p.descricao || ''} ${p.categoria || ''} ${(p.palavraschave || p.palavrasChave || []).join(' ')}`);
                return complementTerms.some(term => searchStr.includes(normalize(term)));
            });
            const sameCategory = related.filter(p => normalize(p.categoria || '') === catNorm && !complements.includes(p));
            related = [...complements.slice(0, 4), ...sameCategory].slice(0, 6);
        } else {
            related = related.filter(p => normalize(p.categoria || '') === catNorm).slice(0, 6);
        }

        if (related.length === 0) return;

        const section = document.getElementById('ppRelated');
        const grid = document.getElementById('ppRelatedGrid');
        section.style.display = '';

        grid.innerHTML = related.map(rp => {
            const img = (rp.imagens && rp.imagens.length > 0) ? rp.imagens[0] : '';
            const rNorm = normalize(rp);
            const rHasPromo = rNorm.isPromocao && rNorm.precoPromocional;
            const rPrice = rHasPromo ? rNorm.precoPromocional : rNorm.preco;
            return `
            <a href="produto.html?id=${rp.id}" class="pp-related-card">
                ${img ? `<img src="${img}" alt="${rp.nome}" loading="lazy">` : '<div style="height:140px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);"><i class="fas fa-image"></i></div>'}
                <div class="pp-related-name">${rp.nome}</div>
                <div class="pp-related-price">${formatPrice(rPrice)}</div>
            </a>`;
        }).join('');
    }

    window.ppSwitchImg = function(src, el) {
        document.getElementById('ppMainImg').src = src;
        document.querySelectorAll('.pp-thumb').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    };

    window.ppQtyChange = function(delta) {
        const input = document.getElementById('ppQty');
        let val = parseInt(input.value) || 1;
        val = Math.max(1, Math.min(parseInt(input.max) || 99, val + delta));
        input.value = val;
    };

    window.ppAddToCart = function() {
        const product = window._ppProduct;
        const price = window._ppPrice;
        const images = window._ppImages;
        const qty = parseInt(document.getElementById('ppQty').value) || 1;

        let cart = [];
        try { cart = JSON.parse(localStorage.getItem('cabral_cart') || '[]'); } catch(e) { cart = []; }

        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.qty = Math.min(existing.qty + qty, product.estoque || 99);
        } else {
            cart.push({
                id: product.id,
                codigo: product.codigo || '',
                nome: product.nome,
                preco: price,
                imagem: images[0] || '',
                qty: qty,
                estoque: product.estoque || 99
            });
        }

        localStorage.setItem('cabral_cart', JSON.stringify(cart));

        const btn = document.getElementById('ppAddBtn');
        btn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
        btn.classList.add('added');
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-cart-plus"></i> Adicionar ao Carrinho';
            btn.classList.remove('added');
        }, 1500);

        // Update badge
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const total = cart.reduce((s, i) => s + i.qty, 0);
            badge.textContent = total;
            badge.style.display = total > 0 ? 'flex' : 'none';
        }
    };

    // Mobile menu
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
        document.getElementById('navLinks')?.classList.toggle('active');
    });

    // Scroll navbar
    window.addEventListener('scroll', () => {
        document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Cart sidebar (simplified — redirect to index with cart open)
    const cartBtn = document.getElementById('navCartBtn');
    const cartBadge = document.getElementById('cartBadge');
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html?openCart=1';
        });
    }
    if (cartBadge) {
        try {
            const cart = JSON.parse(localStorage.getItem('cabral_cart') || '[]');
            const total = cart.reduce((s, i) => s + i.qty, 0);
            cartBadge.textContent = total;
            cartBadge.style.display = total > 0 ? 'flex' : 'none';
        } catch(e) {}
    }

    // Particles (minimal)
    (function initParticles() {
        const canvas = document.getElementById('particles');
        if (!canvas) return;
        // Just a subtle static particle effect via CSS is enough for this page
    })();

    loadProduct();
})();
