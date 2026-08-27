import { useEffect, useRef } from 'react'
import { closeNotification, showErrorNotification } from '@/lib/notifications'
import { getErrorMessage } from '@/lib/errors'

type UseListErrorNotificationOptions = {
  id: string
  title: string
  error?: unknown
  fallback?: string
  onRetry?: () => void
}

export function useListErrorNotification({ id, title, error, fallback, onRetry }: UseListErrorNotificationOptions) {
  const onRetryRef = useRef(onRetry)
  onRetryRef.current = onRetry
  const hasRetry = Boolean(onRetry)

  useEffect(() => {
    if (error) {
      showErrorNotification({
        id,
        title,
        content: getErrorMessage(error, fallback),
        onRetry: hasRetry ? () => onRetryRef.current?.() : undefined,
      })
    } else {
      closeNotification(id)
    }
    return () => closeNotification(id)
  }, [error, fallback, hasRetry, id, title])
}
