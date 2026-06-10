import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { holidayApi, type Holiday } from '@/api/holiday'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function HolidayRow({ holiday, onDelete }: { holiday: Holiday; onDelete: (id: string) => void }) {
  const date = new Date(holiday.holidayDate.includes('T') ? holiday.holidayDate : holiday.holidayDate + 'T00:00:00')
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium">{holiday.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {date.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
        onClick={() => onDelete(holiday.id)}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  )
}

export function HolidaysPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: holidayApi.list,
  })

  const create = useMutation({
    mutationFn: holidayApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] })
      setName('')
      setDate('')
    },
  })

  const remove = useMutation({
    mutationFn: holidayApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date) return
    create.mutate({ name: name.trim(), holidayDate: date })
  }

  const upcoming = holidays.filter(h => h.holidayDate >= new Date().toISOString().split('T')[0])
  const past = holidays.filter(h => h.holidayDate < new Date().toISOString().split('T')[0])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarOff size={22} />
          วันหยุดพิเศษ
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          วันที่ลงทะเบียนไว้จะข้าม queue โดยอัตโนมัติ
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">เพิ่มวันหยุด</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            <Input
              placeholder="ชื่อวันหยุด เช่น วันสงกรานต์"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Button type="submit" disabled={!name.trim() || !date || create.isPending} className="w-full">
              <Plus size={16} />
              เพิ่มวันหยุด
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">กำลังโหลด...</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                วันหยุดที่กำลังมาถึง ({upcoming.length})
              </h2>
              <Card>
                <CardContent className="pt-2 pb-1">
                  {upcoming.map(h => (
                    <HolidayRow key={h.id} holiday={h} onDelete={id => remove.mutate(id)} />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                ผ่านมาแล้ว ({past.length})
              </h2>
              <Card className="opacity-60">
                <CardContent className="pt-2 pb-1">
                  {past.slice(0, 5).map(h => (
                    <HolidayRow key={h.id} holiday={h} onDelete={id => remove.mutate(id)} />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {holidays.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">ยังไม่มีวันหยุดพิเศษ</p>
          )}
        </>
      )}
    </div>
  )
}
