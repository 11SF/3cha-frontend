import type { UsageEvent } from './types'

const SYNTHETIC_MODEL = '<synthetic>'

interface TranscriptLine {
  uuid?: string
  type?: string
  timestamp?: string
  sessionId?: string
  cwd?: string
  message?: {
    model?: string
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
}

// Mirrors the filtering rules in backend/app/scanner/parser.go: only real
// assistant turns with token usage, skipping tool/user lines and synthetic
// internal messages.
export function parseTranscriptLine(raw: string, sourceFile: string): UsageEvent | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let line: TranscriptLine
  try {
    line = JSON.parse(trimmed)
  } catch {
    return null
  }

  if (line.type !== 'assistant' || !line.message?.usage) return null

  const model = line.message.model
  if (!model || model === SYNTHETIC_MODEL) return null
  if (!line.uuid || !line.sessionId || !line.timestamp) return null

  const occurredAt = new Date(line.timestamp)
  if (Number.isNaN(occurredAt.getTime())) return null

  const usage = line.message.usage
  return {
    messageUuid: line.uuid,
    sessionId: line.sessionId,
    projectPath: line.cwd ?? 'unknown',
    model,
    occurredAt,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    sourceFile,
  }
}

export function parseTranscriptContent(content: string, sourceFile: string): UsageEvent[] {
  const events: UsageEvent[] = []
  for (const line of content.split('\n')) {
    const event = parseTranscriptLine(line, sourceFile)
    if (event) events.push(event)
  }
  return events
}
