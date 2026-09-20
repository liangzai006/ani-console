import { Grid } from "@arco-design/web-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ResourcePageFrame } from "@/components/common";
import { GpuContainerCreateModal } from "@/components/instances/GpuContainerCreateModal";
import { GpuAdmissionSummary } from "./GpuAdmissionSummary";
import { GpuAnomalyList } from "./GpuAnomalyList";
import { GpuCapacityMetrics } from "./GpuCapacityMetrics";
import { GpuModelInventory } from "./GpuModelInventory";
import { GpuOccupancyDistribution } from "./GpuOccupancyDistribution";

export function GpuInventoryPage() {
  const queryClient = useQueryClient();
  const [createVisible, setCreateVisible] = useState(false);

  const refreshGpuData = () => {
    void queryClient.invalidateQueries({ queryKey: ["gpu-inventory"] });
    void queryClient.invalidateQueries({ queryKey: ["gpu-occupancy"] });
    void queryClient.invalidateQueries({
      queryKey: ["gpu-specs", "availability"],
    });
    void queryClient.invalidateQueries({ queryKey: ["quotas", "me"] });
  };

  return (
    <>
      <ResourcePageFrame
        header={{
          iconClassName: "icon-GPU",
          title: "GPU 算力管理",
          subtitle: "查看租户配额、规格准入、占用分布与型号库存",
          actions: [
            /* 当前 Core API 尚未开放 GPU 配额申请，暂时隐藏入口，待接口开放后恢复。
            {
              key: "header-action-1",
              label: "申请扩容",
              disabled: true,
              tooltip: "当前 Core API 尚未开放 GPU 配额申请",
            },
            */
            {
              key: "header-action-2",
              label: "创建 GPU 容器",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setCreateVisible(true),
            },
          ],
        }}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-md bg-app-bg p-4">
          <GpuCapacityMetrics />
          <Grid.Row gutter={[16, 16]} className="mt-4">
            <Grid.Col xs={24} lg={9} className="min-w-0">
              <GpuOccupancyDistribution />
            </Grid.Col>
            <Grid.Col xs={24} lg={15} className="min-w-0">
              <GpuAdmissionSummary />
            </Grid.Col>
          </Grid.Row>
          <GpuModelInventory onCreate={() => setCreateVisible(true)} />
          <section className="mt-5 min-w-0">
            <GpuAnomalyList />
          </section>
        </div>
      </ResourcePageFrame>
      <GpuContainerCreateModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onCreated={() => {
          setCreateVisible(false);
          refreshGpuData();
        }}
      />
    </>
  );
}
