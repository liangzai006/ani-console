import { AliIcon } from "../AliIcon";
import { DetailPageFrame } from "../DetailPageFrame";
import type { DetailBreadcrumbItem } from "../DetailPageFrame/types";

type DetailPagePlaceholderProps = {
  breadcrumbs: DetailBreadcrumbItem[];
  title: string;
  idLabel: string;
  idValue: string;
  iconName?: string;
};

export function DetailPagePlaceholder({
  breadcrumbs,
  title,
  idLabel,
  idValue,
  iconName,
}: DetailPagePlaceholderProps) {
  return (
    <DetailPageFrame
      breadcrumbs={breadcrumbs}
      title={title}
      icon={iconName ? <AliIcon name={iconName} size={28} /> : undefined}
      headerItems={[
        { label: idLabel, value: idValue },
        { label: "状态", value: "-" },
        { label: "创建时间", value: "-" },
      ]}
      cards={[
        {
          key: "basic",
          title: "基本信息",
          fields: [{ label: idLabel, value: idValue }],
        },
      ]}
    />
  );
}
