import { Empty, Form, Select, Spin, Typography } from "@arco-design/web-react";
import { ImageNameText } from "@/components/common";
import type { SandboxTemplate } from "../../types";

type Props = {
  templates: SandboxTemplate[];
  loading: boolean;
  error: boolean;
  onChange: (templateId: string) => void;
};

export function SandboxTemplateStep({ templates, loading, error, onChange }: Props) {
  return (
    <>
      {loading ? (
        <div className="py-12 text-center">
          <Spin />
        </div>
      ) : templates.length ? (
        <Form.Item
          field="template_id"
          label="沙箱模板"
          rules={[{ required: true, message: "请选择沙箱模板" }]}
          help="模板决定沙箱的运行镜像"
        >
          <Select placeholder="请选择沙箱模板" showSearch allowClear onChange={onChange}>
            {templates.map((template) => (
              <Select.Option key={template.id} value={template.id}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{template.name}</span>
                  <span className="min-w-0 truncate text-app-text-tertiary">
                    <ImageNameText image={template.image} />
                  </span>
                </span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ) : error ? null : (
        <Empty description="暂无可用沙箱模板" />
      )}
    </>
  );
}
