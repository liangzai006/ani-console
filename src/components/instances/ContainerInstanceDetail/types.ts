import type { ReactNode } from 'react'
import type { components } from '@/api/core-schema'

type InstanceRecord = components['schemas']['InstanceRecord']

export type ContainerDetailPowerAction = 'start' | 'stop' | 'restart' | 'delete'

export type ContainerDetailInstance = {
  id: string
  name: string
  kind: 'container'
  state: string | undefined
  reason?: string | null
  provider: string
  node_name?: string | null
  termination_protection: boolean
  endpoint?: string | null
  vpc_id?: string | null
  subnet_id?: string | null
  private_ip?: string | null
  created_at?: string
  updated_at?: string
  volumes?: InstanceRecord['volumes']
  storage_attachments?: InstanceRecord['storage_attachments']
  resource_refs?: InstanceRecord['resource_refs']
  workload_identity?: InstanceRecord['workload_identity']
  ssh?: InstanceRecord['ssh']
  image?: InstanceRecord['image']
  compute?: InstanceRecord['compute']
  container?: InstanceRecord['container']
}

export type ContainerDetailDataSource = {
  getDetail(instanceId: string): Promise<ContainerDetailInstance | undefined>
  changePowerState(instanceId: string, action: ContainerDetailPowerAction): Promise<void>
}

export type ContainerActionButton = {
  key: string
  label: ReactNode
  disabled?: boolean
}
