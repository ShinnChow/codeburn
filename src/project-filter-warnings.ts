import { type ProjectFilterTarget, unmatchedRootedPatterns } from './parser.js'

/// A rooted --project/--exclude selects one project or nothing, so a typo does
/// not fail: it reports a total over a set nobody asked for, which reads like a
/// correct answer. Judged against what the command parsed, before filtering.
///
/// Never under `serve`: that path routes process.stderr.write into the
/// progress-frame emitter (runCaptured), so a warning would reach the desktop
/// app as scan progress, and `reported` would outlive the request that filled it.
const reported = new Set<string>()

export function reportUnmatchedProjectPatterns(
  projects: readonly ProjectFilterTarget[],
  include?: readonly string[],
  exclude?: readonly string[],
): void {
  if (process.argv[2] === 'serve') return
  // One command can filter several parses (export builds three periods out of
  // one), and a missing path is one piece of news.
  const patterns =[...(include ?? []), ...(exclude ?? [])].filter(pattern => !reported.has(pattern))
  if (patterns.length === 0) return
  for (const pattern of unmatchedRootedPatterns(projects, patterns)) {
    reported.add(pattern)
    process.stderr.write(`codeburn: no project in this period matches ${pattern} (an absolute path has to be a project's path, or a prefix of it on a segment boundary)\n`)
  }
}
