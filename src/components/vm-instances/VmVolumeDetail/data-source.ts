import { formatBytes } from '@/lib/format'
import { changeSharedVmInstancePowerState, getSharedVmInstance, vmInstanceStore } from './legacy-data-source'
import type {
  VmAttachedVolume,
  VmDetailDataSource,
  VmDetailPowerAction,
  VmInstanceDetail,
  VmMonitorData,
  VmVolumeDetail,
} from './types'

const wait = () => new Promise((resolve) => globalThis.setTimeout(resolve, 120))

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function percentFor(instanceId: string, salt: number) {
  const value = hashString(`${instanceId}:${salt}`)
  return 24 + (value % 65)
}

function buildDetail(instanceId: string): VmInstanceDetail {
  const instance = getSharedVmInstance(instanceId)
  if (!instance) throw new Error('云主机 VM 不存在或无权访问')
  const hash = hashString(instanceId)
  return {
    ...instance,
    cluster: `cluster-${(hash % 3) + 1}`,
    zone: ['cn-hz-1a', 'cn-hz-1b', 'cn-hz-1c'][hash % 3] ?? 'cn-hz-1a',
    os: instance.image,
    publicIp: instance.status === 'running' ? `203.0.113.${(hash % 200) + 10}` : '-',
    cpuUsage: percentFor(instanceId, 1),
    memoryUsage: percentFor(instanceId, 2),
    diskUsage: percentFor(instanceId, 3),
    uptime: instance.status === 'running' ? `${(hash % 9) + 1} 天 ${(hash % 12) + 1} 小时` : '0 天 0 小时',
    lastHeartbeat: '2026-07-29 09:18:00',
  }
}

function buildVolumes(instanceId: string): VmAttachedVolume[] {
  const hash = hashString(instanceId)
  const systemSize = 80 * 1024 ** 3
  const dataSize = 200 * 1024 ** 3
  const systemUsed = ((hash % 35) + 25) * 1024 ** 3
  const dataUsed = ((hash % 90) + 40) * 1024 ** 3
  const dataStatus: VmAttachedVolume['status'] = hash % 4 === 0 ? 'attaching' : 'attached'

  return [
    {
      id: `${instanceId}-root`,
      name: '系统盘',
      role: 'system',
      mountPoint: '/',
      filesystem: 'ext4',
      status: 'attached',
      sizeBytes: systemSize,
      usedBytes: systemUsed,
      usedPercent: Math.min(98, Math.round((systemUsed / systemSize) * 100)),
      createdAt: '2026-07-01 08:00:00',
    },
    {
      id: `${instanceId}-data`,
      name: '数据盘 A',
      role: 'data',
      mountPoint: '/data',
      filesystem: 'xfs',
      status: dataStatus,
      sizeBytes: dataSize,
      usedBytes: dataUsed,
      usedPercent: Math.min(98, Math.round((dataUsed / dataSize) * 100)),
      createdAt: '2026-07-08 08:00:00',
    },
  ]
}

function buildVolumeDetail(instanceId: string, volumeId: string): VmVolumeDetail {
  const detail = buildDetail(instanceId)
  const volume = buildVolumes(instanceId).find((item) => item.id === volumeId)
  if (!volume) throw new Error('云盘不存在或无权访问')
  return {
    ...volume,
    instanceId: detail.id,
    instanceName: detail.name,
    device: volume.role === 'system' ? '/dev/vda' : '/dev/vdb',
    snapshotCount: volume.role === 'system' ? 2 : 5,
    encrypted: volume.role === 'data',
    iops: volume.role === 'system' ? '1200' : '800',
    throughput: volume.role === 'system' ? '180 MB/s' : '320 MB/s',
  }
}

function buildMonitor(instanceId: string): VmMonitorData {
  const cpu = percentFor(instanceId, 4)
  const memory = percentFor(instanceId, 5)
  const disk = percentFor(instanceId, 6)
  const network = percentFor(instanceId, 7)
  return {
    metrics: [
      { label: 'CPU 使用率', value: `${cpu}%`, percent: cpu },
      { label: '内存使用率', value: `${memory}%`, percent: memory },
      { label: '磁盘使用率', value: `${disk}%`, percent: disk },
      { label: '网络负载', value: `${network}%`, percent: network },
    ],
    note: `最近 5 分钟采样，最后一次采样时间 2026-07-29 09:18:00`,
  }
}

export const vmDetailDataSource: VmDetailDataSource = {
  async getDetail(instanceId: string) {
    await wait()
    return buildDetail(instanceId)
  },

  async changePowerState(instanceId: string, action: VmDetailPowerAction) {
    await wait()
    if (action === 'restart') {
      const current = vmInstanceStore.get(instanceId)
      if (current?.status !== 'running') {
        changeSharedVmInstancePowerState([instanceId], 'start')
      }
      return
    }
    changeSharedVmInstancePowerState([instanceId], action)
  },

  async getMonitor(instanceId: string) {
    await wait()
    return buildMonitor(instanceId)
  },

  async listVolumes(instanceId: string) {
    await wait()
    buildDetail(instanceId)
    return buildVolumes(instanceId)
  },

  async getVolumeDetail(instanceId: string, volumeId: string) {
    await wait()
    return buildVolumeDetail(instanceId, volumeId)
  },
}

export function volumeUsageLabel(volume: Pick<VmAttachedVolume, 'usedBytes' | 'sizeBytes'>) {
  return `${formatBytes(volume.usedBytes)} / ${formatBytes(volume.sizeBytes)}`
}
