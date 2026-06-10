import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { holidayApi, type Holiday } from '@/api/holiday'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function toDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function normalizeDate(s: string) {
  return s.includes('T') ? s.split('T')[0] : s
}

// Urgency-aware badge colors: imminent = deep terracotta, far = soft warm peach
function urgencyStyle(daysUntil: number): { background: string; color: string } {
  if (daysUntil === 0)  return { background: 'oklch(0.62 0.13 42)',        color: 'white' }
  if (daysUntil <= 7)  return { background: 'oklch(0.62 0.13 42 / 0.22)', color: 'oklch(0.40 0.14 42)' }
  if (daysUntil <= 30) return { background: 'oklch(0.78 0.09 55 / 0.25)', color: 'oklch(0.46 0.12 50)' }
  return              { background: 'oklch(0.88 0.05 68 / 0.35)', color: 'oklch(0.52 0.06 62)' }
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-5">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted-foreground)] flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}

function ConfirmModal({
  open, onClose, title, body, confirmLabel, onConfirm, loading,
}: {
  open: boolean; onClose: () => void; title: string; body: string
  confirmLabel: string; onConfirm: () => void; loading: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm p-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)] mb-2">ยืนยันการลบ</p>
            <h2 className="text-xl font-black tracking-tight leading-snug">{title}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">{body}</p>
            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
                ยกเลิก
              </Button>
              <Button
                className="flex-1 gap-1.5 bg-[var(--destructive)] text-white hover:opacity-90"
                onClick={onConfirm}
                disabled={loading}
              >
                <Trash2 size={14} />
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function HolidaysPage() {
  const qc = useQueryClient()
  const today = new Date()

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [direction, setDirection] = useState<1 | -1>(1)

  const [addDate, setAddDate] = useState('')
  const [addName, setAddName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)

  const { data: holidays = [] } = useQuery({ queryKey: ['holidays'], queryFn: holidayApi.list })

  const create = useMutation({
    mutationFn: holidayApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] })
      setShowAdd(false); setAddDate(''); setAddName('')
    },
  })

  const remove = useMutation({
    mutationFn: holidayApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] })
      setDeleteTarget(null)
    },
  })

  const holidayMap = new Map(holidays.map(h => [normalizeDate(h.holidayDate), h]))

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const trailing = (firstDay + daysInMonth) % 7 === 0 ? 0 : 7 - ((firstDay + daysInMonth) % 7)

  const prevMonth = () => {
    setDirection(-1)
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    setDirection(1)
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('th-TH', { month: 'long' })
  const yearLabel = (viewYear + 543).toString()

  const handleDayClick = (day: number) => {
    const key = toDateKey(viewYear, viewMonth, day)
    const h = holidayMap.get(key)
    if (h) setDeleteTarget(h)
    else { setAddDate(key); setAddName(''); setShowAdd(true) }
  }

  const upcoming = holidays
    .filter(h => normalizeDate(h.holidayDate) >= todayKey)
    .sort((a, b) => normalizeDate(a.holidayDate).localeCompare(normalizeDate(b.holidayDate)))

  return (
    <div>

      {/* ── Header ── */}
      <motion.div
        className="flex items-start justify-between mb-8"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <div className="flex items-baseline gap-3">
            {/* Month name with warm gradient underline */}
            <div className="relative inline-block">
              <h1 className="text-4xl font-black tracking-tight leading-none">{monthName}</h1>
              <div
                className="absolute -bottom-1.5 left-0 h-[3px] rounded-full"
                style={{
                  width: '60%',
                  background: 'linear-gradient(90deg, oklch(0.62 0.13 42 / 0.7), oklch(0.62 0.13 42 / 0))',
                }}
              />
            </div>
            <span className="text-2xl font-semibold text-[var(--muted-foreground)]">{yearLabel}</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-3 font-medium">
            กดวันที่เพื่อเพิ่มวันหยุด · กดวันหยุดเพื่อลบ
          </p>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <button onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ChevronRight size={18} />
          </button>
          <div className="w-px h-5 bg-[var(--border)] mx-1" />
          <Button size="sm" className="gap-1.5 rounded-xl"
            onClick={() => { setAddDate(''); setAddName(''); setShowAdd(true) }}>
            <Plus size={14} />
            เพิ่ม
          </Button>
        </div>
      </motion.div>

      {/* ── Calendar wrapper ── */}
      <div className="relative">

        {/* ── Day header row ── */}
        <div
          className="grid grid-cols-7 mb-1.5 rounded-2xl overflow-hidden"
          style={{ background: 'var(--muted)' }}
        >
          {DAY_LABELS.map((d, i) => {
            const isWeekendCol = i === 0 || i === 6
            return (
              <div
                key={d}
                className="text-center text-[10px] font-black uppercase tracking-[0.15em] py-2.5"
                style={{ color: isWeekendCol ? 'oklch(0.50 0.14 36)' : 'var(--muted-foreground)' }}
              >
                {d}
              </div>
            )
          })}
        </div>

        {/* ── Calendar grid ── */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${viewYear}-${viewMonth}`}
              className="grid grid-cols-7 gap-1"
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -32 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`pre-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const key = toDateKey(viewYear, viewMonth, day)
                const holiday = holidayMap.get(key)
                const isToday = key === todayKey
                const col = (firstDay + i) % 7
                const isWeekend = col === 0 || col === 6
                const isPast = key < todayKey

                // Compute background style — inline avoids Tailwind arbitrary-value conflicts
                const bgStyle: React.CSSProperties = holiday
                  ? { background: 'linear-gradient(160deg, oklch(0.62 0.13 42 / 0.26), oklch(0.74 0.10 54 / 0.14))' }
                  : isWeekend
                    ? { backgroundColor: 'oklch(0.62 0.09 50 / 0.058)' }
                    : {}

                return (
                  <motion.button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={cn(
                      'aspect-square rounded-2xl flex flex-col items-center justify-start pt-2 pb-1 px-1 gap-0.5 relative overflow-hidden cursor-pointer',
                      !holiday && !isWeekend && 'hover:bg-[var(--muted)]/70',
                      isPast && !holiday && 'opacity-40',
                    )}
                    style={bgStyle}
                  >
                    {/* Holiday accent strip — gradient, 3px */}
                    {holiday && (
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                        style={{ background: 'linear-gradient(90deg, oklch(0.56 0.16 36), oklch(0.70 0.12 52))' }}
                      />
                    )}

                    {/* Today — animated glow ring */}
                    {isToday && (
                      <motion.div
                        className="absolute inset-1 rounded-xl pointer-events-none"
                        animate={{
                          boxShadow: [
                            '0 0 0 2px oklch(0.38 0.08 52 / 0.4)',
                            '0 0 0 4px oklch(0.38 0.08 52 / 0.1)',
                            '0 0 0 2px oklch(0.38 0.08 52 / 0.4)',
                          ],
                        }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}

                    {/* Day number */}
                    <span className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-full text-xs font-black leading-none flex-shrink-0 relative z-10',
                      isToday && 'bg-[var(--primary)] text-[var(--primary-foreground)]',
                      holiday && !isToday && 'text-[oklch(0.40_0.14_40)]',
                      isWeekend && !holiday && !isToday && 'text-[oklch(0.50_0.14_36)]',
                      !holiday && !isToday && !isWeekend && 'text-[var(--foreground)]',
                    )}>
                      {day}
                    </span>

                    {holiday && (
                      <span
                        className="text-[7.5px] leading-tight font-bold text-center w-full px-0.5 line-clamp-2 relative z-10"
                        style={{ color: 'oklch(0.40 0.14 40)' }}
                      >
                        {holiday.name}
                      </span>
                    )}
                  </motion.button>
                )
              })}

              {Array.from({ length: trailing }, (_, i) => (
                <div key={`post-${i}`} className="aspect-square" />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Upcoming list ── */}
      {upcoming.length > 0 && (
        <>
          <SectionLabel label="วันหยุดที่กำลังมาถึง" />
          {upcoming.map((h, i) => {
            const d = new Date(normalizeDate(h.holidayDate) + 'T00:00:00')
            const daysUntil = Math.round((d.getTime() - new Date(todayKey).getTime()) / 86400000)
            const badge = urgencyStyle(daysUntil)
            // Dot color: more saturated for imminent dates
            const dotColor = daysUntil === 0
              ? 'oklch(0.56 0.17 36)'
              : daysUntil <= 7
                ? 'oklch(0.62 0.13 42)'
                : 'oklch(0.76 0.09 56)'

            return (
              <motion.div
                key={h.id}
                className="flex items-center gap-4 py-3 border-b border-[var(--border)]/50 last:border-0 group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.22 }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: dotColor }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{h.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={badge}
                >
                  {daysUntil === 0 ? 'วันนี้' : `อีก ${daysUntil} วัน`}
                </span>

                <button
                  onClick={() => setDeleteTarget(h)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            )
          })}
        </>
      )}

      {/* ── Add modal ── */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm p-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)] mb-2">เพิ่มวันหยุด</p>
              <h2 className="text-xl font-black tracking-tight mb-5">
                {addDate
                  ? new Date(addDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'เลือกวันที่'}
              </h2>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (!addName.trim() || !addDate) return
                  create.mutate({ name: addName.trim(), holidayDate: addDate })
                }}
                className="space-y-3"
              >
                <Input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} required />
                <Input
                  placeholder="ชื่อวันหยุด เช่น วันสงกรานต์"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="ghost" className="flex-1 rounded-xl"
                    onClick={() => setShowAdd(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" className="flex-1 gap-1.5 rounded-xl"
                    disabled={!addName.trim() || !addDate || create.isPending}>
                    <Plus size={14} />
                    เพิ่มเลย
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.name ?? ''}
        body={`${deleteTarget
          ? new Date(normalizeDate(deleteTarget.holidayDate) + 'T00:00:00').toLocaleDateString('th-TH', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })
          : ''} จะถูกลบออกจากระบบ`}
        confirmLabel="ลบเลย"
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        loading={remove.isPending}
      />
    </div>
  )
}
