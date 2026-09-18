import type { InstanceRecord } from "@/api/instances";
import { Button, Empty, Tooltip } from "@arco-design/web-react";
import { useState } from "react";
import { DataTable, DataTableNameCell, StatusTag, TableSectionHeader } from "@/components/common";
import { VmInstanceRollbackModal } from "@/components/instances/VmInstanceActions/VmInstanceRollbackModal";
import { VmInstanceSnapshotModal } from "@/components/instances/VmInstanceActions/VmInstanceSnapshotModal";
import { formatDateTime } from "@/lib/format";

type VmInstance = InstanceRecord;
type Snapshot = NonNullable<VmInstance["snapshots"]>[number];

const BUSY_STATES = new Set<VmInstance["state"]>([
  "pending",
  "provisioning",
  "starting",
  "stopping",
  "deleting",
]);

export function VmInstanceSnapshots({
  instance,
  onChanged,
}: {
  instance: VmInstance;
  onChanged: () => void;
}) {
  const [createVisible, setCreateVisible] = useState(false);
  const [rollbackSnapshot, setRollbackSnapshot] = useState<Snapshot>();
  const busy = BUSY_STATES.has(instance.state);
  const stable = instance.state === "running" || instance.state === "stopped";
  const canCreate = stable && !busy;
  const canRollback = stable && !busy;

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
            {
              key: "name",
              title: "名称 / ID",
              fixed: "left",
              width: 200,
              render: (_, row) => <DataTableNameCell name={row.name} id={row.id} />,
            },
            {
              title: "状态",
              width: 120,
              render: (_, snapshot) => {
                const statusTag = <StatusTag status={snapshot.state} />;
                return snapshot.reason ? (
                  <Tooltip content={snapshot.reason}>
                    <span className="inline-flex">{statusTag}</span>
                  </Tooltip>
                ) : (
                  statusTag
                );
              },
            },
            {
              title: "创建时间",
              width: 180,
              render: (_, snapshot) => formatDateTime(snapshot.created_at),
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
