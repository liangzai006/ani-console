import { Alert, Button, Form, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listRegistryImages } from "@/api/registry";
import { ImageNameText } from "@/components/common";

export function InstanceRegistryImageSelect({
  field,
  enabled,
  instanceKind,
}: {
  field: string;
  enabled: boolean;
  instanceKind: "container" | "gpu_container";
}) {
  const purpose = instanceKind === "gpu_container" ? "gpu" : "container";
  const images = useQuery({
    queryKey: ["registry-images", "instance-select", purpose],
    enabled,
    queryFn: () => listRegistryImages({ limit: 100, purpose }).then((data) => data.items),
  });

  return (
    <>
      {images.isError ? (
        <Alert
          type="error"
          content="容器镜像列表加载失败，请重试。"
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
        rules={[{ required: true, message: "请选择容器镜像" }]}
        extra={
          !images.isLoading && !images.isError && !images.data?.length
            ? "当前租户的镜像仓库中暂无匹配类型的容器镜像。"
            : undefined
        }
      >
        <Select
          placeholder="请选择容器镜像"
          loading={images.isLoading}
          disabled={images.isError || !images.data?.length}
          showSearch
        >
          {(images.data ?? []).map((item) => (
            <Select.Option key={item.image} value={item.image}>
              <ImageNameText image={item} showSize />
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );
}
