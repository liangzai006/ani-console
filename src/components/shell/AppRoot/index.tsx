import { useEffect, useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/stores/auth";
import { closeNotification, showMessage, showNotification } from "@/lib/feedback";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const feedback = query.meta?.errorNotification;
      if (!feedback) return;
      showNotification({
        id: feedback.id,
        state: "error",
        action: feedback.action,
        content: { error, fallback: feedback.fallback ?? `${feedback.action}失败` },
      });
    },
    onSuccess: (_data, query) => {
      const id = query.meta?.errorNotification?.id;
      if (id) closeNotification(id);
    },
  }),
  mutationCache: new MutationCache({
    onMutate: (_variables, mutation) => {
      const feedback = mutation.meta?.feedback;
      if (feedback?.channel !== "notification") return;
      showNotification({
        id: feedback.id,
        state: "loading",
        action: feedback.action,
      });
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      const feedback = mutation.meta?.feedback;
      if (!feedback) return;
      if (feedback.channel === "message") {
        showMessage({
          type: "success",
          content: feedback.successText ?? `${feedback.action}成功`,
        });
        return;
      }
      showNotification({
        id: feedback.id,
        state: "success",
        action: feedback.action,
        content: feedback.successText,
      });
    },
    onError: (error, _variables, _context, mutation) => {
      const feedback = mutation.meta?.feedback;
      if (!feedback) return;
      const content = {
        error,
        fallback: feedback.errorFallback ?? `${feedback.action}失败`,
      };
      if (feedback.channel === "message") {
        showMessage({ type: "error", content });
        return;
      }
      showNotification({
        id: feedback.id,
        state: "error",
        action: feedback.action,
        content,
      });
    },
  }),
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRoot() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const ready = () => {
      useAuthStore.setState({ hydrated: true });
      setAuthReady(true);
    };
    const result = useAuthStore.persist.rehydrate();
    if (result && typeof (result as Promise<void>).then === "function") {
      void (result as Promise<void>).then(ready);
    } else {
      ready();
    }
  }, []);

  if (!authReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
