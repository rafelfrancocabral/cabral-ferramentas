// ===========================
// Particles Background
// ===========================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const count = window.innerWidth < 768 ? 15 : 25;
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
// Sidebar Toggle
// ===========================
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

sidebarToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar on click outside (mobile)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && e.target !== sidebarToggle && !sidebarToggle.contains(e.target)) {
            closeSidebar();
        }
    }
});

// ===========================
// Logout
// ===========================
function doLogout() {
    localStorage.removeItem('cabral_auth');
    localStorage.removeItem('cabral_last_activity');
    window.location.href = 'login.html';
}

document.getElementById('btnLogout').addEventListener('click', (e) => {
    e.preventDefault();
    doLogout();
});

// ===========================
// Auto-logout after 10 min inactivity
// ===========================
const LOGOUT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let lastActivity = Date.now();

function resetActivity() {
    lastActivity = Date.now();
    localStorage.setItem('cabral_last_activity', lastActivity.toString());
}

function checkInactivity() {
    if (Date.now() - lastActivity > LOGOUT_TIMEOUT) {
        doLogout();
    }
}

// Track user activity
['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetActivity, { passive: true });
});

// Check every 30 seconds
setInterval(checkInactivity, 30000);

// Check on page load
resetActivity();

// ===========================
// ===========================
// Page Navigation
// ===========================
const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');
const pageContents = document.querySelectorAll('.page-content');
const dashboardContent = document.getElementById('dashboardContent');
const topTitle = document.querySelector('.page-title');
const topSubtitle = document.querySelector('.page-subtitle');

const pageNames = {
    dashboard: { title: 'Dashboard', subtitle: 'Visão geral do negócio' },
    orcamentos: { title: 'Orçamentos', subtitle: 'Gerenciar orçamentos recebidos' },
    produtos: { title: 'Produtos', subtitle: 'Catálogo de produtos' },
    categorias: { title: 'Categorias', subtitle: 'Gerenciar categorias' },
    entregas: { title: 'Entregas', subtitle: 'Configurar taxas de entrega' },
    clientes: { title: 'Clientes', subtitle: 'Clientes que enviaram orçamentos' },
    cupons: { title: 'Cupons', subtitle: 'Cupons e promoções' },
    popups: { title: 'Popups', subtitle: 'Popups de promoção e avisos' },
    config: { title: 'Configurações', subtitle: 'Personalizar o sistema' }
};

sidebarLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        const page = link.dataset.page;

        // Update active link
        sidebarLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update topbar
        if (pageNames[page]) {
            topTitle.textContent = pageNames[page].title;
            topSubtitle.textContent = pageNames[page].subtitle;
        }

        // Show/hide pages
        if (page === 'dashboard') {
            dashboardContent.style.display = 'block';
            pageContents.forEach(p => p.classList.add('hidden'));
        } else {
            dashboardContent.style.display = 'none';
            pageContents.forEach(p => p.classList.add('hidden'));
            const targetPage = document.getElementById(page + 'Page');
            if (targetPage) {
                targetPage.classList.remove('hidden');
            }

            // Lazy load products only when needed
            if (page === 'produtos' && !_productsLoaded) {
                const tbody = document.getElementById('productsTableBody');
                if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>Carregando produtos...</td></tr>';
                const table = document.getElementById('productsTable');
                if (table) table.style.display = '';
                const empty = document.getElementById('productsEmpty');
                if (empty) empty.style.display = 'none';
                await loadProducts();
                renderProducts();
            }
        }

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });
});

// Bell notification → go to orçamentos
document.getElementById('notifBtn')?.addEventListener('click', () => {
    const orcLink = document.querySelector('.sidebar-link[data-page="orcamentos"]');
    if (orcLink) orcLink.click();
});

// ===========================
// Period Filter
// ===========================
const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const period = btn.dataset.period;
        updateCharts(period);
    });
});

// ===========================
// Charts - Chart.js
// ===========================
const chartDefaults = {
    color: '#555570',
    borderColor: '#1a1a2e',
    font: { family: "'Inter', sans-serif" }
};

Chart.defaults.color = chartDefaults.color;
Chart.defaults.borderColor = chartDefaults.borderColor;

// Sales Chart
const salesCtx = document.getElementById('salesChart');
let salesChart;

function createSalesChart() {
    if (salesChart) salesChart.destroy();

    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const salesData = [42, 55, 48, 61, 58, 72, 85, 78, 92, 88, 95, 102];
    const quoteData = [38, 48, 42, 55, 52, 65, 78, 70, 85, 80, 88, 95];

    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Vendas (mil)',
                    data: salesData,
                    borderColor: '#0099cc',
                    backgroundColor: 'rgba(0, 153, 204, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#0099cc',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                },
                {
                    label: 'Orçamentos',
                    data: quoteData,
                    borderColor: '#7b3fbf',
                    backgroundColor: 'rgba(123, 63, 191, 0.05)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    pointBackgroundColor: '#7b3fbf',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1a1a2e',
                    bodyColor: '#555570',
                    borderColor: '#e8e8ef',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { family: "'Rajdhani', sans-serif", weight: 600 },
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: R$ ${ctx.parsed.y} mil`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(26, 26, 46, 0.5)' },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(26, 26, 46, 0.5)' },
                    ticks: {
                        font: { size: 11 },
                        callback: (v) => `R$ ${v}k`
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Category Chart
const categoryCtx = document.getElementById('categoryChart');
let categoryChart;

function createCategoryChart() {
    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: ['Elétricas', 'Manuais', 'Hidráulica', 'Elétrica', 'EPI', 'Construção'],
            datasets: [{
                data: [35, 25, 15, 12, 8, 5],
                backgroundColor: ['#0099cc', '#7b3fbf', '#2ed573', '#ffa502', '#ff4757', '#a4b0be'],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverBorderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { size: 11, family: "'Inter', sans-serif" }
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1a1a2e',
                    bodyColor: '#555570',
                    borderColor: '#e8e8ef',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`
                    }
                }
            }
        }
    });
}

// Initialize charts
createSalesChart();
createCategoryChart();

// Update charts + KPIs based on period (real data from Supabase)
function updateCharts(period) {
    const now = new Date();
    let cutoff;
    if (period === '7d') cutoff = new Date(now - 7 * 86400000);
    else if (period === '90d') cutoff = new Date(now - 90 * 86400000);
    else if (period === '12m') cutoff = new Date(now - 365 * 86400000);
    else cutoff = new Date(now - 30 * 86400000);

    const quotes = getQuotes().filter(q => new Date(q.created_at) >= cutoff);
    const totalQuotes = quotes.length;
    const totalRevenue = quotes.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const delivered = quotes.filter(q => q.status === 'entregue');
    const deliveredCount = delivered.length;
    const deliveryPct = totalQuotes > 0 ? Math.round((deliveredCount / totalQuotes) * 100) : 0;
    const converted = quotes.filter(q => q.status === 'aprovado' || q.status === 'entregue');
    const conversionPct = totalQuotes > 0 ? Math.round((converted.length / totalQuotes) * 100) : 0;

    // KPI cards
    const kpiCards = document.querySelectorAll('.kpi-card');
    if (kpiCards.length >= 4) {
        kpiCards[0].querySelector('.kpi-value').textContent = totalQuotes.toLocaleString('pt-BR');
        const t0 = kpiCards[0].querySelector('.kpi-trend');
        t0.className = 'kpi-trend ' + (conversionPct >= 50 ? 'up' : 'down');
        t0.innerHTML = '<i class="fas fa-arrow-' + (conversionPct >= 50 ? 'up' : 'down') + '"></i> ' + conversionPct + '%';
        const b0 = kpiCards[0].querySelector('.kpi-bar-fill');
        if (b0) b0.style.width = conversionPct + '%';
        const l0 = kpiCards[0].querySelector('.kpi-footer span');
        if (l0) l0.textContent = conversionPct + '% convertidos';

        kpiCards[2].querySelector('.kpi-value').textContent = deliveredCount.toLocaleString('pt-BR');
        const t2 = kpiCards[2].querySelector('.kpi-trend');
        t2.className = 'kpi-trend ' + (deliveryPct >= 80 ? 'up' : 'down');
        t2.innerHTML = '<i class="fas fa-arrow-' + (deliveryPct >= 80 ? 'up' : 'down') + '"></i> ' + deliveryPct + '%';
        const b2 = kpiCards[2].querySelector('.kpi-bar-fill');
        if (b2) b2.style.width = deliveryPct + '%';
        const l2 = kpiCards[2].querySelector('.kpi-footer span');
        if (l2) l2.textContent = deliveryPct + '% no prazo';

        const ft = totalRevenue >= 1000000
            ? 'R$ ' + (totalRevenue / 1000000).toFixed(1) + ' mi'
            : totalRevenue >= 1000
                ? 'R$ ' + (totalRevenue / 1000).toFixed(0) + ' mil'
                : formatPrice(totalRevenue);
        kpiCards[3].querySelector('.kpi-value').textContent = ft;
        const tRev = kpiCards[3].querySelector('.kpi-trend');
        tRev.className = 'kpi-trend up';
        tRev.innerHTML = '<i class="fas fa-arrow-up"></i> 100%';

        // Acessos (visitors)
        const visitors = getVisitors().filter(v => new Date(v.created_at) >= cutoff);
        const uniqueVisitors = new Set(visitors.map(v => v.session_id)).size;
        kpiCards[1].querySelector('.kpi-value').textContent = uniqueVisitors.toLocaleString('pt-BR');
        const newVisitors = new Set(visitors.filter(v => {
            const first = getVisitors().find(f => f.session_id === v.session_id);
            return first && first.id === v.id;
        }).map(v => v.session_id)).size;
        const newPct = uniqueVisitors > 0 ? Math.round((newVisitors / uniqueVisitors) * 100) : 0;
        const t1 = kpiCards[1].querySelector('.kpi-trend');
        t1.className = 'kpi-trend ' + (newPct >= 50 ? 'up' : 'down');
        t1.innerHTML = '<i class="fas fa-arrow-' + (newPct >= 50 ? 'up' : 'down') + '"></i> ' + newPct + '%';
        const b1 = kpiCards[1].querySelector('.kpi-bar-fill');
        if (b1) b1.style.width = Math.min(newPct, 100) + '%';
        const l1 = kpiCards[1].querySelector('.kpi-footer span');
        if (l1) l1.textContent = newPct + '% novos visitantes';
    }

    // Build chart data grouped by period
    const labels = [];
    const salesData = [];
    const quoteDataArr = [];

    if (period === '7d') {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            labels.push(dayNames[d.getDay()]);
            const dayStr = d.toISOString().slice(0, 10);
            const dayQ = quotes.filter(q => q.created_at.slice(0, 10) === dayStr);
            salesData.push(dayQ.reduce((s, q) => s + (Number(q.total) || 0), 0));
            quoteDataArr.push(dayQ.length);
        }
    } else if (period === '90d') {
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now - i * 30 * 86400000);
            labels.push((d.getMonth() + 1) + '/' + d.getFullYear());
            const mq = quotes.filter(q => {
                const qd = new Date(q.created_at);
                return qd.getMonth() === d.getMonth() && qd.getFullYear() === d.getFullYear();
            });
            salesData.push(mq.reduce((s, q) => s + (Number(q.total) || 0), 0));
            quoteDataArr.push(mq.length);
        }
    } else if (period === '12m') {
        const mn = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(mn[d.getMonth()]);
            const mq = quotes.filter(q => {
                const qd = new Date(q.created_at);
                return qd.getMonth() === d.getMonth() && qd.getFullYear() === d.getFullYear();
            });
            salesData.push(mq.reduce((s, q) => s + (Number(q.total) || 0), 0));
            quoteDataArr.push(mq.length);
        }
    } else {
        for (let i = 3; i >= 0; i--) {
            const ws = new Date(now - (i + 1) * 7 * 86400000);
            const we = new Date(now - i * 7 * 86400000);
            labels.push('Sem ' + (4 - i));
            const wq = quotes.filter(q => {
                const qd = new Date(q.created_at);
                return qd >= ws && qd < we;
            });
            salesData.push(wq.reduce((s, q) => s + (Number(q.total) || 0), 0));
            quoteDataArr.push(wq.length);
        }
    }

    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = salesData;
    salesChart.data.datasets[1].data = quoteDataArr;
    salesChart.update('active');

    // Category chart from items
    const catCounts = {};
    quotes.forEach(q => {
        if (!Array.isArray(q.itens)) return;
        q.itens.forEach(item => {
            const cat = item.categoria || 'Geral';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
    });
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (sorted.length > 0) {
        categoryChart.data.labels = sorted.map(c => c[0]);
        categoryChart.data.datasets[0].data = sorted.map(c => c[1]);
    } else {
        categoryChart.data.labels = ['Sem dados'];
        categoryChart.data.datasets[0].data = [1];
    }
    categoryChart.update('active');

    document.querySelectorAll('.kpi-value').forEach(v => {
        v.style.opacity = '0.3';
        v.style.transform = 'translateY(4px)';
        setTimeout(() => { v.style.opacity = '1'; v.style.transform = 'translateY(0)'; }, 400);
    });
}

// ===========================
// Scroll Reveal Animation
// ===========================
function initScrollReveal() {
    const elements = document.querySelectorAll('.kpi-card, .chart-card, .category-card-admin, .settings-card');
    elements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
}
initScrollReveal();

// ===========================
// KPI Counter Animation
// ===========================
function animateKPIs() {
    const kpiValues = document.querySelectorAll('.kpi-value');
    kpiValues.forEach(el => {
        const text = el.textContent.trim();
        const match = text.match(/[\d.]+/);
        if (!match) return;

        const targetStr = match[0].replace('.', '');
        const target = parseInt(targetStr);
        if (isNaN(target)) return;

        const prefix = text.startsWith('R$') ? 'R$ ' : '';
        const suffix = text.includes('mil') ? ' mil' : '';
        const duration = 1500;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            const formatted = Math.floor(current).toLocaleString('pt-BR');
            el.textContent = prefix + formatted + suffix;
        }, 16);
    });
}

// Run KPI animation when visible
const kpiObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateKPIs();
            kpiObserver.disconnect();
        }
    });
}, { threshold: 0.3 });

const kpiRow = document.querySelector('.kpi-row');
if (kpiRow) kpiObserver.observe(kpiRow);

// ===========================
// Bar Fill Animation
// ===========================
function animateBars() {
    const bars = document.querySelectorAll('.kpi-bar-fill, .rank-bar-fill, .cat-bar-fill');
    bars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = width;
        }, 300);
    });
}

// Run bar animation when visible
const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateBars();
            barObserver.disconnect();
        }
    });
}, { threshold: 0.2 });

const _dashboardContent = document.getElementById('dashboardContent');
if (_dashboardContent) barObserver.observe(_dashboardContent);

// ===========================
// Quotes Data (simulated from WhatsApp)
// ===========================
// ===========================
// Orçamentos - Load from Supabase
// ===========================
let _quotesCache = [];

async function loadQuotes() {
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db.from(SUPABASE_QUOTES_TABLE)
            .select('id, nome_cliente, telefone, codigo_cliente, itens, total, cupom, desconto, status, status_entrega, created_at, updated_at')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar orçamentos:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    _quotesCache = all;
    return _quotesCache;
}

function getQuotes() {
    return _quotesCache;
}

