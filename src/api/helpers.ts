import { Message } from '@arco-design/web-react'
import { getErrorMessage } from '@/lib/errors'

export function showApiError(error: unknown, fallback?: string): void {
  Message.error(getErrorMessage(error, fallback))
}

export async function unwrapApi<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise
  if (error) {
    throw error
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return data as T
}
