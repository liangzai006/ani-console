import type {
  VmInstance,
  VmInstanceDataSource,
  VmInstanceListResult,
  VmInstancePowerAction,
  VmInstanceQuery,
  VmInstanceStatus,
  VmInstanceStatusCounts,
} from './legacy-types'

export const vmInstanceSeed: VmInstance[] = [
  {
    id: 'vm_2krt5t',
    name: 'demo-resource-01',
    status: 'running',
    spec: '8C 16G',
    image: 'Ubuntu 22.04',
    privateIp: '10.0.2.12',
    node: 'worker-a',
    terminationProtected: true,
    createdAt: '2025-10-06 15:49:09',
  },
  {
    id: 'vm_3lsu6v',
    name: 'demo-resource-02',
    status: 'running',
    spec: '4C 8G',
    image: 'CentOS 7.9',
    privateIp: '10.0.2.13',
    node: 'worker-b',
    terminationProtected: false,
    createdAt: '2025-11-12 09:20:00',
  },
  {
    id: 'vm_9xyr1a',
    name: 'demo-resource-06',
    status: 'running',
    spec: '64C 128G',
    image: 'OpenEuler 24.03',
    privateIp: '10.0.3.5',
    node: 'gpu-node-01',
    terminationProtected: true,
    createdAt: '2025-08-20 10:00:00',
  },
  {
    id: 'vm_b4nd7c',
    name: 'demo-resource-03',
    status: 'stopped',
    spec: '2C 4G',
    image: 'Debian 12',
    privateIp: '10.0.1.50',
    node: 'worker-c',
    terminationProtected: false,
    createdAt: '2025-09-10 09:00:00',
  },
  {
    id: 'vm_p9qm2w',
    name: 'demo-resource-07',
    status: 'stopped',
    spec: '8C 16G',
    image: 'Ubuntu 24.04',
    privateIp: '10.0.4.12',
    node: 'worker-a',
    terminationProtected: false,
    createdAt: '2025-12-01 16:30:00',
  },
  {
    id: 'vm_e5f6h8',
    name: 'demo-resource-04',
    status: 'error',
    spec: '16C 32G',
    image: 'Rocky 9',
    privateIp: '10.0.2.99',
    node: 'worker-b',
    terminationProtected: true,
    createdAt: '2025-07-08 11:45:00',
  },
]

const waitForMockResponse = () => new Promise((resolve) => globalThis.setTimeout(resolve, 120))

function statusCounts(items: VmInstance[]): VmInstanceStatusCounts {
  return items.reduce<VmInstanceStatusCounts>(
    (counts, item) => {
      counts[item.status] += 1
      counts.all += 1
      return counts
    },
    { all: 0, running: 0, stopped: 0, error: 0 },
  )
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, 'zh-CN')
}

let sharedInstances = vmInstanceSeed.map((item) => ({ ...item }))

export function resetSharedVmInstances(seed: VmInstance[] = vmInstanceSeed) {
  sharedInstances = seed.map((item) => ({ ...item }))
}

export function listSharedVmInstances() {
  return sharedInstances.map((item) => ({ ...item }))
}

export function getSharedVmInstance(instanceId: string) {
  const instance = sharedInstances.find((item) => item.id === instanceId)
  return instance ? { ...instance } : undefined
}

export function changeSharedVmInstancePowerState(ids: string[], action: VmInstancePowerAction) {
  const idSet = new Set(ids)
  const nextStatus: VmInstanceStatus = action === 'start' ? 'running' : 'stopped'
  sharedInstances = sharedInstances.map((item) => {
    if (!idSet.has(item.id)) return item
    const canChange = action === 'start' ? item.status !== 'running' : item.status === 'running'
    return canChange ? { ...item, status: nextStatus } : item
  })
}

export function createMockVmInstanceDataSource(seed: VmInstance[] = vmInstanceSeed): VmInstanceDataSource {
  let instances = seed.map((item) => ({ ...item }))

  return {
    async list(query: VmInstanceQuery): Promise<VmInstanceListResult> {
      await waitForMockResponse()
      const keyword = query.keyword.trim().toLocaleLowerCase()
      let filtered = instances.filter((item) => query.status === 'all' || item.status === query.status)

      if (keyword) {
        filtered = filtered.filter((item) => item[query.searchField].toLocaleLowerCase().includes(keyword))
      }

      if (query.sortField) {
        const direction = query.sortDirection === 'asc' ? 1 : -1
        filtered = [...filtered].sort((left, right) => compareText(left[query.sortField!], right[query.sortField!]) * direction)
      }

      const start = (query.page - 1) * query.pageSize
      return {
        items: filtered.slice(start, start + query.pageSize).map((item) => ({ ...item })),
        total: filtered.length,
        statusCounts: statusCounts(instances),
      }
    },

    async changePowerState(ids: string[], action: VmInstancePowerAction) {
      await waitForMockResponse()
      const idSet = new Set(ids)
      const nextStatus: VmInstanceStatus = action === 'start' ? 'running' : 'stopped'
      instances = instances.map((item) => {
        if (!idSet.has(item.id)) return item
        const canChange = action === 'start' ? item.status !== 'running' : item.status === 'running'
        return canChange ? { ...item, status: nextStatus } : item
      })
    },
  }
}

// Replace this binding with an API-backed implementation when the VM list endpoint is ready.
export const vmInstanceDataSource: VmInstanceDataSource = {
  async list(query: VmInstanceQuery): Promise<VmInstanceListResult> {
    await waitForMockResponse()
    const keyword = query.keyword.trim().toLocaleLowerCase()
    let filtered = listSharedVmInstances().filter((item) => query.status === 'all' || item.status === query.status)

    if (keyword) {
      filtered = filtered.filter((item) => item[query.searchField].toLocaleLowerCase().includes(keyword))
    }

    if (query.sortField) {
      const direction = query.sortDirection === 'asc' ? 1 : -1
      filtered = [...filtered].sort((left, right) => compareText(left[query.sortField!], right[query.sortField!]) * direction)
    }

    const start = (query.page - 1) * query.pageSize
    return {
      items: filtered.slice(start, start + query.pageSize).map((item) => ({ ...item })),
      total: filtered.length,
      statusCounts: statusCounts(listSharedVmInstances()),
    }
  },

  async changePowerState(ids: string[], action: VmInstancePowerAction) {
    await waitForMockResponse()
    changeSharedVmInstancePowerState(ids, action)
  },
}
export const vmInstanceStore = {
  list: listSharedVmInstances,
  get: getSharedVmInstance,
  changePowerState: changeSharedVmInstancePowerState,
  reset: resetSharedVmInstances,
}
