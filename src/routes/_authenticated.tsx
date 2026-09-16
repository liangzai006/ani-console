import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/AppLayout";
import { isAuthenticated } from "@/stores/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: "/login" });
  },
  component: function AuthenticatedLayout() {
    return (
      <AppLayout>
        <Outlet />
      </AppLayout>
    );
  },
});
