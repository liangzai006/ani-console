import type { ReactNode } from 'react'

export type ContainerDetailPowerAction = 'start' | 'stop' | 'restart' | 'delete'

export type ContainerDetailInstance = {
  id: string
  name: string
  kind: 'container'
  state: string | undefined
  state_message?: string | null
  provider: string
  node_name?: string | null
  termination_protection: boolean
  endpoint?: string | null
  vpc_id?: string | null
  subnet_id?: string | null
  private_ip?: string | null
  created_at?: string
  updated_at?: string
  container?: {
    ready_replicas?: number
    replicas?: number
    rollout_status?: string
    image?: string
    cpu?: number | string
    memory?: number | string
  }
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
