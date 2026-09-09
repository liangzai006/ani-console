import { Alert, Button, Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/api/services-client";
import type { components } from "@/api/services-schema";
import { DataTable, StatusTag, TableSectionHeader } from "@/components/common";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

type InferencePolicy = components["schemas"]["InferenceAccessPolicy"];

const SCOPE_LABELS: Record<InferencePolicy["scope"]["type"], string> = {
  tenant_default: "租户默认",
  inference_service: "推理服务",
  api_key: "API Key",
  inference_service_api_key: "服务与 API Key",
};

function formatRateLimits(policy: InferencePolicy) {
  const limits = [
    policy.rate_limits.qps ? `QPS ${policy.rate_limits.qps}` : "",
    policy.rate_limits.rpm ? `RPM ${policy.rate_limits.rpm}` : "",
  ].filter(Boolean);
  return limits.length ? limits.join(" / ") : "-";
}

export function InferencePolicies({ serviceId }: { serviceId: string }) {
  const policies = useQuery({
    queryKey: ["inference-service-policies", serviceId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/inference-services/{service_id}/policies", {
        params: { path: { service_id: serviceId } },
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <TableSectionHeader
        title="已绑定访问策略"
        extra={
          <Button
            size="small"
            loading={policies.isFetching}
            onClick={() => void policies.refetch()}
          >
            刷新
          </Button>
        }
      />
      {policies.error ? (
        <Alert
          type="error"
          showIcon
          content={getErrorMessage(policies.error, "访问策略加载失败")}
        />
      ) : (
        <DataTable<InferencePolicy>
          data={policies.data?.policies ?? []}
          loading={policies.isFetching}
          pagination={false}
          rowKey="id"
          noDataElement={<Empty description="当前服务未绑定访问策略" />}
          columns={[
            { title: "策略名称", dataIndex: "name", ellipsis: true },
            {
              title: "状态",
              width: 110,
              render: (_, policy) => <StatusTag status={policy.status} />,
            },
            {
              title: "作用范围",
              width: 150,
              render: (_, policy) => SCOPE_LABELS[policy.scope.type],
            },
            {
              title: "API Key",
              width: 160,
              render: (_, policy) =>
                policy.access.allow_all_tenant_keys
                  ? "租户内全部"
                  : `允许 ${policy.access.allow_api_key_ids?.length ?? 0} 个`,
            },
            {
              title: "限流",
              width: 150,
              render: (_, policy) => formatRateLimits(policy),
            },
            {
              title: "最大并发",
              width: 110,
              render: (_, policy) => policy.concurrency.max_in_flight ?? "-",
            },
            {
              title: "更新时间",
              width: 180,
              render: (_, policy) => formatDateTime(policy.updated_at ?? policy.created_at),
            },
          ]}
          tableLabel="推理服务访问策略列表"
        />
      )}
    </div>
  );
}
