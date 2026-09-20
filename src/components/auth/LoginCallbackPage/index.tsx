import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Card, Result, Spin, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { exchangeOidcCode } from "@/api/auth";
import { ApiError } from "@/api/request";
import { AuthCenterLayout } from "@/components/layouts/AuthCenterLayout";
import { closeNotification, showNotification } from "@/lib/feedback";
import { oidcStorage } from "@/lib/storage";
import { isAuthenticated, useAuthStore } from "@/stores/auth";

type CallbackPhase = "loading" | "missing" | "error";

const PENDING_KEY = "ani-console-oidc-pending";
const exchangeDoneKey = (code: string, state: string) => `ani-console-oidc:${code}:${state}`;

type PendingCallback = {
  code: string;
  state: string;
};

function stripCallbackQuery() {
  window.history.replaceState({}, "", "/login/callback");
}

async function readCallbackParams(): Promise<{ code: string | null; state: string | null }> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) {
    try {
      await oidcStorage.setItem<PendingCallback>(PENDING_KEY, { code, state });
      stripCallbackQuery();
    } catch {
      // Keep the callback query in place when persistence is unavailable.
    }
    return { code, state };
  }

  try {
    const pending = await oidcStorage.getItem<PendingCallback>(PENDING_KEY);
    if (pending?.code && pending.state) return pending;
    await oidcStorage.removeItem(PENDING_KEY);
  } catch {
    // Continue with a missing callback when storage is unavailable.
  }
  return { code: null, state: null };
}

export function LoginCallbackPage() {
  const navigate = useNavigate();
  const setAuthSession = useAuthStore((s) => s.setAuthSession);
  const [phase, setPhase] = useState<CallbackPhase>("loading");

  useEffect(() => {
    const completeLogin = async () => {
      const redirectUri = `${window.location.origin}/login/callback`;
      const { code, state } = await readCallbackParams();

      if (!code || !state) {
        if (isAuthenticated()) {
          navigate({ to: "/", replace: true });
          return;
        }
        setPhase("missing");
        return;
      }

      const doneKey = exchangeDoneKey(code, state);
      const exchangeDone = await oidcStorage.getItem<boolean>(doneKey).catch(() => false);
      if (exchangeDone && isAuthenticated()) {
        await oidcStorage.removeItem(PENDING_KEY).catch(() => undefined);
        navigate({ to: "/", replace: true });
        return;
      }

      try {
        const tokens = await exchangeOidcCode(code, state, redirectUri);
        closeNotification("oidc-login");
        setAuthSession({ tokens, username: null });
        await Promise.allSettled([
          oidcStorage.setItem(doneKey, true),
          oidcStorage.removeItem(PENDING_KEY),
        ]);
        stripCallbackQuery();
        navigate({ to: "/", replace: true });
      } catch (e) {
        await Promise.allSettled([
          oidcStorage.removeItem(PENDING_KEY),
          oidcStorage.removeItem(doneKey),
        ]);
        const content =
          e instanceof ApiError && e.code === "UNAUTHORIZED"
            ? "授权信息已失效，请返回登录页重新发起登录"
            : { error: e, fallback: "登录失败，请稍后重试" };
        showNotification({ id: "oidc-login", state: "error", action: "登录", content });
        setPhase("error");
      }
    };

    void completeLogin();
  }, [navigate, setAuthSession]);

  if (phase === "missing") {
    return (
      <AuthCenterLayout>
        <Card className="w-full max-w-100">
          <Result
            status="warning"
            title="缺少授权参数"
            subTitle="请从登录页重新发起 OIDC 授权"
            extra={
              <Link to="/login">
                <Button type="primary">返回登录</Button>
              </Link>
            }
          />
        </Card>
      </AuthCenterLayout>
    );
  }

  if (phase === "error") {
    return (
      <AuthCenterLayout>
        <Card className="w-full max-w-120 text-center">
          <Link to="/login">
            <Button type="primary">返回登录</Button>
          </Link>
        </Card>
      </AuthCenterLayout>
    );
  }

  return (
    <AuthCenterLayout>
      <Card className="w-full max-w-90 text-center">
        <Spin className="block" />
        <Typography.Text className="mt-4 block">正在完成登录…</Typography.Text>
      </Card>
    </AuthCenterLayout>
  );
}
