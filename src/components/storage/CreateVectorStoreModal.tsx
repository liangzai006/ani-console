import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, InputNumber, Modal, Select, Typography } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { newIdempotencyKey } from '@/lib/idempotency'

type VectorStore = components['schemas']['VectorStore']
type VectorMetric = components['schemas']['CreateVectorStoreRequest']['metric']

export function CreateVectorStoreModal({ visible, onCancel, onCreated }: { visible: boolean; onCancel: () => void; onCreated?: (store: VectorStore) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [dimension, setDimension] = useState(1536)
  const [metric, setMetric] = useState<VectorMetric>('cosine')
  const reset = () => { setName(''); setDimension(1536); setMetric('cosine') }
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('请输入向量存储名称')
      if (!Number.isInteger(dimension) || dimension < 1) throw new Error('向量维度必须是大于 0 的整数')
      const { data, error } = await coreApi.POST('/vector-stores', { body: { name: trimmedName, dimension, metric, idempotency_key: newIdempotencyKey() } })
      if (error) throw error
      return data
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['vector-stores'] }); reset(); onCreated?.(data); onCancel() },
    onError: (error) => showApiError(error),
  })
  return <Modal visible={visible} title="创建向量存储" onCancel={() => { reset(); onCancel() }} onOk={() => create.mutateAsync(undefined)} confirmLoading={create.isPending} unmountOnExit>
    <Form layout="vertical">
      <Form.Item label="名称" required><Input value={name} onChange={setName} placeholder="请输入向量存储名称" maxLength={64} showWordLimit /></Form.Item>
      <Form.Item label="向量维度" required><InputNumber value={dimension} min={1} precision={0} className="w-full" onChange={(value) => setDimension(Number(value ?? 1))} /></Form.Item>
      <Form.Item label="距离度量" required><Select value={metric} onChange={setMetric}><Select.Option value="cosine">Cosine · 余弦相似度</Select.Option><Select.Option value="l2">L2 · 欧氏距离</Select.Option><Select.Option value="ip">IP · 内积</Select.Option></Select></Form.Item>
      <Typography.Text type="secondary">维度和距离度量创建后不可修改，请与写入数据的嵌入模型保持一致。</Typography.Text>
    </Form>
  </Modal>
}
