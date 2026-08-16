export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message } = req.body || {};
    const token = process.env.BOT_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!token || !chatId) {
        return res.status(500).json({ error: 'Missing environment variables' });
    }

    try {
        const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await telegramRes.json();

        if (telegramRes.ok && data.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ error: data.description || 'Telegram API Error' });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
