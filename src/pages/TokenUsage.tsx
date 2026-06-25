import { AnimatePresence, motion } from 'framer-motion'
import { FolderOpen, Gauge, RefreshCw, Unlink } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  computeCacheEfficiency,
  computeHourlyHeatmap,
  computeModelBreakdown,
  computeProjectBreakdown,
  computeSummary,
  computeTimeseries,
} from '@/lib/claudeUsage/aggregate'
import { formatTokens, prettifyModelName } from '@/lib/claudeUsage/format'
import type {
  PeriodSummary,
  TimeseriesPoint,
  HourlyBucket,
  ModelBreakdownItem,
  ProjectBreakdownItem,
  CacheEfficiency,
} from '@/lib/claudeUsage/types'
import { useClaudeUsage } from '@/lib/claudeUsage/useClaudeUsage'

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-5">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-(--muted-foreground) shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-(--border)" />
    </div>
  )
}

function ConnectPrompt({
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  busy,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  busy?: boolean
}) {
  return (
    <motion.div
      className="flex flex-col items-center text-center gap-3 py-16 px-6 rounded-3xl border border-(--border) bg-(--card)"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'oklch(0.62 0.13 42 / 0.15)' }}>
        <FolderOpen size={20} style={{ color: 'oklch(0.62 0.13 42)' }} />
      </div>
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <p className="text-sm text-(--muted-foreground) max-w-sm leading-relaxed">{body}</p>
      {actionLabel && onAction && (
        <Button className="mt-2 gap-1.5 rounded-xl" onClick={onAction} disabled={busy}>
          <FolderOpen size={14} />
          {actionLabel}
        </Button>
      )}
      {secondaryLabel && onSecondary && (
        <button
          className="text-xs font-semibold text-(--muted-foreground) hover:text-(--foreground) underline-offset-2 hover:underline"
          onClick={onSecondary}
        >
          {secondaryLabel}
        </button>
      )}
    </motion.div>
  )
}

function FolderPickerGuideModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm p-6 rounded-3xl border border-(--border) bg-(--card) shadow-2xl"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--accent) mb-2">ก่อนเลือกโฟลเดอร์</p>
            <h2 className="text-lg font-black tracking-tight leading-snug">โฟลเดอร์ .claude ถูกซ่อนอยู่</h2>
            <p className="text-sm text-(--muted-foreground) mt-2 leading-relaxed">
              macOS ซ่อนโฟลเดอร์ที่ขึ้นต้นด้วยจุด ในหน้าต่างเลือกไฟล์ตามปกติ ใช้วิธีใดวิธีหนึ่งด้านล่างเพื่อหาโฟลเดอร์ให้เจอ
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-(--muted)">
                <kbd className="shrink-0 px-1.5 py-0.5 rounded-md bg-(--card) border border-(--border) text-[11px] font-bold">
                  ⌘⇧.
                </kbd>
                <p className="text-xs text-(--muted-foreground) leading-relaxed">
                  กดในหน้าต่างเลือกโฟลเดอร์ที่กำลังจะเปิด เพื่อแสดงโฟลเดอร์ที่ซ่อนอยู่ (รวม{' '}
                  <span className="font-semibold text-(--foreground)">.claude</span>)
                </p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-(--muted)">
                <kbd className="shrink-0 px-1.5 py-0.5 rounded-md bg-(--card) border border-(--border) text-[11px] font-bold">
                  ⌘⇧G
                </kbd>
                <p className="text-xs text-(--muted-foreground) leading-relaxed">
                  หรือพิมพ์ path ตรงๆ:{' '}
                  <span className="font-mono font-semibold text-(--foreground)">~/.claude/projects</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1 rounded-xl" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button className="flex-1 gap-1.5 rounded-xl" onClick={onConfirm}>
                <FolderOpen size={14} />
                เปิดตัวเลือกโฟลเดอร์
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const up = pct >= 0
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={
        up
          ? { background: 'oklch(0.86 0.12 145 / 0.3)', color: 'oklch(0.42 0.13 145)' }
          : { background: 'oklch(0.577 0.245 27.325 / 0.12)', color: 'oklch(0.50 0.20 27)' }
      }
    >
      {up ? '+' : ''}
      {pct.toFixed(0)}%
    </span>
  )
}

function StatCard({ label, period, delay }: { label: string; period: PeriodSummary; delay: number }) {
  return (
    <motion.div
      className="flex-1 rounded-2xl border border-(--border) bg-(--card) p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-(--muted-foreground)">{label}</span>
        <ChangeBadge pct={period.changePct} />
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight">{formatTokens(period.totalTokens)}</div>
      <div className="mt-1 text-xs text-(--muted-foreground)">
        {formatTokens(period.inputTokens)} in &middot; {formatTokens(period.outputTokens)} out
      </div>
    </motion.div>
  )
}

