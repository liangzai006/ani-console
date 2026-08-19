import type { components } from '@/api/core-schema'

type Cluster = components['schemas']['K8sCluster']
type NodePool = components['schemas']['K8sClusterNodePool']
type Workload = components['schemas']['K8sClusterWorkload']

// 开发预览开关：设置 VITE_K8S_MOCK_DATA=false 可恢复真实接口。
// 后续移除 Mock 时，删除本文件及 K8S 页面中的 mock 查询分支即可。
export const K8S_MOCK_ENABLED = import.meta.env.DEV && import.meta.env.VITE_K8S_MOCK_DATA !== 'false'

export const mockClusters: Cluster[] = [
  {
    id: 'k8s_5oi7sx',
    tenant_id: 'tenant-a',
    name: 'prod-beijing-a',
    version: '1.28',
    state: 'running',
    created_at: '2026-07-10T01:10:00Z',
    updated_at: '2026-08-18T06:35:00Z',
  },
  {
    id: 'cls-gpu-training-02',
    tenant_id: 'tenant-a',
    name: 'gpu-training',
    version: '1.31.4',
    state: 'running',
    created_at: '2026-07-26T08:10:00Z',
    updated_at: '2026-08-18T02:12:00Z',
  },
  {
    id: 'cls-staging-03',
    tenant_id: 'tenant-a',
    name: 'staging-shanghai',
    version: '1.30.8',
    state: 'running',
    created_at: '2026-08-02T09:30:00Z',
    updated_at: '2026-08-17T11:45:00Z',
  },
  {
    id: 'cls-edge-04',
    tenant_id: 'tenant-a',
    name: 'edge-hangzhou',
    version: '1.31.4',
    state: 'provisioning',
    reason: '正在初始化控制面与默认节点池',
    created_at: '2026-08-18T07:42:00Z',
    updated_at: '2026-08-18T07:46:00Z',
  },
  {
    id: 'cls-dev-legacy-05',
    tenant_id: 'tenant-a',
    name: 'dev-legacy',
    version: '1.29.12',
    state: 'deleting',
    reason: '正在释放集群资源',
    created_at: '2026-06-12T01:05:00Z',
    updated_at: '2026-08-18T05:18:00Z',
  },
]

const defaultNodePools: NodePool[] = [
  {
    id: 'pool-system',
    tenant_id: 'tenant-a',
    name: 'system-pool',
    node_count: 1,
    instance_type: 'ecs.c8i.2xlarge',
    state: 'running',
    created_at: '2026-07-18T03:28:00Z',
    updated_at: '2026-08-16T05:30:00Z',
  },
  {
    id: 'pool-worker',
    tenant_id: 'tenant-a',
    name: 'worker-pool',
    node_count: 1,
    instance_type: 'ecs.g8i.4xlarge',
    state: 'running',
    created_at: '2026-07-18T03:35:00Z',
    updated_at: '2026-08-18T01:20:00Z',
  },
  {
    id: 'pool-gpu',
    tenant_id: 'tenant-a',
    name: 'gpu-pool',
    node_count: 1,
    instance_type: 'ecs.gn8is.4xlarge',
    gpu: { vendor: 'NVIDIA', model: 'L20', count: 1, resource_name: 'nvidia.com/gpu' },
    state: 'running',
    created_at: '2026-07-20T06:40:00Z',
    updated_at: '2026-08-18T04:16:00Z',
  },
]

const defaultWorkloads: Workload[] = [
  {
    name: 'api-gateway',
    namespace: 'production',
    kind: 'Deployment',
    replicas: 4,
    ready_replicas: 4,
    image: 'registry.example.com/ani/api-gateway:v2.8.1',
    status: 'running',
    created_at: '2026-08-10T02:20:00Z',
    dev_profile: { mode: 'local', provider: 'mock', real_provider: false, reason: 'K8s 页面开发预览数据' },
  },
  {
    name: 'model-serving',
    namespace: 'ai-platform',
    kind: 'Deployment',
    replicas: 3,
    ready_replicas: 3,
    image: 'registry.example.com/ani/model-serving:v1.12.0',
    status: 'running',
    created_at: '2026-08-12T07:15:00Z',
    dev_profile: { mode: 'local', provider: 'mock', real_provider: false, reason: 'K8s 页面开发预览数据' },
  },
  {
    name: 'daily-backup',
    namespace: 'platform-system',
    kind: 'CronJob',
    replicas: 1,
    ready_replicas: 0,
    image: 'registry.example.com/ani/backup:v3.2.0',
    status: 'succeeded',
    created_at: '2026-08-01T00:00:00Z',
    dev_profile: { mode: 'local', provider: 'mock', real_provider: false, reason: 'K8s 页面开发预览数据' },
  },
]

export function getMockCluster(clusterId: string): Cluster {
  return mockClusters.find((cluster) => cluster.id === clusterId) ?? mockClusters[0]
}

export function getMockNodePools(clusterId: string): NodePool[] {
  return defaultNodePools.map((pool) => ({ ...pool, cluster_id: clusterId }))
}

export function getMockWorkloads(): Workload[] {
  return defaultWorkloads
}
