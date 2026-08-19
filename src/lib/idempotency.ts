import { randomUUID } from './uuid'

export function newIdempotencyKey(): string {
  return randomUUID()
}
