import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36', locale: 'no-NO' });
const page = await ctx.newPage();
await page.goto('https://www.wera.de/no/05032002001', { waitUntil: 'networkidle', timeout: 30000 });
const data = await page.evaluate(() => {
  return {
    text: document.body.innerText.slice(0, 4000),
    images: Array.from(document.querySelectorAll('img')).map(i => i.src).filter(s => s && !s.startsWith('data:') && s.includes('fileadmin') && (s.match(/\d{11}/) || s.includes('Werkzeug'))).slice(0, 8),
  };
});
console.log(data.text);
console.log('\n=== IMAGES ===');
console.log(data.images);
await browser.close();