function renderQuotes(filter = 'all') {
    const list = document.getElementById('quotesList');
    const empty = document.getElementById('quotesEmpty');
    if (!list) return;

    const quotes = getQuotes();
    const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

    if (filtered.length === 0) {
        list.innerHTML = '';
        if (empty) { empty.style.display = ''; list.appendChild(empty); }
        return;
    }
    if (empty) empty.style.display = 'none';

    const statusMap = { recebido: 0, analise: 1, aprovado: 2, entregue: 3 };
    const stepLabels = ['Recebido', 'Análise', 'Aprovado', 'Entregue'];

    list.innerHTML = filtered.map(q => {
        const stepIdx = statusMap[q.status] ?? 0;
        const isCancelled = q.status === 'cancelado';
        const phoneDigits = (q.telefone || '').replace(/\D/g, '');
        const itemCount = Array.isArray(q.itens) ? q.itens.length : 0;
        const date = new Date(q.created_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const stepNames = ['recebido', 'analise', 'aprovado', 'entregue'];
        const timelineSteps = [0, 1, 2, 3].map(i => {
            let cls = 'tl-step step-' + stepNames[i];
            if (isCancelled) cls += ' cancelled';
            else if (i < stepIdx) cls += ' active';
            else if (i === stepIdx) cls += ' current';

            const icons = ['fa-inbox', 'fa-magnifying-glass-chart', 'fa-circle-check', 'fa-truck-fast'];
            return `<div class="${cls}" data-step="${i}"><div class="tl-icon"><i class="fas ${icons[i]}"></i></div><div class="tl-label">${stepLabels[i]}</div></div>`;
        });

        const stepColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#2ed573'];
        const connectors = [0, 1, 2].map(i => {
            let cls = 'tl-conn';
            let style = '';
            if (!isCancelled && i < stepIdx) {
                cls += ' done';
                style = `background:${stepColors[Math.min(i + 1, 3)]};`;
            } else if (!isCancelled && i === stepIdx) {
                cls += ' partial';
                style = `background:linear-gradient(90deg, ${stepColors[stepIdx]}, var(--border));`;
            }
            return `<div class="${cls}" style="${style}"></div>`;
        });

        return `
        <div class="quote-card" data-status="${q.status}" data-id="${q.id}">
            <div class="quote-row">
                <div class="quote-id">#${q.id}</div>
                <div class="quote-client">
                    <div class="client-avatar-sm"><i class="fas fa-user"></i></div>
                    <div>
                        <span class="client-name">${q.nome_cliente}</span>
                        <span class="client-contact"><i class="fab fa-whatsapp"></i> ${q.telefone}</span>
                    </div>
                </div>
                <div class="quote-date"><i class="fas fa-calendar"></i> ${dateStr}</div>
                <span class="quote-value">${formatPrice(q.total)}</span>
                <span class="quote-items-count">${itemCount} ${itemCount === 1 ? 'item' : 'itens'}</span>
                <div class="quote-timeline-inline${isCancelled ? ' cancelled' : ''}" data-current="${isCancelled ? -1 : stepIdx}">
                    ${timelineSteps.join('')}
                    ${connectors.join('')}
                </div>
                <div class="quote-actions">
                    <button class="action-btn view-quote" data-quote-id="${q.id}" title="Ver orçamento"><i class="fas fa-file-lines"></i></button>
                    <button class="action-btn edit-quote" data-quote-id="${q.id}" title="Editar orçamento"><i class="fas fa-pen"></i></button>
                    <a href="https://wa.me/55${phoneDigits}" target="_blank" class="action-btn whatsapp-btn" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    <button class="action-btn cancel-quote ${isCancelled ? 'cancelled' : ''}" data-quote-id="${q.id}" data-status="${q.status}" title="${isCancelled ? 'Orçamento cancelado' : 'Cancelar orçamento'}"><i class="fas ${isCancelled ? 'fa-ban' : 'fa-ban'}"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Re-bind status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.value = filter;
}

// ===========================
// Timeline Click Handler (inline)
// ===========================
document.addEventListener('click', (e) => {
    const step = e.target.closest('.quote-timeline-inline .tl-step');
    if (!step) return;

    const timeline = step.closest('.quote-timeline-inline');
    if (!timeline) return;
    if (timeline.classList.contains('cancelled')) return;

    const clickedStep = parseInt(step.dataset.step);
    const quoteCard = step.closest('.quote-card');
    const quoteId = quoteCard.dataset.id;

    const statusMap = ['recebido', 'analise', 'aprovado', 'entregue'];
    const statusLabels = ['Recebido', 'Em Análise', 'Aprovado', 'Entregue'];
    const newStatus = statusMap[clickedStep] || 'recebido';
    const currentStatus = quoteCard.dataset.status;

    if (newStatus === currentStatus) return;

    if (!confirm(`Tem certeza que quer alterar o status do Orçamento?\n\nOrçamento #${quoteId}: ${statusLabels[statusMap.indexOf(currentStatus)] || currentStatus} → ${statusLabels[clickedStep]}`)) return;

    const steps = timeline.querySelectorAll('.tl-step');
    const conns = timeline.querySelectorAll('.tl-conn');

    steps.forEach((s, i) => {
        s.classList.remove('active', 'current');
        if (i < clickedStep) s.classList.add('active');
        else if (i === clickedStep) s.classList.add('current');
    });

    // Update connector colors based on current step
    const stepColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#2ed573'];
    conns.forEach((c, i) => {
        c.classList.remove('done', 'partial');
        if (i < clickedStep) {
            c.classList.add('done');
            c.style.background = stepColors[Math.min(i + 1, 3)];
        } else if (i === clickedStep) {
            c.classList.add('partial');
            c.style.background = `linear-gradient(90deg, ${stepColors[clickedStep]}, var(--border))`;
        } else {
            c.style.background = '';
        }
    });

    quoteCard.dataset.status = newStatus;

    // Save to Supabase
    db.from(SUPABASE_QUOTES_TABLE)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .then(({ error }) => {
            if (error) console.error('Erro ao atualizar orçamento:', error);
        });

    // Refresh local cache
    const q = getQuotes().find(o => o.id == quoteId);
    if (q) q.status = newStatus;

    renderMetrics();
    updateCharts(document.querySelector('.filter-btn.active')?.dataset.period || '30d');
    updateQuoteBadges();

    showToast(`Orçamento #${quoteId} atualizado para: ${['Recebido', 'Em Análise', 'Aprovado', 'Entregue'][clickedStep]}`);
});

// ===========================
// Cancel Quote Handler
// ===========================
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cancel-quote');
    if (!btn) return;

    const quoteId = btn.dataset.quoteId;
    const currentStatus = btn.dataset.status;

    if (currentStatus === 'cancelado') {
        if (!confirm(`Reativar orçamento #${quoteId}?`)) return;

        db.from(SUPABASE_QUOTES_TABLE)
            .update({ status: 'recebido', updated_at: new Date().toISOString() })
            .eq('id', quoteId)
            .then(({ error }) => {
                if (error) console.error('Erro ao reativar orçamento:', error);
            });

        const q = getQuotes().find(o => o.id == quoteId);
        if (q) q.status = 'recebido';

        const statusFilter = document.getElementById('statusFilter');
        renderQuotes(statusFilter?.value || 'all');
        renderMetrics();
        updateCharts(document.querySelector('.filter-btn.active')?.dataset.period || '30d');
        updateQuoteBadges();

        showToast(`Orçamento #${quoteId} reativado`);
        return;
    }

    if (!confirm(`Cancelar orçamento #${quoteId}?`)) return;

    db.from(SUPABASE_QUOTES_TABLE)
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .then(({ error }) => {
            if (error) console.error('Erro ao cancelar orçamento:', error);
        });

    const q = getQuotes().find(o => o.id == quoteId);
    if (q) q.status = 'cancelado';

    const statusFilter = document.getElementById('statusFilter');
    renderQuotes(statusFilter?.value || 'all');
    renderMetrics();
    updateCharts(document.querySelector('.filter-btn.active')?.dataset.period || '30d');
    updateQuoteBadges();

    showToast(`Orçamento #${quoteId} cancelado`);
});

// ===========================
// View Quote Modal
// ===========================
const quoteModal = document.getElementById('quoteModal');
const modalClose = document.getElementById('modalClose');
const modalQuoteId = document.getElementById('modalQuoteId');
const modalProducts = document.getElementById('modalProducts');
const modalTotal = document.getElementById('modalTotal');
const modalWhatsApp = document.getElementById('modalWhatsApp');
const modalClient = document.getElementById('modalClient');

document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-quote');
    if (!viewBtn) return;

    const quoteId = parseInt(viewBtn.dataset.quoteId);
    const q = getQuotes().find(o => o.id === quoteId);
    if (!q) return;

    const phoneDigits = (q.telefone || '').replace(/\D/g, '');
    const items = Array.isArray(q.itens) ? q.itens : [];

    modalQuoteId.textContent = '#' + q.id;
    modalTotal.textContent = formatPrice(q.total);
    modalWhatsApp.href = `https://wa.me/55${phoneDigits}`;

    modalClient.innerHTML = `
        <div class="client-avatar-sm"><i class="fas fa-user"></i></div>
        <div>
            <span class="client-name">${q.nome_cliente}</span>
            <span class="client-contact"><i class="fab fa-whatsapp"></i> ${q.telefone}</span>
        </div>
    `;

    modalProducts.innerHTML = items.map(p => {
        const code = p.codigo ? `CÓD ${p.codigo}` : '';
        return `
        <div class="product-row">
            <div class="product-details">
                <span class="product-name">${code ? code + ' | ' : ''}${p.nome}</span>
                <span class="product-qty">Qtd: ${p.quantidade}x ${formatPrice(p.preco)}</span>
            </div>
            <span class="product-price">${formatPrice(p.subtotal)}</span>
        </div>`;
    }).join('');

    quoteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Close modal
