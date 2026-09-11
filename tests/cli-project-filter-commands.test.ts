import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

import { afterEach, describe, expect, it, vi } from 'vitest'

// Each test spawns `tsx src/cli.ts`, which re-transpiles the CLI per spawn.
vi.setConfig({ testTimeout: 30_000 })

// Unit tests of filterProjectsByName cannot tell whether a command passes its
// patterns down. These run the real binary over two path siblings, so dropping
// the argument anywhere here fails the suite.
const SIBLINGS = [
  { dir: '-Users-gone-app', cwd: '/Users/gone/app', session: 's-app' },
  { dir: '-Users-gone-app-kit', cwd: '/Users/gone/app-kit', session: 's-kit' },
]

let homes: string[] = []

afterEach(async () => {
  while (homes.length > 0) {
    const home = homes.pop()
    if (home) await rm(home, { recursive: true, force: true })
  }
})

async function seedHome(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'codeburn-project-filter-cli-'))
  homes.push(home)
  const now = Date.now()
  const line = (session: string, cwd: string, index: number): string => JSON.stringify({
    type: 'assistant',
    timestamp: new Date(now - (30 - index) * 60_000).toISOString(),
    sessionId: session,
    cwd,
    message: {
      type: 'message', role: 'assistant', model: 'claude-3-5-sonnet-20241022', id: `${session}-m${index}`,
      content: [],
      usage: { input_tokens: 90000, output_tokens: 12000, cache_creation_input_tokens: 0, cache_read_input_tokens: 300000 },
    },
  })
  for (const project of SIBLINGS) {
    const dir = join(home, '.claude', 'projects', project.dir)
    await mkdir(dir, { recursive: true })
    const lines = [1, 2].map(index => line(project.session, project.cwd, index))
    await writeFile(join(dir, `${project.session}.jsonl`), lines.join('\n') + '\n', 'utf-8')
  }
  return home
}

function runCli(args: string[], home: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: join(home, '.claude'), TZ: 'UTC' },
    encoding: 'utf-8',
    timeout: 30_000,
  })
}

describe('--project / --exclude reach the reporting commands', () => {
  it('sessions keeps the sibling an absolute --exclude does not name', async () => {
    const home = await seedHome()

    const all = runCli(['sessions', '--format', 'json', '--period', '30days'], home)
    expect(all.stderr).toBe('')
    expect(JSON.parse(all.stdout).map((s: { project: string }) => s.project).sort())
      .toEqual(['-Users-gone-app', '-Users-gone-app-kit'])

    const filtered = runCli(['sessions', '--format', 'json', '--period', '30days', '--exclude', '/Users/gone/app'], home)
    expect(filtered.status).toBe(0)
    expect(JSON.parse(filtered.stdout).map((s: { project: string }) => s.project))
      .toEqual(['-Users-gone-app-kit'])
  })

  it('spend carries the patterns into computeSpendFlow', async () => {
    const home = await seedHome()

    const all = runCli(['spend', '--format', 'flow-json', '--period', '30days'], home)
    expect(all.status).toBe(0)
    expect(JSON.parse(all.stdout).projects).toHaveLength(2)

    const filtered = runCli(['spend', '--format', 'flow-json', '--period', '30days', '--exclude', '/Users/gone/app'], home)
    expect(filtered.status).toBe(0)
    const projects = JSON.parse(filtered.stdout).projects as Array<{ label: string }>
    expect(projects.map(p => p.label)).toEqual(['app-kit'])
  })

  it('yield carries the patterns into computeYield', async () => {
    const home = await seedHome()

    const all = runCli(['yield', '--format', 'json', '--period', '30days'], home)
    expect(all.status).toBe(0)
    expect(JSON.parse(all.stdout).details).toHaveLength(2)

    const filtered = runCli(['yield', '--format', 'json', '--period', '30days', '--exclude', '/Users/gone/app'], home)
    expect(filtered.status).toBe(0)
    const report = JSON.parse(filtered.stdout)
    expect(report.details.map((d: { project: string }) => d.project)).toEqual(['-Users-gone-app-kit'])
    type YieldDetail = { project: string; costUSD: number }
    const kept = (JSON.parse(all.stdout).details as YieldDetail[]).find(d => d.project === '-Users-gone-app-kit')!
    const total = (report.details as YieldDetail[]).reduce((sum, d) => sum + d.costUSD, 0)
    expect(total).toBeCloseTo(kept.costUSD, 6)
  })
})

describe('a rooted pattern that names nothing is reported', () => {
  it('warns on stderr rather than reporting a total over a set nobody asked for', async () => {
    const home = await seedHome()
    const result = runCli(['sessions', '--format', 'json', '--period', '30days', '--exclude', '/Users/gone/apps'], home)

    expect(result.stderr).toContain('no project in this period matches /Users/gone/apps')
    // The run still reports: the warning is advisory, not a failure.
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toHaveLength(2)
  })

  it('stays quiet when the pattern selects something, and for a loose word', async () => {
    const home = await seedHome()

    const rooted = runCli(['sessions', '--format', 'json', '--period', '30days', '--exclude', '/Users/gone/app'], home)
    expect(rooted.stderr).not.toContain('no project in this period matches')

    // A plain word is a substring by design, so it is never a typo signal.
    const loose = runCli(['sessions', '--format', 'json', '--period', '30days', '--exclude', 'nothing-like-this'], home)
    expect(loose.stderr).not.toContain('no project in this period matches')
  })

  it('judges each pattern on its own, against the list before any filtering', async () => {
    const home = await seedHome()

    // The second --project selects a project the first one also covers. Judged
    // inside the filter, `some()` would stop at the first and call it unmatched.
    const overlapping = runCli([
      'sessions', '--format', 'json', '--period', '30days',
      '--project', '/Users/gone/app', '--project', '/Users/gone/app/sub',
    ], home)
    expect(overlapping.stderr).toContain('/Users/gone/app/sub')
    expect(overlapping.stderr).not.toContain('matches /Users/gone/app (')

    // And an --exclude must not be judged against what --project already removed.
    const both = runCli([
      'sessions', '--format', 'json', '--period', '30days',
      '--project', '/Users/gone/app', '--exclude', '/Users/gone/app-kit',
    ], home)
    expect(both.stderr).toBe('')
  })
})
