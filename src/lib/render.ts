const MEBIBYTE = 1024 ** 2;

export type ImageDisplaySource = {
  id?: string | null;
  image?: string | null;
  name?: string | null;
  ref?: string | null;
  size_bytes?: number | null;
};

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function imageReference(source?: ImageDisplaySource | string | null) {
  if (typeof source === "string") return nonEmpty(source);
  return (
    nonEmpty(source?.image) ??
    nonEmpty(source?.ref) ??
    nonEmpty(source?.name) ??
    nonEmpty(source?.id)
  );
}

function shortReference(reference: string) {
  return reference.slice(reference.lastIndexOf("/") + 1);
}

export function getImageDisplayName(
  source?: ImageDisplaySource | string | null,
): string {
  if (typeof source !== "string") {
    const name = nonEmpty(source?.name);
    if (name) return name;
  }
  const reference = imageReference(source);
  return reference ? shortReference(reference) : "-";
}

export function getImageFullReference(
  source?: ImageDisplaySource | string | null,
): string {
  return imageReference(source) ?? "-";
}

export function formatImageSize(sizeBytes?: number | null): string | undefined {
  if (sizeBytes == null || !Number.isFinite(sizeBytes) || sizeBytes < 0)
    return undefined;
  return `${Math.ceil(sizeBytes / MEBIBYTE)} MiB`;
}

export function getImageSelectionLabel(
  source?: ImageDisplaySource | string | null,
): string {
  const name = getImageDisplayName(source);
  const size =
    typeof source === "string"
      ? undefined
      : formatImageSize(source?.size_bytes);
  return size ? `${name} · ${size}` : name;
}

export function getImageTooltip(
  source?: ImageDisplaySource | string | null,
): string {
  const reference = getImageFullReference(source);
  const size =
    typeof source === "string"
      ? undefined
      : formatImageSize(source?.size_bytes);
  return size ? `${reference} · ${size}` : reference;
}
