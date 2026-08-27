import { Alert, Descriptions } from "@arco-design/web-react";
import {
  COMPUTE_SPEC_BY_KEY,
  GPU_SPEC_BY_KEY,
  type Filesystem,
  type FormValues,
  type RegistryImage,
} from "../../types";

export function GpuConfirmStep({
  values,
  image,
  filesystem,
  securityGroupName,
}: {
  values: FormValues;
  image?: RegistryImage;
  filesystem?: Filesystem;
  securityGroupName: string;
}) {
  return (
    <>
      <Alert
        type="info"
        showIcon
        content="提交后写入任务中心；调度失败会保留明确的失败原因。"
        className="mb-4"
      />
      <Descriptions
        column={1}
        border
        data={[
          { label: "名称", value: values.name || "—" },
          {
            label: "镜像",
            value: image
              ? `${image.repository}:${image.tag}`
              : values.image || "—",
          },
          {
            label: "资源",
            value: `${COMPUTE_SPEC_BY_KEY[values.compute_spec].label} · GPU ${GPU_SPEC_BY_KEY[values.gpu_spec].label} · 副本 ${values.replicas}`,
          },
          {
            label: "网络",
            value: `${values.vpc_id} / ${values.subnet_id} / 默认安全组 ${securityGroupName}`,
          },
          { label: "环境变量", value: values.env_text || "—" },
          {
            label: "存储",
            value: filesystem
              ? `${filesystem.name ?? filesystem.id} → ${values.mount_path || "/data"}`
              : "不挂载 NFS",
          },
          { label: "自动启动", value: values.auto_start ? "开" : "关" },
        ]}
      />
    </>
  );
}
