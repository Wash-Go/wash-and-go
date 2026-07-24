import { test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT = join(__dirname, 'out');

// Rasterize the money-flow SVG diagram → PNG and inline it as an <img>, so the
// DOCX (pandoc can't embed SVG) keeps the diagram. Features + costs already use
// <img> data-URIs, so they convert directly.
test('prep money.html for docx (rasterize SVG)', async ({ browser }) => {
  const src = readFileSync(join(OUT, 'money.html'), 'utf8');
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(src, { waitUntil: 'networkidle' });
  const svg = page.locator('svg').first();
  const png = await svg.screenshot();
  const uri = `data:image/png;base64,${png.toString('base64')}`;
  await ctx.close();

  // Replace the inline <svg>…</svg> with the rasterized image.
  const replaced = src.replace(/<svg[\s\S]*?<\/svg>/, `<img src="${uri}" style="max-width:100%"/>`);
  writeFileSync(join(OUT, 'money-docx.html'), replaced);
  console.log('money-docx.html written');
});
