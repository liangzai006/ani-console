import {
  deleteBucketLifecycleRule,
  listBucketLifecycleRules,
  type StorageBucketLifecycleRule,
} from "@/api/storage/buckets";
import { DataTable } from "@/components/common";
import { CreateLifecycleRuleModal } from "@/components/storage/CreateLifecycleRuleModal";
import { withId } from "@/lib/id";
import { Button, Empty, Modal, Space, Tag, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function BucketLifecycle({ bucketId }: { bucketId: string }) {
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<StorageBucketLifecycleRule>();
  const rules = useQuery({
    meta: {
      errorNotification: {
        id: withId("bucket-lifecycle", bucketId),
        action: "生命周期规则加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["bucket-lifecycle-rules", bucketId],
    queryFn: () => listBucketLifecycleRules(bucketId),
  });
  const remove = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "lifecycle-rule-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (rule: StorageBucketLifecycleRule) => deleteBucketLifecycleRule(bucketId, rule.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bucket-lifecycle-rules", bucketId] });
      void qc.invalidateQueries({ queryKey: ["bucket", bucketId] });
      void qc.invalidateQueries({ queryKey: ["buckets"] });
    },
  });
  const items = (rules.data?.items ?? []) as StorageBucketLifecycleRule[];

  return (
    <>
      <Space direction="vertical" size={12} className="w-full">
        <div className="flex w-full items-center justify-between">
          <Typography.Text>
            共 <Typography.Text bold>{items.length}</Typography.Text> 条生命周期规则
          </Typography.Text>
          <Button
            type="primary"
            onClick={() => {
              setEditingRule(undefined);
              setVisible(true);
            }}
          >
            添加规则
          </Button>
        </div>
        <DataTable<StorageBucketLifecycleRule>
          columns={[
            { title: "名称", dataIndex: "name" },
            { title: "前缀", dataIndex: "prefix", placeholder: "全部" },
            { title: "转低频天数", dataIndex: "to_infrequent_days" },
            { title: "过期天数", dataIndex: "expire_days" },
            {
              title: "状态",
              width: 120,
              render: (_, row) => (
                <Tag color={row.enabled ? "green" : "gray"}>{row.enabled ? "启用" : "停用"}</Tag>
              ),
            },
          ]}
          data={items}
          loading={rules.isLoading}
          pagination={false}
          rowActions={[
            {
              key: "edit",
              label: "编辑",
              onClick: (row) => {
                setEditingRule(row);
                setVisible(true);
              },
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              loading: (row) => remove.isPending && remove.variables?.id === row.id,
              onClick: (row) =>
                void Modal.confirm({
                  title: "删除生命周期规则",
                  content: `确定删除规则「${row.name}」？`,
                  okButtonProps: { status: "danger" },
                  onOk: () => remove.mutateAsync(row),
                }),
            },
          ]}
          noDataElement={<Empty description="暂无生命周期规则，点击「添加规则」开始" />}
        />
      </Space>
      {visible && (
        <CreateLifecycleRuleModal
          bucketId={bucketId}
          rule={editingRule}
          onCancel={() => setVisible(false)}
        />
      )}
    </>
  );
}
