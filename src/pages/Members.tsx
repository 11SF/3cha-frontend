import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users, GripVertical } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#14b8a6',
]

function SortableMemberRow({
  member,
  onDelete,
}: {
  member: Member
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: member.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const initials = member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0 bg-[var(--card)]"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-grab active:cursor-grabbing touch-none"
        aria-label="drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{ backgroundColor: member.avatarColor }}
      >
        {initials}
      </div>
      <span className="flex-1 font-medium">{member.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
        onClick={() => onDelete(member.id)}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  )
}

export function MembersPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [localMembers, setLocalMembers] = useState<Member[] | null>(null)

  const { data: fetchedMembers = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: memberApi.list,
    // Sync local drag state with fresh server data.
    select: data => data,
  })

  // Use local state while dragging, otherwise show server data.
  const members = localMembers ?? fetchedMembers

  const create = useMutation({
    mutationFn: memberApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      setLocalMembers(null)
      setName('')
    },
  })

  const remove = useMutation({
    mutationFn: memberApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] })
      setLocalMembers(null)
    },
  })

  const reorder = useMutation({
    mutationFn: memberApi.reorder,
    onSuccess: (updated) => {
      qc.setQueryData(['members'], updated)
      setLocalMembers(null)
    },
  })

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = members.findIndex(m => m.id === active.id)
    const newIndex = members.findIndex(m => m.id === over.id)
    const reordered = arrayMove(members, oldIndex, newIndex)

    setLocalMembers(reordered)
    reorder.mutate(reordered.map((m, i) => ({ id: m.id, sortOrder: i })))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate({ name: name.trim(), avatarColor: color })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={22} />
          จัดการสมาชิก
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          ลาก <GripVertical size={12} className="inline" /> เพื่อเรียงลำดับ round-robin
        </p>
      </div>

      {/* Member list with DnD */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
          ลำดับ round-robin ({members.length} คน)
        </h2>
        {isLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">กำลังโหลด...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">ยังไม่มีสมาชิก — เพิ่มคนแรกเลย!</p>
        ) : (
          <Card>
            <CardContent className="pt-2 pb-1 px-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={members.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {members.map(m => (
                    <SortableMemberRow
                      key={m.id}
                      member={m}
                      onDelete={id => remove.mutate(id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add member form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">เพิ่มสมาชิกใหม่</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="ชื่อ..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <div>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">สีอวาตาร์</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" disabled={!name.trim() || create.isPending} className="w-full">
              <Plus size={16} />
              เพิ่มสมาชิก
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
