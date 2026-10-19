#!/usr/bin/env node
// Post-build guard: the landing page is shipped as prerendered HTML from
// dist/client (vercel.json outputDirectory). If prerendering silently degrades
// to a client-only shell, investors and crawlers get an empty page, so the
// build fails unless the prerendered `/` carries the real hero <h1> and none
// of the markers React or TanStack Start leave when they fall back to client
// rendering or hit a render error.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const HERO_H1 =
  'Laundry pickup, delivery and settlement for Zamboanga City.'

const FORBIDDEN = [
  // React: a Suspense boundary that errored on the server and will client-render.
  [
    '<!--$!-->',
    'a Suspense boundary fell back to client rendering (<!--$!-->)',
  ],
  [
    'Switched to client rendering',
    'React switched a boundary to client rendering',
  ],
  ['data-dgst=', 'React streamed a server render error digest (data-dgst)'],
  // React streaming runtime: $RC completes a deferred boundary, $RX errors one.
  // A fully prerendered page has no deferred boundaries left to complete.
  ['$RC(', 'a Suspense boundary was still streaming ($RC)'],
  ['$RX(', 'React streamed a boundary error ($RX)'],
  ['Minified React error', 'a minified React error was rendered'],
]

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** Returns a list of problems; an empty list means the HTML is a real SSR page. */
export function checkSsrHtml(html) {
  const problems = []
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
    decodeEntities(m[1].replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim(),
  )
  if (!h1s.includes(HERO_H1)) {
    problems.push(
      `missing the hero <h1> "${HERO_H1}" (found: ${JSON.stringify(h1s)})`,
    )
  }
  if (h1s.length !== 1) {
    problems.push(`expected exactly one <h1>, found ${h1s.length}`)
  }
  if (!/<main\b/.test(html)) {
    problems.push('missing the <main> landmark')
  }
  for (const [needle, why] of FORBIDDEN) {
    if (html.includes(needle)) problems.push(why)
  }
  // TanStack Start dehydrates each route match; ssr:!1 means the route was
  // rendered client-only and s:"error" means its loader or component threw.
  if (/\bssr:!1\b|\bssr:false\b/.test(html)) {
    problems.push('a TanStack route match was rendered client-only (ssr:false)')
  }
  if (/\bs:"(error|notFound|pending)"/.test(html)) {
    problems.push('a TanStack route match did not finish successfully')
  }
  return problems
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const outDir = resolve(root, 'dist/client')
  const index = resolve(outDir, 'index.html')
  const problems = []
  if (!existsSync(index)) {
    problems.push(`no prerendered page at ${index}; run the build first`)
  } else {
    problems.push(...checkSsrHtml(readFileSync(index, 'utf8')))
  }
  if (!existsSync(resolve(outDir, '404.html'))) {
    problems.push('no prerendered 404.html in dist/client')
  }
  if (problems.length) {
    console.error('check:ssr failed for dist/client/index.html:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(
    'check:ssr ok: dist/client/index.html is prerendered with the hero <h1>',
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
