import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  BucketObjectDeleteResponse,
  BucketObjectPresignedUrlInput,
  BucketObjectPresignedUrlRequest,
  BucketObjectPresignedUrlResponse,
  BucketPrefixCreateInput,
  BucketPrefixCreateRequest,
  CreateStorageBucketInput,
  CreateStorageBucketRequest,
  StorageBucketAclUpdateInput,
  StorageBucketAclUpdateRequest,
  StorageBucketClassUpdateInput,
  StorageBucketClassUpdateRequest,
  StorageBucketLifecycleRule,
  StorageBucketLifecycleRuleCreateInput,
  StorageBucketLifecycleRuleCreateRequest,
  StorageBucketLifecycleRuleListResponse,
  StorageBucketListParams,
  StorageBucketListResponse,
  StorageBucketObjectListParams,
  StorageBucketObjectListResponse,
  StorageBucketObjectEntry,
  StorageBucketRecord,
} from "./types";

const createScope = createIdempotencyScope("storage-bucket-create", ["POST"]);
const aclScope = createIdempotencyScope("storage-bucket-acl-update", ["PUT"]);
const classScope = createIdempotencyScope("storage-bucket-class-update", ["PUT"]);
const prefixScope = createIdempotencyScope("storage-bucket-prefix-create", ["POST"]);
const presignedUrlScope = createIdempotencyScope("storage-bucket-object-presigned-url", ["POST"]);
const lifecycleScope = createIdempotencyScope("storage-bucket-lifecycle-rule-create", ["POST"]);
const bucketPath = (bucketId: string) => `/buckets/${encodeURIComponent(bucketId)}`;

export function listBuckets(
  params: StorageBucketListParams = {},
): Promise<StorageBucketListResponse> {
  return coreRequest<StorageBucketListResponse>("/buckets", { method: "GET", params });
}

export async function getBucket(bucketId: string): Promise<StorageBucketRecord> {
  const data = await listBuckets({ limit: 100 });
  const bucket = data.items.find((item) => item.id === bucketId);
  if (!bucket) throw new Error("存储桶不存在或无权访问");
  return bucket;
}

export function createBucket(submitData: CreateStorageBucketInput): Promise<StorageBucketRecord> {
  return runIdempotentRequest(createScope, submitData, (body) =>
    coreRequest<StorageBucketRecord, CreateStorageBucketRequest>("/buckets", {
      method: "POST",
      data: body,
    }),
  );
}

export function updateBucketAcl(
  bucketId: string,
  submitData: StorageBucketAclUpdateInput,
): Promise<StorageBucketRecord> {
  return runIdempotentRequest(
    aclScope,
    submitData,
    (body) =>
      coreRequest<StorageBucketRecord, StorageBucketAclUpdateRequest>(
        `${bucketPath(bucketId)}/acl`,
        {
          method: "PUT",
          data: body,
        },
      ),
    [bucketId],
  );
}

export function updateBucketStorageClass(
  bucketId: string,
  submitData: StorageBucketClassUpdateInput,
): Promise<StorageBucketRecord> {
  return runIdempotentRequest(
    classScope,
    submitData,
    (body) =>
      coreRequest<StorageBucketRecord, StorageBucketClassUpdateRequest>(
        `${bucketPath(bucketId)}/storage-class`,
        { method: "PUT", data: body },
      ),
    [bucketId],
  );
}

export function listBucketObjects(
  bucketId: string,
  params: StorageBucketObjectListParams = {},
): Promise<StorageBucketObjectListResponse> {
  return coreRequest<StorageBucketObjectListResponse>(`${bucketPath(bucketId)}/objects`, {
    method: "GET",
    params,
  });
}

export function deleteBucketObject(
  bucketId: string,
  key: string,
): Promise<BucketObjectDeleteResponse> {
  return coreRequest<BucketObjectDeleteResponse>(`${bucketPath(bucketId)}/objects`, {
    method: "DELETE",
    params: { key },
  });
}

export function createBucketPrefix(
  bucketId: string,
  submitData: BucketPrefixCreateInput,
): Promise<StorageBucketObjectEntry> {
  return runIdempotentRequest(
    prefixScope,
    submitData,
    (body) =>
      coreRequest<StorageBucketObjectEntry, BucketPrefixCreateRequest>(
        `${bucketPath(bucketId)}/prefixes`,
        { method: "POST", data: body },
      ),
    [bucketId],
  );
}

export function generateBucketObjectPresignedUrl(
  bucketId: string,
  submitData: BucketObjectPresignedUrlInput,
): Promise<BucketObjectPresignedUrlResponse> {
  return runIdempotentRequest(
    presignedUrlScope,
    submitData,
    (body) =>
      coreRequest<BucketObjectPresignedUrlResponse, BucketObjectPresignedUrlRequest>(
        `${bucketPath(bucketId)}/objects/presigned-url`,
        { method: "POST", data: body },
      ),
    [bucketId],
  );
}

export function listBucketLifecycleRules(
  bucketId: string,
): Promise<StorageBucketLifecycleRuleListResponse> {
  return coreRequest<StorageBucketLifecycleRuleListResponse>(
    `${bucketPath(bucketId)}/lifecycle-rules`,
    { method: "GET" },
  );
}

export function createBucketLifecycleRule(
  bucketId: string,
  submitData: StorageBucketLifecycleRuleCreateInput,
): Promise<StorageBucketLifecycleRule> {
  return runIdempotentRequest(
    lifecycleScope,
    submitData,
    (body) =>
      coreRequest<StorageBucketLifecycleRule, StorageBucketLifecycleRuleCreateRequest>(
        `${bucketPath(bucketId)}/lifecycle-rules`,
        { method: "POST", data: body },
      ),
    [bucketId],
  );
}

export function deleteBucketLifecycleRule(
  bucketId: string,
  ruleId: string,
): Promise<StorageBucketLifecycleRuleListResponse> {
  return coreRequest<StorageBucketLifecycleRuleListResponse>(
    `${bucketPath(bucketId)}/lifecycle-rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE" },
  );
}

export type {
  BucketObjectDeleteResponse,
  BucketObjectPresignedUrlInput,
  BucketObjectPresignedUrlRequest,
  BucketObjectPresignedUrlResponse,
  BucketPrefixCreateInput,
  BucketPrefixCreateRequest,
  CreateStorageBucketInput,
  CreateStorageBucketRequest,
  StorageBucketAcl,
  StorageBucketAclUpdateInput,
  StorageBucketAclUpdateRequest,
  StorageBucketClass,
  StorageBucketClassUpdateInput,
  StorageBucketClassUpdateRequest,
  StorageBucketLifecycleRule,
  StorageBucketLifecycleRuleCreateInput,
  StorageBucketLifecycleRuleCreateRequest,
  StorageBucketLifecycleRuleListResponse,
  StorageBucketListParams,
  StorageBucketListResponse,
  StorageBucketObjectEntry,
  StorageBucketObjectListParams,
  StorageBucketObjectListResponse,
  StorageBucketRecord,
} from "./types";
