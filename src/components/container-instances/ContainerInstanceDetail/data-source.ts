import { coreApi } from '@/api/client'
import type { ContainerDetailDataSource, ContainerDetailInstance, ContainerDetailPowerAction } from './types'

function buildDetail(record: Record<string, unknown>): ContainerDetailInstance | undefined {
  return {
    id: record.id as string,
    name: record.name as string,
    kind: 'container',
    state: record.state as string,
    reason: record.reason as string | null,
    provider: record.provider as string,
    node_name: record.node_name as string | null,
    termination_protection: record.termination_protection as boolean,
    endpoint: record.endpoint as string | null,
    vpc_id: record.vpc_id as string | null,
    subnet_id: record.subnet_id as string | null,
    private_ip: record.private_ip as string | null,
    created_at: record.created_at as string,
    updated_at: record.updated_at as string,
    container: record.container
      ? {
          ready_replicas: (record.container as Record<string, unknown>).ready_replicas as number | undefined,
          replicas: (record.container as Record<string, unknown>).replicas as number | undefined,
          rollout_status: (record.container as Record<string, unknown>).rollout_status as string | undefined,
          image: (record.container as Record<string, unknown>).image as string | undefined,
          cpu: (record.container as Record<string, unknown>).cpu as number | string | undefined,
          memory: (record.container as Record<string, unknown>).memory as number | string | undefined,
        }
      : undefined,
  }
}

export const containerDetailDataSource: ContainerDetailDataSource = {
  async getDetail(instanceId: string) {
    const { data, error } = await coreApi.GET('/instances/{instance_id}', {
      params: { path: { instance_id: instanceId } },
    })
    if (error) throw error
    const record = data as Record<string, unknown> | undefined
    if (!record || record.kind !== 'container') return undefined
    return buildDetail(record)
  },

  async changePowerState(instanceId: string, action: ContainerDetailPowerAction) {
    const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
      params: { path: { instance_id: instanceId } },
      body: { action, idempotency_key: '' },
    })
    if (error) {
      throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response?.status }
    }
  },
}
