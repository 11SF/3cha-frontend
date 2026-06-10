import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SkipForward, RefreshCw, RotateCcw, ChevronRight, Monitor, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { queueApi, type QueueEntry } from '@/api/queue'
import { memberApi, type Member } from '@/api/member'
import { holidayApi } from '@/api/holiday'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function nextMember(members: Member[], currentMemberId: string): Member | undefined {
  if (!members.length) return undefined
  const idx = members.findIndex(m => m.id === currentMemberId)
  return members[(idx + 1) % members.length]
}

function nextWorkingDay(from: Date, holidaySet: Set<string>): Date | null {
  const d = new Date(from)
  for (let i = 0; i < 60; i++) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    const str = d.toISOString().split('T')[0]
    if (wd !== 0 && wd !== 6 && !holidaySet.has(str)) return new Date(d)
  }
  return null
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function StatusBadge({ status }: { status: QueueEntry['status'] }) {
  if (status === 'done') return <Badge variant="success">Done</Badge>
  if (status === 'skipped') return <Badge variant="warning">Skipped</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

function AvatarCircle({
  name,
  color,
  size = 'md',
  pulse = false,
}: {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  pulse?: boolean
}) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const sizeClass =
    size === '2xl' ? 'w-36 h-36 text-5xl' :
    size === 'xl'  ? 'w-24 h-24 text-3xl' :
    size === 'lg'  ? 'w-20 h-20 text-2xl' :
    size === 'sm'  ? 'w-8 h-8 text-xs' :
    'w-12 h-12 text-base'

  return (
    <div className={cn('relative flex-shrink-0', sizeClass)}>
      {pulse && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${color}` }}
            animate={{ scale: [1, 1.9, 1.9], opacity: [0.55, 0, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${color}` }}
            animate={{ scale: [1, 1.9, 1.9], opacity: [0.55, 0, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
          />
        </>
      )}
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
    </div>
  )
}

function SectionDivider({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-5">
      <span className={cn(
        'text-[10px] font-black uppercase tracking-[0.22em] flex-shrink-0',
        accent ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]'
      )}>
        {label}
      </span>
      <div className={cn('flex-1 h-px', accent ? 'bg-[var(--accent)]/25' : 'bg-[var(--border)]')} />
    </div>
  )
}

const historyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
}

const historyItemVariant = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
}

function HistoryItem({ entry, index }: { entry: QueueEntry; index: number }) {
  return (
    <motion.div
      variants={historyItemVariant}
      className="flex items-center gap-4 py-3 border-b border-[var(--border)]/50 last:border-0"
    >
      <span className="text-[11px] font-mono tabular-nums text-[var(--muted-foreground)]/40 w-5 flex-shrink-0 select-none">
        {String(index).padStart(2, '0')}
      </span>
      <AvatarCircle name={entry.memberName} color={entry.avatarColor} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.memberName}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(entry.queueDate)}</p>
      </div>
      <StatusBadge status={entry.status} />
    </motion.div>
  )
}

