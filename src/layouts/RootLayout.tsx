import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { Users, LayoutDashboard, CalendarOff } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/queue', label: 'Queue Board', icon: LayoutDashboard },
  { to: '/members', label: 'Party', icon: Users },
  { to: '/holidays', label: 'Holidays', icon: CalendarOff },
] as const

export function RootLayout() {
  const location = useLocation()
  return (
    <div className="min-h-screen bg-(--background)">
      <header className="border-b border-(--border) bg-(--card)/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <motion.span
            className="font-extrabold text-lg tracking-tight text-(--primary)"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            3Cha Party
          </motion.span>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'text-(--muted-foreground) hover:text-(--foreground) hover:bg-(--muted)'
                )}
                activeProps={{
                  className: cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200',
                    'bg-(--accent)/15 text-(--accent)'
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
      <main className={['/queue', '/members'].includes(location.pathname) ? 'w-full' : 'max-w-3xl mx-auto px-4 py-8'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
