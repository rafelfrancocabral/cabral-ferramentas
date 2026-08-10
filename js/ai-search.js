/* =============================================
 * Cabral Ferramentas - Motor de busca do assistente IA
 * Funciona em browser (globalThis.AiSearch) e em Node (module.exports)
 * ============================================= */
(function (global) {
    'use strict';

    const STOP_WORDS = ['ola', 'bom', 'boa', 'dia', 'noite', 'tarde', 'preciso', 'quero', 'gostaria', 'pode', 'me', 'meu', 'minha', 'um', 'uma', 'para', 'pra', 'com', 'sem', 'que', 'tem', 'tenho', 'estou', 'voce', 'voces', 'poderia', 'ajuda', 'ajudar', 'obrigado', 'obrigada', 'por', 'favor', 'isso', 'entao', 'mais', 'bem', 'muito', 'qual', 'onde', 'como', 'ja', 'ainda', 'sempre', 'talvez', 'precisar', 'buscar', 'procurar', 'saber', 'achar', 'encontrar', 'produto', 'produtos', 'coisa', 'algo', 'kit', 'cabral', 'ferramentas', 'vcs', 'vc', 'tb', 'tbm', 'ai', 'ei', 'ta', 'to', 'nos', 'aqui', 'ali', 'la', 'neles', 'delas', 'deles', 'ate', 'desde', 'entre', 'apos', 'contra', 'sob', 'sobre', 'nao', 'num', 'numa', 'sao', 'todo', 'toda', 'esse', 'essa', 'esses', 'essas', 'este', 'esta', 'aquele', 'aquela', 'lhe', 'lhes', 'se', 'si', 'consigo', 'convosco', 'perante', 'tras', 'de', 'da', 'do', 'dos', 'das', 'na', 'no', 'nas', 'em', 'pro', 'pra', 'pela', 'pelas', 'pelo', 'pelos', 'outra', 'outro', 'outras', 'outros', 'tipo', 'item', 'algum', 'alguma', 'nenhum', 'd', 'e'];

    const SYNONYMS = {
        'phillips': ['philips'],
        'philips': ['cruz'],
        'cruz': ['philips'],
        'estrela': ['philips', 'cruz'],
        'allen': ['sextavado'],
        'hexagonal': ['sextavado'],
        'boca': ['combinada'],
        'metrica': ['trena'],
        'perfurar': ['broca', 'furadeira'],
        'perfuracao': ['broca'],
        'lixar': ['lixa'],
        'serrote': ['serra'],
        'medir': ['trena', 'metro'],
        'medida': ['trena'],
        'chaves': ['chave'],
        'parafusar': ['parafuso'],
        'parafusos': ['parafuso'],
        'furadeiras': ['furadeira'],
        'brocas': ['broca'],
        'martelos': ['martelo'],
        'alicates': ['alicate'],
        'serras': ['serra']
    };

    function normalize(s) {
        return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    function stemWord(w) {
        if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
        return w;
    }

    function expandToken(w) {
        const out = [];
        const m = w.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/);
        if (m) {
            const num = m[1];
            const frac = num.match(/^(\d+)[.,](\d+)$/);
            if (frac) out.push(frac[1].replace(/^0+(?=\d)/, ''));
            else out.push(num.replace(/^0+(?=\d)/, ''));
        } else if (/^\d+[.,]\d+$/.test(w)) {
            out.push(w.split(/[.,]/)[0].replace(/^0+(?=\d)/, ''));
        } else if (/^\d+$/.test(w)) {
            out.push(w.replace(/^0+(?=\d)/, ''));
        }
        return out;
    }

    function tokenizeField(str) {
        const set = new Set();
        for (const w of normalize(str).replace(/[&+]+/g, ' ').split(/\s+/)) {
            if (w.length < 2) continue;
            set.add(stemWord(w));
            for (const e of expandToken(w)) set.add(e);
        }
        return set;
    }

    function extractKeywords(text) {
        const normalized = normalize(text).replace(/[^\w\s]/g, '');
        return normalized.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.includes(w));
    }

    function fuzzyVariants(t) {
        const out = new Set();
        if (t.length < 4) return [];
        const letters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < t.length; i++) out.add(t.slice(0, i) + t.slice(i + 1));
        for (let i = 0; i < t.length; i++) {
            for (const c of letters) out.add(t.slice(0, i) + c + t.slice(i + 1));
        }
        for (let i = 0; i <= t.length; i++) {
            for (const c of letters) out.add(t.slice(0, i) + c + t.slice(i));
        }
        for (let i = 0; i < t.length - 1; i++) out.add(t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2));
        out.delete(t);
        return out;
    }

    function buildSearchIndex(products) {
        const tokenIndex = new Map();
        const tokens = new Set();
        const byId = new Map();
        const byCode = new Map();

        const addToken = (tok, id, w) => {
            if (!tok || tok.length < 2) return;
            tokens.add(tok);
            let m = tokenIndex.get(tok);
            if (!m) { m = new Map(); tokenIndex.set(tok, m); }
            const prev = m.get(id) || 0;
            if (w > prev) m.set(id, w);
        };

        for (const p of products) {
            byId.set(p.id, p);
            if (p.codigo) byCode.set(p.codigo, p);
            const fields = [
                [p.nome, 5],
                [(p.palavraschave || p.palavrasChave || []).join(' '), 4],
                [p.subcategoria, 3],
                [p.marca, 3],
                [p.categoria, 2]
            ];
            for (const [txt, w] of fields) {
                if (!txt) continue;
                for (const tok of tokenizeField(txt)) addToken(tok, p.id, w);
            }
            if (p.marca) {
                const bp = normalize(p.marca).replace(/[^a-z0-9]/g, '');
                if (bp) addToken(bp, p.id, 3);
            }
        }
        return { byId, byCode, tokenIndex, tokens: [...tokens], products };
    }

    function matchesCategory(p, catNorm) {
        const cat = normalize(p.categoria || '');
        const sub = normalize(p.subcategoria || '');
        const kw = normalize((p.palavraschave || p.palavrasChave || []).join(' '));
        const nome = normalize(p.nome || '');
        return cat.includes(catNorm) || sub.includes(catNorm) || kw.includes(catNorm) || nome.includes(catNorm);
    }

    function searchIndex(index, query, category, limit) {
        limit = limit || 8;
        const rawTerms = extractKeywords(query).map(stemWord).filter(w => w.length >= 2);
        const terms = [...new Set(rawTerms.flatMap(t => [t, ...expandToken(t)]))];
        if (terms.length === 0) return [];

        const { byId, tokenIndex, tokens, products } = index;

        const termHits = new Map();
        const required = [];

        for (const t of terms) {
            const hits = new Map();
            const collect = (tok, weightScale) => {
                const m = tokenIndex.get(tok);
                if (!m) return;
                for (const [id, w] of m) {
                    const nw = Math.max(hits.get(id) || 0, w * weightScale);
                    hits.set(id, nw);
                }
            };

            collect(t, 1);
            for (const syn of (SYNONYMS[t] || [])) collect(syn, 0.85);

            if (hits.size === 0 && t.length >= 4) {
                const prefix = new Map();
                for (const tok of tokens) {
                    if (tok.startsWith(t)) {
                        const m = tokenIndex.get(tok);
                        for (const [id, w] of m) {
                            const cur = prefix.get(id) || 0;
                            const nw = w * 0.5;
                            if (nw > cur) prefix.set(id, nw);
                        }
                    }
                }
                for (const [id, w] of prefix) hits.set(id, Math.max(hits.get(id) || 0, w));
            }

            if (hits.size === 0 && t.length >= 4) {
                for (const v of fuzzyVariants(t)) collect(v, 0.5);
            }

            if (hits.size > 0) {
                termHits.set(t, hits);
                required.push(t);
            }
        }

        if (required.length === 0) return [];

        const catBoost = new Map();
        let catNorm = category ? normalize(category) : '';
        if (catNorm.startsWith('_')) catNorm = catNorm.slice(1);
        if (catNorm) {
            for (const p of products) {
                if (matchesCategory(p, catNorm)) catBoost.set(p.id, 2);
            }
        }

        let anchor = required[0];
        let anchorCount = -1;
        for (const t of required) {
            if (termHits.get(t).size > anchorCount) { anchorCount = termHits.get(t).size; anchor = t; }
        }
        const need = Math.max(1, Math.ceil(required.length / 2));

        const scored = [];
        for (const p of products) {
            let score = 0;
            let matched = 0;
            let anchorOk = false;
            for (const t of required) {
                const w = termHits.get(t).get(p.id) || 0;
                if (w > 0) {
                    matched++;
                    score += w;
                    if (t === anchor) anchorOk = true;
                }
            }
            if (!anchorOk || matched < need) continue;
            score += catBoost.get(p.id) || 0;
            scored.push({ p, score, ratio: matched / required.length });
        }

        scored.sort((a, b) => b.ratio - a.ratio || b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
        return scored.slice(0, limit).map(s => s.p);
    }

    const AiSearch = {
        normalize,
        stemWord,
        expandToken,
        tokenizeField,
        extractKeywords,
        buildSearchIndex,
        searchIndex,
        SYNONYMS,
        STOP_WORDS
    };
    global.AiSearch = AiSearch;
    if (typeof module !== 'undefined' && module.exports) module.exports = AiSearch;
})(typeof window !== 'undefined' ? window : globalThis);
