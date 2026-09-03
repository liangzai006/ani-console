import { v4 as uuidv4 } from 'uuid'

export type IdempotencyDependencyList = readonly unknown[]

export type IdempotencyBody = Record<string, unknown>

export interface IdempotencyScope {
  withKey<T extends IdempotencyBody>(
    submitData: T,
    runtimeDependencies?: IdempotencyDependencyList,
  ): T & { idempotency_key: string }
  reset(runtimeDependencies?: IdempotencyDependencyList): void
}

type ScopeEntry = {
  runtimeDependencies: IdempotencyDependencyList
  bodyFingerprint?: string
  key?: string
}

function dependenciesEqual(
  left: IdempotencyDependencyList,
  right: IdempotencyDependencyList,
): boolean {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
}

function normalizeJsonValue(value: unknown, inArray = false): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') {
    throw new TypeError('BigInt cannot be serialized in an idempotency payload')
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return inArray ? null : undefined
  }
  if (Array.isArray(value)) return value.map((item) => normalizeJsonValue(item, true))
  if (typeof value === 'object') {
    if (typeof (value as { toJSON?: unknown }).toJSON === 'function') {
      return normalizeJsonValue((value as { toJSON: () => unknown }).toJSON(), inArray)
    }
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const normalized = normalizeJsonValue((value as Record<string, unknown>)[key])
        if (normalized !== undefined) result[key] = normalized
        return result
      }, {})
  }
  return value
}

function fingerprintBody(body: IdempotencyBody): string {
  const { idempotency_key: _ignored, ...submitData } = body
  return JSON.stringify(normalizeJsonValue(submitData))
}

export function createIdempotencyScope(
  _primaryKey: string,
  _dependencies: IdempotencyDependencyList,
): IdempotencyScope {
  let entries: ScopeEntry[] = []

  const findEntry = (runtimeDependencies: IdempotencyDependencyList) =>
    entries.find((entry) => dependenciesEqual(entry.runtimeDependencies, runtimeDependencies))

  return {
    withKey<T extends IdempotencyBody>(
      submitData: T,
      runtimeDependencies: IdempotencyDependencyList = [],
    ) {
      let entry = findEntry(runtimeDependencies)
      if (!entry) {
        entry = { runtimeDependencies: [...runtimeDependencies] }
        entries.push(entry)
      }

      const bodyFingerprint = fingerprintBody(submitData)
      if (entry.bodyFingerprint !== bodyFingerprint) {
        entry.bodyFingerprint = bodyFingerprint
        entry.key = uuidv4()
      }
      entry.key ??= uuidv4()

      const { idempotency_key: _ignored, ...body } = submitData
      return { ...body, idempotency_key: entry.key } as T & { idempotency_key: string }
    },
    reset(runtimeDependencies?: IdempotencyDependencyList) {
      if (!runtimeDependencies) {
        entries = []
        return
      }
      entries = entries.filter(
        (entry) => !dependenciesEqual(entry.runtimeDependencies, runtimeDependencies),
      )
    },
  }
}
