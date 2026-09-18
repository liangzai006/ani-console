import { applyInstanceLifecycle } from "@/api/instances";
import type { InstanceRecord } from "@/api/instances";
import { InstanceReleaseActions } from "@/components/instances/InstanceReleaseActions";
import { InstanceReleases } from "@/components/instances/InstanceReleases";
import { Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";

type Release = NonNullable<NonNullable<InstanceRecord["container"]>["history"]>[number];

export function InstanceVersions({
  instance,
  onChanged,
}: {
  instance: InstanceRecord;
  onChanged: () => void;
}) {
  const rollback = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "instance-release-rollback",
        action: "操作",
        successText: "回滚操作已提交",
        errorFallback: "操作失败，请稍后重试",
      },
    },
    mutationFn: async (release: Release) => {
      await applyInstanceLifecycle(instance.id, {
        action: "rollback",
        revision: release.revision,
      });
    },
    onSuccess: onChanged,
  });

  const confirmRollback = (release: Release) => {
    Modal.confirm({
      title: `回滚到 ${release.revision}`,
      content: `确定将「${instance.name}」回滚到版本 ${release.revision}？`,
      confirmLoading: rollback.isPending,
      onOk: () => rollback.mutateAsync(release),
    });
  };

  return (
    <InstanceReleases
      instance={instance}
      versionLayout
      actions={<InstanceReleaseActions instance={instance} onChanged={onChanged} />}
      onRollback={confirmRollback}
      rollbackRevision={rollback.isPending ? rollback.variables?.revision : undefined}
    />
  );
}
