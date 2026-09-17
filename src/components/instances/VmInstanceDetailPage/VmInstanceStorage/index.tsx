import type { InstanceRecord } from "@/api/instances";
import type { ReactNode } from "react";
import { InstanceStorage, type MountKind } from "@/components/instances/InstanceStorage";

type VmInstance = InstanceRecord;

export function VmInstanceStorage({
  instance,
  mountKind,
  onMountKindChange,
  onChanged,
  volumeAction,
  filesystemAction,
}: {
  instance: VmInstance;
  mountKind?: MountKind;
  onMountKindChange: (kind?: MountKind) => void;
  onChanged: () => void;
  volumeAction?: ReactNode;
  filesystemAction?: ReactNode;
}) {
  return (
    <InstanceStorage
      instance={instance}
      mountKind={mountKind}
      onMountKindChange={onMountKindChange}
      onChanged={onChanged}
      volumeAction={volumeAction}
      filesystemAction={filesystemAction}
    />
  );
}
