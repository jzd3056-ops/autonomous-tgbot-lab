const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-dev-shm-usage'] 
  });
  const page = await browser.newPage();
  
  // Try Reddit - post in r/CryptoCurrency or r/TelegramBots
  // Actually try to find working bot directories
  const targets = [
    { url: 'https://botcatalog.com/submit', name: 'botcatalog' },
    { url: 'https://www.producthunt.com/', name: 'producthunt' },
    { url: 'https://alternativeto.net/', name: 'alternativeto' },
    { url: 'https://botpages.com/submit', name: 'botpages' },
  ];
  
  for (const t of targets) {
    try {
      console.log(`\nTrying ${t.name}: ${t.url}`);
      const resp = await page.goto(t.url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      console.log(`  Status: ${resp.status()}`);
      const title = await page.title();
      console.log(`  Title: ${title}`);
    } catch (e) {
      console.log(`  Error: ${e.message.slice(0, 100)}`);
    }
  }
  
  await browser.close();
})();
