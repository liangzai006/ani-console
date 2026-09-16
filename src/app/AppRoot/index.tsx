import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { queryClient } from "../query-client";
import { router } from "../router";

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
