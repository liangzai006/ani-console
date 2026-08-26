import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Descriptions, Drawer, Form, Input, Modal, Spin, Table } from '@arco-design/web-react'
import type { ColumnProps } from '@arco-design/web-react/es/Table'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shell/AppShell'
import { StatusTag } from '@/components/common/StatusTag'
import { CursorTable } from '@/components/common/CursorTable'
import { ApiErrorAlert } from '@/components/common/ApiErrorAlert'
import { showApiError } from '@/api/helpers'
import { formatDateTime } from '@/lib/format'

export interface SimpleCrudDetailConfig {
  fetch: (id: string) => Promise<Record<string, unknown>>
  buildFields: (record: Record<string, unknown>) => { label: React.ReactNode; value: React.ReactNode }[]
  extraContent?: (record: Record<string, unknown>) => React.ReactNode
}

export interface SimpleCrudConfig {
  title: string
  subtitle?: string
  queryKey: string | readonly unknown[]
  nameField?: string
  list: () => Promise<{ items?: Record<string, unknown>[]; next_cursor?: string | null }>
  onCreate?: (name: string) => Promise<void>
  createForm?: {
    content: React.ReactNode
    onSubmit: () => Promise<void>
    onReset?: () => void
  }
  onDelete?: (id: string) => Promise<void>
  idKey?: string
  emptyDescription?: string
  showState?: boolean
  detail?: SimpleCrudDetailConfig
  columns?: ColumnProps<Record<string, unknown>>[]
  extraColumns?: ColumnProps<Record<string, unknown>>[]
  filters?: React.ReactNode
}

