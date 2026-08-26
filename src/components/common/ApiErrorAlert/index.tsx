import { Alert } from '@arco-design/web-react'
import { getErrorMessage } from '@/lib/errors'

export function ApiErrorAlert({ error, title = '加载失败' }: { error: unknown; title?: string }) {
  return <Alert type="error" title={title} content={getErrorMessage(error)} className="mb-4" />
}
