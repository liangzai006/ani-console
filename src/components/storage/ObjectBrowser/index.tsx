import { Breadcrumb, Button, Empty, Link, Space, Tag, Typography, type TableColumnProps } from '@arco-design/web-react'
import { IconArrowLeft, IconFile, IconFolder } from '@arco-design/web-react/icon'
import type { components } from '@/api/core-schema'
import { DataTable } from '@/components/common'
import { formatBytes, formatDateTime } from '@/lib/format'
import styles from './index.module.css'

type BucketEntry = components['schemas']['StorageBucketObjectEntry']
type BrowserEntry = BucketEntry & {
  parentTarget?: string
}

type ObjectBrowserProps = {
  bucketName: string
  prefix: string
  entries: BucketEntry[]
  aclLabel: string
  loading?: boolean
  actionLoading?: boolean
  onNavigate: (prefix: string) => void
  onCreateFolder: () => void
  onCopyPath: (entry: BucketEntry) => void
  onDownload: (entry: BucketEntry) => void
  onCopyLink: (entry: BucketEntry) => void
  onDelete: (entry: BucketEntry) => void
}

function prefixSegments(prefix: string): string[] {
  return prefix.split('/').filter(Boolean)
}

function parentPrefix(prefix: string): string {
  const segments = prefixSegments(prefix)
  if (segments.length <= 1) return '/'
  return `/${segments.slice(0, -1).join('/')}/`
}

export function ObjectBrowser({
  bucketName,
  prefix,
  entries,
  aclLabel,
  loading,
  actionLoading,
  onNavigate,
  onCreateFolder,
  onCopyPath,
  onDownload,
  onCopyLink,
  onDelete,
}: ObjectBrowserProps) {
  const segments = prefixSegments(prefix)
  const canGoUp = prefix !== '/'
  const tableEntries: BrowserEntry[] = canGoUp
    ? [
        {
          kind: 'prefix',
          name: '..',
          key: `__parent__:${prefix}`,
          parentTarget: parentPrefix(prefix),
        },
        ...entries,
      ]
    : entries

  const columns: Array<TableColumnProps<BrowserEntry>> = [
    {
      title: '名称',
      render: (_, entry) => {
        const isParent = Boolean(entry.parentTarget)
        const canNavigate = isParent || entry.kind === 'prefix'
        const target = entry.parentTarget ?? entry.key

        return (
          <button
            type="button"
            className={canNavigate ? styles.entryButton : styles.entryLabel}
            onClick={canNavigate ? () => onNavigate(target) : undefined}
            aria-label={isParent ? '返回上一级' : entry.kind === 'prefix' ? `进入文件夹 ${entry.name}` : undefined}
          >
            {isParent ? (
              <IconArrowLeft className={styles.backIcon} />
            ) : entry.kind === 'prefix' ? (
              <IconFolder className={styles.folderIcon} />
            ) : (
              <IconFile className={styles.fileIcon} />
            )}
            <span className={styles.entryName}>{entry.name}</span>
          </button>
        )
      },
    },
    {
      title: '大小',
      width: 100,
      render: (_, entry) => (entry.size_bytes != null ? formatBytes(entry.size_bytes) : '—'),
    },
    {
      title: '更新时间',
      width: 180,
      render: (_, entry) => (entry.updated_at ? formatDateTime(entry.updated_at) : '—'),
    },
    {
      title: '存储类型',
      width: 100,
      render: (_, entry) =>
        entry.kind === 'object' ? (entry.storage_class === 'infrequent_access' ? '低频' : '标准') : '—',
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, entry) =>
        entry.parentTarget ? null : (
          <Space className={styles.actions}>
            {entry.kind === 'object' ? (
              <>
                <Link type="text" className="text-nowrap" onClick={() => onCopyPath(entry)}>
                  复制路径
                </Link>
                <Link type="text" className="text-nowrap" disabled={actionLoading} onClick={() => onDownload(entry)}>
                  下载
                </Link>
                <Link type="text" className="text-nowrap" disabled={actionLoading} onClick={() => onCopyLink(entry)}>
                  临时链接
                </Link>
              </>
            ) : null}
            <Link type="text" status="error"  onClick={() => onDelete(entry)}>
              删除
            </Link>
          </Space>
        ),
    },
  ]

  return (
    <div className={styles.browser}>
      <div className={styles.toolbar}>
        <Breadcrumb className={styles.breadcrumb}>
          <Breadcrumb.Item>
            <Button type="text" size="mini" onClick={() => onNavigate('/')}>
              {bucketName}
            </Button>
          </Breadcrumb.Item>
          {segments.map((segment, index) => {
            const target = `/${segments.slice(0, index + 1).join('/')}/`
            return (
              <Breadcrumb.Item key={target}>
                <Button type="text" size="mini" onClick={() => onNavigate(target)}>
                  {segment}
                </Button>
              </Breadcrumb.Item>
            )
          })}
        </Breadcrumb>
        <Space>
          <Typography.Text type="secondary">当前路径：{prefix}</Typography.Text>
          <Tag>{aclLabel}</Tag>
          <Button onClick={onCreateFolder}>新建文件夹</Button>
        </Space>
      </div>

      <DataTable<BrowserEntry>
        className={styles.table}
        tableLabel="对象浏览器"
        rowKey={(entry) => entry.key}
        columns={columns}
        data={tableEntries}
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
        noDataElement={<Empty description="当前文件夹暂无对象，可上传对象或新建文件夹" />}
      />
    </div>
  )
}
