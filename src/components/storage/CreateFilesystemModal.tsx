import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, InputNumber, Modal, Select, Typography } from '@arco-design/web-react'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { newIdempotencyKey } from '@/lib/idempotency'

type Filesystem = components['schemas']['StorageFilesystem']

export function CreateFilesystemModal({ visible, onCancel, onCreated }: { visible: boolean; onCancel: () => void; onCreated?: (filesystem: Filesystem) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [protocol, setProtocol] = useState<'nfs' | 'cephfs'>('nfs')
  const [sizeGiB, setSizeGiB] = useState(100)
  const reset = () => { setName(''); setProtocol('nfs'); setSizeGiB(100) }
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('请输入文件存储名称')
      if (!Number.isInteger(sizeGiB) || sizeGiB < 1) throw new Error('容量必须是大于 0 的整数（GiB）')
      const { data, error } = await coreApi.POST('/filesystems', { body: { name: trimmedName, protocol, size_gib: sizeGiB, idempotency_key: newIdempotencyKey() } })
      if (error) throw error
      return data
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['filesystems'] }); reset(); onCreated?.(data); onCancel() },
    onError: (error) => showApiError(error),
  })
  return <Modal visible={visible} title="创建文件存储" onCancel={() => { reset(); onCancel() }} onOk={() => create.mutateAsync(undefined)} confirmLoading={create.isPending} unmountOnExit>
    <Form layout="vertical">
      <Form.Item label="名称" required><Input value={name} onChange={setName} placeholder="请输入文件存储名称" maxLength={64} showWordLimit /></Form.Item>
      <Form.Item label="协议" required><Select value={protocol} onChange={setProtocol}><Select.Option value="nfs">NFS</Select.Option><Select.Option value="cephfs">CephFS</Select.Option></Select></Form.Item>
      <Form.Item label="容量 (GiB)" required><InputNumber value={sizeGiB} min={1} precision={0} className="w-full" onChange={(value) => setSizeGiB(Number(value ?? 1))} /></Form.Item>
      <Typography.Text type="secondary">创建完成后可在详情页查看挂载目标和挂载命令。</Typography.Text>
    </Form>
  </Modal>
}
