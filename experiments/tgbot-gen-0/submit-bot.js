const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  
  // 1. Submit to telegramchannels.me
  try {
    const page = await browser.newPage();
    await page.goto('https://telegramchannels.me/bots/add', { timeout: 15000 });
    console.log('[telegramchannels.me] Title:', await page.title());
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      const name = await inp.getAttribute('name');
      const ph = await inp.getAttribute('placeholder');
      console.log('  Input:', name, ph);
    }
    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.count() > 0) {
      await textInput.fill('@aiagentlab_bbot');
      console.log('  Filled username');
      const btn = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(3000);
        console.log('  After submit URL:', page.url());
        console.log('  Content snippet:', (await page.textContent('body')).slice(0, 300));
      }
    }
    await page.close();
  } catch(e) { console.log('[telegramchannels.me] Error:', e.message.slice(0, 200)); }

  // 2. Try botfather.dev 
  try {
    const page = await browser.newPage();
    await page.goto('https://botfather.dev/bots/submit', { timeout: 15000 });
    console.log('[botfather.dev] Title:', await page.title());
    await page.close();
  } catch(e) { console.log('[botfather.dev] Error:', e.message.slice(0, 100)); }

  // 3. Try botostore.com
  try {
    const page = await browser.newPage();
    await page.goto('https://botostore.com/add/', { timeout: 15000 });
    console.log('[botostore.com] Title:', await page.title());
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      const name = await inp.getAttribute('name');
      console.log('  Input:', name);
    }
    await page.close();
  } catch(e) { console.log('[botostore.com] Error:', e.message.slice(0, 100)); }

  // 4. Try storebot.me (known TG bot directory)
  try {
    const page = await browser.newPage();
    await page.goto('https://storebot.me/add', { timeout: 15000 });
    console.log('[storebot.me] Title:', await page.title());
    const content = (await page.textContent('body')).slice(0, 300);
    console.log('  Content:', content);
    await page.close();
  } catch(e) { console.log('[storebot.me] Error:', e.message.slice(0, 100)); }

  await browser.close();
  console.log('\nDone.');
})();
