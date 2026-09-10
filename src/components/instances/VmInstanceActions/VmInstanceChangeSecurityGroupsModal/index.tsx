import { listNetworkSecurityGroups } from "@/api/network";
import { applyInstanceLifecycle } from "@/api/instances";
import type { NetworkSecurityGroup } from "@/api/network";
import type { InstanceRecord } from "@/api/instances";
import { Form, Message, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = InstanceRecord;
type SecurityGroup = NetworkSecurityGroup;

export function VmInstanceChangeSecurityGroupsModal({
  instance,
  onCancel,
  onSubmitted,
}: {
  instance: Instance;
  onCancel: () => void;
  onSubmitted: (operationId: string) => void;
}) {
  const [form] = Form.useForm<{ securityGroupIds?: string[] }>();
  const groups = useQuery({
    queryKey: [
      "network-security-groups",
      "vm-instance-change-security-groups",
      instance.network?.vpc_id,
    ],
    queryFn: () =>
      listNetworkSecurityGroups({
        limit: 100,
        vpc_id: instance.network?.vpc_id || undefined,
      }),
  });
  const mutation = useMutation({
    mutationFn: async ({ securityGroupIds }: { securityGroupIds?: string[] }) => {
      const submitData = {
        action: "change_security_groups" as const,
        security_group_ids: securityGroupIds ?? [],
      };
      const data = await applyInstanceLifecycle(instance.id, submitData);
      return data.operation_id;
    },
    onSuccess: (operationId) => {
      Message.success("更换安全组已提交");
      onSubmitted(operationId);
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
  });
  const options = ((groups.data?.items ?? []) as SecurityGroup[]).filter(
    (group) => !instance.network?.vpc_id || group.vpc_id === instance.network.vpc_id,
  );
  return (
    <Modal
      title={`更换安全组 · ${instance.name}`}
      visible
      confirmLoading={mutation.isPending}
      onCancel={() => {
        onCancel();
      }}
      onOk={async () => mutation.mutate(await form.validate())}
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
          extra={
            groups.error
              ? getErrorMessage(groups.error, "安全组列表加载失败")
              : "可多选；清空选择表示解除全部安全组。"
          }
        >
          <Select
            mode="multiple"
            loading={groups.isLoading}
            placeholder="请选择当前 VPC 下的安全组"
            showSearch
            allowClear
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
