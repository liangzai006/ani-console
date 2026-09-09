import { Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import {
  getImageDisplayName,
  getImageSelectionLabel,
  getImageTooltip,
  type ImageDisplaySource,
} from "@/lib/render";

export function ImageNameText({
  image,
  showSize = false,
  className,
}: {
  image?: ImageDisplaySource | string | null;
  showSize?: boolean;
  className?: string;
}) {
  const label = showSize ? getImageSelectionLabel(image) : getImageDisplayName(image);

  return (
    <Tooltip content={getImageTooltip(image)}>
      <span className={clsx("block truncate", className)}>{label}</span>
    </Tooltip>
  );
}
