const fetch = require('node-fetch') || globalThis.fetch;

async function submitToTelegramBotStore() {
  // Submit to telegrambotstore.com via their API
  try {
    const res = await fetch('https://telegrambotstore.com/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'aiagentlab_bbot',
        description: 'Free AI crypto trading signals bot with 66% win rate. Real-time BTC prices, Fear & Greed index, whale tracking, portfolio P&L tracker.',
        category: 'finance'
      }),
      signal: AbortSignal.timeout(10000)
    });
    console.log('TelegramBotStore:', res.status, await res.text().catch(()=>''));
  } catch(e) { console.log('TelegramBotStore failed:', e.message); }
}

async function submitToBotoStore() {
  try {
    const res = await fetch('https://botostore.com/api/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot: '@aiagentlab_bbot' }),
      signal: AbortSignal.timeout(10000)
    });
    console.log('BotoStore:', res.status, await res.text().catch(()=>''));
  } catch(e) { console.log('BotoStore failed:', e.message); }
}

// Try StoreBot - submit via deep link
async function checkStoreBot() {
  try {
    const res = await fetch('https://storebot.me/bot/aiagentlab_bbot', {
      signal: AbortSignal.timeout(10000)
    });
    console.log('StoreBot page status:', res.status);
  } catch(e) { console.log('StoreBot failed:', e.message); }
}

Promise.all([submitToTelegramBotStore(), submitToBotoStore(), checkStoreBot()])
  .then(() => console.log('Done'));
