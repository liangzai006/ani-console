import { Form, Message, Modal, Select } from "@arco-design/web-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { components } from "@/api/core-schema";
import { coreApi } from "@/api/client";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { listOrThrow } from "@/lib/api-list";
import { getErrorMessage } from "@/lib/errors";
import { getInstanceActionErrorMessage } from "@/lib/sandbox-instance";

type Instance = components["schemas"]["InstanceRecord"];
type SecurityGroup = components["schemas"]["NetworkSecurityGroup"];

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
  const scope = useIdempotencyScope("gpu-instance-change-security-groups", ["POST", instance.id]);
  const vpcId = instance.network?.vpc_id ?? instance.vpc_id;
  const groups = useQuery({
    queryKey: ["network-security-groups", "gpu-instance-change-security-groups", vpcId],
    queryFn: () =>
      listOrThrow(() =>
        coreApi.GET("/networks/security-groups", {
          params: {
            query: asUncontractedQuery({
              limit: 100,
              vpc_id: vpcId || undefined,
            }),
          },
        }),
      ),
  });
  const mutation = useMutation({
    mutationFn: async ({ securityGroupIds }: { securityGroupIds?: string[] }) => {
      const submitData = {
        action: "change_security_groups" as const,
        security_group_ids: securityGroupIds ?? [],
      };
      const { error, response } = await coreApi.POST("/instances/{instance_id}/lifecycle", {
        params: { path: { instance_id: instance.id } },
        body: scope.withKey(submitData),
      });
      if (error)
        throw {
          ...(typeof error === "object" && error ? error : { message: String(error) }),
          status: response.status,
        };
    },
    onSuccess: () => {
      scope.reset();
      Message.success("更换安全组已提交");
      onSubmitted();
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, "lifecycle")),
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
        scope.reset();
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