modalClose.addEventListener('click', closeModal);
quoteModal.addEventListener('click', (e) => {
    if (e.target === quoteModal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (quoteModal.classList.contains('active')) closeModal();
        const cqModal = document.getElementById('clientQuotesModal');
        if (cqModal && cqModal.classList.contains('active')) closeModal('clientQuotesModal');
        if (quoteEditModal.classList.contains('active')) {
            quoteEditModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

function closeModal(id) {
    if (id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    } else {
        quoteModal.classList.remove('active');
    }
    document.body.style.overflow = '';
}

// ===========================
// Quote Edit Modal
// ===========================
const quoteEditModal = document.getElementById('quoteEditModal');
let editQuoteData = null;
let editQuoteItems = [];

function formatEditPrice(v) {
    return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseEditPrice(str) {
    return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

function renderEditQuoteItems() {
    const container = document.getElementById('editQuoteItems');
    container.innerHTML = editQuoteItems.map((item, i) => `
        <div class="edit-quote-item" data-idx="${i}">
            <div class="edit-quote-item-name">${item.nome}</div>
            <input type="number" value="${item.quantidade}" min="1" data-field="qty" data-idx="${i}">
            <input type="text" value="${formatEditPrice(item.preco)}" data-field="price" data-idx="${i}">
            <button class="btn-remove-item" data-idx="${i}" title="Remover"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            if (field === 'qty') {
                editQuoteItems[idx].quantidade = Math.max(1, parseInt(e.target.value) || 1);
            } else if (field === 'price') {
                editQuoteItems[idx].preco = parseEditPrice(e.target.value);
            }
            editQuoteItems[idx].subtotal = editQuoteItems[idx].quantidade * editQuoteItems[idx].preco;
            recalcEditTotal();
            renderEditQuoteItems();
        });
    });

    container.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.idx);
            editQuoteItems.splice(idx, 1);
            renderEditQuoteItems();
            recalcEditTotal();
        });
    });
}

function recalcEditTotal() {
    const total = editQuoteItems.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
    document.getElementById('editQuoteTotal').value = formatEditPrice(total);
}

document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-quote');
    if (!editBtn) return;

    const quoteId = parseInt(editBtn.dataset.quoteId);
    const quote = getQuotes().find(q => q.id === quoteId);
    if (!quote) return;

    editQuoteData = quote;
    editQuoteItems = JSON.parse(JSON.stringify(quote.itens || []));

    document.getElementById('editQuoteId').textContent = `#${quote.id}`;

    const phoneDigits = (quote.telefone || '').replace(/\D/g, '');
    document.getElementById('editQuoteClient').innerHTML = `
        <div class="client-avatar-sm"><i class="fas fa-user"></i></div>
        <div>
            <span class="client-name">${quote.nome_cliente || 'Cliente'}</span>
            <span class="client-contact"><i class="fab fa-whatsapp"></i> ${quote.telefone || ''}</span>
        </div>
    `;

    renderEditQuoteItems();
    recalcEditTotal();

    quoteEditModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

document.getElementById('quoteEditClose').addEventListener('click', () => {
    quoteEditModal.classList.remove('active');
    document.body.style.overflow = '';
});
document.getElementById('editQuoteCancel').addEventListener('click', () => {
    quoteEditModal.classList.remove('active');
    document.body.style.overflow = '';
});
quoteEditModal.addEventListener('click', (e) => {
    if (e.target === quoteEditModal) {
        quoteEditModal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.getElementById('editAddItem').addEventListener('click', () => {
    editQuoteItems.push({ codigo: '', nome: 'Novo produto', quantidade: 1, preco: 0, subtotal: 0 });
    renderEditQuoteItems();
    recalcEditTotal();
});

document.getElementById('editQuoteTotal').addEventListener('input', () => {
    // Manual total override — user can type directly
});

document.getElementById('editQuoteSave').addEventListener('click', async () => {
    if (!editQuoteData) return;

    const totalInput = parseEditPrice(document.getElementById('editQuoteTotal').value);
    const calculatedTotal = editQuoteItems.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
    const finalTotal = totalInput || calculatedTotal;

    try {
        const { error } = await db
            .from(SUPABASE_QUOTES_TABLE)
            .update({
                itens: editQuoteItems.map(item => ({
                    codigo: item.codigo,
                    nome: item.nome,
                    quantidade: item.quantidade,
                    preco: item.preco,
                    subtotal: item.quantidade * item.preco,
                    categoria: item.categoria || ''
                })),
                total: finalTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', editQuoteData.id);

        if (error) throw error;

        const idx = _quotesCache.findIndex(q => q.id === editQuoteData.id);
        if (idx !== -1) {
            _quotesCache[idx].itens = editQuoteItems;
            _quotesCache[idx].total = finalTotal;
        }

        renderQuotes(document.getElementById('statusFilter')?.value || 'all');
        updateCharts('30d');

        quoteEditModal.classList.remove('active');
        document.body.style.overflow = '';
        showToast('Orçamento atualizado com sucesso!');
    } catch (e) {
        console.error('Erro ao salvar orçamento:', e);
        showToast('Erro ao salvar: ' + e.message);
    }
});

// ===========================
// Status Filter
// ===========================
const statusFilter = document.getElementById('statusFilter');
if (statusFilter) {
    statusFilter.addEventListener('change', () => {
        renderQuotes(statusFilter.value);
    });
}

// ===========================
// Toast Notification
// ===========================
function showToast(message, duration = 2500) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        border: 1px solid var(--accent);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 0.88rem;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 3000;
        box-shadow: 0 8px 30px rgba(0, 153, 204, 0.2);
        animation: slideUp 0.3s ease-out;
        max-width: 90vw;
        text-align: left;
        line-height: 1.5;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function formatPrice(v) {
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===========================
// Product Management
// ===========================
let _productsCache = [];
let _productsLoaded = false;

let _productsTotalCount = 0;

async function loadProductCount() {
    const { count, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .select('id', { count: 'exact', head: true });
    if (!error) _productsTotalCount = count || 0;
    return _productsTotalCount;
}

function getProductCount() {
    return _productsTotalCount;
}

async function fetchAllProducts() {
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await db
            .from(SUPABASE_PRODUCTS_TABLE)
            .select('id, codigo, nome, marca, categoria, preco, unidade, estoque, visivel, imagens, palavraschave')
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) { console.error('Erro ao carregar produtos:', error); break; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return all;
}

async function fetchProductFull(id) {
    const { data, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .select('*')
        .eq('id', id)
        .single();
    if (error) { console.error('Erro ao carregar produto completo:', error); return null; }
    return data;
}

async function loadProducts() {
    const [data, count] = await Promise.all([fetchAllProducts(), loadProductCount()]);
    _productsCache = data;
    _productsLoaded = true;
    return _productsCache;
}

function getProducts() {
    return _productsCache;
}

async function saveProducts(products) {
    _productsCache = products;
}

async function upsertProduct(productData) {
    const toSend = { ...productData };
    delete toSend.id;
    const { data, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .upsert(toSend, { onConflict: 'codigo' })
        .select();
    if (error) throw error;
    return data[0];
}

async function insertProduct(productData) {
    const { data, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .insert(productData)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteProductDB(id) {
    const { error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function updateProductDB(id, updates) {
    const { data, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .update(updates)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function bulkUpsertProducts(rows) {
    const { data, error } = await db
        .from(SUPABASE_PRODUCTS_TABLE)
        .upsert(rows, { onConflict: 'codigo' })
        .select();
    if (error) throw error;
    return data || [];
}

function getNextProductId() {
    const products = getProducts();
    if (products.length === 0) return 1;
    return Math.max(...products.map(p => p.id)) + 1;
}

async function filterProducts(query) {
    const products = getProducts();
    const tbody = document.getElementById('productsTableBody');
    const empty = document.getElementById('productsEmpty');
    const table = document.getElementById('productsTable');
    const badge = document.getElementById('productCountBadge');

    const totalCount = getProductCount() || products.length;
    if (!query) {
        if (badge) badge.textContent = `${totalCount} produto${totalCount !== 1 ? 's' : ''}`;
        if (totalCount === 0) {
            table.style.display = 'none';
            empty.style.display = 'block';
            return;
        }
        table.style.display = '';
        empty.style.display = 'none';
    }

    const filtered = query ? products.filter(p =>
        p.codigo.toLowerCase().includes(query) ||
        p.nome.toLowerCase().includes(query) ||
        p.unidade.toLowerCase().includes(query) ||
        p.marca.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query) ||
        (p.preco.toFixed(2)).includes(query) ||
        (p.palavraschave || p.palavrasChave || []).some(k => k.toLowerCase().includes(query))
    ) : products;

    if (query && badge) badge.textContent = `${filtered.length} de ${totalCount} produto${totalCount !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        table.style.display = '';
        empty.style.display = 'none';
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);">Nenhum produto encontrado</td></tr>`;
        return;
    }

    table.style.display = '';
    empty.style.display = 'none';

    tbody.innerHTML = filtered.map(p => {
        const estoqueClass = p.estoque > 20 ? 'high' : p.estoque > 5 ? 'medium' : 'low';
        const img = (p.imagens && p.imagens.length > 0) ? p.imagens[0] : '';
        const thumb = img
            ? `<img src="${img}" class="product-thumb product-thumb-click" onclick="editProduct(${p.id})" title="Clique para editar">`
            : `<div class="product-thumb product-thumb-empty product-thumb-click" onclick="editProduct(${p.id})" title="Clique para adicionar foto"><i class="fas fa-image"></i></div>`;
        const isVisivel = p.visivel !== false;
        const eyeIcon = isVisivel ? 'fa-eye' : 'fa-eye-slash';
        const eyeClass = isVisivel ? 'vis-btn-on' : 'vis-btn-off';
        const eyeTitle = isVisivel ? 'Visível no site — clique para ocultar' : 'Oculto no site — clique para tornar visível';
        const kw = p.palavraschave || p.palavrasChave || [];
        return `
        <tr data-id="${p.id}" ${!isVisivel ? 'style="opacity:0.45;"' : ''}>
            <td>${thumb}</td>
            <td><span class="stock-badge" style="background:rgba(0,153,204,0.1);color:var(--accent);">${p.codigo}</span></td>
            <td>${p.nome}</td>
            <td>${p.unidade}</td>
            <td>${p.marca}</td>
            <td>${p.categoria}</td>
            <td>R$ ${p.preco.toFixed(2).replace('.', ',')}</td>
            <td><span class="stock-badge ${estoqueClass}">${p.estoque}</span></td>
            <td>${kw.length > 0 ? kw.join(', ') : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="action-btn ${eyeClass}" onclick="toggleProductVisibility(${p.id})" title="${eyeTitle}"><i class="fas ${eyeIcon}"></i></button>
                    <button class="action-btn edit-btn" onclick="editProduct(${p.id})" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteProduct(${p.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function getCurrentSearchQuery() {
    const el = document.getElementById('productSearch');
    return el ? el.value.toLowerCase().trim() : '';
}

function renderProducts() {
    filterProducts(getCurrentSearchQuery());
}

// ===========================
// Product Modal (Add/Edit)
// ===========================
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const productModalTitle = document.getElementById('productModalTitle');
const productSubmitText = document.getElementById('productSubmitText');
const productIdInput = document.getElementById('productId');

document.getElementById('btnNewProduct').addEventListener('click', () => {
    productModalTitle.textContent = 'Novo Produto';
    productSubmitText.textContent = 'Salvar';
    productIdInput.value = '';
    productForm.reset();
    document.getElementById('prodDescricao').innerHTML = '';
    document.getElementById('promoPriceGroup').style.display = 'none';
    pendingUploadedImages = [];
    renderImagePreviews();
    pendingTags = [];
    renderTags();
    urlInputs.forEach(({ input, preview }) => {
        document.getElementById(input).value = '';
        showUrlPreview(input, preview);
    });
    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

document.getElementById('productModalClose').addEventListener('click', closeProductModal);
document.getElementById('productCancel').addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeProductModal();
});

function closeProductModal() {
    productModal.classList.remove('active');
    document.body.style.overflow = '';
    pendingUploadedImages = [];
    renderImagePreviews();
    urlInputs.forEach(({ input, preview }) => {
        document.getElementById(input).value = '';
        showUrlPreview(input, preview);
    });
}

// ===========================
// Rich Text Editor Toolbar
// ===========================
document.querySelectorAll('#richtextToolbar button[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
    });
});

// ===========================
// Image Upload System
// ===========================
let pendingUploadedImages = [];
const IMG_MAX_DIM = 800;
const IMG_QUALITY = 0.7;

const imgUploadZone = document.getElementById('imgUploadZone');
const imgFileInput = document.getElementById('imgFileInput');
const imgPreviewList = document.getElementById('imgPreviewList');
const imgUploadPlaceholder = document.getElementById('imgUploadPlaceholder');

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > IMG_MAX_DIM || h > IMG_MAX_DIM) {
                    if (w > h) { h = Math.round(h * IMG_MAX_DIM / w); w = IMG_MAX_DIM; }
                    else { w = Math.round(w * IMG_MAX_DIM / h); h = IMG_MAX_DIM; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    imgPreviewList.innerHTML = '';
    imgUploadPlaceholder.style.display = pendingUploadedImages.length > 0 ? 'none' : '';
    pendingUploadedImages.forEach((src, i) => {
        const div = document.createElement('div');
        div.className = 'img-preview-item';
        div.innerHTML = `<img src="${src}"><button class="img-preview-remove" data-idx="${i}"><i class="fas fa-times"></i></button>`;
        imgPreviewList.appendChild(div);
    });
    imgPreviewList.querySelectorAll('.img-preview-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingUploadedImages.splice(parseInt(btn.dataset.idx), 1);
            renderImagePreviews();
        });
    });
}

function handleImageFiles(files) {
    Array.from(files).forEach(async (file) => {
        if (!file.type.startsWith('image/')) return;
        if (pendingUploadedImages.length >= 5) {
            showToast('Maximo de 5 imagens.');
            return;
        }
        const base64 = await compressImage(file);
        pendingUploadedImages.push(base64);
        renderImagePreviews();
    });
}

imgUploadZone.addEventListener('click', () => imgFileInput.click());
imgFileInput.addEventListener('change', (e) => {
    handleImageFiles(e.target.files);
    imgFileInput.value = '';
});

// ===========================
// Image Drop Handler (files, links, browser drag)
// ===========================
const urlInputs = [
    { input: 'prodImg1', preview: 'imgPreview1' },
    { input: 'prodImg2', preview: 'imgPreview2' },
    { input: 'prodImg3', preview: 'imgPreview3' },
    { input: 'prodImg4', preview: 'imgPreview4' },
    { input: 'prodImg5', preview: 'imgPreview5' }
];

function addUrlToFirstEmpty(url) {
    const emptySlot = urlInputs.find(({ input }) => !document.getElementById(input)?.value.trim());
    if (emptySlot) {
        document.getElementById(emptySlot.input).value = url;
        showUrlPreview(emptySlot.input, emptySlot.preview);
        showToast('Imagem adicionada!');
        return true;
    }
    showToast('Todos os 5 campos de imagem estao preenchidos.');
    return false;
}

function extractImageUrl(e) {
    const html = e.dataTransfer.getData('text/html');
    if (html) {
        const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && match[1]) return match[1].trim();
    }

    const uriList = e.dataTransfer.getData('text/uri-list');
    if (uriList) {
        const lines = uriList.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        for (const line of lines) {
            if (/^https?:\/\//i.test(line)) return line;
        }
    }

    const plain = e.dataTransfer.getData('text/plain');
    if (plain && /^https?:\/\//i.test(plain.trim())) return plain.trim();

    return null;
}

imgUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imgUploadZone.classList.add('dragover');
});

imgUploadZone.addEventListener('dragleave', () => {
    imgUploadZone.classList.remove('dragover');
});

imgUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imgUploadZone.classList.remove('dragover');

    const imgUrl = extractImageUrl(e);
    if (imgUrl) {
        addUrlToFirstEmpty(imgUrl);
        return;
    }

    if (e.dataTransfer.files.length > 0) {
        handleImageFiles(e.dataTransfer.files);
    }
});

// ===========================
// URL Image Preview (paste/type)
// ===========================
function showUrlPreview(inputId, previewId) {
    const url = document.getElementById(inputId)?.value.trim();
    const previewEl = document.getElementById(previewId);
    if (!previewEl) return;

    if (!url) {
        previewEl.className = 'img-url-preview';
        previewEl.innerHTML = '';
        return;
    }

    const img = new Image();
    img.onload = () => {
        previewEl.className = 'img-url-preview active';
        previewEl.innerHTML = `<img src="${url}">`;
    };
    img.onerror = () => {
        previewEl.className = 'img-url-preview img-url-error';
        previewEl.innerHTML = '';
    };
    img.src = url;
}

urlInputs.forEach(({ input, preview }) => {
    const el = document.getElementById(input);
    if (!el) return;
    el.addEventListener('input', () => showUrlPreview(input, preview));
    el.addEventListener('paste', () => setTimeout(() => showUrlPreview(input, preview), 100));
});

// Promo toggle
document.getElementById('prodPromocao')?.addEventListener('change', (e) => {
    document.getElementById('promoPriceGroup').style.display = e.target.checked ? '' : 'none';
});

// ===========================
// Tag Input (Palavras-chave)
// ===========================
let pendingTags = [];
const tagInput = document.getElementById('prodKeywords');
const tagList = document.getElementById('tagList');
const tagContainer = document.getElementById('tagInputContainer');

function renderTags() {
    tagList.innerHTML = '';
    pendingTags.forEach((tag, i) => {
        const el = document.createElement('span');
        el.className = 'tag-item';
        el.innerHTML = `${tag} <span class="tag-remove" data-idx="${i}">&times;</span>`;
        tagList.appendChild(el);
    });
    tagList.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingTags.splice(parseInt(btn.dataset.idx), 1);
            renderTags();
        });
    });
}

function addTagFromInput() {
    const val = tagInput.value.trim().toLowerCase();
    if (val && !pendingTags.includes(val)) {
        pendingTags.push(val);
        renderTags();
    }
    tagInput.value = '';
}

if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTagFromInput();
        }
        if (e.key === 'Backspace' && !tagInput.value && pendingTags.length > 0) {
            pendingTags.pop();
            renderTags();
        }
    });
    tagContainer.addEventListener('click', () => tagInput.focus());
}

window.editProduct = async function(id) {
    const lite = getProducts().find(p => p.id === id);
    if (!lite) return;

    const product = await fetchProductFull(id);
    if (!product) { showToast('Erro ao carregar produto'); return; }

    productModalTitle.textContent = 'Editar Produto';
    productSubmitText.textContent = 'Atualizar';
    productIdInput.value = product.id;

    document.getElementById('prodCodigo').value = product.codigo;
    document.getElementById('prodNome').value = product.nome;
    document.getElementById('prodUnidade').value = product.unidade;
    document.getElementById('prodMarca').value = product.marca;
    document.getElementById('prodCategoria').value = product.categoria;
    document.getElementById('prodPreco').value = product.preco.toFixed(2).replace('.', ',');
    document.getElementById('prodEstoque').value = product.estoque;

    // New fields
    document.getElementById('prodDescricao').innerHTML = product.descricao || '';
    pendingTags = [...(product.palavraschave || product.palavrasChave || [])];
    renderTags();
    const imgs = product.imagens || [];
    const urlImgs = imgs.filter(i => !i.startsWith('data:'));
    const base64Imgs = imgs.filter(i => i.startsWith('data:'));
    pendingUploadedImages = [...base64Imgs];
    renderImagePreviews();
    document.getElementById('prodImg1').value = urlImgs[0] || '';
    document.getElementById('prodImg2').value = urlImgs[1] || '';
    document.getElementById('prodImg3').value = urlImgs[2] || '';
    document.getElementById('prodImg4').value = urlImgs[3] || '';
    document.getElementById('prodImg5').value = urlImgs[4] || '';
    urlInputs.forEach(({ input, preview }) => showUrlPreview(input, preview));
    document.getElementById('prodVideo').value = product.video || '';
    document.getElementById('prodDestaque').checked = product.isdestaque || product.isDestaque || false;
    document.getElementById('prodPromocao').checked = product.ispromocao || product.isPromocao || false;
    const promoVal = product.precopromocional || product.precoPromocional || 0;
    document.getElementById('prodPrecoPromo').value = promoVal ? promoVal.toFixed(2).replace('.', ',') : '';
    document.getElementById('promoPriceGroup').style.display = (product.ispromocao || product.isPromocao) ? '' : 'none';

    productModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.deleteProduct = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
        await deleteProductDB(id);
        _productsCache = _productsCache.filter(p => p.id !== id);
        _productsTotalCount = Math.max(0, _productsTotalCount - 1);
        renderProducts();
        showToast('Produto excluído com sucesso!');
    } catch(e) {
        showToast('Erro ao excluir: ' + e.message);
    }
};

window.toggleProductVisibility = async function(id) {
    const product = getProducts().find(p => p.id === id);
    if (!product) return;
    const newVisivel = product.visivel === false ? true : false;
    try {
        await updateProductDB(id, { visivel: newVisivel });
        product.visivel = newVisivel;
        renderProducts();
        showToast(newVisivel ? 'Produto visível no site' : 'Produto ocultado do site');
    } catch(e) {
        showToast('Erro ao atualizar: ' + e.message);
    }
};

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const precoStr = document.getElementById('prodPreco').value.replace('.', '').replace(',', '.');
    const preco = parseFloat(precoStr);
    if (isNaN(preco) || preco <= 0) {
        showToast('Preço inválido!');
        return;
    }

    const estoque = parseInt(document.getElementById('prodEstoque').value);
    if (isNaN(estoque) || estoque < 0) {
        showToast('Estoque inválido!');
        return;
    }

    const productData = {
        codigo: document.getElementById('prodCodigo').value.trim(),
        nome: document.getElementById('prodNome').value.trim(),
        unidade: document.getElementById('prodUnidade').value,
        marca: document.getElementById('prodMarca').value.trim(),
        categoria: document.getElementById('prodCategoria').value,
        preco: preco,
        estoque: estoque,
        descricao: document.getElementById('prodDescricao').innerHTML.trim(),
        palavraschave: [...pendingTags],
        imagens: [
            ...pendingUploadedImages,
            document.getElementById('prodImg1').value.trim(),
            document.getElementById('prodImg2').value.trim(),
            document.getElementById('prodImg3').value.trim(),
            document.getElementById('prodImg4').value.trim(),
            document.getElementById('prodImg5').value.trim()
        ].filter(Boolean).slice(0, 5),
        video: document.getElementById('prodVideo').value.trim(),
        visivel: true,
        isdestaque: document.getElementById('prodDestaque').checked,
        ispromocao: document.getElementById('prodPromocao').checked,
        precopromocional: document.getElementById('prodPromocao').checked
            ? parseFloat(document.getElementById('prodPrecoPromo').value.replace('.', '').replace(',', '.')) || 0
            : 0
    };

    const existingId = productIdInput.value;
    const submitBtn = document.getElementById('productSubmit');

    try {
        submitBtn.disabled = true;
        productSubmitText.textContent = 'Salvando...';
        if (existingId) {
            const existing = getProducts().find(p => p.id === parseInt(existingId));
            productData.visivel = existing ? existing.visivel : true;
            delete productData.id;
            await updateProductDB(parseInt(existingId), productData);
            showToast('Produto atualizado com sucesso!');
        } else {
            delete productData.id;
            const inserted = await insertProduct(productData);
            showToast('Produto cadastrado com sucesso!');
        }
        await loadProducts();
        renderProducts();
        closeProductModal();
    } catch(e) {
        showToast('Erro ao salvar: ' + e.message);
    } finally {
        submitBtn.disabled = false;
        productSubmitText.textContent = existingId ? 'Atualizar' : 'Salvar';
    }
});

// ===========================
// CSV Import
// ===========================
const csvModal = document.getElementById('csvModal');
const csvDropZone = document.getElementById('csvDropZone');
const csvFileInput = document.getElementById('csvFileInput');
const csvStep1 = document.getElementById('csvStep1');
const csvStep2 = document.getElementById('csvStep2');
let csvParsedData = [];
let csvMissingCategories = [];

document.getElementById('btnImportCSV').addEventListener('click', () => {
    csvStep1.style.display = '';
    csvStep2.style.display = 'none';
    csvParsedData = [];
    csvFileInput.value = '';
    csvModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// ===========================
// Export Modal
// ===========================
const exportModal = document.getElementById('exportModal');
const exportCategoryGroup = document.getElementById('exportCategoryGroup');
const exportBrandGroup = document.getElementById('exportBrandGroup');
const exportCategorySelect = document.getElementById('exportCategorySelect');
const exportBrandSelect = document.getElementById('exportBrandSelect');
const exportCount = document.getElementById('exportCount');

function getExportFilteredProducts() {
    const filter = document.querySelector('input[name="exportFilter"]:checked')?.value || 'all';
    const products = getProducts();
    if (filter === 'category') {
        const cat = exportCategorySelect.value;
        return cat ? products.filter(p => p.categoria === cat) : products;
    }
    if (filter === 'brand') {
        const brand = exportBrandSelect.value;
        return brand ? products.filter(p => p.marca === brand) : products;
    }
    return products;
}

function updateExportCount() {
    const count = getExportFilteredProducts().length;
    exportCount.textContent = `${count} produto${count !== 1 ? 's' : ''} será${count !== 1 ? 'ão' : ''} exportado${count !== 1 ? 's' : ''}`;
}

function openExportModal() {
    const products = getProducts();
    if (products.length === 0) {
        showToast('Nenhum produto para exportar');
        return;
    }

    const cats = [...new Set(products.map(p => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    exportCategorySelect.innerHTML = '<option value="">Selecione...</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

    const brands = [...new Set(products.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    exportBrandSelect.innerHTML = '<option value="">Selecione...</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');

    document.querySelector('input[name="exportFilter"][value="all"]').checked = true;
    document.querySelectorAll('.export-radio').forEach(r => r.classList.remove('active'));
    document.querySelector('.export-radio[data-filter="all"]').classList.add('active');
    exportCategoryGroup.style.display = 'none';
    exportBrandGroup.style.display = 'none';
    exportCategorySelect.value = '';
    exportBrandSelect.value = '';

    updateExportCount();
    exportModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeExportModal() {
    exportModal.classList.remove('active');
    document.body.style.overflow = '';
}

document.querySelectorAll('.export-radio').forEach(radio => {
    radio.addEventListener('click', () => {
        document.querySelectorAll('.export-radio').forEach(r => r.classList.remove('active'));
        radio.classList.add('active');
        radio.querySelector('input').checked = true;
        const val = radio.dataset.filter;
        exportCategoryGroup.style.display = val === 'category' ? '' : 'none';
        exportBrandGroup.style.display = val === 'brand' ? '' : 'none';
        updateExportCount();
    });
});

exportCategorySelect.addEventListener('change', updateExportCount);
exportBrandSelect.addEventListener('change', updateExportCount);
document.getElementById('exportModalClose').addEventListener('click', closeExportModal);
document.getElementById('exportCancel').addEventListener('click', closeExportModal);
exportModal.addEventListener('click', (e) => { if (e.target === exportModal) closeExportModal(); });

document.getElementById('btnExportXLSX').addEventListener('click', openExportModal);

document.getElementById('exportConfirm').addEventListener('click', () => {
    const products = getExportFilteredProducts();
    if (products.length === 0) {
        showToast('Nenhum produto para exportar com o filtro selecionado');
        return;
    }

    const headers = ['Código', 'Descrição', 'Unidade', 'Marca', 'Categoria', 'Preço', 'Estoque', 'Palavras Chaves - (separar com virgula)'];

    const rows = products.map(p => [
        p.codigo || '',
        p.nome || '',
        p.unidade || '',
        p.marca || '',
        p.categoria || '',
        String(p.preco || 0).replace('.', ','),
        p.estoque != null ? p.estoque : '',
        Array.isArray(p.palavrasChave) ? p.palavrasChave.join(', ') : (p.palavrasChave || '')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    for (let r = 1; r <= rows.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 5 });
        if (ws[addr]) {
            ws[addr].t = 's';
            ws[addr].z = '@';
        }
    }

    ws['!cols'] = [
        { wch: 15 },
        { wch: 45 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
        { wch: 50 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'catalogo_cabral.xlsx');
    closeExportModal();
    showToast(`${products.length} produto(s) exportado(s) com sucesso!`);
});

document.getElementById('csvModalClose').addEventListener('click', closeCSVModal);
csvModal.addEventListener('click', (e) => {
    if (e.target === csvModal) closeCSVModal();
});

function closeCSVModal() {
    csvModal.classList.remove('active');
    document.body.style.overflow = '';
}

csvDropZone.addEventListener('click', () => csvFileInput.click());
document.getElementById('csvSelectFile').addEventListener('click', (e) => {
    e.stopPropagation();
    csvFileInput.click();
});

csvDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvDropZone.classList.add('dragover');
});

csvDropZone.addEventListener('dragleave', () => {
    csvDropZone.classList.remove('dragover');
});

csvDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    csvDropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const ext = files[0].name.split('.').pop().toLowerCase();
        if (ext === 'csv' || ext === 'xlsx') {
            processCSVFile(files[0]);
        } else {
            showToast('Formato não suportado. Use CSV ou XLSX.');
        }
    }
});

csvFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        processCSVFile(e.target.files[0]);
    }
});

function processCSVFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx') {
        if (typeof XLSX === 'undefined') {
            showToast('Erro: biblioteca XLSX não carregada. Recarregue a página.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                const csvText = json.map(row => row.map(cell => {
                    if (typeof cell === 'number') {
                        return String(cell);
                    }
                    const s = String(cell ?? '');
                    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
                }).join(',')).join('\n');
                parseAndValidateCSV(csvText, file.name);
            } catch (err) {
                console.error('XLSX parse error:', err);
                showToast('Erro ao ler ficheiro XLSX: ' + err.message);
            }
        };
        reader.onerror = () => showToast('Erro ao ler o ficheiro');
        reader.readAsArrayBuffer(file);
    } else if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                parseAndValidateCSV(e.target.result, file.name);
            } catch (err) {
                console.error('CSV parse error:', err);
                showToast('Erro ao ler ficheiro CSV: ' + err.message);
            }
        };
        reader.onerror = () => showToast('Erro ao ler o ficheiro');
        reader.readAsText(file, 'UTF-8');
    } else {
        showToast('Formato não suportado. Use CSV ou XLSX.');
    }
}

function parsePreco(str) {
    if (!str) return NaN;
    const s = String(str).trim();
    const hasDot = s.includes('.');
    const hasComma = s.includes(',');
    if (hasDot && hasComma) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    }
    if (hasComma) {
        return parseFloat(s.replace(',', '.'));
    }
    if (hasDot) {
        const parts = s.split('.');
        if (parts.length > 2 || parts[parts.length - 1].length > 2) {
            return parseFloat(s.replace(/\./g, ''));
        }
        return parseFloat(s);
    }
    return parseFloat(s);
}

function parseAndValidateCSV(text, fileName) {
    const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
        showToast('O ficheiro está vazio ou não tem dados');
        return;
    }

    const header = parseCSVLine(lines[0]);
    const expectedHeaders = ['Código', 'Descrição', 'Unidade', 'Marca', 'Categoria', 'Preço', 'Estoque', 'Palavras Chaves - (separar com virgula)'];

    function normalizeStr(s) {
        return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    const normHeader = header.map(normalizeStr);
    const normExpected = expectedHeaders.map(normalizeStr);

    const headerMatch = normExpected.every(h => normHeader.includes(h));
    if (!headerMatch) {
        console.log('Expected:', normExpected);
        console.log('Found:', normHeader);
        console.log('Original:', header);
        showToast(`Cabeçalho inválido. Colunas encontradas: ${header.join(' | ')}`);
        return;
    }

    const headerMap = {};
    expectedHeaders.forEach((h, i) => {
        const normH = normalizeStr(h);
        const idx = normHeader.indexOf(normH);
        headerMap[h] = idx;
    });

    const existingProducts = getProducts();
    const existingByCodigo = {};
    existingProducts.forEach(p => { existingByCodigo[p.codigo] = p; });
    const cats = getCategories();
    const existingCatNames = new Set(cats.map(c => c.nome.toLowerCase()));
    const missingCategories = new Set();
    const seenCodes = new Set();
    csvParsedData = [];
    let errorCount = 0;

    const dataLines = lines.slice(1, 501);
    const kwColIndex = headerMap['Palavras Chaves - (separar com virgula)'];

    for (let i = 0; i < dataLines.length; i++) {
        const values = kwColIndex !== undefined ? parseCSVLineWithKeywords(dataLines[i], kwColIndex) : parseCSVLine(dataLines[i]);
        const row = {
            line: i + 2,
            codigo: values[headerMap['Código']] || '',
            nome: values[headerMap['Descrição']] || '',
            unidade: values[headerMap['Unidade']] || '',
            marca: values[headerMap['Marca']] || '',
            categoria: values[headerMap['Categoria']] || '',
            preco: values[headerMap['Preço']] || '',
            estoque: values[headerMap['Estoque']] || '',
            palavrasChave: (values[headerMap['Palavras Chaves - (separar com virgula)']] || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean),
            errors: [],
            warnings: [],
            changes: [],
            isUpdate: false
        };

        const allEmpty = !row.codigo && !row.nome && !row.unidade && !row.marca && !row.categoria && !row.preco && !row.estoque;
        if (allEmpty) continue;

        if (!row.codigo) row.errors.push('Código vazio');
        if (!row.nome) row.errors.push('Descrição vazia');
        if (!row.unidade) row.errors.push('Unidade vazia');
        if (!row.marca) row.errors.push('Marca vazia');
        if (!row.categoria) row.errors.push('Categoria vazia');

        if (row.categoria && !existingCatNames.has(row.categoria.toLowerCase())) {
            row.warnings.push('Categoria não cadastrada');
            missingCategories.add(row.categoria);
        }

        const precoNum = parsePreco(row.preco);
        if (isNaN(precoNum) || precoNum <= 0) {
            row.errors.push('Preço inválido');
        } else {
            row.precoNum = precoNum;
        }

        const estoqueNum = parseInt(row.estoque);
        if (isNaN(estoqueNum) || estoqueNum < 0) {
            row.errors.push('Estoque inválido');
        } else {
            row.estoqueNum = estoqueNum;
        }

        if (seenCodes.has(row.codigo)) {
            row.errors.push('Código duplicado no CSV');
        } else {
            seenCodes.add(row.codigo);
        }

        if (existingByCodigo[row.codigo]) {
            row.isUpdate = true;
            const existing = existingByCodigo[row.codigo];
            const changeFields = [];

            if (existing.nome !== row.nome) changeFields.push('Descrição');
            if (existing.marca !== row.marca) changeFields.push('Marca');
            if (existing.categoria !== row.categoria) changeFields.push('Categoria');
            if (existing.unidade !== row.unidade) changeFields.push('Unidade');

            if (existing.preco !== precoNum) {
                changeFields.push(`Preço (${formatPrice(existing.preco)} → ${formatPrice(precoNum)})`);
            }

            if (existing.estoque !== estoqueNum) {
                changeFields.push(`Estoque (${existing.estoque} → ${estoqueNum})`);
            }

            const existingKW = (existing.palavrasChave || []).sort().join(',');
            const newKW = row.palavrasChave.sort().join(',');
            if (existingKW !== newKW) changeFields.push('Palavras-chave');

            if (changeFields.length > 0) {
                row.changes = changeFields;
                row.warnings.push(`${changeFields.length} campo(s) alterado(s)`);
            } else {
                row.isUnchanged = true;
            }
        }

        if (row.errors.length > 0) errorCount++;
        csvParsedData.push(row);
    }

    csvMissingCategories = [...missingCategories];

    if (csvParsedData.length === 0) {
        showToast('Nenhum produto encontrado no CSV');
        return;
    }

    showCSVPreview(fileName, errorCount);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSVLineWithKeywords(line, kwColIndex) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            if (result.length === kwColIndex) {
                result.push(line.substring(i + 1).trim());
                return result;
            }
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function showCSVPreview(fileName, errorCount) {
    csvStep1.style.display = 'none';
    csvStep2.style.display = '';

    document.getElementById('csvFileName').textContent = fileName;
    document.getElementById('csvRowCount').textContent = `${csvParsedData.length} registo(s)`;

    const unchangedCount = csvParsedData.filter(r => r.isUnchanged).length;
    const updateCount = csvParsedData.filter(r => r.isUpdate && !r.isUnchanged).length;
    const newCount = csvParsedData.filter(r => !r.isUpdate && r.errors.length === 0).length;

    const statusEl = document.getElementById('csvPreviewStatus');
    let statusHTML = '';
    if (errorCount > 0) {
        statusHTML += `<span class="csv-status-badge error"><i class="fas fa-exclamation-circle"></i> ${errorCount} erro(s)</span>`;
    }
    if (updateCount > 0) {
        statusHTML += `<span class="csv-status-badge" style="background:rgba(0,153,204,0.1);color:#0099cc;"><i class="fas fa-sync-alt"></i> ${updateCount} atualizar</span>`;
    }
    if (unchangedCount > 0) {
        statusHTML += `<span class="csv-status-badge" style="background:rgba(160,160,180,0.1);color:#a0a0b4;"><i class="fas fa-minus-circle"></i> ${unchangedCount} existente(s)</span>`;
    }
    if (newCount > 0) {
        statusHTML += `<span class="csv-status-badge success"><i class="fas fa-plus-circle"></i> ${newCount} novo(s)</span>`;
    }
    if (!statusHTML) {
        statusHTML = `<span class="csv-status-badge success"><i class="fas fa-check-circle"></i> Sem erros</span>`;
    }
    if (csvMissingCategories.length > 0) {
        statusHTML += `<span class="csv-status-badge error" style="background:rgba(255,165,2,0.1);color:#ffa502;"><i class="fas fa-exclamation-triangle"></i> ${csvMissingCategories.length} categoria(s) não cadastrada(s)</span>`;
    }
    statusEl.innerHTML = statusHTML;

    const tbody = document.getElementById('csvPreviewBody');
    tbody.innerHTML = csvParsedData.map(row => {
        const hasError = row.errors.length > 0;
        const hasChanges = row.changes && row.changes.length > 0;
        const isUnchanged = row.isUnchanged;
        const rowClass = hasError ? 'row-error' : (hasChanges ? 'row-update' : (isUnchanged ? 'row-unchanged' : 'row-valid'));

        let statusText = '';
        let statusClass = '';
        if (hasError) {
            statusText = row.errors.join(', ');
            statusClass = 'err';
        } else if (hasChanges) {
            statusText = row.changes.join(', ');
            statusClass = 'update';
        } else if (isUnchanged) {
            statusText = 'Produto Existente';
            statusClass = 'unchanged';
        } else {
            statusText = 'Novo';
            statusClass = 'ok';
        }

        let badge = '';
        if (isUnchanged) {
            badge = '<span class="cat-badge-exists">existente</span>';
        } else if (row.isUpdate) {
            badge = '<span class="cat-badge-update">atualizar</span>';
        } else {
            badge = '<span class="cat-badge-new">novo</span>';
        }

        return `
        <tr class="${rowClass}">
            <td>${row.line}</td>
            <td>${row.codigo}</td>
            <td>${row.nome}</td>
            <td>${row.unidade}</td>
            <td>${row.marca}</td>
            <td>${row.categoria}${row.warnings.some(w => w.includes('não cadastrada')) ? ' <span class="cat-badge-warn">nova</span>' : ''}</td>
            <td>${row.preco}</td>
            <td>${row.estoque}</td>
            <td>${row.palavrasChave.length > 0 ? row.palavrasChave.join(', ') : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${badge}</td>
            <td><span class="row-status ${statusClass}">${statusText}</span></td>
        </tr>`;
    }).join('');

    const confirmBtn = document.getElementById('csvConfirmImport');
    confirmBtn.disabled = errorCount > 0;
}

document.getElementById('csvBack').addEventListener('click', () => {
    csvStep1.style.display = '';
    csvStep2.style.display = 'none';
});

document.getElementById('csvConfirmImport').addEventListener('click', async () => {
    const validRows = csvParsedData.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
        showToast('Nenhum registo válido para importar');
        return;
    }

    if (csvMissingCategories.length > 0) {
        let cats = getCategories();
        for (const name of csvMissingCategories) {
            if (!cats.some(c => c.nome.toLowerCase() === name.toLowerCase())) {
                try {
                    const { data } = await db
                        .from(SUPABASE_CATEGORIES_TABLE)
                        .insert({ nome: name })
                        .select();
                    if (data && data[0]) cats.push(data[0]);
                } catch(e) { console.error('Erro ao criar categoria:', e); }
            }
        }
        _categoriesCache = cats;
        renderCategories();
        updateCategorySelects();
        showToast(`${csvMissingCategories.length} categoria(s) criada(s) automaticamente!`);
    }

    const rowsToInsert = [];
    const rowsToUpdate = [];
    let addedCount = 0;
    let updatedCount = 0;
    const changeSummary = [];

    validRows.forEach((row) => {
        const existing = getProducts().find(p => p.codigo === row.codigo);

        if (existing) {
            if (row.isUnchanged) return;

            const fieldChanges = [];
            if (existing.nome !== row.nome) fieldChanges.push('Descrição');
            if (existing.marca !== row.marca) fieldChanges.push('Marca');
            if (existing.categoria !== row.categoria) fieldChanges.push('Categoria');
            if (existing.unidade !== row.unidade) fieldChanges.push('Unidade');
            if (existing.preco !== row.precoNum) fieldChanges.push('Preço');
            if (existing.estoque !== row.estoqueNum) fieldChanges.push('Estoque');

            const existingKW = (existing.palavraschave || existing.palavrasChave || []).sort().join(',');
            const newKW = row.palavrasChave.sort().join(',');
            if (existingKW !== newKW) fieldChanges.push('Palavras-chave');

            if (fieldChanges.length > 0) {
                updatedCount++;
                changeSummary.push({ codigo: row.codigo, nome: row.nome, fields: fieldChanges });
                rowsToUpdate.push({
                    id: existing.id,
                    data: {
                        nome: row.nome,
                        unidade: row.unidade,
                        marca: row.marca,
                        categoria: row.categoria,
                        preco: row.precoNum,
                        estoque: row.estoqueNum,
                        palavraschave: [...row.palavrasChave]
                    }
                });
            }
        } else {
            rowsToInsert.push({
                codigo: row.codigo,
                nome: row.nome,
                unidade: row.unidade,
                marca: row.marca,
                categoria: row.categoria,
                preco: row.precoNum,
                estoque: row.estoqueNum,
                palavraschave: [...row.palavrasChave],
                visivel: true
            });
            addedCount++;
        }
    });

    if (rowsToInsert.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
            const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await db.from(SUPABASE_PRODUCTS_TABLE).insert(batch);
            if (error) {
                console.error('Erro ao importar lote:', error);
                showToast(`Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
                break;
            }
        }
    }
    for (const row of rowsToUpdate) {
        await db.from(SUPABASE_PRODUCTS_TABLE).update(row.data).eq('id', row.id);
    }

    await loadProducts();
    renderProducts();
    closeCSVModal();

    if (addedCount === 0 && updatedCount === 0) {
        showToast('Nenhuma alteração — todos os produtos já existem no catálogo');
    } else {
        let msg = '';
        if (addedCount > 0) msg += `${addedCount} novo(s) adicionado(s)`;
        if (updatedCount > 0) msg += `${msg ? ', ' : ''}${updatedCount} atualizado(s)`;
        showToast(msg);

        if (changeSummary.length > 0) {
            setTimeout(() => {
                const detailMsg = changeSummary.map(c => `<strong>${c.codigo}</strong> — ${c.fields.join(', ')}`).join('<br>');
                showToast(`Alterações:<br>${detailMsg}`, 6000);
            }, 500);
        }
    }
});

document.getElementById('csvDownloadTemplate').addEventListener('click', () => {
    const headers = ['Código', 'Descrição', 'Unidade', 'Marca', 'Categoria', 'Preço', 'Estoque', 'Palavras Chaves - (separar com virgula)'];
    const sheetData = [
        headers,
        ['P001', 'Furadeira Bosch GSB 20-2RE', 'UN', 'Bosch', 'Elétricas', '489,90', '48', 'furadeira, bosch, elétrica, parafusar']
    ];

    for (let i = 0; i < 999; i++) {
        sheetData.push(['', '', '', '', '', '', '', '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    for (let r = 1; r <= 1000; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 5 });
        if (ws[addr]) {
            ws[addr].t = 's';
            ws[addr].z = '@';
        }
    }

    ws['!cols'] = [
        { wch: 12 },
        { wch: 40 },
        { wch: 10 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 10 },
        { wch: 45 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    XLSX.writeFile(wb, 'template_produtos.xlsx');
});

// Initialize products on load
renderProducts();

// ===========================
// Product Search
// ===========================
let _searchDebounce = null;
document.getElementById('productSearch').addEventListener('input', (e) => {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
        filterProducts(e.target.value.toLowerCase().trim());
    }, 200);
});

// ===========================
// Sync to Site — now reloads from Supabase
// ===========================
document.getElementById('btnSyncSite').addEventListener('click', async () => {
    await loadProducts();
    renderProducts();
    showToast(`${getProducts().length} produto(s) recarregado(s) do banco!`);
});

document.getElementById('btnSyncCat').addEventListener('click', async () => {
    await loadProducts();
    renderProducts();
    showToast(`${getProducts().length} produto(s) recarregado(s) do banco!`);
});

// ===========================
// Category Management
// ===========================
let _categoriesCache = [];

async function loadCategories() {
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
    _categoriesCache = all;
    return _categoriesCache;
}

function getCategories() {
    return _categoriesCache;
}

function getNextCategoryId() {
    const cats = getCategories();
    if (cats.length === 0) return 1;
    return Math.max(...cats.map(c => c.id)) + 1;
}

function countProductsByCategory(catName) {
    const products = getProducts();
    return products.filter(p => p.categoria === catName).length;
}

function renderCategories() {
    const cats = [...getCategories()].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    const tbody = document.getElementById('categoryTableBody');
    const empty = document.getElementById('categoryListEmpty');
    const table = tbody.closest('.table-container').querySelector('.data-table');

    if (cats.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        empty.style.display = '';
        return;
    }

    table.style.display = '';
    empty.style.display = 'none';

    tbody.innerHTML = cats.map((c, i) => {
        const count = countProductsByCategory(c.nome);
        return `
        <tr data-id="${c.id}">
            <td style="color: var(--text-muted); font-size: 0.8rem;">${i + 1}</td>
            <td><span style="font-weight:500;">${c.nome}</span></td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${count} produto${count !== 1 ? 's' : ''}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="action-btn edit-btn" onclick="editCategory(${c.id})" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteCategory(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

const categoryForm = document.getElementById('categoryForm');
const catIdInput = document.getElementById('catId');
const catFormTitle = document.getElementById('catFormTitle');
const catSubmitBtn = document.getElementById('catSubmitBtn');
const catCancelBtn = document.getElementById('catCancelBtn');

catCancelBtn.addEventListener('click', () => {
    categoryForm.reset();
    catIdInput.value = '';
    catFormTitle.textContent = 'Nova Categoria';
    catSubmitBtn.querySelector('span').textContent = 'Salvar';
    catCancelBtn.style.display = 'none';
});

categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('catName').value.trim();
    if (!name) return;

    const existingId = catIdInput.value;

    if (existingId) {
        const oldCat = getCategories().find(c => c.id === parseInt(existingId));
        const oldName = oldCat ? oldCat.nome : '';

        try {
            await db
                .from(SUPABASE_CATEGORIES_TABLE)
                .update({ nome: name })
                .eq('id', parseInt(existingId));
        } catch(e) { console.error(e); }

        if (oldName && oldName !== name) {
            if (!_productsLoaded) await loadProducts();
            const products = getProducts().filter(p => p.categoria === oldName);
            for (const p of products) {
                await updateProductDB(p.id, { categoria: name });
            }
            await loadProducts();
        }

        showToast('Categoria atualizada!');
    } else {
        if (getCategories().some(c => c.nome.toLowerCase() === name.toLowerCase())) {
            showToast('Categoria já existe!');
            return;
        }

        try {
            const { data } = await db
                .from(SUPABASE_CATEGORIES_TABLE)
                .insert({ nome: name })
                .select();
            if (data && data[0]) _categoriesCache.push(data[0]);
        } catch(e) { console.error(e); }

        showToast('Categoria criada!');
    }

    await loadCategories();
    renderCategories();
    updateCategorySelects();
    categoryForm.reset();
    catIdInput.value = '';
    catFormTitle.textContent = 'Nova Categoria';
    catSubmitBtn.querySelector('span').textContent = 'Salvar';
    catCancelBtn.style.display = 'none';
});

window.editCategory = function(id) {
    const cats = getCategories();
    const cat = cats.find(c => c.id === id);
    if (!cat) return;

    catIdInput.value = cat.id;
    document.getElementById('catName').value = cat.nome;
    catFormTitle.textContent = 'Editar Categoria';
    catSubmitBtn.querySelector('span').textContent = 'Atualizar';
    catCancelBtn.style.display = '';
    document.getElementById('catName').focus();
};

window.deleteCategory = async function(id) {
    const cats = getCategories();
    const cat = cats.find(c => c.id === id);
    if (!cat) return;

    const count = countProductsByCategory(cat.nome);
    const msg = count > 0
        ? `"${cat.nome}" tem ${count} produto(s). Excluir vai desvincular os produtos. Continuar?`
        : `Excluir categoria "${cat.nome}"?`;

    if (!confirm(msg)) return;

    if (count > 0) {
        if (!_productsLoaded) await loadProducts();
        const products = getProducts().filter(p => p.categoria === cat.nome);
        for (const p of products) {
            await updateProductDB(p.id, { categoria: '' });
        }
        await loadProducts();
    }

    try {
        await db.from(SUPABASE_CATEGORIES_TABLE).delete().eq('id', id);
    } catch(e) { console.error(e); }

    await loadCategories();
    renderCategories();
    updateCategorySelects();
    showToast('Categoria excluída!');
};

function updateCategorySelects() {
    const cats = [...getCategories()].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    const selects = document.querySelectorAll('#prodCategoria, #prodCategoriaFilter');
    selects.forEach(sel => {
        const current = sel.value;
        const firstOption = sel.querySelector('option[value=""]');
        sel.innerHTML = '';
        if (firstOption) sel.appendChild(firstOption);
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nome;
            opt.textContent = c.nome;
            sel.appendChild(opt);
        });
        sel.value = current;
    });
}

renderCategories();
updateCategorySelects();

// ===========================
// Category Warning in Product Form
// ===========================
const catSelect = document.getElementById('prodCategoria');
const catWarning = document.getElementById('categoryWarning');
const btnCreateInline = document.getElementById('btnCreateCategoryInline');

catSelect.addEventListener('change', () => {
    const val = catSelect.value;
    if (!val) {
        catWarning.style.display = 'none';
        return;
    }
    const cats = getCategories();
    const exists = cats.some(c => c.nome.toLowerCase() === val.toLowerCase());
    catWarning.style.display = exists ? 'none' : 'flex';
});

btnCreateInline.addEventListener('click', async () => {
    const name = catSelect.value.trim();
    if (!name) return;

    if (!getCategories().some(c => c.nome.toLowerCase() === name.toLowerCase())) {
        try {
            const { data } = await db
                .from(SUPABASE_CATEGORIES_TABLE)
                .insert({ nome: name })
                .select();
            if (data && data[0]) _categoriesCache.push(data[0]);
        } catch(e) { console.error(e); }
        renderCategories();
        updateCategorySelects();
        catSelect.value = name;
        catWarning.style.display = 'none';
        showToast(`Categoria "${name}" criada!`);
    }
});

// ===========================
// Delivery Configuration
// ===========================
const DELIVERY_STORAGE_KEY = 'cabral_delivery_config';

function getDeliveryConfig() {
    const data = localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (data) return JSON.parse(data);
    return {
        pricePerKm: 0,
        minKm: 0,
        maxKm: 50,
        tiers: [],
        freeEnabled: false,
        freeThreshold: 0,
        freeMaxKm: 10
    };
}

function saveDeliveryConfig(cfg) {
    localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(cfg));
}

function renderTiers() {
    const cfg = getDeliveryConfig();
    const container = document.getElementById('deliveryTiers');

    if (cfg.tiers.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.82rem;padding:12px 0;">Nenhuma faixa configurada</div>';
        return;
    }

    container.innerHTML = cfg.tiers.map((t, i) => `
        <div class="tier-row">
            <input type="number" step="1" min="0" value="${t.from}" placeholder="De (km)" data-idx="${i}" data-field="from">
            <span class="tier-sep">até</span>
            <input type="number" step="1" min="0" value="${t.to}" placeholder="Até (km)" data-idx="${i}" data-field="to">
            <div class="input-prefix" style="flex:1;">
                <span>R$</span>
                <input type="number" step="0.01" min="0" value="${t.price}" placeholder="0,00" data-idx="${i}" data-field="price">
            </div>
            <button class="btn-remove-tier" onclick="removeTier(${i})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

window.removeTier = function(idx) {
    const cfg = getDeliveryConfig();
    cfg.tiers.splice(idx, 1);
    saveDeliveryConfig(cfg);
    renderTiers();
};

document.getElementById('btnAddTier').addEventListener('click', () => {
    const cfg = getDeliveryConfig();
    const lastTier = cfg.tiers[cfg.tiers.length - 1];
    cfg.tiers.push({ from: lastTier ? lastTier.to : 0, to: lastTier ? lastTier.to + 10 : 10, price: 0 });
    saveDeliveryConfig(cfg);
    renderTiers();
});

function loadDeliveryConfig() {
    const cfg = getDeliveryConfig();
    document.getElementById('deliveryPricePerKm').value = cfg.pricePerKm || '';
    document.getElementById('deliveryMinKm').value = cfg.minKm || '';
    document.getElementById('deliveryMaxKm').value = cfg.maxKm || '';
    document.getElementById('deliveryFreeEnabled').checked = cfg.freeEnabled;
    document.getElementById('deliveryFreeThreshold').value = cfg.freeThreshold || '';
    document.getElementById('deliveryFreeMaxKm').value = cfg.freeMaxKm || '';
    renderTiers();
}

document.getElementById('btnSaveDelivery').addEventListener('click', () => {
    const cfg = {
        pricePerKm: parseFloat(document.getElementById('deliveryPricePerKm').value) || 0,
        minKm: parseInt(document.getElementById('deliveryMinKm').value) || 0,
        maxKm: parseInt(document.getElementById('deliveryMaxKm').value) || 50,
        tiers: [],
        freeEnabled: document.getElementById('deliveryFreeEnabled').checked,
        freeThreshold: parseFloat(document.getElementById('deliveryFreeThreshold').value) || 0,
        freeMaxKm: parseInt(document.getElementById('deliveryFreeMaxKm').value) || 10
    };

    document.querySelectorAll('#deliveryTiers .tier-row').forEach(row => {
        const from = parseInt(row.querySelector('[data-field="from"]').value) || 0;
        const to = parseInt(row.querySelector('[data-field="to"]').value) || 0;
        const price = parseFloat(row.querySelector('[data-field="price"]').value) || 0;
        cfg.tiers.push({ from, to, price });
    });

    saveDeliveryConfig(cfg);
    showToast('Configuração de entregas salva!');
});

document.getElementById('btnSimulate').addEventListener('click', () => {
    const km = parseFloat(document.getElementById('simKm').value) || 0;
    const value = parseFloat(document.getElementById('simValue').value) || 0;
    const cfg = getDeliveryConfig();
    const result = document.getElementById('simResult');
    const resultValue = document.getElementById('simResultValue');
    const resultDetail = document.getElementById('simResultDetail');

    if (km <= 0) {
        showToast('Informe a distância em km');
        return;
    }

    if (cfg.freeEnabled && value >= cfg.freeThreshold && km <= cfg.freeMaxKm) {
        result.style.display = '';
        resultValue.textContent = 'R$ 0,00 (Grátis)';
        resultDetail.textContent = `Pedido acima de R$ ${cfg.freeThreshold.toFixed(2)} e distância até ${cfg.freeMaxKm} km`;
        return;
    }

    let fee = 0;
    let matchedTier = null;

    for (const tier of cfg.tiers) {
        if (km >= tier.from && km <= tier.to) {
            fee = tier.price;
            matchedTier = tier;
            break;
        }
    }

    if (!matchedTier) {
        fee = km * cfg.pricePerKm;
    }

    result.style.display = '';
    resultValue.textContent = `R$ ${fee.toFixed(2)}`;
    resultDetail.textContent = matchedTier
        ? `Faixa: ${matchedTier.from}–${matchedTier.to} km = R$ ${matchedTier.price.toFixed(2)}`
        : `${km} km × R$ ${cfg.pricePerKm.toFixed(2)}/km`;
});

loadDeliveryConfig();

// ===========================
// Coupon Management
// ===========================
const COUPONS_STORAGE_KEY = 'cabral_coupons';

function getCoupons() {
    const data = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (data) return JSON.parse(data);
    return [];
}

function saveCoupons(coupons) {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
}

function getNextCouponId() {
    const coupons = getCoupons();
    return coupons.length > 0 ? Math.max(...coupons.map(c => c.id)) + 1 : 1;
}

function renderCoupons() {
    const coupons = getCoupons();
    const tbody = document.getElementById('couponTableBody');
    const empty = document.getElementById('couponListEmpty');
    const table = tbody.closest('.table-container').querySelector('.data-table');

    if (coupons.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        empty.style.display = '';
        return;
    }

    table.style.display = '';
    empty.style.display = 'none';

    tbody.innerHTML = coupons.map((c, i) => {
        const discount = c.type === 'percent' ? `${c.value}%` : `R$ ${c.value.toFixed(2)}`;
        const expiry = c.expiry ? new Date(c.expiry + 'T23:59:59').toLocaleDateString('pt-BR') : 'Sem validade';
        const uses = c.maxUses > 0 ? `${c.currentUses}/${c.maxUses}` : `${c.currentUses}/∞`;
        const status = c.active
            ? '<span class="coupon-status-active"><i class="fas fa-circle-check"></i> Ativo</span>'
            : '<span class="coupon-status-inactive"><i class="fas fa-circle-xmark"></i> Inativo</span>';

        return `
        <tr>
            <td style="color:var(--text-muted);font-size:0.8rem;">${i + 1}</td>
            <td><span style="font-weight:600;font-family:'Rajdhani',sans-serif;letter-spacing:0.5px;color:var(--accent);">${c.code}</span></td>
            <td style="color:var(--text-secondary);font-size:0.85rem;">${c.desc || '—'}</td>
            <td><span style="font-weight:600;">${discount}</span></td>
            <td style="font-size:0.85rem;">${c.minPurchase > 0 ? `R$ ${c.minPurchase.toFixed(2)}` : '—'}</td>
            <td style="font-size:0.85rem;">${expiry}</td>
            <td style="font-size:0.85rem;">${uses}</td>
            <td>${status}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="action-btn edit-btn" onclick="editCoupon(${c.id})" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteCoupon(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

const couponFormCard = document.getElementById('couponFormCard');
const couponForm = document.getElementById('couponForm');
const couponFormTitle = document.getElementById('couponFormTitle');
const couponSubmitLabel = document.getElementById('couponSubmitLabel');
const couponIdInput = document.getElementById('couponId');
const couponValuePrefix = document.getElementById('couponValuePrefix');
const couponTypeSelect = document.getElementById('couponType');

couponTypeSelect.addEventListener('change', () => {
    couponValuePrefix.textContent = couponTypeSelect.value === 'percent' ? '%' : 'R$';
});

document.getElementById('btnNewCoupon').addEventListener('click', () => {
    couponForm.reset();
    couponIdInput.value = '';
    couponFormTitle.textContent = 'Novo Cupom';
    couponSubmitLabel.textContent = 'Salvar';
    couponTypeSelect.dispatchEvent(new Event('change'));
    document.getElementById('couponActive').checked = true;
    couponFormCard.classList.remove('hidden');
    couponFormCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('btnCancelCoupon').addEventListener('click', () => {
    couponFormCard.classList.add('hidden');
    couponForm.reset();
});

couponForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const coupons = getCoupons();
    const id = couponIdInput.value ? parseInt(couponIdInput.value) : null;
    const code = document.getElementById('couponCode').value.trim().toUpperCase();

    if (coupons.some(c => c.code === code && c.id !== id)) {
        showToast('Já existe um cupom com este código');
        return;
    }

    const coupon = {
        id: id || getNextCouponId(),
        code,
        desc: document.getElementById('couponDesc').value.trim(),
        type: couponTypeSelect.value,
        value: parseFloat(document.getElementById('couponValue').value) || 0,
        minPurchase: parseFloat(document.getElementById('couponMinPurchase').value) || 0,
        expiry: document.getElementById('couponExpiry').value,
        maxUses: parseInt(document.getElementById('couponMaxUses').value) || 0,
        currentUses: id ? (coupons.find(c => c.id === id)?.currentUses || 0) : 0,
        active: document.getElementById('couponActive').checked
    };

    if (id) {
        const idx = coupons.findIndex(c => c.id === id);
        if (idx !== -1) coupons[idx] = coupon;
    } else {
        coupons.push(coupon);
    }

    saveCoupons(coupons);
    renderCoupons();
    couponFormCard.classList.add('hidden');
    couponForm.reset();
    showToast(id ? 'Cupom atualizado!' : 'Cupom criado!');
});

window.editCoupon = function(id) {
    const coupons = getCoupons();
    const c = coupons.find(c => c.id === id);
    if (!c) return;

    couponIdInput.value = c.id;
    document.getElementById('couponCode').value = c.code;
    document.getElementById('couponDesc').value = c.desc || '';
    couponTypeSelect.value = c.type;
    couponTypeSelect.dispatchEvent(new Event('change'));
    document.getElementById('couponValue').value = c.value;
    document.getElementById('couponMinPurchase').value = c.minPurchase || '';
    document.getElementById('couponExpiry').value = c.expiry || '';
    document.getElementById('couponMaxUses').value = c.maxUses || '';
    document.getElementById('couponActive').checked = c.active;

    couponFormTitle.textContent = 'Editar Cupom';
    couponSubmitLabel.textContent = 'Atualizar';
    couponFormCard.classList.remove('hidden');
    couponFormCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.deleteCoupon = function(id) {
    if (!confirm('Excluir este cupom?')) return;
    const coupons = getCoupons().filter(c => c.id !== id);
    saveCoupons(coupons);
    renderCoupons();
    showToast('Cupom excluído');
};

renderCoupons();

// ===========================
// Configurações / Settings
// ===========================
const SETTINGS_STORAGE_KEY = 'cabral_settings';

function getSettings() {
    const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (data) return JSON.parse(data);
    return {
        store: {
            name: 'Cabral Ferramentas',
            address: '',
            cnpj: '',
            phone: '',
            email: '',
            instagram: '',
            user: 'admin',
            pass: ''
        },
        hours: {
            seg: { ini: '08:00', fim: '18:00', on: true },
            ter: { ini: '08:00', fim: '18:00', on: true },
            qua: { ini: '08:00', fim: '18:00', on: true },
            qui: { ini: '08:00', fim: '18:00', on: true },
            sex: { ini: '08:00', fim: '18:00', on: true },
            sab: { ini: '08:00', fim: '13:00', on: true },
            dom: { ini: '08:00', fim: '18:00', on: false }
        },
        whatsapp: { code: '55', number: '' },
        ai: {
            greeting: 'Olá! 👋 Sou o assistente virtual da Cabral Ferramentas.',
            quickHelp: 'Como posso te ajudar hoje? Você pode me perguntar sobre:\n• Qual produto ideal para seu projeto\n• Comparação entre marcas e modelos\n• Disponibilidade e preços\n• Dicas técnicas de uso',
            defaultReply: 'Obrigado pela sua pergunta! Vou conectar você com um especialista pelo WhatsApp.',
            bye: 'Obrigado por visitar a Cabral Ferramentas! Até mais! 👋',
            theme: {
                chatBg: '#1a1a2e',
                msgAIBg: '#16213e',
                msgUserBg: '#0f3460',
                fontColor: '#e0e0e0',
                accent: '#0099cc',
                headerBg: '#0f3460'
            }
        },
        siteTheme: {
            accent: '#0099cc',
            bg: '#0a0a0a',
            fontColor: '#ffffff'
        }
    };
}

function saveSettings(cfg) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cfg));
}

function loadSettings() {
    const cfg = getSettings();
    const s = cfg.store;
    document.getElementById('cfgStoreName').value = s.name || '';
    document.getElementById('cfgStoreAddress').value = s.address || '';
    document.getElementById('cfgStoreCNPJ').value = s.cnpj || '';
    document.getElementById('cfgStorePhone').value = s.phone || '';
    document.getElementById('cfgStoreEmail').value = s.email || '';
    document.getElementById('cfgStoreInstagram').value = s.instagram || '';
    document.getElementById('cfgStoreUser').value = s.user || '';
    document.getElementById('cfgStorePass').value = s.pass || '';

    const days = ['seg','ter','qua','qui','sex','sab','dom'];
    days.forEach(d => {
        const h = cfg.hours[d] || {};
        const iniInput = document.getElementById('cfgHora' + d.charAt(0).toUpperCase() + d.slice(1) + 'Ini');
        const fimInput = document.getElementById('cfgHora' + d.charAt(0).toUpperCase() + d.slice(1) + 'Fim');
        const toggle = document.querySelector(`[data-day="${d}"]`);
        if (iniInput && h.ini) iniInput.value = h.ini;
        if (fimInput && h.fim) fimInput.value = h.fim;
        if (toggle) toggle.checked = h.on !== false;
        if (iniInput) iniInput.disabled = !h.on;
        if (fimInput) fimInput.disabled = !h.on;
    });

    document.getElementById('cfgWppCode').value = cfg.whatsapp.code || '55';
    document.getElementById('cfgWppNumber').value = cfg.whatsapp.number || '';
    updateWhatsAppPreview();

    const ai = cfg.ai;
    document.getElementById('cfgAIGreeting').value = ai.greeting || '';
    document.getElementById('cfgAIQuickHelp').value = ai.quickHelp || '';
    document.getElementById('cfgAIDefault').value = ai.defaultReply || '';
    document.getElementById('cfgAIBye').value = ai.bye || '';

    const t = ai.theme;
    setThemeInput('cfgChatBg', 'cfgChatBgHex', t.chatBg);
    setThemeInput('cfgMsgAIBg', 'cfgMsgAIBgHex', t.msgAIBg);
    setThemeInput('cfgMsgUserBg', 'cfgMsgUserBgHex', t.msgUserBg);
    setThemeInput('cfgChatFontColor', 'cfgChatFontColorHex', t.fontColor);
    setThemeInput('cfgChatAccent', 'cfgChatAccentHex', t.accent);
    setThemeInput('cfgChatHeader', 'cfgChatHeaderHex', t.headerBg);
    updatePreview();
}

function setThemeInput(colorId, hexId, val) {
    const colorEl = document.getElementById(colorId);
    const hexEl = document.getElementById(hexId);
    if (colorEl) colorEl.value = val || '#000000';
    if (hexEl) hexEl.value = val || '#000000';
}

function updateWhatsAppPreview() {
    const code = document.getElementById('cfgWppCode').value || '55';
    const num = document.getElementById('cfgWppNumber').value || '00000000000';
    document.getElementById('whatsappLinkPreview').textContent = `https://wa.me/${code}${num}`;
}

document.getElementById('cfgWppNumber').addEventListener('input', updateWhatsAppPreview);
document.getElementById('cfgWppCode').addEventListener('input', updateWhatsAppPreview);

// Hours day toggles
document.querySelectorAll('.hours-row .toggle-switch input').forEach(toggle => {
    toggle.addEventListener('change', () => {
        const day = toggle.dataset.day;
        const row = toggle.closest('.hours-row');
        const ini = row.querySelector('input[type="time"]:first-of-type');
        const fim = row.querySelector('input[type="time"]:last-of-type');
        ini.disabled = !toggle.checked;
        fim.disabled = !toggle.checked;
    });
});

// Save Store
document.getElementById('btnSaveStore').addEventListener('click', () => {
    const cfg = getSettings();
    cfg.store = {
        name: document.getElementById('cfgStoreName').value.trim(),
        address: document.getElementById('cfgStoreAddress').value.trim(),
        cnpj: document.getElementById('cfgStoreCNPJ').value.trim(),
        phone: document.getElementById('cfgStorePhone').value.trim(),
        email: document.getElementById('cfgStoreEmail').value.trim(),
        instagram: document.getElementById('cfgStoreInstagram').value.trim(),
        user: document.getElementById('cfgStoreUser').value.trim(),
        pass: document.getElementById('cfgStorePass').value
    };

    const days = ['seg','ter','qua','qui','sex','sab','dom'];
    days.forEach(d => {
        const iniEl = document.getElementById('cfgHora' + d.charAt(0).toUpperCase() + d.slice(1) + 'Ini');
        const fimEl = document.getElementById('cfgHora' + d.charAt(0).toUpperCase() + d.slice(1) + 'Fim');
        const toggle = document.querySelector(`[data-day="${d}"]`);
        cfg.hours[d] = {
            ini: iniEl ? iniEl.value : '08:00',
            fim: fimEl ? fimEl.value : '18:00',
            on: toggle ? toggle.checked : true
        };
    });

    saveSettings(cfg);
    showToast('Dados da loja salvos!');
});

// Save WhatsApp
document.getElementById('btnSaveWhatsApp').addEventListener('click', () => {
    const cfg = getSettings();
    cfg.whatsapp = {
        code: document.getElementById('cfgWppCode').value.trim(),
        number: document.getElementById('cfgWppNumber').value.trim()
    };
    saveSettings(cfg);

    const fullNumber = cfg.whatsapp.code + cfg.whatsapp.number;
    localStorage.setItem('cabral_whatsapp_number', fullNumber);

    showToast('WhatsApp configurado!');
});

// AI Tabs
document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ai-tab-panel').forEach(p => p.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.remove('hidden');
    });
});

// Theme preview update
function updatePreview() {
    const chatBg = document.getElementById('cfgChatBg').value;
    const msgAI = document.getElementById('cfgMsgAIBg').value;
    const msgUser = document.getElementById('cfgMsgUserBg').value;
    const font = document.getElementById('cfgChatFontColor').value;
    const accent = document.getElementById('cfgChatAccent').value;
    const header = document.getElementById('cfgChatHeader').value;

    document.getElementById('previewHeader').style.background = header;
    document.getElementById('previewBody').style.background = chatBg;
    document.querySelectorAll('.theme-preview-msg.ai .theme-preview-text').forEach(el => el.style.background = msgAI);
    document.querySelectorAll('.theme-preview-msg.user .theme-preview-text').forEach(el => el.style.background = msgUser);
    document.querySelectorAll('.theme-preview-text').forEach(el => el.style.color = font);
    document.getElementById('previewSend').style.color = accent;
    document.querySelector('.theme-preview-msg.ai .theme-preview-avatar').style.background = accent + '26';
    document.querySelector('.theme-preview-msg.ai .theme-preview-avatar').style.color = accent;
}

// Sync color picker <-> hex input
function syncColorInputs(colorId, hexId) {
    const colorEl = document.getElementById(colorId);
    const hexEl = document.getElementById(hexId);
    if (!colorEl || !hexEl) return;

    colorEl.addEventListener('input', () => {
        hexEl.value = colorEl.value;
        updatePreview();
    });
    hexEl.addEventListener('input', () => {
        if (/^#[0-9a-f]{6}$/i.test(hexEl.value)) {
            colorEl.value = hexEl.value;
            updatePreview();
        }
    });
}

['cfgChatBg','cfgMsgAIBg','cfgMsgUserBg','cfgChatFontColor','cfgChatAccent','cfgChatHeader'].forEach(id => {
    syncColorInputs(id, id + 'Hex');
});

// Save AI Settings
document.getElementById('btnSaveAI').addEventListener('click', () => {
    const cfg = getSettings();
    cfg.ai.greeting = document.getElementById('cfgAIGreeting').value.trim();
    cfg.ai.quickHelp = document.getElementById('cfgAIQuickHelp').value.trim();
    cfg.ai.defaultReply = document.getElementById('cfgAIDefault').value.trim();
    cfg.ai.bye = document.getElementById('cfgAIBye').value.trim();
    cfg.ai.theme = {
        chatBg: document.getElementById('cfgChatBg').value,
        msgAIBg: document.getElementById('cfgMsgAIBg').value,
        msgUserBg: document.getElementById('cfgMsgUserBg').value,
        fontColor: document.getElementById('cfgChatFontColor').value,
        accent: document.getElementById('cfgChatAccent').value,
        headerBg: document.getElementById('cfgChatHeader').value
    };
    saveSettings(cfg);

    localStorage.setItem('cabral_ai_responses', JSON.stringify({
        greeting: cfg.ai.greeting,
        quickHelp: cfg.ai.quickHelp,
        defaultReply: cfg.ai.defaultReply,
        bye: cfg.ai.bye
    }));
    localStorage.setItem('cabral_ai_theme', JSON.stringify(cfg.ai.theme));

    showToast('Assistente IA configurado!');
});

// Reset theme
document.getElementById('btnResetTheme').addEventListener('click', () => {
    const defaults = {
        chatBg: '#1a1a2e', msgAIBg: '#16213e', msgUserBg: '#0f3460',
        fontColor: '#e0e0e0', accent: '#0099cc', headerBg: '#0f3460'
    };
    setThemeInput('cfgChatBg', 'cfgChatBgHex', defaults.chatBg);
    setThemeInput('cfgMsgAIBg', 'cfgMsgAIBgHex', defaults.msgAIBg);
    setThemeInput('cfgMsgUserBg', 'cfgMsgUserBgHex', defaults.msgUserBg);
    setThemeInput('cfgChatFontColor', 'cfgChatFontColorHex', defaults.fontColor);
    setThemeInput('cfgChatAccent', 'cfgChatAccentHex', defaults.accent);
    setThemeInput('cfgChatHeader', 'cfgChatHeaderHex', defaults.headerBg);
    updatePreview();
    showToast('Cores restauradas ao padrao');
});

loadSettings();

// ===========================
// Client Classification
// ===========================
function classifyClient(quotes) {
    const now = new Date();
    const totalQuotes = quotes.length;
    const lastQuote = quotes.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
    const lastDate = new Date(lastQuote.created_at);
    const daysSinceLast = Math.floor((now - lastDate) / 86400000);
    const thisMonth = quotes.filter(q => {
        const d = new Date(q.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    if (thisMonth.length > 10) return { label: 'VIP', color: '#7b3fbf', bg: 'rgba(138,43,226,0.15)' };
    if (totalQuotes <= 1) return { label: 'Novo', color: '#0099cc', bg: 'rgba(0,153,204,0.1)' };
    if (daysSinceLast > 90) return { label: 'Inativo', color: '#ff4757', bg: 'rgba(255,71,87,0.1)' };
    if (daysSinceLast > 30) return { label: 'Atenção', color: '#ffa502', bg: 'rgba(255,165,2,0.1)' };
    return { label: 'Ativo', color: '#2ed573', bg: 'rgba(46,213,115,0.1)' };
}

function generateClientCode(telefone) {
    const digits = (telefone || '').replace(/\D/g, '');
    const hash = digits.split('').reduce((sum, d) => sum + parseInt(d), 0);
    const suffix = digits.slice(-4).padStart(4, '0');
    const code = (hash * 7 + parseInt(suffix.slice(0, 2)) * 3) % 9999;
    return 'C-' + String(code).padStart(4, '0');
}

function getClients() {
    const quotes = getQuotes();
    const clientMap = {};
    quotes.forEach(q => {
        const key = q.nome_cliente + '|' + q.telefone;
        if (!clientMap[key]) {
            clientMap[key] = { nome: q.nome_cliente, telefone: q.telefone, quotes: [], totalSpent: 0 };
        }
        clientMap[key].quotes.push(q);
        clientMap[key].totalSpent += Number(q.total) || 0;
    });
    return Object.values(clientMap).map(c => {
        const cls = classifyClient(c.quotes);
        const lastQuote = c.quotes.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
        const lastDate = new Date(lastQuote.created_at);
        const firstQuote = c.quotes.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b);
        return {
            ...c,
            code: generateClientCode(c.telefone),
            classification: cls,
            lastPurchase: lastDate.toLocaleDateString('pt-BR'),
            quoteCount: c.quotes.length,
            firstQuoteDate: new Date(firstQuote.created_at)
        };
    }).sort((a, b) => a.firstQuoteDate - b.firstQuoteDate)
      .map((c, i) => ({ ...c, sequentialCode: 'C-' + String(i + 1).padStart(4, '0') }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
}

function renderClients(filter = 'all', search = '') {
    const tbody = document.getElementById('clientTableBody');
    const empty = document.getElementById('clientListEmpty');
    if (!tbody) return;

    let clients = getClients();
    if (filter !== 'all') {
        clients = clients.filter(c => c.classification.label.toLowerCase() === filter);
    }
    if (search) {
        const term = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        clients = clients.filter(c => c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
    }

    if (clients.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = clients.map(c => {
        const phoneDigits = (c.telefone || '').replace(/\D/g, '');
        return `
        <tr>
            <td><span class="client-code" onclick="openClientQuotes('${c.nome.replace(/'/g, "\\'")}', '${c.telefone}')">${c.sequentialCode}</span></td>
            <td><strong style="cursor:pointer;color:var(--accent);" onclick="openClientQuotes('${c.nome.replace(/'/g, "\\'")}', '${c.telefone}')">${c.nome}</strong></td>
            <td><i class="fab fa-whatsapp" style="color:#25d366;margin-right:4px;"></i>${c.telefone}</td>
            <td>${c.lastPurchase}</td>
            <td><strong>${formatPrice(c.totalSpent)}</strong></td>
            <td>${c.quoteCount}</td>
            <td><span style="color:${c.classification.color};background:${c.classification.bg};padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:600;">${c.classification.label}</span></td>
        </tr>`;
    }).join('');
}

// Client filter + search
const clientFilter = document.getElementById('clientFilter');
const clientSearch = document.getElementById('clientSearch');

function updateClientList() {
    renderClients(clientFilter?.value || 'all', clientSearch?.value || '');
}

if (clientFilter) clientFilter.addEventListener('change', updateClientList);
if (clientSearch) clientSearch.addEventListener('input', updateClientList);

// Open client quotes modal
window.openClientQuotes = function(nome, telefone) {
    const quotes = getQuotes().filter(q => q.nome_cliente === nome && q.telefone === telefone);
    const modal = document.getElementById('clientQuotesModal');
    const body = document.getElementById('clientQuotesBody');
    const title = document.getElementById('clientQuotesTitle');
    const subtitle = document.getElementById('clientQuotesSubtitle');
    const stats = document.getElementById('clientQuotesStats');
    const header = document.getElementById('clientQuotesHeader');

    if (!modal || !body) return;

    const sorted = [...quotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const totalSpent = quotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const clientCode = generateClientCode(telefone);
    const seqCode = (getClients().find(c => c.nome === nome && c.telefone === telefone) || {}).sequentialCode || clientCode;

    title.textContent = nome;
    subtitle.textContent = `${seqCode} | ${telefone}`;

    const statusColors = {
        recebido: '#0099cc', analise: '#ffa502', aprovado: '#2ed573', entregue: '#2ed573', cancelado: '#ff4757'
    };
    const statusLabels = {
        recebido: 'Recebido', analise: 'Em Analise', aprovado: 'Aprovado', entregue: 'Entregue', cancelado: 'Cancelado'
    };

    stats.innerHTML = `
        <div class="cq-stat">
            <span class="cq-stat-value">${quotes.length}</span>
            <span class="cq-stat-label">Orcamentos</span>
        </div>
        <div class="cq-stat">
            <span class="cq-stat-value">${formatPrice(totalSpent)}</span>
            <span class="cq-stat-label">Total Gasto</span>
        </div>
        <div class="cq-stat">
            <span class="cq-stat-value">${quotes.filter(q => q.status !== 'cancelado').length}</span>
            <span class="cq-stat-label">Ativos</span>
        </div>
    `;

    if (quotes.length === 0) {
        body.innerHTML = '<div class="cq-empty"><i class="fas fa-file-invoice"></i><p>Nenhum orcamento encontrado</p></div>';
    } else {
        body.innerHTML = sorted.map(q => {
            const date = new Date(q.created_at).toLocaleDateString('pt-BR');
            const time = new Date(q.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const items = Array.isArray(q.itens) ? q.itens : [];
            const color = statusColors[q.status] || '#888';
            const statusLabel = statusLabels[q.status] || q.status;
            const isCancelled = q.status === 'cancelado';

            return `
            <div class="cq-card${isCancelled ? ' cq-cancelled' : ''}">
                <div class="cq-card-header">
                    <div class="cq-card-id">
                        <span class="cq-card-hash">#${q.id}</span>
                        <span class="cq-card-date">${date} | ${time}</span>
                    </div>
                    <div class="cq-card-right">
                        <span class="cq-card-status" style="color:${color};border-color:${color};">${statusLabel}</span>
                        <span class="cq-card-total">${formatPrice(q.total)}</span>
                    </div>
                </div>
                ${q.cupom ? `<div class="cq-card-cupom"><i class="fas fa-tag"></i> Cupom: ${q.cupom} (-${formatPrice(q.desconto || 0)})</div>` : ''}
                <div class="cq-card-items">
                    ${items.map(item => `
                        <div class="cq-item">
                            <span class="cq-item-name">${item.codigo ? '<code>' + item.codigo + '</code> ' : ''}${item.nome}</span>
                            <span class="cq-item-qty">${item.quantidade}x ${formatPrice(item.preco)}</span>
                            <span class="cq-item-sub">${formatPrice(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }).join('');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// ===========================
// Metrics: Most Accessed, Most Sold, Recent Clients
// ===========================
function renderMetrics() {
    const now = new Date();

    // Most Accessed Products (from views)
    const views = getViews();
    const viewCounts = {};
    views.forEach(v => {
        const key = v.produto_id + '|' + v.produto_nome;
        viewCounts[key] = (viewCounts[key] || 0) + 1;
    });
    const sortedViews = Object.entries(viewCounts)
        .map(([k, v]) => { const [id, name] = k.split('|'); return { id, name, count: v }; })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const accessedEl = document.getElementById('mostAccessedList');
    if (accessedEl) {
        if (sortedViews.length === 0) {
            accessedEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Nenhuma visualização registrada</div>';
        } else {
            const maxViews = sortedViews[0].count;
            accessedEl.innerHTML = sortedViews.map((p, i) => `
                <div class="product-rank">
                    <div class="rank-pos views">${i + 1}</div>
                    <div class="rank-info">
                        <span class="rank-name">${p.name}</span>
                        <span class="rank-sales">${p.count} acessos</span>
                    </div>
                    <div class="rank-bar"><div class="rank-bar-fill purple" style="width:${Math.round((p.count / maxViews) * 100)}%"></div></div>
                </div>
            `).join('');
        }
    }

    // Most Sold Products (from entregue quotes)
    const deliveredQuotes = getQuotes().filter(q => q.status === 'entregue');
    const soldCounts = {};
    deliveredQuotes.forEach(q => {
        if (!Array.isArray(q.itens)) return;
        q.itens.forEach(item => {
            const key = (item.codigo || '') + '|' + item.nome;
            if (!soldCounts[key]) soldCounts[key] = { codigo: item.codigo || '', nome: item.nome, count: 0 };
            soldCounts[key].count += item.quantidade || 1;
        });
    });
    const sortedSold = Object.values(soldCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    const soldEl = document.getElementById('mostSoldList');
    if (soldEl) {
        if (sortedSold.length === 0) {
            soldEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Nenhuma venda entregue</div>';
        } else {
            const maxSold = sortedSold[0].count;
            soldEl.innerHTML = sortedSold.map((p, i) => `
                <div class="product-rank">
                    <div class="rank-pos">${i + 1}</div>
                    <div class="rank-info">
                        <span class="rank-name">${p.codigo ? 'CÓD ' + p.codigo + ' | ' : ''}${p.nome}</span>
                        <span class="rank-sales">${p.count} vendas</span>
                    </div>
                    <div class="rank-bar"><div class="rank-bar-fill" style="width:${Math.round((p.count / maxSold) * 100)}%"></div></div>
                </div>
            `).join('');
        }
    }

    // Recent Clients
    const clients = getClients().slice(0, 5);
    const recentEl = document.getElementById('recentClientsList');
    if (recentEl) {
        if (clients.length === 0) {
            recentEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Nenhum cliente registrado</div>';
        } else {
            recentEl.innerHTML = clients.map(c => `
                <div class="product-rank" style="gap:10px;">
                    <div class="client-avatar-sm" style="width:36px;height:36px;border-radius:50%;background:${c.classification.bg};color:${c.classification.color};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">${c.nome.charAt(0).toUpperCase()}</div>
                    <div class="rank-info" style="flex:1;min-width:0;">
                        <span class="rank-name" style="display:flex;align-items:center;gap:6px;">${c.nome} <span style="color:${c.classification.color};background:${c.classification.bg};padding:1px 6px;border-radius:4px;font-size:0.6rem;font-weight:600;">${c.classification.label}</span></span>
                        <span class="rank-sales">${c.quoteCount} orçamento${c.quoteCount > 1 ? 's' : ''} · ${formatPrice(c.totalSpent)}</span>
                    </div>
                </div>
            `).join('');
        }
    }
}

// ===========================
// Popups CRUD
// ===========================
let _popupsCache = [];

async function loadPopups() {
    const { data, error } = await db
        .from(SUPABASE_POPUPS_TABLE)
        .select('*')
        .order('ordem', { ascending: true })
        .range(0, 9999);
    if (error) { console.error('Erro ao carregar popups:', error); return []; }
    _popupsCache = data || [];
    return _popupsCache;
}

function getPopups() {
    return _popupsCache;
}

function renderPopups() {
    const popups = getPopups();
    const tbody = document.getElementById('popupTableBody');
    const empty = document.getElementById('popupListEmpty');
    const table = tbody ? tbody.closest('.table-container').querySelector('.data-table') : null;

    if (!tbody) return;

    if (popups.length === 0) {
        tbody.innerHTML = '';
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = '';
        return;
    }

    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = popups.map((p, i) => {
        const tipoBadge = p.tipo === 'promocao'
            ? '<span class="popup-type-badge promocao"><i class="fas fa-tag"></i> Promoção</span>'
            : '<span class="popup-type-badge aviso"><i class="fas fa-info-circle"></i> Aviso</span>';

        let detail = '';
        if (p.tipo === 'promocao') {
            detail = `<span class="popup-detail-text">${p.produto_codigo || '—'}</span>`;
        } else {
            detail = `<span class="popup-detail-text">${(p.mensagem || '').substring(0, 40)}${(p.mensagem || '').length > 40 ? '...' : ''}</span>`;
        }
        const formatDateShort = (v) => {
            if (!v) return '';
            const d = new Date(v);
            return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        };
        const di = formatDateShort(p.data_inicio);
        const df = formatDateShort(p.data_fim);
        if (di || df) {
            detail += `<br><span style="font-size:0.72rem;color:var(--text-muted);"><i class="fas fa-clock" style="font-size:0.65rem;"></i> ${di || 'início'} → ${df || 'sem fim'}</span>`;
        }

        const toggleChecked = p.ativo ? 'checked' : '';

        return `<tr data-id="${p.id}">
            <td style="color:var(--text-muted);font-size:0.8rem;">${i + 1}</td>
            <td>${tipoBadge}</td>
            <td style="font-weight:500;">${p.titulo || ''}</td>
            <td>${detail}</td>
            <td>
                <label class="toggle-switch small">
                    <input type="checkbox" ${toggleChecked} onchange="togglePopupAtivo(${p.id}, this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="action-btn edit-btn" onclick="editPopup(${p.id})" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete-btn" onclick="deletePopup(${p.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.togglePopupAtivo = async function(id, ativo) {
    await db.from(SUPABASE_POPUPS_TABLE).update({ ativo }).eq('id', id);
    const p = _popupsCache.find(x => x.id === id);
    if (p) p.ativo = ativo;
    showToast(ativo ? 'Popup ativado' : 'Popup desativado');
};

window.editPopup = function(id) {
    const popup = _popupsCache.find(p => p.id === id);
    if (!popup) return;

    document.getElementById('popupId').value = popup.id;
    document.getElementById('popupModalTitle').innerHTML = '<i class="fas fa-rectangle-ad"></i> Editar Popup';
    document.getElementById('popupTipo').value = popup.tipo || 'aviso';
    document.getElementById('popupOrdem').value = popup.ordem || 0;
    document.getElementById('popupTitulo').value = popup.titulo || '';
    document.getElementById('popupMensagem').value = popup.mensagem || '';
    document.getElementById('popupAtivo').checked = popup.ativo !== false;

    const toLocalDatetime = (val) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    document.getElementById('popupDataInicio').value = toLocalDatetime(popup.data_inicio);
    document.getElementById('popupDataFim').value = toLocalDatetime(popup.data_fim);

    if (popup.tipo === 'promocao') {
        document.getElementById('popupProdutoCodigo').value = popup.produto_codigo || '';
        document.getElementById('popupPrecoOriginal').value = popup.preco_original || '';
        document.getElementById('popupPrecoPromo').value = popup.preco_promocional || '';
        document.getElementById('popupPromoFields').style.display = '';
        document.getElementById('popupAvisoFields').style.display = 'none';
        lookupPopupProduct(popup.produto_codigo);
    } else {
        document.getElementById('popupImagemUrl').value = popup.imagem_url || '';
        document.getElementById('popupPromoFields').style.display = 'none';
        document.getElementById('popupAvisoFields').style.display = '';
        document.getElementById('popupPromoPreview').style.display = 'none';
    }

    document.getElementById('popupBotaoTexto').value = popup.botao_texto || 'Ver Produto';
    document.getElementById('popupBotaoLink').value = popup.botao_link || '';

    document.getElementById('popupModal').classList.add('active');
};

window.deletePopup = async function(id) {
    if (!confirm('Excluir este popup?')) return;
    await db.from(SUPABASE_POPUPS_TABLE).delete().eq('id', id);
    await loadPopups();
    renderPopups();
    showToast('Popup excluído!');
};

async function lookupPopupProduct(codigo) {
    if (!codigo) return;
    const preview = document.getElementById('popupPromoPreview');
    const products = getProducts();
    const product = products.find(p => p.codigo && p.codigo.toLowerCase() === codigo.toLowerCase());
    if (product) {
        const img = product.imagens && product.imagens.length > 0 ? product.imagens[0] : '';
        document.getElementById('popupProdImg').src = img || 'https://via.placeholder.com/60';
        document.getElementById('popupProdNome').textContent = product.nome;
        document.getElementById('popupProdPrecoOld').textContent = 'R$ ' + (product.preco || 0).toFixed(2).replace('.', ',');
        document.getElementById('popupProdPrecoNew').textContent = 'R$ ' + (product.precopromocional || product.precoPromocional || product.preco || 0).toFixed(2).replace('.', ',');
        document.getElementById('popupPrecoOriginal').value = product.preco || '';
        if (!document.getElementById('popupPrecoPromo').value) {
            document.getElementById('popupPrecoPromo').value = product.precopromocional || product.precoPromocional || '';
        }
        if (!document.getElementById('popupTitulo').value) {
            document.getElementById('popupTitulo').value = product.nome;
        }
        preview.style.display = 'flex';
    } else {
        preview.style.display = 'none';
    }
}

function initPopupModal() {
    const modal = document.getElementById('popupModal');
    const tipoSelect = document.getElementById('popupTipo');
    const promoFields = document.getElementById('popupPromoFields');
    const avisoFields = document.getElementById('popupAvisoFields');

    function updateTipoFields() {
        if (tipoSelect.value === 'promocao') {
            promoFields.style.display = '';
            avisoFields.style.display = 'none';
        } else {
            promoFields.style.display = 'none';
            avisoFields.style.display = '';
        }
    }
    updateTipoFields();
    tipoSelect.addEventListener('change', updateTipoFields);

    document.getElementById('popupProdutoCodigo').addEventListener('blur', function() {
        lookupPopupProduct(this.value.trim());
    });

    document.getElementById('popupModalClose').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('popupCancelBtn').addEventListener('click', () => modal.classList.remove('active'));

    document.getElementById('btnNewPopup').addEventListener('click', () => {
        document.getElementById('popupId').value = '';
        document.getElementById('popupModalTitle').innerHTML = '<i class="fas fa-rectangle-ad"></i> Novo Popup';
        document.getElementById('popupTipo').value = 'aviso';
        document.getElementById('popupOrdem').value = 0;
        document.getElementById('popupTitulo').value = '';
        document.getElementById('popupMensagem').value = '';
        document.getElementById('popupProdutoCodigo').value = '';
        document.getElementById('popupPrecoOriginal').value = '';
        document.getElementById('popupPrecoPromo').value = '';
        document.getElementById('popupImagemUrl').value = '';
        document.getElementById('popupBotaoTexto').value = 'Ver Produto';
        document.getElementById('popupBotaoLink').value = '';
        document.getElementById('popupAtivo').checked = true;
        document.getElementById('popupDataInicio').value = '';
        document.getElementById('popupDataFim').value = '';
        document.getElementById('popupPromoPreview').style.display = 'none';
        updateTipoFields();
        modal.classList.add('active');
    });

    document.getElementById('popupSaveBtn').addEventListener('click', async () => {
        const id = document.getElementById('popupId').value;
        const tipo = tipoSelect.value;
        const titulo = document.getElementById('popupTitulo').value.trim();
        if (!titulo) { showToast('Preencha o título'); return; }

        const dataInicio = document.getElementById('popupDataInicio').value;
        const dataFim = document.getElementById('popupDataFim').value;

        const data = {
            titulo,
            mensagem: document.getElementById('popupMensagem').value.trim(),
            tipo,
            produto_codigo: tipo === 'promocao' ? document.getElementById('popupProdutoCodigo').value.trim() : null,
            preco_original: tipo === 'promocao' ? parseFloat(document.getElementById('popupPrecoOriginal').value) || null : null,
            preco_promocional: tipo === 'promocao' ? parseFloat(document.getElementById('popupPrecoPromo').value) || null : null,
            imagem_url: tipo === 'aviso' ? document.getElementById('popupImagemUrl').value.trim() : null,
            botao_texto: document.getElementById('popupBotaoTexto').value.trim() || 'Ver Produto',
            botao_link: document.getElementById('popupBotaoLink').value.trim() || null,
            ativo: document.getElementById('popupAtivo').checked,
            ordem: parseInt(document.getElementById('popupOrdem').value) || 0,
            data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
            data_fim: dataFim ? new Date(dataFim).toISOString() : null
        };

        try {
            let result;
            if (id) {
                result = await db.from(SUPABASE_POPUPS_TABLE).update(data).eq('id', parseInt(id));
            } else {
                result = await db.from(SUPABASE_POPUPS_TABLE).insert(data);
            }
            if (result.error) {
                console.error('Erro Supabase popup:', result.error);
                showToast('Erro ao salvar: ' + result.error.message);
                return;
            }
            showToast(id ? 'Popup atualizado!' : 'Popup criado!');
            await loadPopups();
            renderPopups();
            modal.classList.remove('active');
        } catch (e) {
            console.error('Erro ao salvar popup:', e);
            showToast('Erro ao salvar popup');
        }
    });
}

// ===========================
// Init: Load from Supabase
// ===========================
(async function initDashboard() {
    await Promise.all([loadProductCount(), loadCategories(), loadQuotes(), loadVisitors(), loadViews(), loadPopups()]);
    renderCategories();
    renderQuotes();
    renderClients();
    renderMetrics();
    renderPopups();
    initPopupModal();
    updateCategorySelects();
    updateCharts('30d');
    const kpiRow = document.querySelector('.kpi-row');
    if (kpiRow) animateKPIs();

    updateQuoteBadges();

    console.log(`Carregados ${getProductCount()} produtos (lazy), ${getCategories().length} categorias, ${getQuotes().length} orçamentos, ${getVisitors().length} visitantes, ${getViews().length} visualizações do Supabase`);
})();

function updateQuoteBadges() {
    const pending = getQuotes().filter(q => q.status !== 'entregue' && q.status !== 'cancelado').length;

    // Sidebar badge
    const sidebarBadge = document.getElementById('sidebarQuoteBadge');
    if (sidebarBadge) {
        sidebarBadge.textContent = pending;
        sidebarBadge.style.display = pending > 0 ? 'flex' : 'none';
    }

    // Bell notification badge
    const notifBadge = document.getElementById('notifBadge');
    if (notifBadge) {
        notifBadge.textContent = pending;
        notifBadge.style.display = pending > 0 ? 'flex' : 'none';
    }
}

// Poll for new quotes every 30s
setInterval(async () => {
    try {
        const { data } = await db.from(SUPABASE_QUOTES_TABLE).select('id, status').range(0, 9999);
        if (data) {
            const pending = data.filter(q => q.status !== 'entregue' && q.status !== 'cancelado').length;
            const sidebarBadge = document.getElementById('sidebarQuoteBadge');
            if (sidebarBadge) {
                sidebarBadge.textContent = pending;
                sidebarBadge.style.display = pending > 0 ? 'flex' : 'none';
            }
            const notifBadge = document.getElementById('notifBadge');
            if (notifBadge) {
                notifBadge.textContent = pending;
                notifBadge.style.display = pending > 0 ? 'flex' : 'none';
            }
        }
    } catch(e) {}
}, 30000);
