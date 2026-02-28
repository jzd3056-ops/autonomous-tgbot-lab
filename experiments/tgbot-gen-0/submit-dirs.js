const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});

  // botostore.com
  try {
    const page = await browser.newPage();
    await page.goto('https://botostore.com/add/', {timeout: 20000});
    console.log('botostore title:', await page.title());
    const inputs = await page.$$eval('input, textarea, select', els => els.map(e => ({tag: e.tagName, name: e.name, id: e.id, type: e.type, placeholder: e.placeholder})));
    console.log('Fields:', JSON.stringify(inputs.slice(0, 10)));
    const nameInput = await page.$('input[name="bot"], input[name="username"], input#bot, input[type="text"]');
    if (nameInput) {
      await nameInput.fill('aiagentlab_bbot');
      console.log('Filled bot name');
      const btn = await page.$('button[type="submit"], input[type="submit"]');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(3000);
        console.log('Submitted! URL:', page.url());
      } else {
        console.log('No submit button found');
      }
    } else {
      console.log('No input found');
    }
    await page.close();
  } catch(e) {
    console.log('botostore failed:', e.message.slice(0, 200));
  }

  // telegramchannels.me  
  try {
    const page = await browser.newPage();
    await page.goto('https://telegramchannels.me/bots/add', {timeout: 20000});
    console.log('telegramchannels title:', await page.title());
    const html = await page.content();
    const formHtml = html.match(/<form[\s\S]*?<\/form>/i);
    if (formHtml) console.log('Form found, length:', formHtml[0].length);
    const nameInput = await page.$('input[name="username"], input[type="text"], input[name="link"]');
    if (nameInput) {
      await nameInput.fill('aiagentlab_bbot');
      const btn = await page.$('button[type="submit"], input[type="submit"], button');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(3000);
        console.log('Submitted! URL:', page.url());
      }
    } else {
      console.log('No input found on telegramchannels');
    }
    await page.close();
  } catch(e) {
    console.log('telegramchannels failed:', e.message.slice(0, 200));
  }

  await browser.close();
  console.log('Done');
})();
