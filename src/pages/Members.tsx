import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical } from 'lucide-react'
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
import { motion, AnimatePresence } from 'framer-motion'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#14b8a6',
]

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Deterministic tilt from member id — makes each card feel hand-placed on a pin board
function getTilt(id: string): number {
  const n = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ((n % 9) - 4) * 0.55
}

function SortableMemberCard({
  member, index, onDelete,
}: {
  member: Member; index: number; onDelete: (m: Member) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: member.id })

  const tilt = getTilt(member.id)
  const initials = getInitials(member.name)

  return (
    /* Outer motion.div: entrance only — keeps framer-motion transforms separate from dnd */
    <motion.div
      initial={{ opacity: 0, scale: 0.78, y: 28 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: index * 0.07 }}
    >
      {/* dnd div: owns positional transform, no framer-motion conflict */}
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
          zIndex: isDragging ? 50 : undefined,
        }}
        className="group"
      >
        {/* Visual card: tilt + hover */}
        <motion.div
          className="relative flex flex-col items-center pt-7 pb-5 px-4 rounded-[1.75rem] overflow-hidden"
          style={{
            backgroundColor: `${member.avatarColor}12`,
            border: `1.5px solid ${member.avatarColor}2e`,
            rotate: tilt,
          }}
          whileHover={{
            rotate: 0,
            scale: 1.05,
            boxShadow: `0 18px 44px ${member.avatarColor}38`,
          }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
        >
          {/* Avatar with soft color glow */}
          <div className="relative mb-4">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: member.avatarColor,
                filter: 'blur(14px)',
                opacity: 0.38,
                transform: 'scale(1.45)',
              }}
            />
            <div
              className="relative w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center font-black text-white text-xl"
              style={{ backgroundColor: member.avatarColor }}
            >
              {initials}
            </div>
          </div>

          {/* Name */}
          <p
            className="font-extrabold text-base text-center leading-snug break-words w-full px-1"
            style={{ color: 'var(--foreground)' }}
          >
            {member.name}
          </p>

          {/* Trash — top-right corner, fades in on hover */}
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <motion.button
              onClick={(e) => { e.stopPropagation(); onDelete(member) }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-(--muted-foreground) hover:text-(--destructive) hover:bg-(--destructive)/10 transition-colors"
              whileTap={{ scale: 0.82 }}
            >
              <Trash2 size={11} />
            </motion.button>
          </div>

          {/* Drag grip — bottom center, very subtle secondary affordance */}
          <div
            {...attributes}
            {...listeners}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-25 hover:!opacity-55 transition-opacity cursor-grab active:cursor-grabbing touch-none"
            aria-label="ลากเพื่อเรียงลำดับ"
          >
            <GripVertical size={13} className="text-(--muted-foreground)" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function MembersPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [localMembers, setLocalMembers] = useState<Member[] | null>(null)

  const { data: fetchedMembers = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: memberApi.list,
  })
  const members = localMembers ?? fetchedMembers

  const create = useMutation({
    mutationFn: memberApi.create,
    onSuccess: () => {
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

  function openAdd() {
    setName('')
    setColor(AVATAR_COLORS[0])
    setShowAdd(true)
  }

  return (
    <div>
      {/* ── Header ── */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-4xl font-black tracking-tight leading-none">ทีมเรา</h1>
        {members.length > 0 && (
          <p className="text-sm text-(--muted-foreground) mt-2 font-semibold">
            {members.length} คนในทีม
          </p>
        )}
      </motion.div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-(--accent) border-t-transparent animate-spin" />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {members.map((m, i) => (
                <SortableMemberCard
                  key={m.id}
                  member={m}
                  index={i}
                  onDelete={setDeleteTarget}
                />
              ))}

              {/* Add-new slot lives inside the grid */}
              <motion.button
                className="flex flex-col items-center justify-center pt-7 pb-5 px-4 rounded-[1.75rem] group"
                style={{
                  border: '1.5px dashed var(--border)',
                  minHeight: '168px',
                }}
                onClick={openAdd}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.28, delay: members.length * 0.07 + 0.06 }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: '0 8px 28px oklch(0.62 0.13 42 / 0.12)',
                }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center mb-4 transition-colors"
                  style={{ border: '1.5px dashed var(--border)', color: 'var(--muted-foreground)' }}
                >
                  <Plus
                    size={26}
                    strokeWidth={1.5}
                    className="group-hover:text-(--accent) transition-colors"
                  />
                </div>
                <p className="text-sm font-bold text-(--muted-foreground) group-hover:text-(--accent) transition-colors text-center">
                  เพิ่มสมาชิก
                </p>
              </motion.button>
            </div>
          </SortableContext>
        </DndContext>
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
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="w-8 h-8 rounded-full relative shrink-0"
                        style={{ backgroundColor: c }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
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

                  {/* Live avatar preview */}
                  <div
                    className="flex items-center gap-3 mt-4 py-3 px-4 rounded-2xl"
                    style={{ backgroundColor: `${color}12`, border: `1px solid ${color}2e` }}
                  >
                    <div className="relative shrink-0 w-11 h-11">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: color, filter: 'blur(6px)', opacity: 0.42, transform: 'scale(1.3)' }}
                      />
                      <div
                        className="relative w-full h-full rounded-full flex items-center justify-center font-black text-white text-sm"
                        style={{ backgroundColor: color }}
                      >
                        {previewInitials}
                      </div>
                    </div>
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                      {name || 'ชื่อสมาชิก'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setShowAdd(false)}>
                    ยกเลิก
                  </Button>
                  <Button
                    className="flex-1 gap-1.5 rounded-xl"
                    disabled={!name.trim() || create.isPending}
                    onClick={() => {
                      if (!name.trim()) return
                      create.mutate({ name: name.trim(), avatarColor: color })
                    }}
                  >
                    <Plus size={14} />
                    เพิ่มเลย
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
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
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--destructive) mb-3">
                ลบสมาชิก
              </p>

              <div className="flex items-center gap-4 mb-5">
                <div className="relative shrink-0 w-14 h-14">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: deleteTarget.avatarColor,
                      filter: 'blur(8px)',
                      opacity: 0.4,
                      transform: 'scale(1.2)',
                    }}
                  />
                  <div
                    className="relative w-full h-full rounded-full flex items-center justify-center font-black text-white text-lg"
                    style={{ backgroundColor: deleteTarget.avatarColor }}
                  >
                    {getInitials(deleteTarget.name)}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{deleteTarget.name}</h2>
                  <p className="text-sm text-(--muted-foreground) mt-0.5">จะถูกลบออกจากทีม</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => setDeleteTarget(null)}
                  disabled={remove.isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1 gap-1.5 rounded-xl bg-(--destructive) text-white hover:opacity-90"
                  onClick={() => remove.mutate(deleteTarget.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 size={14} />
                  ลบเลย
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
