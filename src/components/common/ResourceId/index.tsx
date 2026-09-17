import { Button, Tooltip } from "@arco-design/web-react";
import { IconCopy } from "@arco-design/web-react/icon";
import clsx from "clsx";
import { copyToClipboard } from "@/lib/clipboard";

const RESOURCE_ID_SUFFIX_LENGTH = 7;

function getResourceIdDisplay(value: string) {
  const separatorIndex = value.indexOf("_");
  if (separatorIndex <= 0) return value;

  const prefix = value.slice(0, separatorIndex + 1);
  const suffix = value.slice(-RESOURCE_ID_SUFFIX_LENGTH);
  if (value.length <= prefix.length + suffix.length) return value;

  return `${prefix}...${suffix}`;
}

export function ResourceId({ value, className }: { value: string; className?: string }) {
  return (
    <span className={clsx("inline-flex max-w-full min-w-0 items-center gap-1", className)}>
      <Tooltip content={value}>
        <span className="min-w-0 truncate font-mono">{getResourceIdDisplay(value)}</span>
      </Tooltip>
      <Tooltip content="复制资源 ID">
        <Button
          className="shrink-0"
          type="text"
          size="mini"
          icon={<IconCopy />}
          aria-label="复制资源 ID"
          onClick={() => void copyToClipboard(value, "资源 ID")}
        />
      </Tooltip>
    </span>
  );
}
