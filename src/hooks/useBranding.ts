import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { coreApi } from '@/api/client'
import { useBrandingStore, type BrandingConfig } from '@/stores/branding'

export function useBranding() {
  const setBranding = useBrandingStore((s) => s.setBranding)

  const query = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/branding')
      if (error) throw error
      return data as BrandingConfig
    },
    staleTime: 300_000,
  })

  useEffect(() => {
    if (query.data) {
      setBranding(query.data)
      if (query.data.favicon_url) {
        let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = query.data.favicon_url
      }
    }
  }, [query.data, setBranding])

  return query
}
