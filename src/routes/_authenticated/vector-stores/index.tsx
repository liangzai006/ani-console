import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
} from '@arco-design/web-react'
import { useEffect, useState } from 'react'
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

type VectorStore = components['schemas']['VectorStore']
type SearchHit = components['schemas']['VectorStoreSearchHit']
type VectorMetric = components['schemas']['CreateVectorStoreRequest']['metric']

function defaultSearchVector(dimension: number): string {
  const size = Math.max(1, Math.floor(dimension))
  return Array.from({ length: size }, (_, index) => ((index + 1) / 10).toFixed(1)).join(',')
}

function parseSearchVector(raw: string): number[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  return trimmed.split(',').map((value) => Number.parseFloat(value.trim()))
}

export const Route = createFileRoute('/_authenticated/vector-stores/')({
  component: VectorStoresPage,
})

function VectorStoresPage() {
  const qc = useQueryClient()
  const [createVisible, setCreateVisible] = useState(false)
  const [name, setName] = useState('')
  const [dimension, setDimension] = useState(128)
  const [metric, setMetric] = useState<VectorMetric>('cosine')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [searchVector, setSearchVector] = useState('')
  const [topK, setTopK] = useState(10)
  const [filterJson, setFilterJson] = useState('{}')
  const [documentsJson, setDocumentsJson] = useState('[\n  {\n    "content": "",\n    "metadata": {},\n    "id": ""\n  }\n]')

  const list = useQuery({
    queryKey: ['vector-stores'],
    queryFn: () => listOrThrow(() => coreApi.GET('/vector-stores', { params: { query: { limit: 50 } } })),
  })

  const detail = useQuery({
    queryKey: ['vector-store', detailId],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/vector-stores/{vector_store_id}', {
        params: { path: { vector_store_id: detailId! } },
      })
      if (error) throw error
      return data
    },
    enabled: !!detailId,
  })

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.POST('/vector-stores', {
        body: { name, dimension, metric, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setCreateVisible(false)
      setName('')
      setDimension(128)
      setMetric('cosine')
      qc.invalidateQueries({ queryKey: ['vector-stores'] })
    },
    onError: (e) => showApiError(e),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await coreApi.DELETE('/vector-stores/{vector_store_id}', {
        params: { path: { vector_store_id: id } },
      })
      if (error) throw error
    },
    onSuccess: () => {
      if (detailId) setDetailId(null)
      qc.invalidateQueries({ queryKey: ['vector-stores'] })
    },
    onError: (e) => showApiError(e),
  })

  const search = useMutation({
    mutationFn: async () => {
      const dimension = detail.data?.dimension
      const vector = parseSearchVector(searchVector)
      if (vector.some((value) => Number.isNaN(value))) {
        throw new Error('向量必须为逗号分隔的数字')
      }
      if (dimension != null && vector.length !== dimension) {
        throw new Error(`向量维度必须为 ${dimension}，当前为 ${vector.length}`)
      }
      const parsedFilter = filterJson.trim() ? JSON.parse(filterJson) : undefined
      const { data, error } = await coreApi.POST('/vector-stores/{vector_store_id}/search', {
        params: { path: { vector_store_id: detailId! } },
        body: { vector, top_k: topK, filter: parsedFilter, idempotency_key: newIdempotencyKey() },
      })
      if (error) throw error
      return data
    },
    onError: (e) => showApiError(e),
  })

  const insertDoc = useMutation({
    mutationFn: async () => {
      const documents = JSON.parse(documentsJson)
      if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('documents 必须是非空 JSON 数组')
      }
      const { error } = await coreApi.POST('/vector-stores/{vector_store_id}/documents', {
        params: { path: { vector_store_id: detailId! } },
        body: {
          documents,
          idempotency_key: newIdempotencyKey(),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      setDocumentsJson('[\n  {\n    "content": "",\n    "metadata": {},\n    "id": ""\n  }\n]')
    },
    onError: (e) => showApiError(e),
  })

  const items = (list.data?.items ?? []) as VectorStore[]
  const searchHits = (search.data?.items ?? []) as SearchHit[]
  const detailRecord = detail.data

  useEffect(() => {
    if (!detailRecord?.dimension) return
    setSearchVector(defaultSearchVector(detailRecord.dimension))
    search.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset search state when switching stores
  }, [detailRecord?.id, detailRecord?.dimension])

  const confirmDelete = (row: VectorStore) => {
    Modal.confirm({
      title: '删除向量库',
      content: `确定删除「${row.name ?? row.id}」？此操作不可恢复。`,
      onOk: () => remove.mutateAsync(row.id),
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="向量存储"
        subtitle="Milvus 向量库"
        extra={
          <Button type="primary" onClick={() => setCreateVisible(true)}>
            创建
          </Button>
        }
      />
      <CursorTable<VectorStore>
        columns={[
          {
            title: '名称',
            render: (_, r) => (
              <Button type="text" onClick={() => setDetailId(r.id)}>
                {r.name ?? r.id}
              </Button>
            ),
          },
          { title: '维度', dataIndex: 'dimension' },
          { title: '度量', dataIndex: 'metric' },
          { title: '状态', render: (_, r) => <StatusTag status={r.state} /> },
          { title: '创建时间', render: (_, r) => formatDateTime(r.created_at) },
          {
            title: '操作',
            render: (_, r) => (
              <Button type="text" status="danger" onClick={() => confirmDelete(r)}>
                删除
              </Button>
            ),
          },
        ]}
        data={{ items, next_cursor: list.data?.next_cursor }}
        loading={list.isLoading}
        error={list.error}
        rowKey="id"
        emptyDescription="暂无向量库，点击右上角创建"
      />
      <Drawer
        width={560}
        visible={!!detailId}
        title={`向量库详情 · ${detailRecord?.name ?? detailId ?? ''}`}
        footer={null}
        onCancel={() => {
          setDetailId(null)
          search.reset()
          setSearchVector('')
          setTopK(10)
          setFilterJson('{}')
          setDocumentsJson('[\n  {\n    "content": "",\n    "metadata": {},\n    "id": ""\n  }\n]')
        }}
      >
        {detail.isLoading && !detailRecord ? (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        ) : null}
        {detail.isError ? <ApiErrorAlert error={detail.error} /> : null}
        {detailRecord ? (
          <div className="space-y-4">
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              data={[
                { label: 'ID', value: detailRecord.id },
                { label: '维度', value: String(detailRecord.dimension) },
                { label: '度量', value: detailRecord.metric },
                { label: '状态', value: <StatusTag status={detailRecord.state} /> },
                { label: '创建时间', value: formatDateTime(detailRecord.created_at) },
                { label: '更新时间', value: formatDateTime(detailRecord.updated_at) },
              ]}
            />
            <Tabs>
              <Tabs.TabPane key="search" title="检索测试">
                <div className="space-y-4">
                  <Space wrap className="w-full">
                    <Input
                      value={searchVector}
                      onChange={setSearchVector}
                      placeholder={
                        detailRecord?.dimension
                          ? `向量（逗号分隔，需 ${detailRecord.dimension} 维）`
                          : '向量（逗号分隔）'
                      }
                      className="min-w-[240px] flex-1"
                    />
                    <InputNumber
                      value={topK}
                      min={1}
                      max={100}
                      precision={0}
                      onChange={(value) => setTopK(Number(value ?? 10))}
                    />
                    <Button type="primary" loading={search.isPending} onClick={() => search.mutateAsync()}>
                      搜索
                    </Button>
                  </Space>
                  <Input.TextArea
                    value={filterJson}
                    onChange={setFilterJson}
                    placeholder='过滤条件 JSON，例如 {"tenant":"demo"}'
                    autoSize={{ minRows: 2, maxRows: 4 }}
                  />
                  {search.isIdle && !search.data ? (
                    <Empty description="输入向量后点击搜索" />
                  ) : (
                    <CursorTable<SearchHit>
                      columns={[
                        { title: 'ID', dataIndex: 'id' },
                        { title: '得分', dataIndex: 'score' },
                        {
                          title: '元数据',
                          render: (_, r) => JSON.stringify(r.metadata ?? {}),
                        },
                      ]}
                      data={{ items: searchHits }}
                      loading={search.isPending}
                      error={search.error}
                      rowKey="id"
                      emptyDescription="无检索结果"
                    />
                  )}
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane key="docs" title="插入文档">
                <div className="space-y-4">
                  <Input.TextArea
                    value={documentsJson}
                    onChange={setDocumentsJson}
                    placeholder='Documents JSON，例如 [{"content":"hello","metadata":{"source":"manual"},"id":"doc-1"}]'
                    autoSize={{ minRows: 8, maxRows: 14 }}
                  />
                  <Button type="primary" loading={insertDoc.isPending} onClick={() => insertDoc.mutateAsync()}>
                    批量插入
                  </Button>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </div>
        ) : null}
      </Drawer>
      <Modal
        visible={createVisible}
        title="创建向量库"
        onCancel={() => setCreateVisible(false)}
        onOk={() => create.mutateAsync()}
        confirmLoading={create.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} />
          </Form.Item>
          <Form.Item label="维度" required>
            <InputNumber value={dimension} min={1} precision={0} onChange={(value) => setDimension(Number(value ?? 128))} />
          </Form.Item>
          <Form.Item label="度量" required>
            <Select value={metric} onChange={setMetric}>
              <Select.Option value="cosine">cosine</Select.Option>
              <Select.Option value="l2">l2</Select.Option>
              <Select.Option value="ip">ip</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
