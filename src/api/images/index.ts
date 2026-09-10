import axios from "axios";
import { coreRequest, externalAxios, toApiError } from "@/api/request";
import { createIdempotencyScope, type IdempotencyBody } from "@/lib/idempotency";
import type {
  CreateImageUploadInput,
  CreateImageUploadRequest,
  Image,
  ImageListParams,
  ImageListResponse,
  ImageUploadProgress,
  ImageUploadSession,
  UploadImageFileInput,
} from "./types";

const GIB = 1024 ** 3;
const DEFAULT_ISO_CONTENT_TYPE = "application/x-iso9660-image";
const UPLOAD_BODY_CONTENT_TYPE = "application/octet-stream";
const POLL_INTERVAL_MS = 2000;
const PREPARE_TIMEOUT_MS = 5 * 60 * 1000;
const PROCESS_TIMEOUT_MS = 30 * 60 * 1000;
const UPLOAD_READY_STABILIZE_MS = 3000;
const UPLOAD_RETRY_DELAY_MS = 5000;
const MAX_UPLOAD_RETRIES = 6;

const uploadSessionScope = createIdempotencyScope("image-upload-session", ["POST"]);
const imagePath = (imageId: string) => `/images/${encodeURIComponent(imageId)}`;

export function listImages(params: ImageListParams = {}): Promise<ImageListResponse> {
  return coreRequest<ImageListResponse>("/images", { method: "GET", params });
}

export function getImage(imageId: string, signal?: AbortSignal): Promise<Image> {
  return coreRequest<Image>(imagePath(imageId), { method: "GET", signal });
}

export function deleteImage(imageId: string): Promise<Image> {
  return coreRequest<Image>(imagePath(imageId), { method: "DELETE" });
}

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

function assertSessionNotExpired(expiresAt: string): void {
  const expiresMs = Date.parse(expiresAt);
  if (Number.isFinite(expiresMs) && Date.now() >= expiresMs) {
    throw new Error("上传会话已过期，请重新创建");
  }
}

async function uploadFileOnce({
  method,
  uploadUrl,
  token,
  file,
  onProgress,
  signal,
}: {
  method: "PUT" | "POST";
  uploadUrl: string;
  token: string;
  file: File;
  onProgress?: (update: ImageUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  try {
    await externalAxios.request({
      method,
      url: uploadUrl,
      data: file,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": UPLOAD_BODY_CONTENT_TYPE,
      },
      onUploadProgress: (event) => {
        if (!event.total || !onProgress) return;
        onProgress({
          phase: "uploading",
          percent: Math.min(99, Math.floor((event.loaded / event.total) * 100)),
          loadedBytes: event.loaded,
          totalBytes: event.total,
        });
      },
    });
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    const apiError = toApiError(error);
    if (apiError.status === 503) Object.assign(apiError, { retryable: true });
    throw apiError;
  }
}

async function uploadFile(input: Parameters<typeof uploadFileOnce>[0]): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await uploadFileOnce(input);
      return;
    } catch (error) {
      const retryable = error instanceof Error && "retryable" in error && error.retryable === true;
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

async function waitForImageUploadReady(imageId: string, signal?: AbortSignal): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < PREPARE_TIMEOUT_MS) {
    const image = await getImage(imageId, signal);
    if (image.state === "uploading") return;
    if (image.state === "failed") {
      throw new Error([image.message, image.reason].filter(Boolean).join("：") || "准备失败");
    }
    if (image.state === "deleting" || image.state === "deleted") throw new Error("镜像已删除");
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new Error("等待上传服务就绪超时");
}

async function pollImageUntilTerminal(imageId: string, signal?: AbortSignal): Promise<Image> {
  const started = Date.now();
  while (Date.now() - started < PROCESS_TIMEOUT_MS) {
    const image = await getImage(imageId, signal);
    if (image.state === "ready") return image;
    if (image.state === "failed") {
      throw new Error([image.reason, image.message].filter(Boolean).join("：") || "镜像导入失败");
    }
    if (image.state === "deleted" || image.state === "deleting") throw new Error("镜像已删除");
    await sleep(POLL_INTERVAL_MS, signal);
  }
  throw new Error("等待镜像就绪超时");
}

export async function uploadImageFile(input: UploadImageFileInput): Promise<Image> {
  const name = (input.name ?? input.file.name).trim();
  if (!name) throw new Error("请输入镜像名称");
  if (!input.file.name.toLowerCase().endsWith(".iso")) throw new Error("请选择 .iso 文件");

  const sizeGib = input.sizeGib ?? suggestImageSizeGib(input.file.size);
  if (sizeGib < 1) throw new Error("容量必须大于 0");

  const submitData: CreateImageUploadInput = {
    name,
    format: "iso",
    size_gib: sizeGib,
    content_type: input.contentType?.trim() || DEFAULT_ISO_CONTENT_TYPE,
  };
  const runtimeDependencies = [
    input.file.name,
    input.file.size,
    input.file.type,
    input.file.lastModified,
  ] as const;
  const body = uploadSessionScope.withKey(
    submitData as unknown as IdempotencyBody,
    runtimeDependencies,
  ) as unknown as CreateImageUploadRequest;

  try {
    const session = await coreRequest<ImageUploadSession, CreateImageUploadRequest>(
      "/images/uploads",
      {
        method: "POST",
        data: body,
        headers: { "Idempotency-Key": body.idempotency_key },
        signal: input.signal,
      },
    );
    if (!session.upload_url || !session.token || !session.image?.id) {
      throw new Error("上传会话无效");
    }

    assertSessionNotExpired(session.expires_at);
    input.onProgress?.({
      phase: "preparing",
      percent: 0,
      message: "正在准备存储（等待上传服务就绪）…",
    });
    await waitForImageUploadReady(session.image.id, input.signal);
    await sleep(UPLOAD_READY_STABILIZE_MS, input.signal);

    input.onProgress?.({ phase: "uploading", percent: 0 });
    await uploadFile({
      method: session.method ?? "POST",
      uploadUrl: session.upload_url,
      token: session.token,
      file: input.file,
      onProgress: input.onProgress,
      signal: input.signal,
    });

    input.onProgress?.({
      phase: "processing",
      percent: 100,
      message: "发送完成，平台入库中…",
    });
    const image = await pollImageUntilTerminal(session.image.id, input.signal);
    uploadSessionScope.reset(runtimeDependencies);
    return image;
  } catch (error) {
    if (axios.isCancel(error) || (error instanceof DOMException && error.name === "AbortError")) {
      uploadSessionScope.reset(runtimeDependencies);
    }
    throw error;
  }
}

export type {
  CreateImageUploadInput,
  CreateImageUploadRequest,
  Image,
  ImageFormat,
  ImageListParams,
  ImageListResponse,
  ImageState,
  ImageUploadProgress,
  ImageUploadSession,
  UploadImageFileInput,
} from "./types";
