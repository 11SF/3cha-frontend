import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { RootLayout } from './layouts/RootLayout'
import { QueueBoardPage } from './pages/QueueBoard'
import { MembersPage } from './pages/Members'
import { HolidaysPage } from './pages/Holidays'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => { throw redirect({ to: '/queue' }) },
})

const queueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/queue',
  component: QueueBoardPage,
})

const membersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/members',
  component: MembersPage,
})

const holidaysRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/holidays',
  component: HolidaysPage,
})

const routeTree = rootRoute.addChildren([indexRoute, queueRoute, membersRoute, holidaysRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
