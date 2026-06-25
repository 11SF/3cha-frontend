export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

// "claude-sonnet-4-6" -> "sonnet-4-6"
export function prettifyModelName(model: string): string {
  return model.replace(/^claude-/, '')
}
