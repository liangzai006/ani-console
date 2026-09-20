export function resolveWebSocketUrl(value: string): string {
  const url = new URL(value, window.location.href);
  if (url.username || url.password) throw new Error("WebSocket 连接地址不能包含凭据");

  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (window.location.protocol === "https:" && url.protocol === "ws:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("WebSocket 连接地址协议无效");
  }
  return url.href;
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof URL.createObjectURL !== "function") {
    throw new Error("当前浏览器不支持文件下载");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function openExternalUrl(value: string): void {
  const url = new URL(value, window.location.href);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("外部链接协议无效");
  }

  const anchor = document.createElement("a");
  anchor.href = url.href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
