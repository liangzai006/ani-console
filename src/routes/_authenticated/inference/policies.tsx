import { createFileRoute, Link } from "@tanstack/react-router";
import { Message, Select, Space } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { AiServiceStatusTag } from "@/components/ai-services/AiServiceStatusTag";
import {
  ListDataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import {
  inferencePolicyItems,
  type InferencePolicyItem,
} from "../-ai-services-mock-data";

type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/inference/policies")({
  component: InferencePoliciesPage,
});

function InferencePoliciesPage() {
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("all");
  const [scope, setScope] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // TODO: 推理策略列表接口接入后传递 status/scope/searchField/searchText，目前不做本地过滤。
  useEffect(() => setPage(1), [scope, searchField, searchText, status]);
  const columns: Array<ListColumn<InferencePolicyItem>> = [
    {
      key: "name",
      title: "策略名称",
      render: (_, item) => (
        <ListNameCell
          name={
            <Link
              to="/inference/policies/$policyId"
              params={{ policyId: item.id }}
            >
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      render: (_, item) => <AiServiceStatusTag status={item.status} />,
    },
    {
      key: "scope",
      title: "作用范围",
      render: (_, item) => item.scope,
    },
    {
      key: "rules",
      title: "限流规则",
      render: (_, item) => item.rules,
    },
    {
      key: "updatedAt",
      title: "更新时间",
      render: (_, item) => item.updatedAt,
    },
  ];
  return (
    <ListPageFrame
      header={
        <ListPageHeader
          iconClassName="icon-constraint"
          title="限流与访问策略"
          subtitle="为推理调用设置 QPS、并发限制与访问范围"
          extra={
            <Space>
              <ToolbarButton onClick={() => Message.success("已导出演示数据")}>
                导出
              </ToolbarButton>
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => Message.info("策略创建表单将在下一阶段补充")}
              >
                创建策略
              </ToolbarButton>
            </Space>
          }
        />
      }
      toolbar={
        <ListToolbar
          filters={
            <Space wrap>
              <ToolbarSearch
                fields={[
                  { value: "name", label: "名称" },
                  { value: "id", label: "ID" },
                ]}
                field={searchField}
                value={searchText}
                onFieldChange={setSearchField}
                onChange={setSearchText}
              />
              <Select
                value={scope}
                onChange={setScope}
                className="w-[170px]"
                options={[
                  { value: "all", label: "全部作用对象" },
                  { value: "全部推理服务", label: "全部推理服务" },
                  { value: "推理服务", label: "指定推理服务" },
                  { value: "API Key", label: "API Key" },
                ]}
              />
              <Select
                value={status}
                onChange={setStatus}
                className="w-[130px]"
                options={[
                  { value: "all", label: "全部状态" },
                  { value: "enabled", label: "已启用" },
                  { value: "disabled", label: "已停用" },
                ]}
              />
            </Space>
          }
          tools={
            <ToolbarIconButton
              iconClassName="icon-refresh-1"
              label="刷新"
              onClick={() => Message.success("演示数据已刷新")}
            />
          }
        />
      }
    >
      <ListDataTable
        data={inferencePolicyItems.slice(
          (page - 1) * pageSize,
          page * pageSize,
        )}
        columns={[
          ...columns,
          {
            key: "__actions",
            title: "操作",
            fixed: "right",
            render: (_value, item) => (
              <ListRowActions>
                <ListRowActionButton
                  onClick={() =>
                    Message.success(
                      item.status === "enabled"
                        ? "已停用（演示）"
                        : "已启用（演示）",
                    )
                  }
                >
                  {item.status === "enabled" ? "停用" : "启用"}
                </ListRowActionButton>
                <ListRowActionButton
                  status="danger"
                  onClick={() => Message.warning("删除操作将在接口接入后启用")}
                >
                  删除
                </ListRowActionButton>
              </ListRowActions>
            ),
          },
        ]}
        pagination={{
          page,
          pageSize,
          total: inferencePolicyItems.length,
          onPageChange: setPage,
          onPageSizeChange: (next) => {
            setPageSize(next);
            setPage(1);
          },
        }}
        preserveTableOnEmpty
        emptyIconClassName="icon-constraint"
        emptyText="还没有限流与访问策略"
        tableLabel="限流与访问策略列表"
      />
    </ListPageFrame>
  );
}
