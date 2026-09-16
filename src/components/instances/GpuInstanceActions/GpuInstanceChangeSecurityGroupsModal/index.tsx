import { listNetworkSecurityGroups } from "@/api/network";
import { applyInstanceLifecycle } from "@/api/instances";
import type { NetworkSecurityGroup } from "@/api/network";
import type { InstanceRecord } from "@/api/instances";
import { Form, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { validateForm } from "@/lib/form";

type Instance = InstanceRecord;
type SecurityGroup = NetworkSecurityGroup;

export function GpuInstanceChangeSecurityGroupsModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const [form] = Form.useForm<{ securityGroupIds?: string[] }>();
  const vpcId = instance.network?.vpc_id ?? instance.vpc_id;
  const groups = useQuery({
    meta: {
      errorNotification: {
        id: "security-groups",
        action: "安全组列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: ["network-security-groups", "gpu-instance-change-security-groups", vpcId],
    queryFn: () =>
      listNetworkSecurityGroups({
        limit: 100,
        vpc_id: vpcId || undefined,
      }),
  });
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "操作",
        successText: "更换安全组已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async ({ securityGroupIds }: { securityGroupIds?: string[] }) => {
      const submitData = {
        action: "change_security_groups" as const,
        security_group_ids: securityGroupIds ?? [],
      };
      await applyInstanceLifecycle(instance.id, submitData);
    },
    onSuccess: () => {
      onSubmitted();
    },
  });
  const options = ((groups.data?.items ?? []) as SecurityGroup[]).filter(
    (group) => !vpcId || group.vpc_id === vpcId,
  );
  return (
    <Modal
      title={`更换安全组 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await validateForm(form))}
      unmountOnExit
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          securityGroupIds: (instance.network?.security_groups ?? []).map((group) => group.id),
        }}
      >
        <Form.Item
          field="securityGroupIds"
          label="安全组"
          extra="可多选；清空选择表示解除全部安全组。"
        >
          <Select
            mode="multiple"
            loading={groups.isLoading}
            placeholder="请选择当前 VPC 下的安全组"
            showSearch
            allowClear
            filterOption={(inputValue, option) =>
              String(option.props.children).toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            {options.map((group) => (
              <Select.Option key={group.id} value={group.id}>
                {group.name} · {group.id}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
