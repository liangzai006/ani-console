import { Button, Notification } from '@arco-design/web-react'

type ErrorNotificationOptions = {
  id: string
  title: string
  content: string
  onRetry?: () => void
}

export function showErrorNotification({ id, title, content, onRetry }: ErrorNotificationOptions) {
  Notification.error({
    id,
    title,
    content,
    duration: 0,
    closable: true,
    btn: onRetry ? (
      <Button
        type="primary"
        size="small"
        onClick={() => {
          Notification.remove(id)
          onRetry()
        }}
      >
        重新加载
      </Button>
    ) : undefined,
  })
}

export function closeNotification(id: string) {
  Notification.remove(id)
}
