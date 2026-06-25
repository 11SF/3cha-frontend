import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router'
import { RootLayout } from './layouts/RootLayout'
import { QueueBoardPage } from './pages/QueueBoard'
import { MembersPage } from './pages/Members'
import { HolidaysPage } from './pages/Holidays'
import { TodayBoardPage } from './pages/TodayBoard'
import { TokenUsagePage } from './pages/TokenUsage'

// Root passes through — no layout
const rootRoute = createRootRoute({ component: Outlet })

// Pathless layout route wrapping all nav pages
const navRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_nav',
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => navRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/queue' }) },
})

const queueRoute = createRoute({
  getParentRoute: () => navRoute,
  path: '/queue',
  component: QueueBoardPage,
})

const membersRoute = createRoute({
  getParentRoute: () => navRoute,
  path: '/members',
  component: MembersPage,
})

const holidaysRoute = createRoute({
  getParentRoute: () => navRoute,
  path: '/holidays',
  component: HolidaysPage,
})

const tokenUsageRoute = createRoute({
  getParentRoute: () => navRoute,
  path: '/token-usage',
  component: TokenUsagePage,
})

// Standalone display — no nav
const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/today',
  component: TodayBoardPage,
})

const routeTree = rootRoute.addChildren([
  navRoute.addChildren([indexRoute, queueRoute, membersRoute, holidaysRoute, tokenUsageRoute]),
  todayRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
