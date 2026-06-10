import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SkipForward, RefreshCw, Monitor, CalendarClock, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { queueApi, type QueueEntry } from '@/api/queue'
import { memberApi, type Member } from '@/api/member'
import { holidayApi } from '@/api/holiday'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-base'
  return (
    <div className={cn('relative flex-shrink-0', sizeClass)}>
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${color}` }}
          animate={{ scale: [1, 1.8, 1.8], opacity: [0.7, 0, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
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

const historyVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
}

const historyItemVariant = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

function HistoryItem({ entry }: { entry: QueueEntry }) {
  return (
    <motion.div
      variants={historyItemVariant}
      className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0"
    >
      <AvatarCircle name={entry.memberName} color={entry.avatarColor} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.memberName}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(entry.queueDate)}</p>
      </div>
      <StatusBadge status={entry.status} />
    </motion.div>
  )
}

export function QueueBoardPage() {
  const qc = useQueryClient()

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
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

  if (todayQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    )
  }

  if (todayQ.isError) {
    const msg = (todayQ.error as any)?.response?.data?.message ?? 'ไม่สามารถโหลดข้อมูลได้'
    return (
      <div className="text-center py-24 space-y-2">
        <p className="text-[var(--muted-foreground)]">{msg}</p>
        <Button variant="outline" className="mt-4" onClick={() => todayQ.refetch()}>
          ลองใหม่
        </Button>
      </div>
    )
  }

  if (todayQ.isSuccess && todayQ.data === null) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold mt-0.5">Daily Queue Board</h1>
        </div>
        <div className="text-center py-16 space-y-2">
          <p className="text-5xl">🎉</p>
          <p className="font-semibold text-lg">วันนี้ไม่มี daily meeting</p>
          <p className="text-sm text-[var(--muted-foreground)]">วันหยุดหรือสุดสัปดาห์</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold mt-0.5">Daily Queue Board</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
          className="gap-1.5 text-[var(--destructive)] border-[var(--destructive)] hover:bg-[var(--destructive)] hover:text-white"
        >
          <RotateCcw size={14} />
          Reset Queue
        </Button>
      </div>

      {/* Today card */}
      {entry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        >
          <Card className={cn('transition-all', !isPending && 'opacity-75')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-[var(--muted-foreground)] flex items-center gap-2">
                  <Monitor size={16} />
                  วันนี้
                </CardTitle>
                <StatusBadge status={entry.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <AvatarCircle name={entry.memberName} color={entry.avatarColor} size="lg" pulse={isPending} />
                <div>
                  <p className="text-3xl font-bold">{entry.memberName}</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{formatDate(entry.queueDate)}</p>
                </div>
              </div>

              {isPending && (
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => skip.mutate(entry.id)}
                    disabled={skip.isPending}
                  >
                    <SkipForward size={16} />
                    ข้าม
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next working day preview */}
      {nextDayMember && nextDayLabel && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
        >
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="text-[var(--muted-foreground)]">
                  <CalendarClock size={18} />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <AvatarCircle name={nextDayMember.name} color={nextDayMember.avatarColor} size="sm" />
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">{nextDayLabel}</p>
                    <p className="font-semibold leading-tight">{nextDayMember.name}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">ถัดไป</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* History */}
      {historyItems.length > 0 && (
        <div>
          <motion.h2
            className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            ประวัติย้อนหลัง
          </motion.h2>
          <Card>
            <CardContent className="pt-4 pb-2">
              <motion.div variants={historyVariants} initial="hidden" animate="show">
                {historyItems.slice(0, 10).map(e => (
                  <HistoryItem key={e.id} entry={e} />
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
