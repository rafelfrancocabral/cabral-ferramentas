const https = require('https');

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { clientName, total } = body || {};

        if (!clientName || !total) {
            return res.status(400).json({ error: 'Missing clientName or total' });
        }

        const formatPrice = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

        const payload = JSON.stringify({
            access_key: '2a3a89f7-5ae1-49c7-b5f0-bf5b4a8dfcb1',
            subject: 'Novo orcamento - ' + clientName + ' - ' + formatPrice(total),
            from_name: 'Cabral Ferramentas',
            email: 'rafaelfrancocabral@gmail.com',
            message: 'Novo orcamento recebido!\n\nCliente: ' + clientName + '\nValor: ' + formatPrice(total) + '\n\nAcesse o dashboard para mais detalhes:\nhttps://www.cabralferramentas.com.br/dashboard.html'
        });

        const options = {
            hostname: 'api.web3forms.com',
            path: '/submit',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', (chunk) => { data += chunk; });
            proxyRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.success) {
                        return res.status(200).json({ ok: true });
                    } else {
                        return res.status(502).json({ error: 'Web3Forms rejected', detail: parsed });
                    }
                } catch (e) {
                    return res.status(502).json({ error: 'Bad response from Web3Forms' });
                }
            });
        });

        proxyReq.on('error', (err) => {
            console.error('Notification error:', err);
            return res.status(500).json({ error: 'Proxy error', msg: String(err) });
        });

        proxyReq.write(payload);
        proxyReq.end();
    } catch (err) {
        console.error('Handler error:', err);
        return res.status(500).json({ error: 'Handler error', msg: String(err) });
    }
};
