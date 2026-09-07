import { it, expect } from 'vitest'
import { buildPayloadProjects, uniquePeriodSessionCount } from '../src/usage-aggregator.js'
import type { ProjectSummary, SessionSummary } from '../src/types.js'
import type { DailyEntry } from '../src/daily-cache.js'

const path = '/tmp/count-boundary'
const session = {
  sessionId: 'surviving-id', project: 'vault', workingDirectory: path,
  firstTimestamp: '2026-09-02T12:00:00Z', lastTimestamp: '2026-09-07T12:00:00Z',
  totalCostUSD: 1, totalSavingsUSD: 0, apiCalls: 1,
  totalInputTokens: 100, totalOutputTokens: 20, totalCacheReadTokens: 0, totalCacheWriteTokens: 0,
  modelBreakdown: {}, categoryBreakdown: {}, turns: [{timestamp:'2026-09-07T12:00:00Z',userMessage:'task',assistantCalls:[{provider:'claude',model:'claude-sonnet-4-5',costUSD:1,inputTokens:100,outputTokens:20,cacheReadTokens:0,cacheWriteTokens:0}]}],
} as SessionSummary
const live = [{ project: 'vault', projectPath: path, sessions: [session], totalCostUSD: 1, totalSavingsUSD: 0, totalApiCalls: 1, totalProxiedCostUSD: 0 }] as ProjectSummary[]
function day(date: string, count: number, cost: number, carried = false): DailyEntry {
  const projects = { vault: {path, cost, calls:count, savingsUSD:0, sessions:count} }
  return { date, cost, calls:count, sessions:count, savingsUSD:0, inputTokens:100, outputTokens:20, cacheReadTokens:0,cacheWriteTokens:0,editTurns:0,oneShotTurns:0,models:{},categories:{},projects,providers:{claude:{cost,calls:count,sessions:count,savingsUSD:0,projects}}, ...(carried?{carried:true as const}:{}) }
}
it('positive historical accounting with no count metadata cannot certify exact live count', () => {
  const missing = day('2026-09-02', 0, 3)
  missing.calls = 2
  missing.providers.claude!.calls = 2
  const counted = uniquePeriodSessionCount(live, [missing])
  const row = buildPayloadProjects(live, [missing], '/Users/synthetic')[0]!
  console.log('ROOT_COUNT_METADATA_GAP', JSON.stringify({counted,row}))
  expect(row.cost).toBe(3)
  expect(counted.basis).toBe('partial')
})
