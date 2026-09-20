import type { StorageBucketRecord } from "@/api/storage/buckets";
import { BucketAclEditor } from "@/components/storage/BucketAclEditor";
import { Modal } from "@arco-design/web-react";

type BucketAclModalProps = {
  bucket?: StorageBucketRecord;
  onCancel: () => void;
};

export function BucketAclModal({ bucket, onCancel }: BucketAclModalProps) {
  return (
    <Modal
      visible={Boolean(bucket)}
      title={bucket ? `修改权限 · ${bucket.name}` : "修改权限"}
      footer={null}
      onCancel={onCancel}
      unmountOnExit
    >
      {bucket ? <BucketAclEditor bucket={bucket} onSaved={onCancel} /> : null}
    </Modal>
  );
}
