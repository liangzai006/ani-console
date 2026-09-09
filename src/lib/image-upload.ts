import { coreApi } from "@/api/client";
import { getErrorMessage } from "@/lib/errors";
import type { IdempotencyScope } from "@/lib/idempotency";
import type { components } from "@/api/core-schema";

type Image = components["schemas"]["Image"];
type ImageUploadSession = components["schemas"]["ImageUploadSession"];

const GIB = 1024 ** 3;
const DEFAULT_ISO_CONTENT_TYPE = "application/x-iso9660-image";
const UPLOAD_BODY_CONTENT_TYPE = "application/octet-stream";
const POLL_INTERVAL_MS = 2000;
const PREPARE_TIMEOUT_MS = 5 * 60 * 1000;
const PROCESS_TIMEOUT_MS = 30 * 60 * 1000;
const UPLOAD_READY_STABILIZE_MS = 3000;
const UPLOAD_RETRY_DELAY_MS = 5000;
const MAX_UPLOAD_RETRIES = 6;

export type ImageUploadProgress = {
  phase: "preparing" | "uploading" | "processing";
  /** preparing 不显示确定进度；uploading 只表示本地发送；processing 不把浏览器 100% 当最终成功 */
  percent: number;
  loadedBytes?: number;
  totalBytes?: number;
  message?: string;
};

