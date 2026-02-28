const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-dev-shm-usage'] 
  });
  
  // Try submitting to telegramchannels.me
  try {
    const page = await browser.newPage();
    await page.goto('https://telegramchannels.me/bots/add', { timeout: 15000 });
    const html = await page.content();
    console.log('telegramchannels.me title:', await page.title());
    // Look for input fields
    const inputs = await page.$$eval('input', els => els.map(e => ({name: e.name, type: e.type, placeholder: e.placeholder})));
    console.log('Inputs:', JSON.stringify(inputs));
    await page.close();
  } catch(e) {
    console.log('telegramchannels.me failed:', e.message.slice(0,100));
  }

  // Try tdirectory.me
  try {
    const page = await browser.newPage();
    await page.goto('https://tdirectory.me/submit', { timeout: 15000 });
    console.log('tdirectory.me title:', await page.title());
    await page.close();
  } catch(e) {
    console.log('tdirectory.me failed:', e.message.slice(0,100));
  }

  // Try botostore.com
  try {
    const page = await browser.newPage();
    await page.goto('https://botostore.com/add/', { timeout: 15000 });
    console.log('botostore.com title:', await page.title());
    const inputs = await page.$$eval('input, textarea', els => els.map(e => ({tag: e.tagName, name: e.name, type: e.type, placeholder: e.placeholder})));
    console.log('Inputs:', JSON.stringify(inputs));
    await page.close();
  } catch(e) {
    console.log('botostore.com failed:', e.message.slice(0,100));
  }

  await browser.close();
})();
