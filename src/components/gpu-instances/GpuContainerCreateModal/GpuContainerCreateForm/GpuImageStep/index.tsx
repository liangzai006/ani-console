import { Empty, Form, Select, Spin, Typography } from "@arco-design/web-react";
import type { RegistryImage } from "../../types";

export function GpuImageStep({
  images,
  loading,
}: {
  images: RegistryImage[];
  loading: boolean;
}) {
  return (
    <>
      <Typography.Paragraph type="secondary">
        镜像必须来自当前租户的 GPU / CUDA 镜像仓库。
      </Typography.Paragraph>
      {loading ? (
        <Spin />
      ) : images.length ? (
        <Form.Item
          field="image"
          label="选择镜像（仓库 · GPU / CUDA 运行时镜像）"
          rules={[{ required: true, message: "请选择 GPU 镜像" }]}
        >
          <Select placeholder="请选择 GPU 镜像">
            {images.map((item) => (
              <Select.Option key={item.image} value={item.image}>
                {item.repository}:{item.tag}
                {item.size_bytes
                  ? ` · ${Math.ceil(item.size_bytes / 1024 / 1024)} MiB`
                  : ""}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      ) : (
        <Empty description="仓库无可用 GPU 镜像，请先在镜像仓库推送 GPU（CUDA）镜像" />
      )}
    </>
  );
}
