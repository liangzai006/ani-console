export type ContainerStorageFormValues = {
  volume_id: string;
  volume_mount_path: string;
  volume_read_only: boolean;
  filesystem_id: string;
  filesystem_mount_path: string;
  filesystem_read_only: boolean;
};

export function hasDuplicateContainerMountPath(values: ContainerStorageFormValues) {
  return Boolean(
    values.volume_id &&
    values.filesystem_id &&
    values.volume_mount_path.trim() &&
    values.volume_mount_path.trim() === values.filesystem_mount_path.trim(),
  );
}
