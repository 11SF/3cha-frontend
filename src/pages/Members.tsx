import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, GripVertical,
  ChevronLeft, ChevronRight, ChevronDown, Users,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memberApi, type Member } from '@/api/member'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence, useSpring } from 'framer-motion'

// ── Config ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#14b8a6',
]

const PROG_ROLES = [
  { label: 'Frontend',   bg: '#dbeafe', text: '#1d4ed8' },
  { label: 'Backend',    bg: '#ede9fe', text: '#6d28d9' },
  { label: 'Full-stack', bg: '#ffedd5', text: '#c2410c' },
  { label: 'DevOps',     bg: '#dcfce7', text: '#15803d' },
  { label: 'Mobile',     bg: '#fce7f3', text: '#be185d' },
  { label: 'Data',       bg: '#fef9c3', text: '#a16207' },
  { label: 'Security',   bg: '#fee2e2', text: '#b91c1c' },
]

// Subtle overlay patterns on portrait backgrounds
const PATTERNS = [
  'repeating-linear-gradient(45deg,rgba(255,255,255,.09) 0px,rgba(255,255,255,.09) 1px,transparent 1px,transparent 14px)',
  'radial-gradient(circle,rgba(255,255,255,.13) 1.5px,transparent 1.5px) 0 0/18px 18px',
  'repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0px,rgba(255,255,255,.07) 1px,transparent 1px,transparent 11px)',
  'repeating-linear-gradient(45deg,rgba(255,255,255,.07) 0,rgba(255,255,255,.07) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,255,255,.07) 0,rgba(255,255,255,.07) 1px,transparent 1px,transparent 10px)',
  'repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0px,rgba(255,255,255,.07) 1px,transparent 1px,transparent 13px)',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function hash(str: string): number {
  let n = 5381
  for (let i = 0; i < str.length; i++) n = ((n << 5) + n + str.charCodeAt(i)) >>> 0
  return n
}

function getProgRole(id: string)  { return PROG_ROLES[hash(id) % PROG_ROLES.length] }
function getPattern(id: string)   { return PATTERNS[hash(id + 'p') % PATTERNS.length] }

// ── Confetti ──────────────────────────────────────────────────────────────────

function ConfettiParticle({ color, angle, delay }: { color: string; angle: number; delay: number }) {
  const d = 55 + Math.random() * 45, s = 4 + Math.random() * 5
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: s, height: s, backgroundColor: color, top: '50%', left: '50%', translateX: '-50%', translateY: '-50%' }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: Math.cos(angle) * d, y: Math.sin(angle) * d - 20, opacity: 0, scale: 0.2 }}
      transition={{ duration: 0.65, delay, ease: [0.2, 0, 0.8, 1] }}
    />
  )
}

// ── Portrait Card (carousel strip) ───────────────────────────────────────────

