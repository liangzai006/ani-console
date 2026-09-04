import { Alert, Descriptions } from "@arco-design/web-react";
import { ImageNameText } from "@/components/common";
import {
  parseEgressAllowlist,
  type FormValues,
  type SandboxTemplate,
} from "../../types";

const EGRESS_LABELS: Record<FormValues["egress_policy"], string> = {
  deny_all: "禁止访问外部网络",
  allowlist: "仅允许白名单地址",
  internet: "允许访问公网",
};

export function SandboxConfirmStep({
  values,
  template,
}: {
  values: FormValues;
  template: SandboxTemplate;
}) {
  const allowlist = parseEgressAllowlist(values.egress_allowlist);

  return (
    <>
      <Alert
        type="info"
        showIcon
        content="提交后写入任务中心；创建失败会保留明确的失败原因。"
        className="mb-4"
      />
      <Descriptions
        column={1}
        border
        data={[
          { label: "名称", value: values.name || "-" },
          { label: "模板", value: template.name },
          { label: "镜像", value: <ImageNameText image={template.image} /> },
          { label: "规格", value: values.compute_spec },
          {
            label: "会话",
            value: `最长 ${values.session_timeout} · 空闲 ${values.idle_timeout}`,
          },
          {
            label: "到期策略",
            value:
              values.on_timeout === "kill"
                ? "销毁 Sandbox"
                : "暂停并保留工作区",
          },
          { label: "网络出口", value: EGRESS_LABELS[values.egress_policy] },
          {
            label: "出口白名单",
            value:
              values.egress_policy === "allowlist" && allowlist.length
                ? allowlist.join("、")
                : "-",
          },
          { label: "自动启动", value: values.auto_start ? "开" : "关" },
        ]}
      />
    </>
  );
}
