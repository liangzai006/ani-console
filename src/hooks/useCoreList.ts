import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { coreApi } from '@/api/client'
import type { CursorPage } from '@/components/common/CursorTable'

export function useCoreListQuery<T>(
  key: string,
  fetcher: (cursor?: string) => ReturnType<typeof coreApi.GET>,
  enabled = true,
) {
  return useQuery({
    queryKey: [key, 'list'],
    queryFn: async () => {
      const { data, error } = await fetcher()
      if (error) throw error
      return data as CursorPage<T> & Record<string, unknown>
    },
    enabled,
  })
}

export function useReloadOnMount(reload: () => void) {
  useEffect(() => {
    reload()
  }, [reload])
}
