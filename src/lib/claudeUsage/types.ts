export interface UsageEvent {
  messageUuid: string
  sessionId: string
  projectPath: string
  model: string
  occurredAt: Date
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  sourceFile: string
}

export interface PeriodTotals {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

export interface PeriodSummary extends PeriodTotals {
  totalTokens: number
  changePct: number | null
}

export interface Summary {
  today: PeriodSummary
  week: PeriodSummary
  month: PeriodSummary
}

export interface TimeseriesPoint extends PeriodTotals {
  date: string
  totalTokens: number
}

export interface HeatmapDay {
  date: string
  totalTokens: number
}

export interface HourlyBucket {
  dayOfWeek: number // 0-6, Sunday = 0
  hour: number // 0-23
  totalTokens: number
}

export interface ModelBreakdownItem {
  model: string
  totalTokens: number
}

export interface ProjectBreakdownItem {
  projectPath: string
  projectName: string
  totalTokens: number
}

export interface CacheEfficiency {
  cacheReadTokens: number
  totalTokens: number
  ratio: number
}
