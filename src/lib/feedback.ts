import { IconLoading } from "@arco-design/web-react/icon";
import { Message, Notification } from "@arco-design/web-react";
import { createElement, type ReactNode } from "react";

type FeedbackMessageType = "success" | "error" | "warning" | "info" | "loading";
type FeedbackNotificationState = FeedbackMessageType;

type ErrorFeedbackContent = {
  error: unknown;
  fallback: string;
};

type FeedbackContent = ReactNode | ErrorFeedbackContent;

type MessageOptions = {
  type: FeedbackMessageType;
  content: FeedbackContent;
  id?: string;
  duration?: number;
};

type NotificationOptions = {
  id: string;
  state: FeedbackNotificationState;
  action: string;
  content?: FeedbackContent;
};

function isErrorFeedbackContent(content: FeedbackContent): content is ErrorFeedbackContent {
  return Boolean(
    content && typeof content === "object" && "error" in content && "fallback" in content,
  );
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

function resolveContent(content: FeedbackContent): ReactNode {
  return isErrorFeedbackContent(content)
    ? resolveErrorMessage(content.error, content.fallback)
    : content;
}

export function showMessage({ type, content, id, duration }: MessageOptions): void {
  Message[type]({
    id,
    content: resolveContent(content),
    duration,
    className: "ani-feedback-message",
  });
}

export function showNotification({ id, state, action, content }: NotificationOptions): void {
  const method = state === "loading" ? "info" : state;
  const suffix =
    state === "loading" ? "中" : state === "success" ? "成功" : state === "error" ? "失败" : "";

  Notification[method]({
    id,
    title: suffix ? `${action}${suffix}` : action,
    content: content === undefined ? undefined : resolveContent(content),
    duration: state === "loading" ? 0 : 5000,
    closable: true,
    icon: state === "loading" ? createElement(IconLoading, { spin: true }) : undefined,
    className: "ani-feedback-notification",
  });
}

export function closeNotification(id: string): void {
  Notification.remove(id);
}
