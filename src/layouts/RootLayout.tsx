import { Outlet, Link } from '@tanstack/react-router'
import { Users, LayoutDashboard, CalendarOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/queue', label: 'Queue Board', icon: LayoutDashboard },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff },
] as const

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">3Cha Portal</span>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                  'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]'
                )}
                activeProps={{
                  className: cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                    'bg-[var(--accent)] text-[var(--accent-foreground)] font-medium'
                  ),
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
