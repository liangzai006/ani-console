import { coreApi } from '@/api/client'
import { getInstanceDisplayIp, getInstanceNetworkValue } from '@/lib/instance-network'
import type {
  ContainerInstance,
  ContainerInstanceDataSource,
  ContainerInstanceListResult,
  ContainerInstanceQuery,
  ContainerInstanceRecord,
  ContainerInstanceStatus,
  ContainerInstanceStatusCounts,
} from './types'

const API_PAGE_SIZE = 100
const DEPLOYING_STATES = new Set<ContainerInstanceStatus>([
  'pending',
  'provisioning',
  'starting',
  'stopping',
  'deleting',
])

type InstancePage = {
  items: ContainerInstanceRecord[]
  total: number
  next_cursor?: string | null
}

export type ContainerInstancePageFetcher = (cursor?: string) => Promise<InstancePage>

function displayScalar(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return undefined
}

function matchesStatus(item: ContainerInstance, status: ContainerInstanceQuery['status']) {
  if (status === 'all') return true
  if (status === 'deploying') return DEPLOYING_STATES.has(item.status)
  return item.status === status
}

function mapContainerInstance(record: ContainerInstanceRecord): ContainerInstance {
  const compatibleRecord = record as ContainerInstanceRecord & Record<string, unknown>
  const cpu = displayScalar(compatibleRecord.cpu)
  const memory = displayScalar(compatibleRecord.memory)

  return {
    id: record.id,
    name: record.name,
    kind: 'container',
    vpc: getInstanceNetworkValue(record, 'vpc_id'),
    subnet: getInstanceNetworkValue(record, 'subnet_id'),
    ip: getInstanceDisplayIp(record),
    status: record.state,
    image: displayScalar(compatibleRecord.image) ?? '—',
    cpuMemory: [cpu, memory].filter(Boolean).join(' / ') || '—',
    replicas: record.container ? `${record.container.ready_replicas}/${record.container.replicas}` : '—',
    rolloutStatus: record.container?.rollout_status ?? '—',
    node: record.node_name ?? '—',
    endpoint: record.endpoint ?? '—',
    createdAt: record.created_at,
  }
}

function countStatuses(items: ContainerInstance[]): ContainerInstanceStatusCounts {
  return items.reduce<ContainerInstanceStatusCounts>(
    (counts, item) => {
      counts.all += 1
      if (item.status === 'running' || item.status === 'stopped' || item.status === 'failed') {
        counts[item.status] += 1
      } else if (DEPLOYING_STATES.has(item.status)) {
        counts.deploying += 1
      }
      return counts
    },
    { all: 0, running: 0, stopped: 0, deploying: 0, failed: 0 },
  )
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, 'zh-CN')
}

function toApiState(status: ContainerInstanceQuery['status']): string | null {
  // Return a single state string for backend, or null to omit the param
  if (status === 'all') return null
  if (status === 'deploying') return null // can't filter multiple states in one param, keep frontend filtering
  return status // 'running' | 'stopped' | 'failed'
}

async function fetchContainerInstancePage(cursor: string | undefined, status: ContainerInstanceQuery['status']): Promise<InstancePage> {
  const params: Record<string, unknown> = { kind: 'container', limit: API_PAGE_SIZE }
  if (cursor) params.cursor = cursor

  const apiState = toApiState(status)
  if (apiState) {
    params.state = apiState
  }

  const { data, error } = await coreApi.GET('/instances', { params: { query: params } })
  if (error) throw error

  // Unwrap items that are wrapped as { instance: { ... } }
  const rawItems = (data?.items ?? []) as Record<string, unknown>[]
  const items = rawItems
    .map((item) => {
      const inst = item.instance as Record<string, unknown> | undefined
      return (inst && typeof inst === 'object') ? inst : item
    })

  return {
    items,
    total: typeof data?.total === 'number' ? data.total : items.length,
    next_cursor: typeof data?.next_cursor === 'string' ? data.next_cursor : null,
  }
}

export function createContainerInstanceDataSource(
  fetchPage: ContainerInstancePageFetcher = fetchContainerInstancePage,
): ContainerInstanceDataSource {
  return {
    async list(query: ContainerInstanceQuery): Promise<ContainerInstanceListResult> {
      const pageResult = await fetchPage(undefined, query.status)
      const allItems = pageResult.items.map(mapContainerInstance)
      const keyword = query.keyword.trim().toLocaleLowerCase()
      let filtered = allItems.filter((item) => matchesStatus(item, query.status))

      if (keyword) {
        filtered = filtered.filter((item) => item[query.searchField].toLocaleLowerCase().includes(keyword))
      }

      if (query.sortField) {
        const direction = query.sortDirection === 'asc' ? 1 : -1
        filtered = [...filtered].sort(
          (left, right) => compareText(left[query.sortField!], right[query.sortField!]) * direction,
        )
      }

      const start = (query.page - 1) * query.pageSize
      return {
        items: filtered.slice(start, start + query.pageSize),
        total: filtered.length,
        statusCounts: countStatuses(allItems),
        hasTransitioningInstances: allItems.some((item) => DEPLOYING_STATES.has(item.status)),
      }
    },
  }
}

export const containerInstanceDataSource = createContainerInstanceDataSource()
