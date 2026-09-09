import type { ButtonProps, FormInstance, FormProps } from "@arco-design/web-react";
import type { ReactNode } from "react";

export type FormPageBreadcrumbItem = {
  label: ReactNode;
  to?: string;
  params?: Record<string, string>;
};

export type FormPageSection = {
  key: string;
  title: ReactNode;
  content: ReactNode;
};

export type FormPageAction = {
  key: string;
  label: ReactNode;
  submit?: boolean;
  onClick?: () => void;
  buttonProps?: Omit<ButtonProps, "children" | "htmlType" | "onClick">;
};

export type FormPageFrameProps<FormData extends Record<string, unknown>> = {
  breadcrumbs: FormPageBreadcrumbItem[];
  form: FormInstance<FormData>;
  sections: FormPageSection[];
  actions: FormPageAction[];
  onSubmit: (values: FormData) => void | Promise<void>;
  onBack?: () => void;
  formProps?: Omit<FormProps<FormData>, "children" | "className" | "form" | "onSubmit">;
};
