import type { ReactNode } from 'react'
import type { VmInstance, VmInstanceStatus } from '../types'

export type VmDetailPowerAction = 'start' | 'stop' | 'restart'

export type VmInstanceDetail = VmInstance & {
  cluster: string
  zone: string
  os: string
  publicIp: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  uptime: string
  lastHeartbeat: string
}

export type VmMonitorMetric = {
  label: string
  value: string
  percent: number
}

export type VmMonitorData = {
  metrics: VmMonitorMetric[]
  note: string
}

export type VmAttachedVolume = {
  id: string
  name: string
  role: 'system' | 'data'
  mountPoint: string
  filesystem: string
  status: 'attached' | 'attaching' | 'detached'
  sizeBytes: number
  usedBytes: number
  usedPercent: number
  createdAt: string
}

export type VmVolumeDetail = VmAttachedVolume & {
  instanceId: string
  instanceName: string
  device: string
  snapshotCount: number
  encrypted: boolean
  iops: string
  throughput: string
}

export interface VmDetailDataSource {
  getDetail(instanceId: string): Promise<VmInstanceDetail>
  changePowerState(instanceId: string, action: VmDetailPowerAction): Promise<void>
  getMonitor(instanceId: string): Promise<VmMonitorData>
  listVolumes(instanceId: string): Promise<VmAttachedVolume[]>
  getVolumeDetail(instanceId: string, volumeId: string): Promise<VmVolumeDetail>
}

export type VmActionButton = {
  key: string
  label: ReactNode
  disabled?: boolean
}

export type VmState = VmInstanceStatus
