import { Breadcrumb, Button, Empty, List, Space, Spin, Tag, Typography } from '@arco-design/web-react'
import { IconArrowLeft, IconFile, IconFolder } from '@arco-design/web-react/icon'
import type { components } from '@/api/core-schema'
import { formatBytes, formatDateTime } from '@/lib/format'
import styles from './index.module.css'

type BucketEntry = components['schemas']['StorageBucketObjectEntry']

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

      <div className={styles.columns} aria-hidden="true">
        <span>名称</span>
        <span>大小</span>
        <span>更新时间</span>
        <span>存储类型</span>
        <span>操作</span>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : (
        <>
          {canGoUp ? (
            <div className={`${styles.row} ${styles.parentRow}`}>
              <button type="button" className={styles.entryButton} onClick={() => onNavigate(parentPrefix(prefix))}>
                <IconArrowLeft className={styles.backIcon} />
                <span className={styles.entryName}>..</span>
              </button>
              <span>—</span>
              <span>—</span>
              <span>—</span>
              <span />
            </div>
          ) : null}
          <List
            className={styles.list}
            bordered={false}
            split
            dataSource={entries}
            noDataElement={<Empty description="当前文件夹暂无对象，可上传对象或新建文件夹" />}
            render={(entry) => (
              <List.Item key={entry.key} className={styles.item}>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={entry.kind === 'prefix' ? styles.entryButton : styles.entryLabel}
                    onClick={entry.kind === 'prefix' ? () => onNavigate(entry.key) : undefined}
                    aria-label={entry.kind === 'prefix' ? `进入文件夹 ${entry.name}` : undefined}
                  >
                    {entry.kind === 'prefix' ? (
                      <IconFolder className={styles.folderIcon} />
                    ) : (
                      <IconFile className={styles.fileIcon} />
                    )}
                    <span className={styles.entryName}>{entry.name}</span>
                  </button>
                  <span>{entry.size_bytes != null ? formatBytes(entry.size_bytes) : '—'}</span>
                  <span>{entry.updated_at ? formatDateTime(entry.updated_at) : '—'}</span>
                  <span>
                    {entry.kind === 'object'
                      ? entry.storage_class === 'infrequent_access'
                        ? '低频'
                        : '标准'
                      : '—'}
                  </span>
                  <Space className={styles.actions}>
                    {entry.kind === 'object' ? (
                      <>
                        <Button type="text" size="mini" onClick={() => onCopyPath(entry)}>
                          复制路径
                        </Button>
                        <Button type="text" size="mini" loading={actionLoading} onClick={() => onDownload(entry)}>
                          下载
                        </Button>
                        <Button type="text" size="mini" loading={actionLoading} onClick={() => onCopyLink(entry)}>
                          临时链接
                        </Button>
                      </>
                    ) : null}
                    <Button type="text" size="mini" status="danger" onClick={() => onDelete(entry)}>
                      删除
                    </Button>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  )
}
