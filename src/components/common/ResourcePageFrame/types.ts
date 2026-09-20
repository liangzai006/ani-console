import type { ButtonHTMLAttributes, ReactNode } from "react";

type ResourcePageTitleProps = {
  iconClassName: string;
  title: string;
  subtitle?: string;
};

export type ResourcePageHeaderAction = {
  key: string;
  label: ReactNode;
  iconClassName?: string;
  variant?: "primary" | "outline" | "secondary" | "danger";
  tooltip?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled" | "onClick">;
};

type ResourcePageHeaderBaseConfig = ResourcePageTitleProps;

export type ResourcePageHeaderConfig = ResourcePageHeaderBaseConfig &
  (
    | {
        actions?: ResourcePageHeaderAction[];
        extra?: never;
      }
    | {
        actions?: never;
        extra: ReactNode;
      }
  );

export type ResourcePageFrameProps = {
  header: ResourcePageHeaderConfig;
  children: ReactNode;
};
