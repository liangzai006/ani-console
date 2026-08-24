import { useMutation } from '@tanstack/react-query'
import { Alert, Button, Empty, Form, Input, InputNumber, Space, Table, Tabs, Typography } from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { StatusTag } from '@/components/shell/StatusTag'
import { newIdempotencyKey } from '@/lib/idempotency'

type VectorStore = components['schemas']['VectorStore']
type SearchHit = components['schemas']['VectorStoreSearchHit']
const EMPTY_DOCUMENTS = '[\n  {\n    "content": "",\n    "metadata": {},\n    "id": ""\n  }\n]'

export function VectorStoreWorkbench({ store }: { store: VectorStore }) {
  const [searchVector, setSearchVector] = useState('')
  const [topK, setTopK] = useState(10)
  const [filterJson, setFilterJson] = useState('{}')
  const [documentsJson, setDocumentsJson] = useState(EMPTY_DOCUMENTS)
  const [insertResult, setInsertResult] = useState<components['schemas']['VectorStoreDocumentInsertResponse'] | null>(null)
  useEffect(() => { setSearchVector(Array.from({ length: store.dimension }, () => '0').join(',')) }, [store.dimension, store.id])
  const search = useMutation({
    mutationFn: async (_: undefined) => {
      const vector = searchVector.split(',').map((value) => Number.parseFloat(value.trim()))
      if (vector.some(Number.isNaN)) throw new Error('向量必须为逗号分隔的数字')
      if (vector.length !== store.dimension) throw new Error(`向量维度必须为 ${store.dimension}，当前为 ${vector.length}`)
      const filter = filterJson.trim() ? JSON.parse(filterJson) : undefined
      const { data, error } = await coreApi.POST('/vector-stores/{vector_store_id}/search', { params: { path: { vector_store_id: store.id } }, body: { vector, top_k: topK, filter, idempotency_key: newIdempotencyKey() } })
      if (error) throw error
      return data
    },
    onError: (error) => showApiError(error),
  })
  const insert = useMutation({
    mutationFn: async (_: undefined) => {
      const documents = JSON.parse(documentsJson)
      if (!Array.isArray(documents) || documents.length === 0) throw new Error('documents 必须是非空 JSON 数组')
      if (documents.some((item) => !item || typeof item.content !== 'string' || !item.content.trim())) throw new Error('每条文档都必须包含非空 content')
      const { data, error } = await coreApi.POST('/vector-stores/{vector_store_id}/documents', { params: { path: { vector_store_id: store.id } }, body: { documents, idempotency_key: newIdempotencyKey() } })
      if (error) throw error
      return data
    },
    onSuccess: (data) => { setInsertResult(data); setDocumentsJson(EMPTY_DOCUMENTS) },
    onError: (error) => showApiError(error),
  })
  const hits = (search.data?.items ?? []) as SearchHit[]
  return <Tabs defaultActiveTab="search">
    <Tabs.TabPane key="search" title="检索测试"><div className="space-y-4">
      <Alert type="info" showIcon content={`请输入 ${store.dimension} 维原始向量。当前 Core API 不支持直接输入自然语言生成查询向量。`} />
      <Form layout="vertical">
        <Form.Item label="查询向量" required><Input.TextArea value={searchVector} onChange={setSearchVector} autoSize={{ minRows: 4, maxRows: 8 }} placeholder="使用英文逗号分隔每个数值" /></Form.Item>
        <Space wrap>
          <Form.Item label="Top K"><InputNumber value={topK} min={1} max={100} precision={0} onChange={(value) => setTopK(Number(value ?? 10))} /></Form.Item>
          <Form.Item label="元数据过滤（JSON）"><Input value={filterJson} onChange={setFilterJson} className="min-w-[320px]" /></Form.Item>
        </Space>
        <Button type="primary" loading={search.isPending} onClick={() => search.mutateAsync(undefined)}>执行检索</Button>
      </Form>
      {search.data ? <Table<SearchHit> columns={[{ title: '文档 ID', dataIndex: 'id' }, { title: '得分', dataIndex: 'score' }, { title: '元数据', render: (_, row) => <Typography.Text code>{JSON.stringify(row.metadata ?? {})}</Typography.Text> }]} data={hits} rowKey="id" pagination={false} noDataElement={<Empty description="没有匹配的向量结果" />} /> : <Empty description="输入查询向量后执行检索" />}
    </div></Tabs.TabPane>
    <Tabs.TabPane key="documents" title="写入文档"><div className="space-y-4">
      <Alert type="info" showIcon content="文本嵌入由 ANI Core 异步处理；当前接口仅提交写入任务，暂不提供文档列表查询。" />
      {insertResult ? <Alert type="success" showIcon content={<>已提交 {insertResult.inserted_count} 条文档，任务 <Typography.Text code>{insertResult.task_id}</Typography.Text>，状态 <StatusTag status={insertResult.status ?? 'pending'} /></>} /> : null}
      <Form layout="vertical"><Form.Item label="Documents JSON" required><Input.TextArea value={documentsJson} onChange={setDocumentsJson} autoSize={{ minRows: 10, maxRows: 18 }} /></Form.Item>
        <Button type="primary" loading={insert.isPending} onClick={() => insert.mutateAsync(undefined)}>批量写入</Button>
      </Form>
    </div></Tabs.TabPane>
  </Tabs>
}
