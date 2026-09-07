import {
  Alert,
  Descriptions,
  Empty,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import type { components } from "@/api/core-schema";
import { DataTable } from "@/components/common";
import { sandboxEgressLabel } from "../utils";

type SandboxStatus = NonNullable<
  components["schemas"]["SandboxInstanceStatus"]
>;
type SandboxEnv = NonNullable<SandboxStatus["env"]>[number];

export function SandboxEnvironmentPanel({
  sandbox,
}: {
  sandbox: SandboxStatus;
}) {
  const env = sandbox.env ?? [];
  const allowlist = sandbox.egress_allowlist ?? [];

  return (
    <Space direction="vertical" size={24} className="w-full">
      <Alert
        type="info"
        content="Core 当前只返回环境变量名称和密钥引用，不回显变量明文；环境变量与出口白名单的在线编辑接口尚未开放。"
      />
      <section>
        <Typography.Title heading={6}>环境变量</Typography.Title>
        <DataTable<SandboxEnv>
          data={env}
          rowKey="name"
          pagination={false}
          noDataElement={<Empty description="暂无环境变量" />}
          columns={[
            { title: "名称", dataIndex: "name" },
            {
              title: "来源",
              width: 160,
              render: (_, item) =>
                item.secret_ref ? (
                  <Tag color="purple">密钥引用</Tag>
                ) : (
                  <Tag color="gray">运行时注入</Tag>
                ),
            },
            {
              title: "密钥引用",
              dataIndex: "secret_ref",
              placeholder: "-",
            },
          ]}
        />
      </section>
      <section>
        <Typography.Title heading={6}>出口控制</Typography.Title>
        <Descriptions
          column={1}
          labelStyle={{ width: "120px" }}
          data={[
            {
              label: "策略",
              value: sandboxEgressLabel(sandbox.network_egress_policy),
            },
            {
              label: "允许的 Host",
              value:
                sandbox.network_egress_policy === "allowlist" ? (
                  allowlist.length ? (
                    <div className="flex flex-wrap gap-2">
                      {allowlist.map((host) => (
                        <Tag key={host}>{host}</Tag>
                      ))}
                    </div>
                  ) : (
                    "白名单为空，所有出站连接将被拒绝"
                  )
                ) : (
                  "-"
                ),
            },
          ]}
        />
      </section>
    </Space>
  );
}