export function suggestImageSizeGib(fileSizeBytes: number): number {
  if (fileSizeBytes <= 0) return 1;
  return Math.max(1, Math.ceil(fileSizeBytes / GIB) + 1);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function assertSessionNotExpired(expiresAt: string) {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return;
  if (Date.now() >= expiresMs) {
    throw new Error("上传会话已过期，请重新创建");
  }
}

type UploadRetryError = Error & { retryable?: boolean };

function xhrUploadFileOnce(input: {
  method: "PUT" | "POST";
  uploadUrl: string;
  token: string;
  file: File;
  onProgress?: (update: ImageUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => {
      xhr.abort();
      reject(input.signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    if (input.signal?.aborted) {
      onAbort();
      return;
    }
    input.signal?.addEventListener("abort", onAbort, { once: true });

    xhr.open(input.method, input.uploadUrl);
    // 直传必须用会话 upload token，禁止用户 JWT；body 必须是原始 File/Blob，禁止 FormData
    xhr.setRequestHeader("Authorization", `Bearer ${input.token}`);
    xhr.setRequestHeader("Content-Type", UPLOAD_BODY_CONTENT_TYPE);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !input.onProgress) return;
      const percent = Math.min(99, Math.floor((event.loaded / event.total) * 100));
      input.onProgress({
        phase: "uploading",
        percent,
        loadedBytes: event.loaded,
        totalBytes: event.total,
      });
    };
    xhr.onload = () => {
      input.signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      const detail = xhr.responseText?.trim();
      const error = new Error(detail || `上传失败 HTTP ${xhr.status}`) as UploadRetryError;
      error.retryable = xhr.status === 503;
      reject(error);
    };
    xhr.onerror = () => {
      input.signal?.removeEventListener("abort", onAbort);
      reject(new Error("网络中断"));
    };
    xhr.onabort = () => {
      input.signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    xhr.send(input.file);
  });
}

async function xhrUploadFile(input: {
  method: "PUT" | "POST";
  uploadUrl: string;
  token: string;
  file: File;
  onProgress?: (update: ImageUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await xhrUploadFileOnce(input);
      return;
    } catch (error) {
      const retryable = error instanceof Error && (error as UploadRetryError).retryable;
      if (!retryable || attempt >= MAX_UPLOAD_RETRIES) throw error;
      attempt += 1;
      input.onProgress?.({
        phase: "uploading",
        percent: 0,
        message: "上传服务尚未就绪，正在重试…",
      });
      await sleep(UPLOAD_RETRY_DELAY_MS, input.signal);
    }
  }
}

async function pollImageUntilTerminal(imageId: string, signal?: AbortSignal): Promise<Image> {
  const started = Date.now();
  while (Date.now() - started < PROCESS_TIMEOUT_MS) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    const { data, error } = await coreApi.GET("/images/{image_id}", {
      params: { path: { image_id: imageId } },
    });
    if (error) throw error;
    if (!data) throw new Error("镜像状态为空");
    if (data.state === "ready") return data;
    if (data.state === "failed") {
      const detail = [data.reason, data.message].filter(Boolean).join("：");
      throw new Error(detail || "镜像导入失败");
    }
    if (data.state === "deleted" || data.state === "deleting") {
      throw new Error("镜像已删除");
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new Error("等待镜像就绪超时");
}

async function waitForImageUploadReady(imageId: string, signal?: AbortSignal): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < PREPARE_TIMEOUT_MS) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    const { data, error } = await coreApi.GET("/images/{image_id}", {
      params: { path: { image_id: imageId } },
    });
    if (error) throw error;
    if (!data) throw new Error("镜像状态为空");
    if (data.state === "uploading") return;
    if (data.state === "failed") {
      const detail = [data.message, data.reason].filter(Boolean).join("：");
      throw new Error(detail || "准备失败");
    }
    if (data.state === "deleting" || data.state === "deleted") {
      throw new Error("镜像已删除");
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new Error("等待上传服务就绪超时");
}

export async function uploadImageFile(input: {
  file: File;
  name?: string;
  sizeGib?: number;
  contentType?: string;
  onProgress?: (update: ImageUploadProgress) => void;
  signal?: AbortSignal;
  idempotencyScope: IdempotencyScope;
}): Promise<Image> {
  const name = (input.name ?? input.file.name).trim();
  if (!name) throw new Error("请输入镜像名称");
  if (!input.file.name.toLowerCase().endsWith(".iso")) {
    throw new Error("请选择 .iso 文件");
  }

  const sizeGib = input.sizeGib ?? suggestImageSizeGib(input.file.size);
  if (sizeGib < 1) throw new Error("容量必须大于 0");

  const contentType = input.contentType?.trim() || DEFAULT_ISO_CONTENT_TYPE;
  const runtimeDependencies = [
    input.file.name,
    input.file.size,
    input.file.type,
    input.file.lastModified,
  ] as const;
  const submitData = {
    name,
    format: "iso" as const,
    size_gib: sizeGib,
    content_type: contentType,
  };
  const body = input.idempotencyScope.withKey(submitData, runtimeDependencies);

  const { data: session, error } = await coreApi.POST("/images/uploads", {
    body,
    headers: {
      "Idempotency-Key": body.idempotency_key,
    },
  });
  if (error) throw new Error(getErrorMessage(error, "创建上传会话失败"));
  if (!session?.upload_url || !session.token || !session.image?.id) {
    throw new Error("上传会话无效");
  }

  assertSessionNotExpired(session.expires_at);

  const method = session.method ?? "POST";
  input.onProgress?.({
    phase: "preparing",
    percent: 0,
    message: "正在准备存储（等待上传服务就绪）…",
  });
  await waitForImageUploadReady(session.image.id, input.signal);
  await sleep(UPLOAD_READY_STABILIZE_MS, input.signal);

  input.onProgress?.({ phase: "uploading", percent: 0 });
  await xhrUploadFile({
    method,
    uploadUrl: session.upload_url,
    token: session.token,
    file: input.file,
    onProgress: input.onProgress,
    signal: input.signal,
  });

  // 浏览器发送完成 ≠ 镜像 ready；进入入库轮询阶段
  input.onProgress?.({
    phase: "processing",
    percent: 100,
    message: "发送完成，平台入库中…",
  });

  const image = await pollImageUntilTerminal(session.image.id, input.signal);
  input.idempotencyScope.reset(runtimeDependencies);
  return image;
}

export type { Image, ImageUploadSession };
