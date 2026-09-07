/// Shared session-count phrasing for CLI, MCP, and tests.
/// Exact unique counts come only from surviving source identities with no
/// unknown cache contribution. Everything else is a lower bound.
export type SessionCountBasis = 'identity' | 'partial'

export const SESSION_COUNT_HELP = 'Older session logs may be unavailable.'
/// Combined-scope counts are a sum of per-device numbers with no shared identity
/// contract. Do not show that sum as unique or as a lower bound.
export const COMBINED_SESSION_COUNT_HELP = 'Session identities are unavailable across devices.'
export const COMBINED_SESSION_COUNT_LABEL = 'Session count unavailable'

export function sessionCountIsExact(basis: SessionCountBasis | undefined): boolean {
  return basis === 'identity'
}

export function formatSessionCount(
  sessions: number,
  basis: SessionCountBasis | undefined,
): string {
  if (!sessionCountIsExact(basis)) {
    if (sessions <= 0) return 'Session count unavailable'
    return sessions === 1 ? 'At least 1 session' : `At least ${sessions.toLocaleString('en-US')} sessions`
  }
  if (sessions === 1) return '1 session'
  return `${sessions.toLocaleString('en-US')} sessions`
}

/// Compact average for surfaces that show one. Never invent $0 or cost/count
/// when the count is a bound.
export function formatSessionAveragePlaceholder(): string {
  return '—'
}

/// Combined-scope display only. Ignores the numeric wire sum; do not pass 0 to
/// `formatSessionCount` to obtain this string.
export function formatCombinedSessionCount(): string {
  return COMBINED_SESSION_COUNT_LABEL
}