function TrendChart({ points }: { points: TimeseriesPoint[] }) {
  const width = 600
  const height = 160
  const max = Math.max(1, ...points.map((p) => p.totalTokens))

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * width : 0
    const y = height - (p.totalTokens / max) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <div className="rounded-2xl border border-(--border) bg-(--card) p-5">
      <span className="text-sm font-black">การใช้ token (14 วันล่าสุด)</span>
      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
          <polyline
            points={coords.join(' ')}
            fill="none"
            stroke="oklch(0.62 0.13 42)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-2 flex justify-between text-[10px] text-(--muted-foreground)">
          <span>{points[0]?.date}</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  )
}

function colorForRatio(ratio: number): string {
  if (ratio <= 0) return 'oklch(0.935 0.016 78)'
  if (ratio < 0.25) return 'oklch(0.86 0.09 50)'
  if (ratio < 0.5) return 'oklch(0.76 0.11 48)'
  if (ratio < 0.75) return 'oklch(0.68 0.13 45)'
  return 'oklch(0.56 0.16 40)'
}

const DOW_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function HourlyHeatmap({ buckets }: { buckets: HourlyBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.totalTokens))
  const rows = DOW_LABELS.map((_, dow) => buckets.filter((b) => b.dayOfWeek === dow).sort((a, b) => a.hour - b.hour))

  return (
    <div className="rounded-2xl border border-(--border) bg-(--card) p-5">
      <span className="text-sm font-black">ช่วงเวลาที่ใช้งานบ่อย</span>
      <div className="mt-4 overflow-x-auto">
        <div className="inline-flex flex-col gap-[3px] min-w-[640px]">
          {rows.map((row, dow) => (
            <div key={dow} className="flex items-center gap-[3px]">
              <span className="w-5 shrink-0 text-[10px] text-(--muted-foreground) text-right pr-1">
                {DOW_LABELS[dow]}
              </span>
              {row.map((cell) => (
                <div
                  key={cell.hour}
                  title={`${DOW_LABELS[dow]} ${cell.hour}:00 — ${cell.totalTokens.toLocaleString()} tokens`}
                  className="h-[11px] flex-1 rounded-[2px]"
                  style={{ background: colorForRatio(cell.totalTokens / max) }}
                />
              ))}
            </div>
          ))}
          <div className="flex items-center gap-[3px] mt-1">
            <span className="w-5 shrink-0" />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="flex-1 text-center text-[8px] text-(--muted-foreground)">
                {h % 6 === 0 ? h : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const MODEL_COLORS = ['oklch(0.62 0.13 42)', 'oklch(0.52 0.12 270)', 'oklch(0.62 0.12 165)', 'oklch(0.60 0.16 25)']

function ModelBreakdown({ items }: { items: ModelBreakdownItem[] }) {
  const total = items.reduce((sum, i) => sum + i.totalTokens, 0)

  return (
    <div className="rounded-2xl border border-(--border) bg-(--card) p-5">
      <span className="text-sm font-black">สัดส่วนตาม model</span>

      {items.length === 0 ? (
        <div className="mt-4 text-sm text-(--muted-foreground)">ยังไม่มีข้อมูล</div>
      ) : (
        <>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-(--muted)">
            {items.map((item, i) => (
              <div
                key={item.model}
                style={{
                  width: `${(item.totalTokens / total) * 100}%`,
                  background: MODEL_COLORS[i % MODEL_COLORS.length],
                }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {items.map((item, i) => (
              <div key={item.model} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] }}
                  />
                  <span className="font-semibold">{prettifyModelName(item.model)}</span>
                </div>
                <div className="text-(--muted-foreground)">
                  {formatTokens(item.totalTokens)} &middot; {((item.totalTokens / total) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProjectList({ projects }: { projects: ProjectBreakdownItem[] }) {
  const max = Math.max(1, ...projects.map((p) => p.totalTokens))
  return (
    <div className="rounded-2xl border border-(--border) bg-(--card) p-5">
      <span className="text-sm font-black">โปรเจกต์ที่ใช้มากสุด (30 วัน)</span>
      <div className="mt-4 space-y-3">
        {projects.length === 0 && <div className="text-sm text-(--muted-foreground)">ยังไม่มีข้อมูล</div>}
        {projects.map((p) => (
          <div key={p.projectPath}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="truncate font-medium" title={p.projectPath}>
                {p.projectName}
              </span>
              <span className="ml-2 shrink-0 text-(--muted-foreground)">{formatTokens(p.totalTokens)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-(--muted)">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${(p.totalTokens / max) * 100}%`, background: 'oklch(0.62 0.13 42)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CacheRing({ efficiency }: { efficiency: CacheEfficiency }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - efficiency.ratio)

  return (
    <div className="rounded-2xl border border-(--border) bg-(--card) p-5">
      <span className="text-sm font-black">ประสิทธิภาพ cache (30 วัน)</span>
      <div className="mt-4 flex items-center gap-5">
        <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="oklch(0.935 0.016 78)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="oklch(0.62 0.13 42)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--foreground)">
            {Math.round(efficiency.ratio * 100)}%
          </text>
        </svg>
        <div className="text-xs text-(--muted-foreground)">
          <div>{efficiency.cacheReadTokens.toLocaleString()} token จาก cache</div>
          <div className="mt-1">{efficiency.totalTokens.toLocaleString()} token ทั้งหมด</div>
        </div>
      </div>
    </div>
  )
}

export function TokenUsagePage() {
  const { status, events, error, connect, reconnect, refresh, disconnect } = useClaudeUsage()
  const [showGuide, setShowGuide] = useState(false)

  const now = useMemo(() => new Date(), [])
  const last14Start = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - 13)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [now])
  const tomorrow = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [now])
  const last30Start = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [now])
  const allTimeStart = useMemo(() => new Date(0), [])

  const summary = useMemo(() => computeSummary(events, now), [events, now])
  const timeseries = useMemo(() => computeTimeseries(events, last14Start, tomorrow), [events, last14Start, tomorrow])
  const hourlyHeatmap = useMemo(
    () => computeHourlyHeatmap(events, allTimeStart, tomorrow),
    [events, allTimeStart, tomorrow]
  )
  const modelBreakdown = useMemo(
    () => computeModelBreakdown(events, last30Start, tomorrow),
    [events, last30Start, tomorrow]
  )
  const projects = useMemo(() => computeProjectBreakdown(events, last30Start, tomorrow, 8), [events, last30Start, tomorrow])
  const cacheEfficiency = useMemo(() => computeCacheEfficiency(events, last30Start, tomorrow), [events, last30Start, tomorrow])

  return (
    <div>
      <motion.div
        className="flex items-start justify-between mb-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <Gauge size={26} style={{ color: 'oklch(0.62 0.13 42)' }} />
            <h1 className="text-3xl font-black tracking-tight leading-none">Token Usage</h1>
          </div>
        </div>

        {status === 'ready' && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl" onClick={refresh}>
              <RefreshCw size={14} />
              รีเฟรช
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-(--muted-foreground)" onClick={disconnect}>
              <Unlink size={14} />
              ยกเลิกการเชื่อมต่อ
            </Button>
          </div>
        )}
      </motion.div>

      {status === 'unsupported' && (
        <ConnectPrompt
          title="เบราว์เซอร์นี้ไม่รองรับ"
          body="ฟีเจอร์นี้ใช้ File System Access API ซึ่งรองรับเฉพาะ Chrome, Edge หรือ Opera เท่านั้น (Safari และ Firefox ยังไม่รองรับ)"
        />
      )}

      {(status === 'checking' || status === 'loading') && (
        <div className="space-y-6">
          <div className="flex gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 flex-1 animate-pulse rounded-2xl bg-(--muted)" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-2xl bg-(--muted)" />
        </div>
      )}

      {status === 'disconnected' && (
        <ConnectPrompt
          title="เชื่อมต่อกับ Claude Code usage ของคุณ"
          body="เลือกโฟลเดอร์ ~/.claude/projects"
          actionLabel="เลือกโฟลเดอร์"
          onAction={() => setShowGuide(true)}
        />
      )}

      {status === 'needs-permission' && (
        <ConnectPrompt
          title="ขออนุญาตอ่านโฟลเดอร์อีกครั้ง"
          body="เคยเลือกโฟลเดอร์ไว้แล้ว แต่เบราว์เซอร์ต้องการให้ยืนยันสิทธิ์อีกครั้งในเซสชันนี้"
          actionLabel="อนุญาต"
          onAction={reconnect}
          secondaryLabel="หรือเลือกโฟลเดอร์อื่น"
          onSecondary={disconnect}
        />
      )}

      {status === 'error' && (
        <ConnectPrompt
          title="มีบางอย่างผิดพลาด"
          body={error ?? 'ไม่สามารถอ่านข้อมูลได้'}
          actionLabel="เลือกโฟลเดอร์ใหม่"
          onAction={() => setShowGuide(true)}
        />
      )}

      <FolderPickerGuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        onConfirm={() => {
          setShowGuide(false)
          connect()
        }}
      />

      {status === 'ready' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <StatCard label="วันนี้" period={summary.today} delay={0} />
            <StatCard label="สัปดาห์นี้" period={summary.week} delay={0.05} />
            <StatCard label="เดือนนี้" period={summary.month} delay={0.1} />
          </div>

          <TrendChart points={timeseries} />
          <HourlyHeatmap buckets={hourlyHeatmap} />
          <ModelBreakdown items={modelBreakdown} />

          <SectionLabel label="รายละเอียด" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ProjectList projects={projects} />
            <CacheRing efficiency={cacheEfficiency} />
          </div>
        </div>
      )}
    </div>
  )
}