export function QueueBoardPage() {
  const qc = useQueryClient()
  const now = useLiveClock()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const todayQ = useQuery({
    queryKey: ['queue', 'today'],
    queryFn: queueApi.getToday,
    retry: false,
  })

  const historyQ = useQuery({
    queryKey: ['queue', 'list'],
    queryFn: queueApi.list,
  })

  const membersQ = useQuery({
    queryKey: ['members'],
    queryFn: memberApi.list,
  })

  const holidaysQ = useQuery({
    queryKey: ['holidays'],
    queryFn: holidayApi.list,
  })

  const skip = useMutation({
    mutationFn: queueApi.skip,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })

  const reset = useMutation({
    mutationFn: queueApi.reset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] })
      setShowResetConfirm(false)
    },
  })

  const entry = todayQ.data
  const isPending = entry?.status === 'pending'

  const holidaySet = new Set((holidaysQ.data ?? []).map(h => h.holidayDate))
  const nextDay = nextWorkingDay(new Date(), holidaySet)
  const activeMembers = (membersQ.data ?? []).filter(m => m.isActive)
  const nextDayMember = (entry && nextDay) ? nextMember(activeMembers, entry.memberId) : undefined
  const nextDayLabel = nextDay
    ? nextDay.toLocaleDateString('th-TH', { weekday: 'long', month: 'short', day: 'numeric' })
    : null

  const todayStr = new Date().toISOString().split('T')[0]
  const historyItems = (historyQ.data ?? []).filter(e => e.queueDate !== todayStr)

  const currentIdx = entry ? activeMembers.findIndex(m => m.id === entry.memberId) + 1 : 0
  const memberCount = activeMembers.length

  const dateLabel = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (todayQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <RefreshCw size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    )
  }

  if (todayQ.isError) {
    const msg = (todayQ.error as any)?.response?.data?.message ?? 'ไม่สามารถโหลดข้อมูลได้'
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
        <p className="text-[var(--muted-foreground)]">{msg}</p>
        <Button variant="outline" onClick={() => todayQ.refetch()}>ลองใหม่</Button>
      </div>
    )
  }

  const RightPanel = (
    <div className="lg:flex-[2] border-t lg:border-t-0 lg:border-l border-[var(--border)]/60 bg-[var(--muted)]/20 flex flex-col lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
      {/* Right header */}
      <div className="px-8 pt-8 pb-0 flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Daily Queue</h1>
          {memberCount > 0 && currentIdx > 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
              คิวที่ {currentIdx} / {memberCount}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <a
            href="/today"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Monitor size={13} />
            Kiosk
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            className="gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] text-xs"
          >
            <RotateCcw size={13} />
            Reset
          </Button>
        </div>
      </div>

      {/* Confluence CTA */}
      {entry?.confluenceUrl && (
        <div className="px-8 pt-4 flex-shrink-0">
          <a
            href={entry.confluenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'oklch(0.62 0.13 42 / 0.12)',
              color: 'var(--accent)',
              border: '1.5px solid oklch(0.62 0.13 42 / 0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.62 0.13 42 / 0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'oklch(0.62 0.13 42 / 0.12)')}
          >
            <ExternalLink size={14} />
            Confluence Board
          </a>
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {nextDayMember && nextDayLabel ? (
          <>
            <SectionDivider label="ถัดไป" />
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.25 }}
            >
              <ChevronRight size={15} className="text-[var(--muted-foreground)] flex-shrink-0" />
              <AvatarCircle name={nextDayMember.name} color={nextDayMember.avatarColor} size="sm" />
              <span className="font-semibold text-sm">{nextDayMember.name}</span>
              <span className="text-[var(--muted-foreground)] text-sm select-none">·</span>
              <span className="text-sm text-[var(--muted-foreground)]">{nextDayLabel}</span>
            </motion.div>
          </>
        ) : (
          <div className="pt-5" />
        )}

        {historyItems.length > 0 && (
          <>
            <SectionDivider label="ประวัติย้อนหลัง" />
            <motion.div variants={historyVariants} initial="hidden" animate="show">
              {historyItems.slice(0, 20).map((e, i) => (
                <HistoryItem key={e.id} entry={e} index={i + 1} />
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  )

  if (todayQ.isSuccess && todayQ.data === null) {
    return (
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
        {/* Left: holiday message */}
        <div className="flex-1 lg:flex-[3] relative overflow-hidden flex flex-col items-center justify-center px-12 py-16 lg:py-0">
          <div className="absolute -top-40 -right-40 w-[32rem] h-[32rem] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, oklch(0.94 0.05 72 / 0.4), transparent 65%)' }} />
          <div className="absolute -bottom-28 -left-28 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, oklch(0.88 0.1 48 / 0.2), transparent 65%)' }} />
          <div className="relative z-10 text-center space-y-3">
            <span className="text-6xl block">🎉</span>
            <p className="font-black text-3xl tracking-tight">วันนี้ไม่มี daily</p>
            <p className="text-sm text-[var(--muted-foreground)]">วันหยุดหรือสุดสัปดาห์</p>
            <p className="text-2xl font-mono font-bold text-[var(--accent)] pt-4">{timeLabel}</p>
          </div>
        </div>
        {RightPanel}
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">

      {/* ── LEFT PANEL: Today's Host ── */}
      <div className="flex-1 lg:flex-[3] relative overflow-hidden flex flex-col px-10 lg:px-14 py-10">

        {/* Background decoration blobs */}
        <div className="absolute -top-48 -right-48 w-[36rem] h-[36rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.94 0.055 72 / 0.45), transparent 65%)' }} />
        <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.88 0.1 48 / 0.25), transparent 65%)' }} />

        {/* Watermark "TODAY" */}
        <div className="absolute bottom-0 left-0 overflow-hidden leading-none select-none pointer-events-none">
          <span
            className="block font-black uppercase leading-none"
            style={{ fontSize: 'clamp(6rem, 18vw, 16rem)', color: 'oklch(0.2 0.025 55 / 0.04)' }}
          >
            TODAY
          </span>
        </div>

        {/* Date + live clock */}
        <div className="relative z-10 flex items-baseline justify-between flex-shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {dateLabel}
          </p>
          <p className="text-sm font-mono font-bold tabular-nums text-[var(--muted-foreground)]/70">
            {timeLabel}
          </p>
        </div>

        {/* Section label */}
        <div className="relative z-10 flex items-center gap-3 mt-6 mb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">Daily Host</span>
          <div className="flex-1 h-px bg-[var(--accent)]/25" />
        </div>

        {/* Main hero content */}
        {entry && (
          <motion.div
            className="relative z-10 flex-1 flex flex-col justify-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: isPending ? 1 : 0.65, x: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
          >
            <div className="flex items-center gap-8 lg:gap-10">
              <AvatarCircle
                name={entry.memberName}
                color={entry.avatarColor}
                size="2xl"
                pulse={isPending}
              />
              <div className="min-w-0">
                <motion.h2
                  className="font-black leading-[1] tracking-tight"
                  style={{ fontSize: 'clamp(2.8rem, 6.5vw, 6rem)', wordBreak: 'break-word' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.35, ease: 'easeOut' }}
                >
                  {entry.memberName}
                </motion.h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-3 font-medium">
                  {formatDate(entry.queueDate)}
                </p>
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <StatusBadge status={entry.status} />
                  {isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => skip.mutate(entry.id)}
                      disabled={skip.isPending}
                      className="gap-1.5 text-xs border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]"
                    >
                      <SkipForward size={13} />
                      ข้าม
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      {RightPanel}

      {/* Reset confirm modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/25 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm bg-[var(--card)] rounded-2xl shadow-xl p-6 border border-[var(--border)]"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <h2 className="text-lg font-black tracking-tight">Reset Queue?</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1.5">
                ประวัติทั้งหมดจะถูกล้างและ queue จะเริ่มใหม่ตั้งแต่คนแรก
              </p>
              <div className="flex gap-2 mt-5 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={reset.isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  onClick={() => reset.mutate()}
                  disabled={reset.isPending}
                  className="bg-[var(--destructive)] text-white hover:opacity-90"
                >
                  <RotateCcw size={13} />
                  Reset เลย
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
