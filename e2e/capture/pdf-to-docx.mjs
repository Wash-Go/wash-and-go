// Build image-per-page DOCX from the rendered PDF pages, so the Word/Google-Docs
// file is a pixel-perfect match of the PDF (pandoc's HTML path drops all the CSS).
// Each A4 page → one full-bleed PNG; page break between. Not text-editable — that
// is the trade for design fidelity. Run: node e2e/capture/pdf-to-docx.mjs
import { Document, Packer, Paragraph, ImageRun, PageBreak } from 'docx';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES = join(HERE, 'out', 'pages');
const ROOT = join(HERE, '..', '..'); // repo root

// A4 at 96dpi, full-bleed (zero page margins).
const PAGE_W = 794;
const PAGE_H = 1123;
const A4_TWIP = { width: 11906, height: 16838 };

const DOCS = [
  { prefix: 'Money-Flow', out: 'Wash-and-Go-Money-Flow.docx' },
  { prefix: 'Cost-Matrix', out: 'Wash-and-Go-Cost-Matrix.docx' },
  { prefix: 'Features', out: 'Wash-and-Go-Features.docx' },
];

function pagesFor(prefix) {
  return readdirSync(PAGES)
    .filter((f) => f.startsWith(prefix + '-') && f.endsWith('.png'))
    .sort((a, b) => {
      const n = (s) => parseInt(s.match(/-(\d+)\.png$/)[1], 10);
      return n(a) - n(b);
    });
}

for (const { prefix, out } of DOCS) {
  const files = pagesFor(prefix);
  const children = [];
  files.forEach((file, i) => {
    const runs = [
      new ImageRun({
        type: 'png',
        data: readFileSync(join(PAGES, file)),
        transformation: { width: PAGE_W, height: PAGE_H },
      }),
    ];
    if (i > 0) runs.unshift(new PageBreak());
    children.push(new Paragraph({ children: runs, spacing: { before: 0, after: 0 } }));
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_TWIP.width, height: A4_TWIP.height },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  writeFileSync(join(ROOT, out), buf);
  console.log(`${out}  ${files.length} pages  ${(buf.length / 1024).toFixed(0)}KB`);
}
