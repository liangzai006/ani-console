import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Card, Result, Spin, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { exchangeOidcCode } from "@/api/auth";
import { ApiError } from "@/api/request";
import { AuthCenterLayout } from "@/components/shell/AuthCenterLayout";
import { closeNotification, showNotification } from "@/lib/feedback";
import { isAuthenticated, useAuthStore } from "@/stores/auth";

type CallbackPhase = "loading" | "missing" | "error";

const PENDING_KEY = "ani-console-oidc-pending";
const exchangeDoneKey = (code: string, state: string) => `ani-console-oidc:${code}:${state}`;

function stripCallbackQuery() {
  window.history.replaceState({}, "", "/login/callback");
}

function readCallbackParams(): { code: string | null; state: string | null } {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ code, state }));
    stripCallbackQuery();
    return { code, state };
  }

  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return { code: null, state: null };
  try {
    const parsed = JSON.parse(raw) as { code?: string; state?: string };
    if (parsed.code && parsed.state) return { code: parsed.code, state: parsed.state };
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
  }
  return { code: null, state: null };
}

export function LoginCallbackPage() {
  const navigate = useNavigate();
  const setAuthSession = useAuthStore((s) => s.setAuthSession);
  const [phase, setPhase] = useState<CallbackPhase>("loading");

  useEffect(() => {
    const redirectUri = `${window.location.origin}/login/callback`;
    const { code, state } = readCallbackParams();

    if (!code || !state) {
      if (isAuthenticated()) {
        navigate({ to: "/", replace: true });
        return;
      }
      setPhase("missing");
      return;
    }

    if (sessionStorage.getItem(exchangeDoneKey(code, state)) === "1" && isAuthenticated()) {
      sessionStorage.removeItem(PENDING_KEY);
      navigate({ to: "/", replace: true });
      return;
    }

    exchangeOidcCode(code, state, redirectUri)
      .then((tokens) => {
        closeNotification("oidc-login");
        setAuthSession({ tokens, username: null });
        sessionStorage.setItem(exchangeDoneKey(code, state), "1");
        sessionStorage.removeItem(PENDING_KEY);
        stripCallbackQuery();
        navigate({ to: "/", replace: true });
      })
      .catch((e) => {
        sessionStorage.removeItem(PENDING_KEY);
        sessionStorage.removeItem(exchangeDoneKey(code, state));
        const content =
          e instanceof ApiError && e.code === "UNAUTHORIZED"
            ? "授权信息已失效，请返回登录页重新发起登录"
            : { error: e, fallback: "登录失败，请稍后重试" };
        showNotification({ id: "oidc-login", state: "error", action: "登录", content });
        setPhase("error");
      });
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
