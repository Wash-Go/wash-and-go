import { readFileSync } from 'fs';
import { join } from 'path';

// Brand parity: the portal copies the landing page's fonts and @theme colour
// tokens (app/brand.css). Compared as text so a change on either side that is
// not mirrored fails here instead of drifting silently.
const repo = join(__dirname, '..', '..', '..');
const landingCss = readFileSync(join(repo, 'apps/landing-page/src/styles/globals.css'), 'utf8');
const portalCss = readFileSync(join(__dirname, '..', 'app/brand.css'), 'utf8');
const designMd = readFileSync(join(repo, 'DESIGN.md'), 'utf8');

function block(css: string, opener: RegExp): string {
  const m = css.match(opener);
  if (!m || m.index === undefined) throw new Error(`no block for ${opener}`);
  const start = m.index + m[0].length;
  return css.slice(start, css.indexOf('}', start));
}

function colourTokens(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)) {
    out[name] = value.toLowerCase();
  }
  return out;
}

function vars(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    out[name] = value.toLowerCase();
  }
  return out;
}

const fontSrcs = (css: string) =>
  [...css.matchAll(/url\('[^']*\/([a-z0-9-]+\.woff2)'\)/g)].map((m) => m[1]).sort();

describe('brand token parity with the landing page', () => {
  const landing = colourTokens(block(landingCss, /@theme\s*\{/));
  const portal = colourTokens(block(portalCss, /Mirror of the landing page[^\n]*\n:root\s*\{/));

  it('reads a non-empty token set from both files', () => {
    expect(Object.keys(landing).length).toBeGreaterThanOrEqual(9);
  });

  it('mirrors every landing @theme colour token exactly', () => {
    expect(portal).toEqual(landing);
  });

  it('self-hosts the same woff2 files as the landing page', () => {
    expect(fontSrcs(portalCss)).toEqual(fontSrcs(landingCss));
  });
});

describe('portal light tokens match DESIGN.md', () => {
  const design: Record<string, string> = {};
  for (const [, name, value] of designMd.matchAll(/^ {2}([a-z-]+): "(#[0-9A-F]{6})"/gm)) {
    design[name] = value.toLowerCase();
  }
  // Portal var name → DESIGN.md colour name where they differ.
  const alias: Record<string, string> = {
    muted: 'text-muted',
    'warn-tint': 'warning-tint',
    'warn-ink': 'warning-ink',
    rail: 'navy',
  };
  const light = vars(block(portalCss, /Portal semantic tokens, light[^\n]*\n:root\s*\{/));

  it('uses only DESIGN.md colours', () => {
    for (const [name, value] of Object.entries(light)) {
      expect([name, design[alias[name] ?? name]]).toEqual([name, value]);
    }
  });

  it('never ships the retired Expo blue', () => {
    expect(portalCss.toLowerCase()).not.toContain('#208aef');
  });
});
