import { describe, it, expect } from 'vitest'
import { getAllProviders } from '../../src/providers/index.js'

/**
 * #899 exact-main residual census (Codex REVIEW-2026-09-06-2306):
 * seven filesystem gaps + one intentional Vercel network exception.
 * Method presence is necessary but not sufficient for OpenClaw empty-root
 * semantics — see openclaw.test.ts doctor fixture.
 */
const FILESYSTEM_GAP_NAMES = [
  'forge',
  'mux',
  'open-design',
  'openclaw',
  'zcode',
  'zed',
  'zerostack',
] as const

describe('#899 probeRoots census', () => {
  it('closes the seven filesystem gaps; Vercel remains network exception', async () => {
    const providers = await getAllProviders()
    const byName = new Map(providers.map(p => [p.name, p]))

    for (const name of FILESYSTEM_GAP_NAMES) {
      const p = byName.get(name)
      expect(p, `provider ${name} should be loaded`).toBeTruthy()
      expect(p!.probeRoots, `${name} must implement probeRoots`).toBeTypeOf('function')
      const roots = await p!.probeRoots!()
      expect(roots.length, `${name} probeRoots must return ≥1 root`).toBeGreaterThanOrEqual(1)
    }

    const vercel = byName.get('vercel-gateway')
    expect(vercel).toBeTruthy()
    expect(vercel!.network).toBe(true)
    expect(vercel!.probeRoots, 'Vercel is intentional network exception — no probeRoots').toBeUndefined()

    const missingFilesystem = providers.filter(p => !p.network && !p.probeRoots).map(p => p.name)
    expect(missingFilesystem).toEqual([])
  })
})
