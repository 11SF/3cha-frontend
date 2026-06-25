import type {
  CacheEfficiency,
  HourlyBucket,
  ModelBreakdownItem,
  PeriodSummary,
  PeriodTotals,
  ProjectBreakdownItem,
  Summary,
  TimeseriesPoint,
  UsageEvent,
} from './types'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emptyTotals(): PeriodTotals {
  return { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 }
}

function addInto(acc: PeriodTotals, e: UsageEvent) {
  acc.inputTokens += e.inputTokens
  acc.outputTokens += e.outputTokens
  acc.cacheCreationTokens += e.cacheCreationTokens
  acc.cacheReadTokens += e.cacheReadTokens
}

function totalOf(p: PeriodTotals): number {
  return p.inputTokens + p.outputTokens + p.cacheCreationTokens + p.cacheReadTokens
}

function sumRange(events: UsageEvent[], from: Date, to: Date): PeriodTotals {
  const totals = emptyTotals()
  for (const e of events) {
    if (e.occurredAt >= from && e.occurredAt < to) addInto(totals, e)
  }
  return totals
}

function toPeriodSummary(current: PeriodTotals, previous: PeriodTotals): PeriodSummary {
  const totalTokens = totalOf(current)
  const prevTotal = totalOf(previous)
  return {
    ...current,
    totalTokens,
    changePct: prevTotal > 0 ? ((totalTokens - prevTotal) / prevTotal) * 100 : null,
  }
}

// Period boundaries use the browser's local time zone — this data only ever
// describes the one machine it was read from, so there's no cross-timezone
// aggregation to normalize against (unlike the Postgres-backed tokenview API).
export function computeSummary(events: UsageEvent[], now: Date = new Date()): Summary {
  const today = startOfDay(now)
  const yesterday = addDays(today, -1)
  const tomorrow = addDays(today, 1)

  const thisWeekStart = addDays(today, -today.getDay())
  const lastWeekStart = addDays(thisWeekStart, -7)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  return {
    today: toPeriodSummary(sumRange(events, today, tomorrow), sumRange(events, yesterday, today)),
    week: toPeriodSummary(sumRange(events, thisWeekStart, tomorrow), sumRange(events, lastWeekStart, thisWeekStart)),
    month: toPeriodSummary(sumRange(events, thisMonthStart, tomorrow), sumRange(events, lastMonthStart, thisMonthStart)),
  }
}

export function computeTimeseries(events: UsageEvent[], from: Date, to: Date): TimeseriesPoint[] {
  const byDay = new Map<string, PeriodTotals>()
  for (const e of events) {
    if (e.occurredAt < from || e.occurredAt >= to) continue
    const key = dateKey(startOfDay(e.occurredAt))
    const totals = byDay.get(key) ?? emptyTotals()
    addInto(totals, e)
    byDay.set(key, totals)
  }

  const points: TimeseriesPoint[] = []
  for (let d = startOfDay(from); d < to; d = addDays(d, 1)) {
    const key = dateKey(d)
    const totals = byDay.get(key) ?? emptyTotals()
    points.push({ date: key, totalTokens: totalOf(totals), ...totals })
  }
  return points
}

// Buckets every event by (day of week, hour of day) regardless of date, so
// the result shows *when* the user tends to work rather than a sparse
// per-calendar-day view — more informative while history is still short.
export function computeHourlyHeatmap(events: UsageEvent[], from: Date, to: Date): HourlyBucket[] {
  const totals = new Map<string, number>()
  for (const e of events) {
    if (e.occurredAt < from || e.occurredAt >= to) continue
    const total = e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
    const key = `${e.occurredAt.getDay()}-${e.occurredAt.getHours()}`
    totals.set(key, (totals.get(key) ?? 0) + total)
  }

  const buckets: HourlyBucket[] = []
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = 0; hour < 24; hour++) {
      buckets.push({ dayOfWeek, hour, totalTokens: totals.get(`${dayOfWeek}-${hour}`) ?? 0 })
    }
  }
  return buckets
}

export function computeModelBreakdown(events: UsageEvent[], from: Date, to: Date): ModelBreakdownItem[] {
  const byModel = new Map<string, number>()
  for (const e of events) {
    if (e.occurredAt < from || e.occurredAt >= to) continue
    const total = e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
    byModel.set(e.model, (byModel.get(e.model) ?? 0) + total)
  }

  return [...byModel.entries()]
    .map(([model, totalTokens]) => ({ model, totalTokens }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
}

export function computeProjectBreakdown(
  events: UsageEvent[],
  from: Date,
  to: Date,
  limit: number
): ProjectBreakdownItem[] {
  const byProject = new Map<string, number>()
  for (const e of events) {
    if (e.occurredAt < from || e.occurredAt >= to) continue
    const total = e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens
    byProject.set(e.projectPath, (byProject.get(e.projectPath) ?? 0) + total)
  }

  return [...byProject.entries()]
    .map(([projectPath, totalTokens]) => ({
      projectPath,
      projectName: projectPath.split('/').filter(Boolean).pop() ?? projectPath,
      totalTokens,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, limit)
}

export function computeCacheEfficiency(events: UsageEvent[], from: Date, to: Date): CacheEfficiency {
  const totals = sumRange(events, from, to)
  const totalTokens = totalOf(totals)
  return {
    cacheReadTokens: totals.cacheReadTokens,
    totalTokens,
    ratio: totalTokens > 0 ? totals.cacheReadTokens / totalTokens : 0,
  }
}
