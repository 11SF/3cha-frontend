import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SkipForward, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { queueApi } from '@/api/queue'
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
    weekday: 'long', month: 'long', day: 'numeric',
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

export function TodayBoardPage() {
  const qc = useQueryClient()
  const now = useLiveClock()

  const todayQ = useQuery({ queryKey: ['queue', 'today'], queryFn: queueApi.getToday, retry: false })
  const membersQ = useQuery({ queryKey: ['members'], queryFn: memberApi.list })
  const holidaysQ = useQuery({ queryKey: ['holidays'], queryFn: holidayApi.list })

  const skip = useMutation({
    mutationFn: queueApi.skip,
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

  const currentIdx = entry ? activeMembers.findIndex(m => m.id === entry.memberId) + 1 : 0
  const memberCount = activeMembers.length

  const timeLabel = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateLabel = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const isHoliday = todayQ.isSuccess && todayQ.data === null

  return (
    <div className="h-screen flex flex-col bg-(--background) overflow-hidden select-none">

      {/* Top bar */}
      <div className="flex items-center justify-between px-10 pt-6 pb-0 shrink-0 z-10">
        <Link to="/queue" className="flex items-center gap-1.5 text-xs font-semibold text-(--muted-foreground) hover:text-(--foreground) transition-colors">
          <ArrowLeft size={13} />
          กลับ
        </Link>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted-foreground)">{dateLabel}</p>
          <p className="text-3xl font-mono font-black tabular-nums leading-tight text-(--primary)">{timeLabel}</p>
        </div>
      </div>

      {/* Main hero */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-8">

        {/* Blobs */}
        <div className="absolute -top-52 -right-52 w-[44rem] h-[44rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.94 0.055 72 / 0.45), transparent 65%)' }} />
        <div className="absolute -bottom-36 -left-36 w-[36rem] h-[36rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, oklch(0.88 0.1 48 / 0.25), transparent 65%)' }} />

        {/* Watermark */}
        <div className="absolute bottom-0 left-0 overflow-hidden leading-none pointer-events-none">
          <span className="block font-black uppercase leading-none"
            style={{ fontSize: 'clamp(7rem, 22vw, 20rem)', color: 'oklch(0.2 0.025 55 / 0.04)' }}>
            {isHoliday ? 'REST' : 'TODAY'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {todayQ.isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-8 h-8 rounded-full border-2 border-(--accent) border-t-transparent animate-spin" />
            </motion.div>
          )}

          {isHoliday && (
            <motion.div
              key="holiday"
              className="relative z-10 text-center space-y-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <p className="text-8xl">🎉</p>
              <p className="font-black tracking-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
                วันนี้ไม่มี daily
              </p>
              <p className="text-lg text-(--muted-foreground)">วันหยุดหรือสุดสัปดาห์</p>
            </motion.div>
          )}

          {entry && (
            <motion.div
              key={entry.id}
              className="relative z-10 flex flex-col items-center text-center gap-6"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              {/* Avatar */}
              <div className="relative shrink-0" style={{ width: 'clamp(7rem, 14vmin, 11rem)', height: 'clamp(7rem, 14vmin, 11rem)' }}>
                {isPending && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: `3px solid ${entry.avatarColor}` }}
                      animate={{ scale: [1, 1.9, 1.9], opacity: [0.5, 0, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: `3px solid ${entry.avatarColor}` }}
                      animate={{ scale: [1, 1.9, 1.9], opacity: [0.5, 0, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
                    />
                  </>
                )}
                <div
                  className="w-full h-full rounded-full flex items-center justify-center font-black text-white"
                  style={{
                    backgroundColor: entry.avatarColor,
                    fontSize: 'clamp(2rem, 5vmin, 3.5rem)',
                  }}
                >
                  {entry.memberName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              </div>

              {/* Section label */}
              <div className="flex items-center gap-3 w-full max-w-md">
                <div className="flex-1 h-px bg-(--accent)/30" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-(--accent)">Daily Host</span>
                <div className="flex-1 h-px bg-(--accent)/30" />
              </div>

              {/* Name */}
              <motion.h1
                className="font-black leading-[1] tracking-tight"
                style={{ fontSize: 'clamp(3rem, 9vw, 8rem)', wordBreak: 'break-word', maxWidth: '90vw' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              >
                {entry.memberName}
              </motion.h1>

              {/* Date + position */}
              <div className="flex items-center gap-4 text-(--muted-foreground)">
                <span className="text-base font-medium">{formatDate(entry.queueDate)}</span>
                {memberCount > 0 && currentIdx > 0 && (
                  <>
                    <span className="opacity-30 select-none">·</span>
                    <span className="text-sm font-semibold">คิวที่ {currentIdx} / {memberCount}</span>
                  </>
                )}
              </div>

              {/* Status + skip */}
              <div className="flex items-center gap-3">
                {entry.status === 'done' && <Badge variant="success">Done</Badge>}
                {entry.status === 'skipped' && <Badge variant="warning">Skipped</Badge>}
                {isPending && (
                  <>
                    <Badge variant="secondary">Pending</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => skip.mutate(entry.id)}
                      disabled={skip.isPending}
                      className="gap-1.5 text-xs border-(--accent)/40 text-(--accent) hover:bg-(--accent)/10 hover:border-(--accent)"
                    >
                      <SkipForward size={13} />
                      ข้าม
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar: next person */}
      <div className={cn(
        'shrink-0 border-t border-(--border)/60 px-10 py-4 flex items-center gap-3',
        !nextDayMember && 'opacity-0 pointer-events-none'
      )}>
        {nextDayMember && (
          <motion.div
            className="flex items-center gap-3 w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-(--muted-foreground)">ถัดไป</span>
            <div className="w-px h-4 bg-(--border)" />
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: nextDayMember.avatarColor }}
            >
              {nextDayMember.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span className="font-semibold text-sm">{nextDayMember.name}</span>
            <span className="text-(--muted-foreground) text-sm select-none">·</span>
            <span className="text-sm text-(--muted-foreground)">{nextDayLabel}</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
