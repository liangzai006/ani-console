import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Empty } from '@arco-design/web-react'
import { useNavigate } from '@tanstack/react-router'
import {
  DataTable,
  ApiErrorAlert,
} from '@/components/common'
import { formatBytes } from '@/lib/format'
import { vmDetailDataSource } from './data-source'
import styles from './detail.module.css'

type VmVolumesTabProps = {
  instanceId: string
}

export function VmVolumesTab({ instanceId }: VmVolumesTabProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['vm-instance-volumes', instanceId],
    queryFn: () => vmDetailDataSource.listVolumes(instanceId),
  })

  const refresh = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: ['vm-instance-volumes', instanceId] })
    },
  })

  return (
    <div className={styles.tabSection}>
      <div className={styles.tabSectionHeader}>
        <div className={styles.tabSectionTitle}>已挂载云盘</div>
        <Button type="text" loading={refresh.isPending} onClick={() => refresh.mutateAsync()}>
          刷新
        </Button>
      </div>
      <DataTable
        columns={[
          {
            title: '名称',
            render: (_, row) => (
              <Button
                type="text"
                className={styles.linkButton}
                onClick={() =>
                  navigate({
                    to: '/instances/vm/$instanceId/volumes/$volumeId',
                    params: { instanceId, volumeId: row.id },
                  })
                }
              >
                {row.name}
              </Button>
            ),
          },
          { title: '挂载点', dataIndex: 'mountPoint' },
          { title: '文件系统', dataIndex: 'filesystem' },
          {
            title: '容量',
            render: (_, row) => (
              <div className={styles.volumeUsageCell}>
                <div className={styles.volumeUsageLabel}>{`${formatBytes(row.usedBytes)} / ${formatBytes(row.sizeBytes)}`}</div>
                <div className={styles.volumeUsageProgress}>
                  <div style={{ width: `${row.usedPercent}%` }} />
                </div>
              </div>
            ),
          },
        ]}
        data={query.error ? [] : query.data ?? []}
        loading={query.isLoading}
        pagination={false}
        noDataElement={query.error ? <ApiErrorAlert error={query.error} /> : <Empty description="暂无云盘" />}
      />
    </div>
  )
}
