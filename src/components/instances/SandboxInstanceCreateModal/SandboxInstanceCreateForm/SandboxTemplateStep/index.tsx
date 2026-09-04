import {
  Alert,
  Button,
  Empty,
  Form,
  Select,
  Spin,
  Typography,
} from "@arco-design/web-react";
import { ImageNameText } from "@/components/common";
import type { SandboxTemplate } from "../../types";

type Props = {
  templates: SandboxTemplate[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onChange: (templateId: string) => void;
};

export function SandboxTemplateStep({
  templates,
  loading,
  error,
  onRetry,
  onChange,
}: Props) {
  return (
    <>
      <Typography.Paragraph type="secondary">
        模板决定 Sandbox 的运行镜像。
      </Typography.Paragraph>
      {error ? (
        <Alert
          type="error"
          showIcon
          content="Sandbox 模板加载失败，请重试"
          action={
            <Button size="mini" onClick={onRetry}>
              重试
            </Button>
          }
          className="mb-4"
        />
      ) : null}
      {loading ? (
        <div className="py-12 text-center">
          <Spin />
        </div>
      ) : templates.length ? (
        <Form.Item
          field="template_id"
          label="Sandbox 模板"
          rules={[{ required: true, message: "请选择 Sandbox 模板" }]}
        >
          <Select
            placeholder="请选择 Sandbox 模板"
            showSearch
            allowClear
            onChange={onChange}
          >
            {templates.map((template) => (
              <Select.Option key={template.id} value={template.id}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{template.name}</span>
                  <span className="min-w-0 truncate text-[var(--color-text-3)]">
                    <ImageNameText image={template.image} />
                  </span>
                </span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ) : error ? null : (
        <Empty description="暂无可用 Sandbox 模板" />
      )}
    </>
  );
}
