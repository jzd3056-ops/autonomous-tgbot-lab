const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-dev-shm-usage'] 
  });
  const page = await browser.newPage();
  
  // Try submitting to botostore.com
  const targets = [
    { url: 'https://telegram.me/s/botlist', name: 'TG botlist channel' },
    { url: 'https://tdirectory.me/submit', name: 'tdirectory' },
    { url: 'https://telegramic.org/submit/', name: 'telegramic' },
    { url: 'https://tgram.io/submit', name: 'tgram' },
  ];
  
  for (const t of targets) {
    try {
      console.log(`\nTrying ${t.name}: ${t.url}`);
      const resp = await page.goto(t.url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      console.log(`  Status: ${resp.status()}`);
      const title = await page.title();
      console.log(`  Title: ${title}`);
      // Look for input fields
      const inputs = await page.$$eval('input[type="text"], input[type="url"], input[name*="bot"], input[name*="url"], textarea', 
        els => els.map(e => ({ tag: e.tagName, name: e.name, placeholder: e.placeholder, type: e.type })));
      console.log(`  Inputs: ${JSON.stringify(inputs)}`);
      // Look for submit buttons
      const buttons = await page.$$eval('button, input[type="submit"]', 
        els => els.map(e => ({ text: e.textContent?.trim(), type: e.type })));
      console.log(`  Buttons: ${JSON.stringify(buttons)}`);
    } catch (e) {
      console.log(`  Error: ${e.message.slice(0, 100)}`);
    }
  }
  
  await browser.close();
})();