export function SimpleResourceCrud({
  title,
  subtitle,
  queryKey,
  nameField = 'name',
  list,
  onCreate,
  createForm,
  onDelete,
  idKey = 'id',
  emptyDescription,
  showState = false,
  detail,
  columns: columnsOverride,
  extraColumns,
  filters,
}: SimpleCrudConfig) {
  const qc = useQueryClient()
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const resourceQueryKey = useMemo(() => (Array.isArray(queryKey) ? [...queryKey] : [queryKey]), [queryKey])

  const { data, isLoading, error } = useQuery({
    queryKey: resourceQueryKey,
    queryFn: list,
  })

  const detailQuery = useQuery({
    queryKey: [...resourceQueryKey, 'detail', detailId],
    queryFn: () => detail!.fetch(detailId!),
    enabled: !!detailId && !!detail,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      if (createForm) {
        await createForm.onSubmit()
        return
      }
      if (!onCreate) return
      await onCreate(name)
    },
    onSuccess: () => {
      setVisible(false)
      setName('')
      createForm?.onReset?.()
      qc.invalidateQueries({ queryKey: resourceQueryKey })
    },
    onError: (e) => showApiError(e),
  })

  const deleteMut = useMutation({
    mutationFn: onDelete ?? (async () => {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourceQueryKey }),
    onError: (e) => showApiError(e),
  })

  const items = data?.items ?? []

  const columns = useMemo(() => {
    if (columnsOverride) return columnsOverride

    const cols: ColumnProps<Record<string, unknown>>[] = [
      { title: 'ID', dataIndex: idKey },
      {
        title: '名称',
        render: (_, r) => {
          const label = String(r[nameField] ?? r[idKey] ?? '—')
          if (detail) {
            return (
              <Button type="text" onClick={() => setDetailId(String(r[idKey]))}>
                {label}
              </Button>
            )
          }
          return label
        },
      },
    ]

    if (extraColumns) cols.push(...extraColumns)

    if (showState) {
      cols.push({
        title: '状态',
        render: (_, r) => <StatusTag status={r.state as string} />,
      })
    }

    cols.push({ title: '创建时间', render: (_, r) => formatDateTime(r.created_at as string) })

    if (onDelete) {
      cols.push({
        title: '操作',
        render: (_, r) => (
          <Button
            type="text"
            status="danger"
            onClick={() =>
              Modal.confirm({
                title: `删除${title}`,
                content: `确定删除「${String(r[nameField] ?? r[idKey])}」？此操作不可恢复。`,
                onOk: () => deleteMut.mutateAsync(String(r[idKey])),
              })
            }
          >
            删除
          </Button>
        ),
      })
    }

    return cols
  }, [columnsOverride, detail, deleteMut, extraColumns, idKey, nameField, onDelete, showState, title])

  const detailRecord = detailQuery.data
  const detailTitle = detailRecord
    ? String(detailRecord[nameField] ?? detailRecord[idKey] ?? title)
    : title

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle}
        extra={
          onCreate ? (
            <Button type="primary" onClick={() => setVisible(true)}>
              创建
            </Button>
          ) : undefined
        }
      />
      {filters ? <div className="mb-3">{filters}</div> : null}
      <CursorTable<Record<string, unknown>>
        columns={columns}
        data={{ items, next_cursor: data?.next_cursor }}
        loading={isLoading}
        error={error}
        rowKey={idKey}
        emptyDescription={emptyDescription ?? `暂无${title}`}
      />
      {onCreate ? (
        <Modal
          visible={visible}
          title={`创建${title}`}
          onCancel={() => setVisible(false)}
          onOk={() => createMut.mutateAsync()}
          confirmLoading={createMut.isPending}
        >
          {createForm?.content ?? (
            <Form layout="vertical">
              <Form.Item label="名称" required>
                <Input value={name} onChange={setName} />
              </Form.Item>
            </Form>
          )}
        </Modal>
      ) : null}
      {detail ? (
        <Drawer
          width={520}
          visible={!!detailId}
          title={`${title}详情 · ${detailTitle}`}
          footer={
            onDelete && detailId ? (
              <Button
                status="danger"
                onClick={() =>
                  Modal.confirm({
                    title: `删除${title}`,
                    content: `确定删除「${detailTitle}」？此操作不可恢复。`,
                    onOk: async () => {
                      await deleteMut.mutateAsync(detailId)
                      setDetailId(null)
                    },
                  })
                }
              >
                删除{title}
              </Button>
            ) : null
          }
          onCancel={() => setDetailId(null)}
        >
          {detailQuery.isLoading && !detailQuery.data ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : null}
          {detailQuery.isError ? <ApiErrorAlert error={detailQuery.error} /> : null}
          {detailRecord ? (
            <div className="space-y-4">
              <Descriptions column={{ xs: 1, sm: 2 }} data={detail.buildFields(detailRecord)} />
              {detail.extraContent?.(detailRecord)}
            </div>
          ) : null}
        </Drawer>
      ) : null}
    </div>
  )
}

export function networkRulesTable(rules: Record<string, unknown>[] | undefined) {
  if (!rules?.length) return null
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-[var(--color-text-2)]">规则</div>
      <Table
        data={rules}
        rowKey={(r) => `${r.direction}-${r.protocol}-${r.port_range}`}
        pagination={false}
        columns={[
          { title: '方向', dataIndex: 'direction' },
          { title: '协议', dataIndex: 'protocol' },
          { title: '端口', dataIndex: 'port_range' },
          { title: 'CIDR', dataIndex: 'cidr' },
          { title: '动作', dataIndex: 'action' },
        ]}
      />
    </div>
  )
}

export function networkListenersTable(listeners: Record<string, unknown>[] | undefined) {
  if (!listeners?.length) return null
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-[var(--color-text-2)]">监听器</div>
      <Table
        data={listeners}
        rowKey={(r) => `${r.protocol}-${r.port}`}
        pagination={false}
        columns={[
          { title: '协议', dataIndex: 'protocol' },
          { title: '端口', dataIndex: 'port' },
          { title: '目标端口', dataIndex: 'target_port' },
        ]}
      />
    </div>
  )
}
