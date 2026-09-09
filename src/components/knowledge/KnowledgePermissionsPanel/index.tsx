import {
  Alert,
  Button,
  Form,
  Input,
  Message,
  Space,
  Spin,
  Switch,
  Typography,
} from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { servicesApi } from "@/api/services-client";
import { showApiError } from "@/api/helpers";
import { ApiErrorAlert } from "@/components/common";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { formatDateTime } from "@/lib/format";

type PermissionFormValues = {
  public_read: boolean;
  allowed_user_ids_text?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUserIds(value?: string) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\s,，]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function KnowledgePermissionsPanel({ kbId }: { kbId: string }) {
  const [form] = Form.useForm<PermissionFormValues>();
  const qc = useQueryClient();
  const updateScope = useIdempotencyScope("knowledge-base-permissions-update", ["PUT", kbId]);
  const permissions = useQuery({
    queryKey: ["knowledge-base-permissions", kbId],
    queryFn: async () => {
      const { data, error } = await servicesApi.GET("/knowledge-bases/{kb_id}/permissions", {
        params: { path: { kb_id: kbId } },
      });
      if (error || !data) throw error ?? new Error("权限配置未返回结果");
      return data;
    },
  });

  useEffect(() => {
    if (!permissions.data) return;
    form.setFieldsValue({
      public_read: permissions.data.public_read,
      allowed_user_ids_text: permissions.data.allowed_user_ids.join("\n"),
    });
  }, [form, permissions.data]);

  const update = useMutation({
    mutationFn: async (values: PermissionFormValues) => {
      const allowedUserIds = parseUserIds(values.allowed_user_ids_text);
      const invalidId = allowedUserIds.find((id) => !UUID_PATTERN.test(id));
      if (invalidId) throw new Error(`成员 ID 格式不正确：${invalidId}`);
      const submitData = {
        public_read: values.public_read,
        allowed_user_ids: allowedUserIds,
      };
      const { error } = await servicesApi.PUT("/knowledge-bases/{kb_id}/permissions", {
        params: { path: { kb_id: kbId } },
        body: updateScope.withKey(submitData),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      updateScope.reset();
      Message.success("知识库权限已保存");
      void qc.invalidateQueries({ queryKey: ["knowledge-base-permissions", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "保存知识库权限失败"),
  });

  if (permissions.isLoading && !permissions.data) {
    return (
      <div className="flex justify-center py-16">
        <Spin />
      </div>
    );
  }

  if (permissions.error && !permissions.data) {
    return (
      <Space direction="vertical" size={8} className="w-full">
        <ApiErrorAlert error={permissions.error} title="权限配置加载失败" />
        <Button onClick={() => void permissions.refetch()}>重试</Button>
      </Space>
    );
  }

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Alert
        type="info"
        showIcon
        content="租户内公开读取开启后，本租户成员均可读取；关闭后仅指定成员可访问。"
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ public_read: false, allowed_user_ids_text: "" }}
      >
        <Form.Item label="租户内公开读取" field="public_read" triggerPropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          label="指定成员 ID"
          field="allowed_user_ids_text"
          extra="每行填写一个成员用户 ID；也支持使用逗号分隔。"
        >
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="例如：8c6d5d54-8fae-4d65-b2f0-c64c45adf3cf"
          />
        </Form.Item>
        {permissions.data?.updated_at ? (
          <Typography.Text type="secondary">
            最近更新：{formatDateTime(permissions.data.updated_at)}
          </Typography.Text>
        ) : null}
        <div className="mt-4">
          <Button
            type="primary"
            loading={update.isPending}
            onClick={() => form.validate().then((values) => update.mutate(values))}
          >
            保存权限
          </Button>
        </div>
      </Form>
    </Space>
  );
}
