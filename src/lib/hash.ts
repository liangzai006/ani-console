import { sha256 } from "@noble/hashes/sha2.js";

const HASH_CHUNK_SIZE = 4 * 1024 * 1024;

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
}

export async function sha256File(file: File): Promise<string> {
  const hash = sha256.create();
  for (let offset = 0; offset < file.size; offset += HASH_CHUNK_SIZE) {
    const chunk = file.slice(offset, offset + HASH_CHUNK_SIZE);
    hash.update(new Uint8Array(await readBlob(chunk)));
  }
  return Array.from(hash.digest(), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
