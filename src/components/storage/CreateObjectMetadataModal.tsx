import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, InputNumber, Modal, Typography } from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import { newIdempotencyKey } from '@/lib/idempotency'

export function CreateObjectMetadataModal({
  visible,
  bucketId,
  bucketName,
  onCancel,
}: {
  visible: boolean
  bucketId: string
  bucketName: string
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [key, setKey] = useState('')
  const [sizeBytes, setSizeBytes] = useState(0)
  const [contentType, setContentType] = useState('application/octet-stream')
  useEffect(() => {
    if (visible) {
      setKey('')
      setSizeBytes(0)
      setContentType('application/octet-stream')
    }
  }, [visible])
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      const trimmedKey = key.trim()
      if (!trimmedKey) throw new Error('请输入对象 Key')
      const { error } = await coreApi.POST('/objects', {
        body: {
          bucket: bucketName,
          key: trimmedKey,
          size_bytes: sizeBytes,
          content_type: contentType.trim() || 'application/octet-stream',
          idempotency_key: newIdempotencyKey(),
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bucket-objects', bucketId] })
      qc.invalidateQueries({ queryKey: ['buckets'] })
      qc.invalidateQueries({ queryKey: ['bucket', bucketId] })
      setKey('')
      onCancel()
    },
    onError: (error) => showApiError(error),
  })
  return (
    <Modal
      visible={visible}
      title="仅登记对象元数据"
      onCancel={onCancel}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="Bucket">
          <Input value={bucketName} disabled />
        </Form.Item>
        <Form.Item label="Key" required>
          <Input value={key} onChange={setKey} placeholder="请输入对象 Key" />
        </Form.Item>
        <Form.Item label="Size Bytes" required>
          <InputNumber
            value={sizeBytes}
            min={0}
            precision={0}
            className="w-full"
            onChange={(value) => setSizeBytes(Number(value ?? 0))}
          />
        </Form.Item>
        <Form.Item label="Content Type" required>
          <Input
            value={contentType}
            onChange={setContentType}
            placeholder="application/octet-stream"
            maxLength={128}
          />
        </Form.Item>
        <Typography.Text type="secondary">
          此操作只在控制面写入 PG 元数据，不会上传文件到 MinIO/S3。如需真实文件，请使用「上传对象」。
        </Typography.Text>
      </Form>
    </Modal>
  )
}
