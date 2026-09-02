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

export type ContainerInstancePageFetcher = (
  cursor?: string,
  query?: ContainerInstanceQuery,
) => Promise<InstancePage>

function displayScalar(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return undefined
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
    image: displayScalar(compatibleRecord.image) ?? '-',
    cpuMemory: [cpu, memory].filter(Boolean).join(' / ') || '-',
    replicas: record.container ? `${record.container.ready_replicas}/${record.container.replicas}` : '-',
    rolloutStatus: record.container?.rollout_status ?? '-',
    node: record.node_name ?? '-',
    endpoint: record.endpoint ?? '-',
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

async function fetchContainerInstancePage(
  cursor?: string,
  filters?: ContainerInstanceQuery,
): Promise<InstancePage> {
  const keyword = filters?.keyword.trim() ?? ''
  const query = {
    kind: 'container',
    limit: API_PAGE_SIZE,
    ...(cursor ? { cursor } : {}),
    status: filters?.status === 'all' ? undefined : filters?.status,
    search_field: keyword ? filters?.searchField : undefined,
    keyword: keyword || undefined,
  } as never
  const { data, error } = await coreApi.GET('/instances', { params: { query } })
  if (error) throw error
  return data ?? { items: [], total: 0 }
}

async function fetchAllContainerInstances(
  fetchPage: ContainerInstancePageFetcher,
  query: ContainerInstanceQuery,
) {
  const records: ContainerInstanceRecord[] = []
  const seenCursors = new Set<string>()
  let cursor: string | undefined

  do {
    const page = await fetchPage(cursor, query)
    records.push(...page.items)
    const nextCursor = page.next_cursor ?? undefined
    if (!nextCursor) break
    if (seenCursors.has(nextCursor)) throw new Error('实例列表返回了重复游标')
    seenCursors.add(nextCursor)
    cursor = nextCursor
  } while (cursor)

  return records
}

export function createContainerInstanceDataSource(
  fetchPage: ContainerInstancePageFetcher = fetchContainerInstancePage,
): ContainerInstanceDataSource {
  return {
    async list(query: ContainerInstanceQuery): Promise<ContainerInstanceListResult> {
      const records = await fetchAllContainerInstances(fetchPage, query)
      const allItems = records.map(mapContainerInstance)
      const start = (query.page - 1) * query.pageSize
      return {
        items: allItems.slice(start, start + query.pageSize),
        total: allItems.length,
        statusCounts: countStatuses(allItems),
        hasTransitioningInstances: allItems.some((item) => DEPLOYING_STATES.has(item.status)),
      }
    },
  }
}

export const containerInstanceDataSource = createContainerInstanceDataSource()
