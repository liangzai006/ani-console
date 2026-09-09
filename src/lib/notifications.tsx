import { Notification } from "@arco-design/web-react";

type ErrorNotificationOptions = {
  id: string;
  title: string;
  content: string;
};

export function showErrorNotification({ id, title, content }: ErrorNotificationOptions) {
  Notification.error({
    id,
    title,
    content,
    duration: 5000,
    closable: true,
  });
}

export function closeNotification(id: string) {
  Notification.remove(id);
}
