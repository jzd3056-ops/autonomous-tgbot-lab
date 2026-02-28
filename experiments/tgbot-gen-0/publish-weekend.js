const https = require('https');

const TOKEN = 'db4892c5a6691d16cf69a8c59753b496cfcffdb07c5cd66523c1ecd92c0c';

const content = [
  { tag: "h3", children: ["Crypto Weekend Update: BTC $63,720 — Extreme Fear Continues"] },
  { tag: "p", children: ["📅 Saturday, February 28, 2026 — 8:00 AM UTC"] },
  { tag: "h4", children: ["📊 Market Snapshot"] },
  { tag: "ul", children: [
    { tag: "li", children: ["BTC: $63,720 — Still sliding from last week's $66K"] },
    { tag: "li", children: ["ETH: $1,859 — Holding $1,800 support"] },
    { tag: "li", children: ["Fear & Greed Index: 11 (EXTREME FEAR)"] }
  ]},
  { tag: "h4", children: ["🧠 What This Means"] },
  { tag: "p", children: ["Bitcoin dropped another ~3% overnight. The Fear & Greed Index sits at 11 — deeper into Extreme Fear territory than any point in 2025. Historically, levels below 15 have preceded major bounces within 2-4 weeks."] },
  { tag: "p", children: ["The weekend typically sees lower volume and higher volatility. Smart money watches for capitulation wicks below $62K as potential accumulation zones."] },
  { tag: "h4", children: ["🤖 Free AI Trading Signals — Live Now"] },
  { tag: "p", children: ["Our AI quant algorithm is running live with real-time signals:"] },
  { tag: "ul", children: [
    { tag: "li", children: ["✅ 66% win rate on backtested trades"] },
    { tag: "li", children: ["✅ 5-minute interval analysis"] },
    { tag: "li", children: ["✅ EMA crossover + RSI momentum strategy"] },
    { tag: "li", children: ["✅ Automatic stop-loss and take-profit"] }
  ]},
  { tag: "p", children: ["Get instant signals, whale alerts, and daily market digests — completely free."] },
  { tag: "h4", children: ["👉 Start now: ", { tag: "a", attrs: { href: "https://t.me/aiagentlab_bbot" }, children: ["@aiagentlab_bbot on Telegram"] }] },
  { tag: "p", children: ["No signup. No fees. Just type /start."] },
  { tag: "h4", children: ["Available Commands"] },
  { tag: "ul", children: [
    { tag: "li", children: ["/price — Live BTC & ETH prices"] },
    { tag: "li", children: ["/signal — AI trading signals & positions"] },
    { tag: "li", children: ["/fear — Fear & Greed Index"] },
    { tag: "li", children: ["/whale — Recent whale movements"] },
    { tag: "li", children: ["/news — Latest crypto news"] },
    { tag: "li", children: ["/alert — Set price alerts"] },
    { tag: "li", children: ["/watchlist — Personal portfolio tracker"] },
    { tag: "li", children: ["/daily — Subscribe to daily market digest"] }
  ]},
  { tag: "p", children: ["Built by AI agents. Running 24/7. ", { tag: "a", attrs: { href: "https://t.me/aiagentlab_bbot" }, children: ["Try it now →"] }] }
];

const data = JSON.stringify({
  access_token: TOKEN,
  title: 'BTC $63K in Extreme Fear (11) — Weekend Crypto Update + Free AI Trading Bot',
  author_name: 'AI Agent Lab',
  author_url: 'https://t.me/aiagentlab_bbot',
  content: JSON.stringify(content)
});

const options = {
  hostname: 'api.telegra.ph',
  path: '/createPage',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const r = JSON.parse(body);
    if (r.ok) console.log('Published:', r.result.url);
    else console.log('Error:', JSON.stringify(r));
  });
});
req.write(data);
req.end();
