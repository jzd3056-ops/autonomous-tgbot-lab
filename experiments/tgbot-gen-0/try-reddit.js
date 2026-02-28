const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-dev-shm-usage'] 
  });
  const page = await browser.newPage();
  
  // Try to find bot submission forms that actually work
  const attempts = [];
  
  // 1. Try Telegram Bot Store (storebot.me)
  try {
    console.log('1. Trying storebot.me...');
    await page.goto('https://storebot.me/add', { timeout: 15000, waitUntil: 'domcontentloaded' });
    console.log('   Title:', await page.title());
    const html = await page.content();
    const hasForm = html.includes('<form') || html.includes('input');
    console.log('   Has form:', hasForm);
    if (hasForm) {
      // Try to find and fill the bot username field
      const inputs = await page.$$('input');
      for (const inp of inputs) {
        const name = await inp.getAttribute('name');
        const placeholder = await inp.getAttribute('placeholder');
        console.log(`   Input: name=${name}, placeholder=${placeholder}`);
      }
    }
  } catch(e) { console.log('   Error:', e.message.slice(0,80)); }

  // 2. Try botpages.com
  try {
    console.log('2. Trying botpages.com...');
    await page.goto('https://botpages.com/bots/submit', { timeout: 15000, waitUntil: 'domcontentloaded' });
    console.log('   Title:', await page.title());
    const inputs = await page.$$eval('input, textarea, select', els => els.map(e => ({tag: e.tagName, name: e.name, id: e.id, placeholder: e.placeholder})));
    console.log('   Fields:', JSON.stringify(inputs.slice(0, 10)));
  } catch(e) { console.log('   Error:', e.message.slice(0,80)); }

  // 3. Try ChatBottle
  try {
    console.log('3. Trying chatbottle.co...');
    await page.goto('https://chatbottle.co/bots/submit', { timeout: 15000, waitUntil: 'domcontentloaded' });
    console.log('   Title:', await page.title());
  } catch(e) { console.log('   Error:', e.message.slice(0,80)); }

  // 4. Try 50bots
  try {
    console.log('4. Trying 50bots.com...');
    await page.goto('https://50bots.com/submit', { timeout: 15000, waitUntil: 'domcontentloaded' });
    console.log('   Title:', await page.title());
  } catch(e) { console.log('   Error:', e.message.slice(0,80)); }

  // 5. Try telegramcatalog.com
  try {
    console.log('5. Trying telegramcatalog.com...');
    await page.goto('https://telegramcatalog.com/en/channels/submit', { timeout: 15000, waitUntil: 'domcontentloaded' });
    console.log('   Title:', await page.title());
    const inputs = await page.$$eval('input, textarea', els => els.map(e => ({tag: e.tagName, name: e.name, placeholder: e.placeholder})));
    console.log('   Fields:', JSON.stringify(inputs.slice(0,10)));
  } catch(e) { console.log('   Error:', e.message.slice(0,80)); }

  await browser.close();
})();
