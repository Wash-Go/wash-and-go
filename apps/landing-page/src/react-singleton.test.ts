/// <reference types="node" />
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/*
 * Regression guard for the prerendered homepage losing its content (React
 * error #419). The repo uses pnpm's hoisted node-linker, so when this app
 * resolves a different React version from the rest of the monorepo, pnpm
 * copies that version under each dependent package (for example
 * node_modules/@tanstack/react-router/node_modules/react). The SSR build keeps
 * node_modules external, so at prerender time the app's hooks ran against one
 * React instance while TanStack's react-dom/server rendered with another, and
 * `useRef` threw "Cannot read properties of null". Every package that renders
 * or calls hooks must therefore resolve the exact same react and react-dom
 * directories as the app itself.
 */

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

type ReactPeer = { name: string; dir: string; peers: Array<string> }

type Manifest = {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/** Node's package lookup: the nearest node_modules/<name>, walking upwards. */
function findPackageDir(name: string, fromDir: string): string | null {
  let dir = fromDir
  for (;;) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      return realpathSync(candidate)
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest
}

/** Every runtime package reachable from the app that peers on react/react-dom. */
function reactPeers(): Array<ReactPeer> {
  const found: Array<ReactPeer> = []
  const visited = new Set<string>()
  const queue: Array<{ name: string; from: string }> = Object.keys(
    readManifest(APP_DIR).dependencies ?? {},
  ).map((name) => ({ name, from: APP_DIR }))

  while (queue.length > 0) {
    const { name, from } = queue.shift()!
    const dir = findPackageDir(name, from)
    if (!dir || visited.has(dir)) continue
    visited.add(dir)

    const manifest = readManifest(dir)
    const peers = ['react', 'react-dom'].filter(
      (peer) => manifest.peerDependencies?.[peer] !== undefined,
    )
    if (peers.length > 0) found.push({ name, dir, peers })

    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      queue.push({ name: dep, from: dir })
    }
  }
  return found
}

describe('React singleton', () => {
  it('resolves one react and one react-dom for the app and every React consumer', () => {
    const appCopy: Record<string, string | null> = {
      react: findPackageDir('react', APP_DIR),
      'react-dom': findPackageDir('react-dom', APP_DIR),
    }
    const consumers = reactPeers()
    // Sanity: the walk must actually reach the router and the SSR renderer.
    expect(consumers.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'react-dom',
        '@tanstack/react-router',
        '@tanstack/react-start-server',
      ]),
    )

    const strays = consumers.flatMap(({ name, dir, peers }) =>
      peers
        .map((peer) => ({ peer, resolved: findPackageDir(peer, dir) }))
        .filter(({ peer, resolved }) => resolved && resolved !== appCopy[peer])
        .map(({ resolved }) => `${name} -> ${resolved}`),
    )

    expect(strays).toEqual([])
  })
})
