import { coreApi } from '@/api/client'
import type { ContainerDetailDataSource, ContainerDetailInstance } from './types'

function buildDetail(record: Record<string, unknown>): ContainerDetailInstance | undefined {
  const compute = record.compute as Record<string, unknown> | undefined
  return {
    id: record.id as string,
    name: record.name as string,
    kind: 'container',
    state: record.state as string,
    reason: record.reason as string | null,
    provider: record.provider as string,
    node_name: (compute?.node_name ?? record.node_name) as string | null,
    termination_protection: record.termination_protection as boolean,
    endpoint: record.endpoint as string | null,
    vpc_id: record.vpc_id as string | null,
    subnet_id: record.subnet_id as string | null,
    private_ip: record.private_ip as string | null,
    created_at: record.created_at as string,
    updated_at: record.updated_at as string,
    volumes: record.volumes as ContainerDetailInstance['volumes'],
    storage_attachments: record.storage_attachments as ContainerDetailInstance['storage_attachments'],
    resource_refs: record.resource_refs as ContainerDetailInstance['resource_refs'],
    workload_identity: record.workload_identity as ContainerDetailInstance['workload_identity'],
    ssh: record.ssh as ContainerDetailInstance['ssh'],
    image: record.image as ContainerDetailInstance['image'],
    compute: record.compute as ContainerDetailInstance['compute'],
    container: record.container as ContainerDetailInstance['container'],
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

  async changePowerState(instanceId, body) {
    const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
      params: { path: { instance_id: instanceId } },
      body,
    })
    if (error) {
      throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response?.status }
    }
  },
}
