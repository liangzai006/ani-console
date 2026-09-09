import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";
import { isAuthenticated } from "@/stores/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  component: function AuthenticatedLayout() {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  },
});
