import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { migrateLegacyAuthStorage } from "@/lib/storage";
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
    const hydrateAuth = async () => {
      try {
        try {
          await migrateLegacyAuthStorage();
        } catch {
          // Hydration can still continue when legacy migration is unavailable.
        }
        await useAuthStore.persist.rehydrate();
      } finally {
        ready();
      }
    };
    void hydrateAuth();
  }, []);

  if (!authReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
