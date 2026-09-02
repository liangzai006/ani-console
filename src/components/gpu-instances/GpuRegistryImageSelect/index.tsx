import { Alert, Button, Form, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";

type RegistryImage = {
  image: string;
  purpose?: string;
  repository: string;
  tag: string;
};

type RegistryImageListResponse = {
  items: RegistryImage[];
  total: number;
};

export function GpuRegistryImageSelect({
  field,
  enabled,
}: {
  field: string;
  enabled: boolean;
}) {
  const images = useQuery({
    queryKey: ["registry-images", "gpu-select"],
    enabled,
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
        options: { params: { query: never } },
      ) => Promise<{ data?: RegistryImageListResponse; error?: unknown }>;
      const { data, error } = await request("/registry/images", {
        params: { query: asUncontractedQuery({ limit: 100, purpose: "gpu" }) },
      });
      if (error || !data) throw error ?? new Error("GPU 镜像列表未返回结果");
      // TODO: Registry 后端确认按 purpose 过滤后，移除此处关联资源选择的本地兜底过滤。
      return data.items.filter((item) => item.purpose === "gpu");
    },
  });

  return (
    <>
      {images.isError ? (
        <Alert
          type="error"
          content="GPU 镜像列表加载失败，请重试。"
          action={
            <Button size="mini" onClick={() => images.refetch()}>
              重试
            </Button>
          }
          className="mb-4"
        />
      ) : null}
      <Form.Item
        field={field}
        label="镜像"
        rules={[{ required: true, message: "请选择 GPU 镜像" }]}
        extra={
          !images.isLoading && !images.isError && !images.data?.length
            ? "当前租户的镜像仓库中暂无可用 GPU 镜像。"
            : undefined
        }
      >
        <Select
          placeholder="请选择 GPU 镜像"
          loading={images.isLoading}
          disabled={images.isError || !images.data?.length}
          showSearch
        >
          {(images.data ?? []).map((item) => (
            <Select.Option key={item.image} value={item.image}>
              {item.repository}:{item.tag}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );
}