function PortraitCard({
  member, isActive, cardWidth, onClick,
}: {
  member: Member; isActive: boolean; cardWidth: number; onClick: () => void
}) {
  const initials = getInitials(member.name)
  const pattern  = getPattern(member.id)

  return (
    <motion.div
      className="relative flex-shrink-0 overflow-hidden cursor-pointer"
      style={{
        width: cardWidth,
        borderRadius: 12,
        background: member.avatarColor,
      }}
      onClick={onClick}
      animate={{
        opacity: isActive ? 1 : 0.62,
        scale:   isActive ? 1 : 0.97,
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ opacity: 0.92, scale: 0.99 }}
    >
      {/* Light highlight overlay (top lighter, bottom darker) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(170deg, rgba(255,255,255,0.28) 0%, transparent 45%, rgba(0,0,0,0.22) 100%)',
        }}
      />

      {/* Subtle pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: pattern }}
      />

      {/* Large watermark initials */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{
          fontSize: Math.max(48, cardWidth * 0.55),
          fontWeight: 900,
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '-0.04em',
          paddingBottom: '3.5rem',
        }}
      >
        {initials}
      </div>

      {/* Active: white top accent line */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
            style={{ backgroundColor: 'white' }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* Name gradient overlay at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 pb-3 pt-12"
        style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.72) 0%, transparent 100%)' }}
      >
        <p
          className="font-extrabold text-white text-center leading-tight"
          style={{
            fontSize: Math.max(10, Math.min(15, cardWidth * 0.1)),
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {member.name}
        </p>
      </div>
    </motion.div>
  )
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────

function HeroCarousel({ members }: { members: Member[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(1000)
  const pointerStartX = useRef<number | null>(null)
  const didDrag = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerW(el.offsetWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (members.length > 0 && activeIdx >= members.length)
      setActiveIdx(members.length - 1)
  }, [members.length, activeIdx])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setActiveIdx(i => (i - 1 + members.length) % members.length)
      if (e.key === 'ArrowRight') setActiveIdx(i => (i + 1) % members.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [members.length])

  if (members.length === 0) return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height: 'calc(100vh - 56px)' }}>
      <Users size={28} className="text-(--muted-foreground)" />
      <p className="text-sm font-semibold text-(--muted-foreground)">ยังไม่มีสมาชิกในทีม</p>
    </div>
  )

  const safeIdx  = Math.min(activeIdx, members.length - 1)
  const active   = members[safeIdx]
  const progRole = getProgRole(active.id)
  const GAP = 5
  const cardW = Math.max(72, Math.floor((containerW - (members.length - 1) * GAP) / members.length))

  function prev() { setActiveIdx(i => (i - 1 + members.length) % members.length) }
  function next() { setActiveIdx(i => (i + 1) % members.length) }

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 56px)', minHeight: 500 }}
      onPointerDown={e => { pointerStartX.current = e.clientX; didDrag.current = false }}
      onPointerMove={e => {
        if (pointerStartX.current !== null && Math.abs(e.clientX - pointerStartX.current) > 8)
          didDrag.current = true
      }}
      onPointerUp={e => {
        if (pointerStartX.current !== null) {
          const dx = e.clientX - pointerStartX.current
          if (dx > 60) prev()
          else if (dx < -60) next()
        }
        pointerStartX.current = null
      }}
    >
      {/* ── Card strip — flex-1 fills all available height ── */}
      <div
        ref={containerRef}
        className="flex items-stretch flex-1 px-4 pt-5"
        style={{ gap: GAP }}
      >
        {members.map((m, i) => (
          <PortraitCard
            key={m.id}
            member={m}
            isActive={i === safeIdx}
            cardWidth={cardW}
            onClick={() => { if (!didDrag.current) setActiveIdx(i) }}
          />
        ))}
      </div>

      {/* ── Active member info panel ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          className="flex items-center gap-4 px-6 py-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          style={{ flexShrink: 0 }}
        >
          {/* Avatar circle */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg flex-shrink-0 shadow-lg"
            style={{ backgroundColor: active.avatarColor }}
          >
            {getInitials(active.name)}
          </div>

          {/* Name + role + days */}
          <div className="min-w-0">
            <p className="font-black text-lg leading-tight truncate text-(--foreground)">
              {active.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: progRole.bg, color: progRole.text }}
              >
                {progRole.label}
              </span>
            </div>
          </div>

          {/* Nav arrows */}
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <motion.button
              onClick={prev}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-(--border) text-(--muted-foreground) hover:text-(--foreground) hover:border-(--foreground) transition-colors"
              style={{ backgroundColor: 'var(--card)' }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft size={15} />
            </motion.button>
            <span className="text-xs font-semibold text-(--muted-foreground) tabular-nums w-12 text-center">
              {safeIdx + 1} / {members.length}
            </span>
            <motion.button
              onClick={next}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-(--border) text-(--muted-foreground) hover:text-(--foreground) hover:border-(--foreground) transition-colors"
              style={{ backgroundColor: 'var(--card)' }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight size={15} />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Navigation dots ── */}
      <div className="flex justify-center items-center gap-1.5 pb-3" style={{ flexShrink: 0 }}>
        {members.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              height: 5,
              borderRadius: 3,
              backgroundColor: i === safeIdx ? active.avatarColor : 'var(--border)',
            }}
            animate={{ width: i === safeIdx ? 22 : 5, opacity: i === safeIdx ? 1 : 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        ))}
      </div>

      {/* ── Scroll hint ── */}
      <motion.div
        className="flex flex-col items-center pb-3 gap-0.5"
        style={{ flexShrink: 0 }}
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-[10px] font-semibold text-(--muted-foreground) tracking-widest">SCROLL</span>
        <ChevronDown size={11} className="text-(--muted-foreground)" />
      </motion.div>
    </div>
  )
}

// ── Roster card (below fold) ──────────────────────────────────────────────────

