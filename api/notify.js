module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientName, total } = req.body || {};

    if (!clientName || !total) {
        return res.status(400).json({ error: 'Missing clientName or total' });
    }

    const formatPrice = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

    try {
        const resp = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_key: '2a3a89f7-5ae1-49c7-b5f0-bf5b4a8dfcb1',
                subject: `Novo orçamento — ${clientName} — ${formatPrice(total)}`,
                from_name: 'Cabral Ferramentas',
                email: 'rafaelfrancocabral@gmail.com',
                message: `Novo orçamento recebido!\n\nCliente: ${clientName}\nValor: ${formatPrice(total)}\n\nAcesse o dashboard para mais detalhes:\nhttps://www.cabralferramentas.com.br/dashboard.html`
            })
        });

        const data = await resp.json();

        if (data.success) {
            return res.status(200).json({ ok: true });
        } else {
            console.error('Web3Forms error:', data);
            return res.status(502).json({ error: 'Web3Forms rejected', detail: data });
        }
    } catch (err) {
        console.error('Notification proxy error:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
};
