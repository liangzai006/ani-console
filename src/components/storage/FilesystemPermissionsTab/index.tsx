import { DataTable } from "@/components/common";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Space,
  Tooltip,
  Typography,
} from "@arco-design/web-react";

type FilesystemAccessRule = {
  id: string;
  cidr: string;
  access: string;
  squash: string;
  description?: string;
};

const unavailableReason = "当前 Core API 暂未提供文件存储访问规则与默认目录权限接口";

export function FilesystemPermissionsTab() {
  const rules: FilesystemAccessRule[] = [];

  return (
    <Space direction="vertical" size={20} className="w-full">
      <Alert
        type="info"
        showIcon
        content="访问规则用于限制允许挂载文件系统的客户端网段，并控制挂载后的读写和用户权限。"
      />

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <Typography.Title heading={6} className="!m-0">
            访问规则
          </Typography.Title>
          <Tooltip content={unavailableReason}>
            <span>
              <Button type="primary" disabled>
                添加规则
              </Button>
            </span>
          </Tooltip>
        </div>
        <DataTable<FilesystemAccessRule>
          columns={[
            { title: "授权网段", dataIndex: "cidr" },
            { title: "读写权限", dataIndex: "access" },
            { title: "用户权限", dataIndex: "squash" },
            { title: "描述", dataIndex: "description" },
            { title: "操作", render: () => "-" },
          ]}
          data={rules}
          pagination={false}
          noDataElement={
            <Empty description="暂无可展示的访问规则；Core API 开放后可在此配置授权网段" />
          }
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <Typography.Title heading={6} className="!m-0">
            默认目录权限
          </Typography.Title>
          <Tooltip content={unavailableReason}>
            <span>
              <Button disabled>编辑</Button>
            </span>
          </Tooltip>
        </div>
        <Descriptions
          border
          column={1}
          data={[
            { label: "权限模式", value: "-" },
            { label: "所有者", value: "-" },
            { label: "所属组", value: "-" },
          ]}
        />
      </section>
    </Space>
  );
}
