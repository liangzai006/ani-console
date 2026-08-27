import { useEffect } from 'react'
import { showErrorNotification } from '@/lib/notifications'
import { getErrorMessage } from '@/lib/errors'

type UseListErrorNotificationOptions = {
  id: string
  title: string
  error?: unknown
  fallback?: string
}

export function useListErrorNotification({ id, title, error, fallback }: UseListErrorNotificationOptions) {
  useEffect(() => {
    if (error) {
      showErrorNotification({
        id,
        title,
        content: getErrorMessage(error, fallback),
      })
    }
  }, [error, fallback, id, title])
}
