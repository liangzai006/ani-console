import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Message,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
} from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { StatusTag } from '@/components/shell/StatusTag'
import { CursorTable } from '@/components/tables/CursorTable'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { newIdempotencyKey } from '@/lib/idempotency'
import { showApiError } from '@/api/helpers'
import { listOrThrow } from '@/lib/api-list'
import { formatDateTime } from '@/lib/format'
import type { components } from '@/api/core-schema'

type RegistryProject = components['schemas']['RegistryProject']
type RegistryRepository = components['schemas']['RegistryRepository']
type RegistryArtifact = components['schemas']['RegistryArtifact']
type RegistryAction = components['schemas']['SetRegistryPermissionRequest']['actions'][number]
type RegistryPullSecretKubernetesApply = components['schemas']['RegistryPullSecretKubernetesApply']

type PullSecretMode = 'create-only' | 'kubernetes-apply'

const K8S_DOCKER_CONFIG_SECRET_TYPE = 'kubernetes.io/dockerconfigjson'

export const Route = createFileRoute('/_authenticated/registry/')({
  component: RegistryPage,
})

function RegistryPage() {
  const qc = useQueryClient()
  const [project, setProject] = useState<string | null>(null)
  const [repo, setRepo] = useState<string | null>(null)
  const [createVisible, setCreateVisible] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectPublic, setProjectPublic] = useState(false)
  const [permVisible, setPermVisible] = useState(false)
  const [permissionSubject, setPermissionSubject] = useState('developers')
  const [permissionActions, setPermissionActions] = useState<RegistryAction[]>(['pull', 'push'])
  const [pullSecretVisible, setPullSecretVisible] = useState(false)
  const [pullSecretMode, setPullSecretMode] = useState<PullSecretMode>('create-only')
  const [pullSecretName, setPullSecretName] = useState('ani-registry-pull')
  const [pullSecretNamespace, setPullSecretNamespace] = useState('')
  const [pullSecretApplyResult, setPullSecretApplyResult] = useState<RegistryPullSecretKubernetesApply | null>(null)
  const [scanImage, setScanImage] = useState('')
  const [scanResult, setScanResult] = useState<components['schemas']['RegistryScanResult'] | null>(null)

  const projects = useQuery({
    queryKey: ['registry-projects'],
    queryFn: () => listOrThrow(() => coreApi.GET('/registry/projects', { params: { query: { limit: 50 } } })),
  })

  const repos = useQuery({
    queryKey: ['registry-repos', project],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET('/registry/projects/{project}/repositories', {
          params: { path: { project: project! }, query: { limit: 50 } },
        }),
      ),
    enabled: !!project,
  })

  const artifacts = useQuery({
    queryKey: ['registry-artifacts', project, repo],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET('/registry/projects/{project}/repositories/{repository}/artifacts', {
          params: { path: { project: project!, repository: repo! }, query: { limit: 50 } },
        }),
      ),
    enabled: !!project && !!repo,
  })

  const scan = useQuery({
    queryKey: ['registry-scan', project],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/registry/projects/{project}/scan-report', {
        params: { path: { project: project! } },
      })
      if (error) throw error
      return data
    },
    enabled: !!project,
  })

  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/registry/projects', {
        body: { name: projectName, public: projectPublic, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setCreateVisible(false)
      setProjectName('')
      setProjectPublic(false)
      qc.invalidateQueries({ queryKey: ['registry-projects'] })
    },
    onError: (e) => showApiError(e),
  })

  const setPermission = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/registry/projects/{project}/repositories/{repository}/permissions', {
        params: { path: { project: project!, repository: repo! } },
        body: { subject: permissionSubject, actions: permissionActions, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => setPermVisible(false),
    onError: (e) => showApiError(e),
  })

  const resetPullSecretForm = () => {
    setPullSecretMode('create-only')
    setPullSecretName('ani-registry-pull')
    setPullSecretNamespace('')
  }

  const openPullSecretModal = () => {
    resetPullSecretForm()
    setPullSecretVisible(true)
  }

  const submitPullSecret = () => {
    const namespace = pullSecretNamespace.trim()
    if (pullSecretMode === 'kubernetes-apply' && !namespace) {
      Message.error('创建并应用到 Kubernetes 时，Namespace 为必填项')
      return
    }
    createPullSecret.mutateAsync()
  }

  const createPullSecret = useMutation({
    mutationFn: async () => {
      const namespace = pullSecretNamespace.trim()
      const body = {
        name: pullSecretName,
        idempotency_key: newIdempotencyKey(),
        ...(namespace ? { namespace } : {}),
      }

      if (pullSecretMode === 'kubernetes-apply') {
        const { data, error } = await coreApi.POST('/registry/projects/{project}/pull-secret/kubernetes-apply', {
          params: { path: { project: project! } },
          body: { ...body, namespace },
        })
        if (error) throw error
        return data
      }

      const { error } = await coreApi.POST('/registry/projects/{project}/pull-secret', {
        params: { path: { project: project! } },
        body,
      })
      if (error) throw error
      return undefined
    },
    onSuccess: (data) => {
      setPullSecretVisible(false)
      resetPullSecretForm()
      if (data) setPullSecretApplyResult(data)
    },
    onError: (e) => showApiError(e),
  })

  const fetchImageScan = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.GET('/registry/images/scan-result', {
        params: { query: { image: scanImage } },
      })
      if (error) throw error
      setScanResult(data ?? null)
    },
    onError: (e) => showApiError(e),
  })

  const projectItems = (projects.data?.items ?? []) as RegistryProject[]
  const repoItems = (repos.data?.items ?? []) as RegistryRepository[]
  const artifactItems = (artifacts.data?.items ?? []) as RegistryArtifact[]

  const selectProject = (name: string) => {
    setProject(name)
    setRepo(null)
    setScanResult(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="镜像 Registry"
        subtitle="Harbor 项目 / 仓库 / 制品"
        extra={
          <Button type="primary" onClick={() => setCreateVisible(true)}>
            创建项目
          </Button>
        }
      />

      <Card title="项目">
        <CursorTable<RegistryProject>
          columns={[
            {
              title: '项目',
              render: (_, r) => (
                <Button type="text" onClick={() => selectProject(r.name)}>
                  {r.name}
                </Button>
              ),
            },
            { title: '公开', render: (_, r) => (r.public ? '是' : '否') },
            { title: '创建时间', render: (_, r) => formatDateTime(r.created_at) },
          ]}
          data={{ items: projectItems, next_cursor: projects.data?.next_cursor }}
          loading={projects.isLoading}
          error={projects.error}
          rowKey="name"
          emptyDescription="暂无 Registry 项目，点击右上角创建"
        />
      </Card>

      {!project ? (
        <Empty description="请选择项目以查看仓库与扫描报告" />
      ) : (
        <Card title={`仓库 · ${project}`}>
          <div className="space-y-4">
            <CursorTable<RegistryRepository>
              columns={[
                {
                  title: '仓库',
                  render: (_, r) => (
                    <Button type="text" onClick={() => setRepo(r.name)}>
                      {r.name}
                    </Button>
                  ),
                },
                { title: '制品数', dataIndex: 'artifact_count' },
                { title: '拉取次数', dataIndex: 'pull_count' },
              ]}
              data={{ items: repoItems, next_cursor: repos.data?.next_cursor }}
              loading={repos.isLoading}
              error={repos.error}
              rowKey="name"
              emptyDescription="该项目暂无仓库"
            />
            <div>
              <Typography.Text type="secondary" className="mb-2 block text-sm font-medium">
                项目扫描报告
              </Typography.Text>
              {scan.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spin />
                </div>
              ) : scan.isError ? (
                <ApiErrorAlert error={scan.error} />
              ) : scan.data ? (
                <Descriptions
                  column={{ xs: 1, sm: 2, md: 4 }}
                  data={[
                    { label: '状态', value: <StatusTag status={scan.data.status} /> },
                    { label: 'Critical', value: String(scan.data.critical) },
                    { label: 'High', value: String(scan.data.high) },
                    { label: '已扫描制品', value: `${scan.data.scanned_artifacts}/${scan.data.artifacts_total}` },
                  ]}
                />
              ) : (
                <Empty description="暂无扫描报告" />
              )}
            </div>
          </div>
        </Card>
      )}

      {project && !repo ? (
        <Empty description="请选择仓库以查看制品与权限操作" />
      ) : null}

      {project && repo ? (
        <Card
          title={`制品 · ${repo}`}
          extra={
            <Space>
              <Button type="outline" onClick={() => setPermVisible(true)}>
                设置权限
              </Button>
              <Button type="outline" onClick={openPullSecretModal}>
                Pull Secret
              </Button>
            </Space>
          }
        >
          <div className="space-y-4">
            <CursorTable<RegistryArtifact>
              columns={[
                { title: 'Digest', dataIndex: 'digest' },
                { title: '标签', render: (_, r) => (r.tags?.length ? r.tags.join(', ') : '—') },
                { title: '大小', dataIndex: 'size_bytes' },
                {
                  title: '扫描',
                  render: (_, r) => <StatusTag status={r.scan_status?.status} />,
                },
                { title: '推送时间', render: (_, r) => formatDateTime(r.pushed_at) },
              ]}
              data={{ items: artifactItems, next_cursor: artifacts.data?.next_cursor }}
              loading={artifacts.isLoading}
              error={artifacts.error}
              rowKey="digest"
              emptyDescription="该仓库暂无制品"
            />
            <div className="space-y-3">
              <Typography.Text type="secondary" className="block text-sm font-medium">
                镜像扫描查询
              </Typography.Text>
              <Space wrap>
                <Input
                  value={scanImage}
                  onChange={setScanImage}
                  placeholder="完整镜像引用"
                  className="min-w-[280px]"
                />
                <Button type="primary" loading={fetchImageScan.isPending} onClick={() => fetchImageScan.mutateAsync()}>
                  查询扫描结果
                </Button>
              </Space>
              {scanResult == null ? (
                <Empty description="输入镜像引用后查询" />
              ) : (
                <Descriptions
                  column={{ xs: 1, sm: 2, md: 4 }}
                  data={[
                    { label: '镜像', value: scanResult.image },
                    { label: '状态', value: <StatusTag status={scanResult.status} /> },
                    { label: 'Critical', value: String(scanResult.critical) },
                    { label: 'High', value: String(scanResult.high) },
                  ]}
                />
              )}
            </div>
          </div>
        </Card>
      ) : null}

      <Modal
        visible={permVisible}
        title="仓库权限"
        onCancel={() => setPermVisible(false)}
        onOk={() => setPermission.mutateAsync()}
        confirmLoading={setPermission.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="Subject" required>
            <Input value={permissionSubject} onChange={setPermissionSubject} />
          </Form.Item>
          <Form.Item label="Actions" required>
            <Select mode="multiple" value={permissionActions} onChange={setPermissionActions}>
              <Select.Option value="pull">pull</Select.Option>
              <Select.Option value="push">push</Select.Option>
              <Select.Option value="delete">delete</Select.Option>
              <Select.Option value="scan">scan</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        visible={pullSecretVisible}
        title="创建 Pull Secret"
        onCancel={() => {
          setPullSecretVisible(false)
          resetPullSecretForm()
        }}
        onOk={submitPullSecret}
        confirmLoading={createPullSecret.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="操作模式" required>
            <Radio.Group value={pullSecretMode} onChange={setPullSecretMode}>
              <Radio value="create-only">仅创建 Pull Secret</Radio>
              <Radio value="kubernetes-apply">创建并应用到 Kubernetes Namespace</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="名称" required>
            <Input value={pullSecretName} onChange={setPullSecretName} />
          </Form.Item>
          <Form.Item
            label="Namespace"
            required={pullSecretMode === 'kubernetes-apply'}
            extra={
              pullSecretMode === 'create-only'
                ? '仅创建模式下可选，用于记录目标命名空间'
                : '将 dockerconfigjson Secret 注入该命名空间'
            }
          >
            <Input
              value={pullSecretNamespace}
              onChange={setPullSecretNamespace}
              placeholder={pullSecretMode === 'kubernetes-apply' ? '例如 default' : '可选'}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        visible={!!pullSecretApplyResult}
        title="Pull Secret 已应用到 Kubernetes"
        okText="关闭"
        hideCancel
        onOk={() => setPullSecretApplyResult(null)}
        onCancel={() => setPullSecretApplyResult(null)}
      >
        <Descriptions
          column={1}
          data={[
            { label: 'Project', value: pullSecretApplyResult?.project },
            { label: 'Secret name', value: pullSecretApplyResult?.kubernetes_secret_name ?? pullSecretApplyResult?.name },
            { label: 'Namespace', value: pullSecretApplyResult?.kubernetes_namespace },
            { label: 'Secret type', value: K8S_DOCKER_CONFIG_SECRET_TYPE },
          ]}
        />
      </Modal>
      <Modal
        visible={createVisible}
        title="创建项目"
        onCancel={() => setCreateVisible(false)}
        onOk={() => createProject.mutateAsync()}
        confirmLoading={createProject.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={projectName} onChange={setProjectName} placeholder="项目名称" />
          </Form.Item>
          <Form.Item label="公开项目">
            <Switch checked={projectPublic} onChange={setProjectPublic} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
