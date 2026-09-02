import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { useAuthStore } from '@/stores/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRoot() {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const ready = () => {
      useAuthStore.setState({ hydrated: true })
      setAuthReady(true)
    }
    const result = useAuthStore.persist.rehydrate()
    if (result && typeof (result as Promise<void>).then === 'function') {
      void (result as Promise<void>).then(ready)
    } else {
      ready()
    }
  }, [])

  if (!authReady) return null

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
