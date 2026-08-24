import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Empty, Modal, Space, Spin } from '@arco-design/web-react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { DetailPageFrame } from '@/components/detailbase'
import { ApiErrorAlert } from '@/components/feedback/ApiErrorAlert'
import { AliIcon } from '@/components/icons/AliIcon'
import { StatusTag } from '@/components/shell/StatusTag'
import { VectorStoreWorkbench } from '@/components/storage/VectorStoreWorkbench'
import { formatDateTime } from '@/lib/format'

type VectorStore = components['schemas']['VectorStore']

export const Route = createFileRoute('/_authenticated/vector-stores/$vectorStoreId')({ component: VectorStoreDetailPage })

function VectorStoreDetailPage() {
  const { vectorStoreId } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['vector-store', vectorStoreId],
    queryFn: async () => { const { data, error } = await coreApi.GET('/vector-stores/{vector_store_id}', { params: { path: { vector_store_id: vectorStoreId } } }); if (error) throw error; return data },
  })
  const remove = useMutation({
    mutationFn: async (_: undefined) => { const { error } = await coreApi.DELETE('/vector-stores/{vector_store_id}', { params: { path: { vector_store_id: vectorStoreId } } }); if (error) throw error },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vector-stores'] }); navigate({ to: '/vector-stores' }) },
    onError: (error) => showApiError(error),
  })
  if (detail.isLoading && !detail.data) return <div className="flex justify-center py-20"><Spin /></div>
  if (detail.error || !detail.data) return <ApiErrorAlert error={detail.error ?? new Error('向量存储不存在或无权访问')} title="向量存储加载失败" />
  const store = detail.data as VectorStore
  return <DetailPageFrame
    breadcrumbs={[{ label: '存储' }, { label: '向量存储', to: '/vector-stores' }, { label: store.name }]}
    title={store.name} status={<StatusTag status={store.state} />} icon={<AliIcon name="xiangliang" size={28} />}
    headerItems={[{ label: '向量存储 ID', value: store.id }, { label: '维度', value: store.dimension }, { label: '创建时间', value: formatDateTime(store.created_at) }]}
    actions={<Button status="danger" loading={remove.isPending} onClick={() => Modal.confirm({ title: '删除向量存储', content: `确定删除「${store.name}」？其中的向量数据将不可恢复。`, okButtonProps: { status: 'danger' }, onOk: () => remove.mutateAsync(undefined) })}>删除</Button>}
    cards={[
      { key: 'basic', title: '基本信息', fields: [{ label: 'ID', value: store.id }, { label: '名称', value: store.name }, { label: '状态', value: <StatusTag status={store.state} /> }, { label: '向量维度', value: store.dimension }, { label: '距离度量', value: store.metric.toUpperCase() }, { label: '状态原因', value: store.reason || '—' }, { label: '创建时间', value: formatDateTime(store.created_at) }, { label: '更新时间', value: formatDateTime(store.updated_at) }] },
      { key: 'index-summary', title: '索引摘要', fields: [{ label: '索引状态', value: <StatusTag status={store.state === 'ready' ? 'ready' : store.state} /> }, { label: '嵌入模型', value: '—' }, { label: '向量数量', value: '—' }] },
    ]}
    tabs={[
      { key: 'workbench', label: '数据与检索', content: <VectorStoreWorkbench store={store} /> },
      { key: 'index', label: '索引', content: <Space direction="vertical" size={12} className="w-full"><Alert type="info" showIcon content="距离度量与向量维度在创建时确定。" /><Empty description="当前 Core API 暂未提供索引详情、重建或参数调整能力" /></Space> },
      { key: 'related', label: '关联资源', content: <Empty description="当前 Core API 暂未提供向量存储与知识库的关联数据" /> },
      { key: 'events', label: '事件', content: <Space direction="vertical" size={12} className="w-full">{store.reason ? <Alert type="warning" showIcon content={store.reason} /> : null}<Empty description="当前 Core API 暂未提供向量存储事件列表" /></Space> },
    ]}
    onBack={() => navigate({ to: '/vector-stores' })}
  />
}
