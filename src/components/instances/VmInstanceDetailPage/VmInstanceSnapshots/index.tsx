import type { InstanceRecord } from "@/api/instances";
import { Button, Empty } from "@arco-design/web-react";
import { useState } from "react";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { VmInstanceRollbackModal } from "@/components/instances/VmInstanceActions/VmInstanceRollbackModal";
import { VmInstanceSnapshotModal } from "@/components/instances/VmInstanceActions/VmInstanceSnapshotModal";
import { formatDateTime } from "@/lib/format";

type VmInstance = InstanceRecord;
type Snapshot = NonNullable<VmInstance["snapshots"]>[number];

export function VmInstanceSnapshots({
  instance,
  canCreate,
  canRollback,
  onChanged,
}: {
  instance: VmInstance;
  canCreate: boolean;
  canRollback: boolean;
  onChanged: () => void;
}) {
  const [createVisible, setCreateVisible] = useState(false);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<Snapshot>();

  return (
    <>
      <section>
        <TableSectionHeader
          title="快照"
          extra={
            <Button disabled={!canCreate} onClick={() => setCreateVisible(true)}>
              创建快照
            </Button>
          }
        />
        <DataTable<Snapshot>
          data={instance.snapshots ?? []}
          rowKey="id"
          pagination={false}
          noDataElement={<Empty description="暂无快照" />}
          rowActions={[
            {
              key: "rollback",
              label: "回滚",
              disabled: (snapshot) => !canRollback || snapshot.state !== "ready",
              onClick: setRollbackSnapshot,
            },
          ]}
          columns={[
            { title: "快照名称", dataIndex: "name", fixed: "left" },
            { title: "快照 ID", dataIndex: "id", ellipsis: true },
            {
              title: "状态",
              width: 120,
              render: (_, snapshot) => <StatusTag status={snapshot.state} />,
            },
            {
              title: "创建时间",
              width: 180,
              render: (_, snapshot) => formatDateTime(snapshot.created_at),
            },
            {
              title: "状态说明",
              dataIndex: "reason",
              ellipsis: true,
              placeholder: "-",
            },
          ]}
        />
      </section>

      {createVisible ? (
        <VmInstanceSnapshotModal
          instance={instance}
          onCancel={() => setCreateVisible(false)}
          onSubmitted={() => {
            setCreateVisible(false);
            onChanged();
          }}
        />
      ) : null}

      {rollbackSnapshot ? (
        <VmInstanceRollbackModal
          instance={instance}
          snapshot={rollbackSnapshot}
          onCancel={() => setRollbackSnapshot(undefined)}
          onSubmitted={() => {
            setRollbackSnapshot(undefined);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}
