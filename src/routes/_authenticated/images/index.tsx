import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Progress,
  Space,
  Spin,
  Typography,
  Upload,
} from '@arco-design/web-react'
import { useRef, useState } from 'react'
import { coreApi } from '@/api/client'
import { PageHeader } from '@/components/shell/AppShell'
import { CursorTable } from '@/components/tables/CursorTable'
import { StatusTag } from '@/components/shell/StatusTag'
import { formatDateTime } from '@/lib/format'
import { showApiError } from '@/api/helpers'
import { getErrorMessage } from '@/lib/errors'
import {
  suggestImageSizeGib,
  uploadImageFile,
  type ImageUploadProgress,
} from '@/lib/image-upload'
import type { components } from '@/api/core-schema'

export const Route = createFileRoute('/_authenticated/images/')({
  component: ImagesPage,
})

type ImageRecord = components['schemas']['Image']

type UploadFormState = {
  name: string
  size_gib: number
  content_type: string
  file: File | null
}

const defaultUploadForm: UploadFormState = {
  name: '',
  size_gib: 1,
  content_type: 'application/x-iso9660-image',
  file: null,
}

const IMAGE_LIST_POLL_MS = 5000

function formatBytes(bytes?: number): string | null {
  if (bytes == null || !Number.isFinite(bytes)) return null
  const gib = bytes / 1024 ** 3
  if (gib >= 1) return `${gib.toFixed(1)} GB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function ImagesPage() {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [form, setForm] = useState<UploadFormState>(defaultUploadForm)
  const [progress, setProgress] = useState<ImageUploadProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const images = useQuery({
    queryKey: ['images'],
    queryFn: async () => {
      const { data, error } = await coreApi.GET('/images', { params: { query: { limit: 50 } } })
      if (error) throw error
      return data
    },
    refetchInterval: (query) => {
      const items = (query.state.data?.items ?? []) as ImageRecord[]
      const busy = items.some((item) =>
        item.state === 'pending' || item.state === 'uploading' || item.state === 'processing',
      )
      return busy || progress !== null ? IMAGE_LIST_POLL_MS : false
    },
  })

  const uploadIso = useMutation({
    mutationFn: async () => {
      if (!form.file) throw new Error('请选择 .iso 文件')
      if (!form.name.trim()) throw new Error('请输入镜像名称')
      if (form.size_gib < 1) throw new Error('容量必须大于 0')
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setProgress({ phase: 'uploading', percent: 0 })
      return uploadImageFile({
        file: form.file,
        name: form.name.trim(),
        sizeGib: form.size_gib,
        contentType: form.content_type.trim() || undefined,
        onProgress: setProgress,
        signal: controller.signal,
      })
    },
    onSuccess: (image) => {
      setVisible(false)
      setForm(defaultUploadForm)
      setProgress(null)
      abortRef.current = null
      qc.invalidateQueries({ queryKey: ['images'] })
      Message.success(`镜像「${image.name}」已就绪`)
    },
    onError: (e) => {
      setProgress(null)
      abortRef.current = null
      showApiError(e)
    },
  })

  const deleteImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await coreApi.DELETE('/images/{image_id}', { params: { path: { image_id: imageId } } })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['images'] }),
    onError: (e) => showApiError(e),
  })

  const items = (images.data?.items ?? []) as ImageRecord[]
  const progressLabel =
    progress?.phase === 'preparing'
      ? progress.message || '正在准备存储（等待上传服务就绪）…'
      : progress?.phase === 'processing'
        ? progress.message || '发送完成，平台入库中…'
      : progress
        ? `正在发送文件… ${progress.percent}%${
            progress.loadedBytes != null && progress.totalBytes != null
              ? `（${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes)}）`
              : ''
          }`
        : null

  return (
    <div className="space-y-4">
      <PageHeader
        title="可启动镜像"
        subtitle="上传本地 ISO，导入就绪后可用于 VM 安装"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setForm(defaultUploadForm)
              setProgress(null)
              setVisible(true)
            }}
          >
            上传 ISO
          </Button>
        }
      />
      <CursorTable<ImageRecord>
        columns={[
          { title: '名称', render: (_, r) => r.name ?? r.id },
          { title: '格式', dataIndex: 'format' },
          { title: '容量 GiB', dataIndex: 'size_gib' },
          {
            title: '状态',
            render: (_, r) => (
              <Space direction="vertical" size={2}>
                <StatusTag status={r.state} />
                {r.state === 'failed' ? (
                  <Typography.Text type="error" className="text-xs">
                    {[r.reason, r.message].filter(Boolean).join('：') || '导入失败'}
                  </Typography.Text>
                ) : null}
              </Space>
            ),
          },
          { title: '存储类', render: (_, r) => r.storage_class || '—' },
          { title: '更新时间', render: (_, r) => formatDateTime(r.updated_at) },
          {
            title: '操作',
            render: (_, r) => (
              <Button
                type="text"
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: '删除镜像',
                    content: `确定删除「${r.name ?? r.id}」？仍被实例引用时后端会拒绝删除。`,
                    onOk: () => deleteImage.mutateAsync(r.id),
                  })
                }
              >
                删除
              </Button>
            ),
          },
        ]}
        data={{ items, next_cursor: images.data?.next_cursor }}
        loading={images.isLoading}
        error={images.error}
        rowKey="id"
        emptyDescription="暂无可启动镜像"
      />

      <Modal
        visible={visible}
        title="上传 ISO"
        onCancel={() => {
          if (uploadIso.isPending) {
            abortRef.current?.abort()
          }
          setVisible(false)
          setProgress(null)
        }}
        onOk={() => uploadIso.mutateAsync()}
        confirmLoading={uploadIso.isPending}
        okText={
          uploadIso.isPending
            ? progress?.phase === 'preparing'
              ? '准备中…'
              : progress?.phase === 'processing'
              ? '入库中…'
              : '上传中…'
            : '开始上传'
        }
        unmountOnExit
      >
        <Form layout="vertical">
          <Form.Item label="ISO 文件" required>
            <Upload
              accept=".iso,application/x-iso9660-image"
              showUploadList={false}
              beforeUpload={(file) => {
                if (!file.name.toLowerCase().endsWith('.iso')) {
                  Message.error('请选择 .iso 文件')
                  return false
                }
                setForm((current) => ({
                  ...current,
                  file,
                  name: current.name || file.name,
                  size_gib: suggestImageSizeGib(file.size),
                  content_type: 'application/x-iso9660-image',
                }))
                return false
              }}
            >
              <Button data-testid="image-upload-file-button">选择文件</Button>
            </Upload>
            {form.file ? (
              <Typography.Text className="mt-2 block text-xs" type="secondary">
                已选：{form.file.name}（{(form.file.size / (1024 ** 3)).toFixed(2)} GiB）
              </Typography.Text>
            ) : null}
          </Form.Item>
          <Form.Item label="名称" required>
            <Input
              data-testid="image-upload-name-input"
              value={form.name}
              onChange={(name) => setForm((current) => ({ ...current, name }))}
            />
          </Form.Item>
          <Form.Item
            label="容量 GiB"
            required
            extra="按文件大小自动计算（向上取整并留 1GiB 余量）；大 ISO 如 openEuler DVD 通常为 20 或 30"
          >
            <InputNumber
              data-testid="image-upload-size-input"
              value={form.size_gib}
              min={1}
              precision={0}
              onChange={(size) => setForm((current) => ({ ...current, size_gib: Number(size ?? 1) }))}
            />
          </Form.Item>
          <Form.Item label="Content-Type">
            <Input
              value={form.content_type}
              onChange={(contentType) => setForm((current) => ({ ...current, content_type: contentType }))}
            />
          </Form.Item>
          {progress ? (
            <Form.Item label="上传进度">
              {progress.phase === 'preparing' ? (
                <div className="flex items-center gap-2">
                  <Spin size={16} />
                  <Typography.Text type="secondary">准备中</Typography.Text>
                </div>
              ) : progress.phase === 'processing' ? (
                <div className="flex items-center gap-2">
                  <Spin size={16} />
                  <Typography.Text type="secondary">入库中</Typography.Text>
                </div>
              ) : (
                <Progress percent={progress.percent} />
              )}
              {progressLabel ? (
                <Typography.Text className="mt-2 block text-xs" type="secondary" data-testid="image-upload-phase">
                  {progressLabel}
                </Typography.Text>
              ) : null}
              {progress.phase === 'uploading' ? (
                <Typography.Text className="mt-1 block text-xs" type="secondary">
                  本地发送进度，不等于入库完成
                </Typography.Text>
              ) : null}
            </Form.Item>
          ) : null}
          {uploadIso.isError ? (
            <Typography.Text type="error">{getErrorMessage(uploadIso.error)}</Typography.Text>
          ) : null}
        </Form>
      </Modal>
    </div>
  )
}
