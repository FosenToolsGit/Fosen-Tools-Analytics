import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();
await page.goto('https://www.wera.de/en/05032002001', { waitUntil: 'networkidle', timeout: 30000 });
const data = await page.evaluate(() => {
  const allText = document.body.innerText.slice(0, 3000);
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.textContent?.trim()).filter(Boolean);
  const tables = Array.from(document.querySelectorAll('table')).map(t => t.innerText.slice(0, 500));
  const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(s => s && !s.startsWith('data:')).slice(0, 10);
  const ldjson = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent);
  return { allText, headings, tables, imgs, ldjson };
});
console.log('=== TEXT (first 2000 chars) ===');
console.log(data.allText.slice(0, 2000));
console.log('\n=== HEADINGS ===');
console.log(data.headings);
console.log('\n=== IMAGES ===');
console.log(data.imgs.slice(0, 5));
console.log('\n=== LD-JSON ===');
console.log(data.ldjson.slice(0, 2));
await browser.close();
