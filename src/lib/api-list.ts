import type { coreApi } from '@/api/client'

export type ListResponse<T = Record<string, unknown>> = {
  items?: T[]
  next_cursor?: string | null
  total?: number
}

export async function listOrThrow<T extends ListResponse = ListResponse>(
  fn: () => ReturnType<typeof coreApi.GET>,
): Promise<T> {
  const { data, error } = await fn()
  if (error) throw error
  return data as T
}