function SortableRosterCard({
  member, index, onDelete,
}: {
  member: Member; index: number; onDelete: (m: Member) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: member.id })

  const cardRef = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(0, { stiffness: 350, damping: 28 })
  const rotateY = useSpring(0, { stiffness: 350, damping: 28 })
  const [isHovered, setIsHovered] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return
    const r = cardRef.current.getBoundingClientRect()
    rotateX.set(((e.clientY - r.top) / r.height - 0.5) * -10)
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 10)
  }
  function handleMouseLeave() {
    rotateX.set(0); rotateY.set(0); setIsHovered(false)
  }

  const progRole = getProgRole(member.id)
  const pattern  = getPattern(member.id)
  const initials = getInitials(member.name)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform), transition,
          opacity: isDragging ? 0.4 : 1,
          zIndex: isDragging ? 50 : undefined,
          perspective: '800px',
        }}
        className="group"
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          animate={{
            boxShadow: isHovered
              ? `0 16px 40px ${member.avatarColor}25, 0 0 0 1px ${member.avatarColor}30`
              : '0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px var(--border)',
          }}
          transition={{ boxShadow: { duration: 0.2 } }}
          className="overflow-hidden rounded-2xl bg-(--card) cursor-default select-none"
        >
          {/* Portrait top */}
          <div
            className="relative"
            style={{
              height: 120,
              background: member.avatarColor,
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(170deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)' }}
            />
            <div
              className="absolute inset-0"
              style={{ backgroundImage: pattern }}
            />
            {/* Initials */}
            <div
              className="absolute inset-0 flex items-center justify-center font-black text-white select-none pointer-events-none"
              style={{ fontSize: 52, opacity: 0.22, letterSpacing: '-0.04em', paddingBottom: 8 }}
            >
              {initials}
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 flex items-end justify-center pb-3"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white text-xl border-3"
                style={{
                  backgroundColor: member.avatarColor,
                  border: '3px solid var(--card)',
                  boxShadow: `0 4px 16px ${member.avatarColor}40`,
                  transform: 'translateY(28px)',
                }}
              >
                {initials}
              </div>
            </div>
          </div>

          {/* Info bottom */}
          <div className="px-3 pt-10 pb-3 text-center">
            <p className="font-extrabold text-sm text-(--foreground) truncate">{member.name}</p>
            <span
              className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: progRole.bg, color: progRole.text }}
            >
              {progRole.label}
            </span>
          </div>

          {/* Delete */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.button
              onClick={e => { e.stopPropagation(); onDelete(member) }}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/70 text-(--muted-foreground) hover:text-(--destructive) hover:bg-(--destructive)/10 transition-colors"
              whileTap={{ scale: 0.85 }}
            >
              <Trash2 size={11} />
            </motion.button>
          </div>

          {/* Drag grip */}
          <div
            {...attributes} {...listeners}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-30 hover:!opacity-60 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={12} className="text-(--muted-foreground)" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MembersPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [localMembers, setLocalMembers] = useState<Member[] | null>(null)
  const [confetti, setConfetti] = useState<{ color: string; particles: number[] } | null>(null)

  const { data: fetchedMembers = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: memberApi.list,
  })
  const members = localMembers ?? fetchedMembers

  const create = useMutation({
    mutationFn: memberApi.create,
    onSuccess: () => {
      setConfetti({ color, particles: Array.from({ length: 12 }, (_, i) => i) })
      setTimeout(() => setConfetti(null), 800)
      qc.invalidateQueries({ queryKey: ['members'] })
      setLocalMembers(null)
      setName('')
      setColor(AVATAR_COLORS[0])
      setShowAdd(false)
    },
  })

  const remove = useMutation({
    mutationFn: memberApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      setLocalMembers(null)
      setDeleteTarget(null)
    },
  })

  const reorder = useMutation({
    mutationFn: memberApi.reorder,
    onSuccess: (updated) => {
      qc.setQueryData(['members'], updated)
      setLocalMembers(null)
    },
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = members.findIndex(m => m.id === active.id)
    const newIndex = members.findIndex(m => m.id === over.id)
    const reordered = arrayMove(members, oldIndex, newIndex)
    setLocalMembers(reordered)
    reorder.mutate(reordered.map((m, i) => ({ id: m.id, sortOrder: i })))
  }

  const previewInitials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AB'

  return (
    <div className="bg-(--background)">

      {/* ══ SECTION 1: Carousel ══ */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 56px)' }}>
            <div className="w-7 h-7 rounded-full border-2 border-(--accent) border-t-transparent animate-spin" />
          </div>
        ) : (
          <HeroCarousel members={members} />
        )}
      </div>

      {/* ══ SECTION 2: Roster ══ */}
      <div className="border-t border-(--border)">
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-12">

          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-black tracking-tight">ทีม</h1>
            {members.length > 0 && (
              <p className="text-sm text-(--muted-foreground) mt-1 font-medium">
                {members.length} คน · ลากเพื่อเรียงลำดับ
              </p>
            )}
          </motion.div>

          {/* Grid */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {members.map((m, i) => (
                  <SortableRosterCard key={m.id} member={m} index={i} onDelete={setDeleteTarget} />
                ))}

                {/* Add slot */}
                <motion.button
                  className="relative flex flex-col items-center justify-center gap-3 rounded-2xl group/add overflow-hidden"
                  style={{
                    minHeight: 220,
                    border: '1.5px dashed var(--border)',
                    backgroundColor: 'var(--card)',
                  }}
                  onClick={() => { setName(''); setColor(AVATAR_COLORS[0]); setShowAdd(true) }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: members.length * 0.05 + 0.05 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 24px oklch(0.62 0.13 42 / 0.12)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <AnimatePresence>
                    {confetti?.particles.map((_, i) => (
                      <ConfettiParticle
                        key={i} color={confetti.color}
                        angle={(i / confetti.particles.length) * Math.PI * 2}
                        delay={i * 0.018}
                      />
                    ))}
                  </AnimatePresence>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center border-[1.5px] border-dashed border-(--border) text-(--muted-foreground) group-hover/add:text-(--accent) group-hover/add:border-(--accent) transition-colors"
                  >
                    <Plus size={22} strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-bold text-(--muted-foreground) group-hover/add:text-(--accent) transition-colors">
                    เพิ่มสมาชิก
                  </span>
                </motion.button>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* ══ Add modal ══ */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              className="fixed inset-0 z-40 backdrop-blur-[2px] bg-black/25"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm p-6 rounded-3xl border border-(--border) bg-(--card) shadow-2xl"
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--accent) mb-1">สมาชิกใหม่</p>
              <h2 className="text-xl font-black tracking-tight mb-5">ใครเข้าทีมบ้าง?</h2>

              <div className="space-y-4">
                <Input
                  placeholder="ชื่อสมาชิก..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && name.trim())
                      create.mutate({ name: name.trim(), avatarColor: color })
                  }}
                  autoFocus
                />

                <div>
                  <p className="text-xs text-(--muted-foreground) mb-2.5 font-semibold">สีอวาตาร์</p>
                  <div className="flex gap-2 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <motion.button
                        key={c} type="button" onClick={() => setColor(c)}
                        className="w-7 h-7 rounded-full relative shrink-0"
                        style={{ backgroundColor: c }}
                        whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      >
                        <AnimatePresence>
                          {color === c && (
                            <motion.div
                              className="absolute -inset-1 rounded-full border-2"
                              style={{ borderColor: c }}
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.6 }}
                              transition={{ duration: 0.15 }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </div>

                  {/* Preview */}
                  <div
                    className="flex items-center gap-3 mt-4 py-3 px-4 rounded-2xl"
                    style={{ backgroundColor: `${color}12`, border: `1px solid ${color}2e` }}
                  >
                    <div className="relative shrink-0 w-10 h-10">
                      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: color, filter: 'blur(6px)', opacity: 0.4, transform: 'scale(1.3)' }} />
                      <div className="relative w-full h-full rounded-full flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: color }}>
                        {previewInitials}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-(--foreground)">{name || 'ชื่อสมาชิก'}</p>
                      <span
                        className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-0.5"
                        style={{ backgroundColor: getProgRole(color + name).bg, color: getProgRole(color + name).text }}
                      >
                        {getProgRole(color + name).label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowAdd(false)}>ยกเลิก</Button>
                  <Button
                    className="flex-1 gap-1.5 rounded-xl"
                    disabled={!name.trim() || create.isPending}
                    onClick={() => { if (!name.trim()) return; create.mutate({ name: name.trim(), avatarColor: color }) }}
                  >
                    <Plus size={14} />เพิ่มเลย
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ Delete modal ══ */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              className="fixed inset-0 z-40 backdrop-blur-[2px] bg-black/25"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm p-6 rounded-3xl border border-(--border) bg-(--card) shadow-2xl"
              initial={{ opacity: 0, scale: 0.88, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--destructive) mb-3">ลบสมาชิก</p>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative shrink-0 w-14 h-14">
                  <div className="absolute inset-0 rounded-full" style={{ backgroundColor: deleteTarget.avatarColor, filter: 'blur(8px)', opacity: 0.35, transform: 'scale(1.2)' }} />
                  <div className="relative w-full h-full rounded-full flex items-center justify-center font-black text-white text-lg" style={{ backgroundColor: deleteTarget.avatarColor }}>
                    {getInitials(deleteTarget.name)}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{deleteTarget.name}</h2>
                  <p className="text-sm text-(--muted-foreground) mt-0.5">จะถูกลบออกจากทีม</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setDeleteTarget(null)} disabled={remove.isPending}>ยกเลิก</Button>
                <Button
                  className="flex-1 gap-1.5 rounded-xl bg-(--destructive) text-white hover:opacity-90"
                  onClick={() => remove.mutate(deleteTarget.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 size={14} />ลบเลย
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
