import { Empty, Space, Typography } from "@arco-design/web-react";
import { useState } from "react";
import type { components } from "@/api/core-schema";
import {
  DataTable,
  DataTableRowActionButton,
  DataTableRowActions,
  StatusTag,
} from "@/components/common";
import {
  InstanceStorage,
  type MountKind,
} from "@/components/instances/InstanceStorage";
import { VmInstanceRollbackModal } from "@/components/instances/VmInstanceActions/VmInstanceRollbackModal";
import { formatDateTime } from "@/lib/format";

type VmInstance = components["schemas"]["InstanceRecord"];
type Snapshot = NonNullable<VmInstance["snapshots"]>[number];

export function VmInstanceStorage({
  instance,
  mountKind,
  onMountKindChange,
  onChanged,
  canRollback,
}: {
  instance: VmInstance;
  mountKind?: MountKind;
  onMountKindChange: (kind?: MountKind) => void;
  onChanged: () => void;
  canRollback: boolean;
}) {
  const [rollbackSnapshot, setRollbackSnapshot] = useState<Snapshot>();

  return (
    <>
      <Space direction="vertical" size={28} className="w-full">
        <InstanceStorage
          instance={instance}
          mountKind={mountKind}
          onMountKindChange={onMountKindChange}
          onChanged={onChanged}
        />
        <section>
          <div className="mb-3">
            <Typography.Title heading={6}>快照</Typography.Title>
          </div>
          <DataTable<Snapshot>
            data={instance.snapshots ?? []}
            rowKey="id"
            pagination={false}
            noDataElement={<Empty description="暂无快照" />}
            columns={[
              { title: "快照名称", dataIndex: "name" },
              { title: "快照 ID", dataIndex: "id" },
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
                render: (_, snapshot) => snapshot.reason ?? "-",
              },
              {
                key: "__actions",
                title: "操作",
                fixed: "right",
                width: 100,
                render: (_, snapshot) => (
                  <DataTableRowActions>
                    <DataTableRowActionButton
                      disabled={!canRollback || snapshot.state !== "ready"}
                      onClick={() => setRollbackSnapshot(snapshot)}
                    >
                      回滚
                    </DataTableRowActionButton>
                  </DataTableRowActions>
                ),
              },
            ]}
          />
        </section>
      </Space>

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
