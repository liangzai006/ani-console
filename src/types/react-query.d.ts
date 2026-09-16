import "@tanstack/react-query";

export type QueryErrorNotificationMeta = {
  id: string;
  action: string;
  fallback?: string;
};

type MutationFeedbackBase = {
  action: string;
  successText?: string;
  errorFallback?: string;
};

export type MutationFeedbackMeta =
  | (MutationFeedbackBase & {
      channel: "message";
    })
  | (MutationFeedbackBase & {
      channel: "notification";
      id: string;
    });

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      errorNotification?: QueryErrorNotificationMeta;
    };
    mutationMeta: {
      feedback?: MutationFeedbackMeta;
    };
  }
}
