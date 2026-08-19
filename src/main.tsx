import '@arco-design/web-react/dist/css/arco.css'
import '@/assets/iconfont/iconfont.css'
import '@/styles/global.css'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from '@arco-design/web-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './stores/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

const ARCO_THEME = { primaryColor: '#0079D3' }

const router = createRouter({
  routeTree,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={ARCO_THEME}>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
