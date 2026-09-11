import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { listKnowledgeBaseAuditLogs, type KBAuditLog } from "@/api/knowledge";
import { ApiErrorAlert, DataTable, TableSectionHeader } from "@/components/common";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  "kb.create": "创建知识库",
  "kb.update": "更新知识库",
  "kb.delete": "删除知识库",
  "kb.permissions.update": "更新权限",
  "kb.config.update": "更新配置",
  "kb.rebuild": "重建知识库",
  "doc.create": "上传文档",
  "doc.parse": "解析文档",
  "doc.delete": "删除文档",
  "doc.reparse": "重新解析文档",
};

function formatAuditState(state?: Record<string, unknown> | null) {
  return state ? JSON.stringify(state, null, 2) : "-";
}

export function KnowledgeBaseAuditLogsPanel({ kbId }: { kbId: string }) {
  const [selectedLog, setSelectedLog] = useState<KBAuditLog | null>(null);
  const logs = useInfiniteQuery({
    queryKey: ["knowledge-base-audit-logs", kbId],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      listKnowledgeBaseAuditLogs(kbId, {
        limit: PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor?.trim() || undefined,
  });
  useListErrorNotification({
    id: `knowledge-base-audit-logs:${kbId}`,
    title: "操作历史加载失败",
    error: logs.error,
  });

  const items = logs.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <TableSectionHeader
        title="操作历史"
        extra={
          <Button
            size="small"
            loading={logs.isFetching && !logs.isFetchingNextPage}
            onClick={() => void logs.refetch()}
          >
            刷新
          </Button>
        }
      />

      {logs.error && items.length === 0 ? (
        <Space direction="vertical" className="w-full">
          <ApiErrorAlert error={logs.error} title="操作历史加载失败" />
          <Button onClick={() => void logs.refetch()}>重试</Button>
        </Space>
      ) : (
        <>
          <DataTable<KBAuditLog>
            data={items}
            loading={logs.isPending}
            pagination={false}
            noDataElement={<Empty description="暂无操作历史" />}
            tableLabel="知识库操作历史列表"
            columns={[
              {
                title: "操作时间",
                width: 180,
                render: (_, log) => formatDateTime(log.created_at),
              },
              {
                title: "操作",
                width: 160,
                render: (_, log) => ACTION_LABELS[log.action] ?? log.action,
              },
              {
                title: "操作者",
                dataIndex: "actor_user_id",
                placeholder: "系统",
                width: 240,
                ellipsis: true,
              },
              {
                title: "结果",
                width: 100,
                render: (_, log) =>
                  log.error_code ? <Tag color="red">失败</Tag> : <Tag color="green">成功</Tag>,
              },
              {
                title: "详情",
                width: 100,
                render: (_, log) => (
                  <Button type="text" size="small" onClick={() => setSelectedLog(log)}>
                    查看详情
                  </Button>
                ),
              },
            ]}
          />

          {logs.hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                loading={logs.isFetchingNextPage}
                disabled={logs.isFetching}
                onClick={() => void logs.fetchNextPage()}
              >
                加载更多
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Drawer
        width={640}
        title="操作详情"
        visible={Boolean(selectedLog)}
        footer={null}
        onCancel={() => setSelectedLog(null)}
      >
        {selectedLog ? (
          <Space direction="vertical" size={20} className="w-full">
            <Descriptions
              column={1}
              border
              data={[
                {
                  label: "操作",
                  value: ACTION_LABELS[selectedLog.action] ?? selectedLog.action,
                },
                { label: "操作者", value: selectedLog.actor_user_id || "系统" },
                {
                  label: "结果",
                  value: selectedLog.error_code ? (
                    <Tag color="red">失败</Tag>
                  ) : (
                    <Tag color="green">成功</Tag>
                  ),
                },
                { label: "错误码", value: selectedLog.error_code || "-" },
                { label: "错误信息", value: selectedLog.error_msg || "-" },
                { label: "操作时间", value: formatDateTime(selectedLog.created_at) },
              ]}
            />
            <div>
              <Typography.Title heading={6}>变更前</Typography.Title>
              <pre className="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-fill-2)] p-3 text-xs">
                {formatAuditState(selectedLog.before_state)}
              </pre>
            </div>
            <div>
              <Typography.Title heading={6}>变更后</Typography.Title>
              <pre className="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-fill-2)] p-3 text-xs">
                {formatAuditState(selectedLog.after_state)}
              </pre>
            </div>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
