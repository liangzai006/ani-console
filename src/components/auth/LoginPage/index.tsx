import { Button, Divider, Form, Input } from "@arco-design/web-react";
import { IconDriveFile, IconLock } from "@arco-design/web-react/icon";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import backgroundImageUrl from "@/assets/auth/background-01-cqy.png";
import logoUrl from "@/assets/brand/logo.png";
import { passwordLogin } from "@/api/auth";
import { ApiError } from "@/api/request";
import { isAuthenticated, useAuthStore } from "@/stores/auth";
import styles from "./index.module.css";
import { showMessage } from "@/lib/feedback";

export function LoginPage({ redirect = "/" }: { redirect?: string }) {
  const navigate = useNavigate();
  const setAuthSession = useAuthStore((state) => state.setAuthSession);
  const setDevelopmentBypass = useAuthStore((state) => state.setDevelopmentBypass);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate({ to: redirect, replace: true });
    }
  }, [navigate, redirect]);

  const login = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "登录",
        successText: "登录成功",
        errorFallback: "登录失败，请稍后重试",
      },
    },
    mutationFn: async (values: PasswordLoginValues) => {
      const submitData = {
        tenant_name: values.tenant_name.trim(),
        username: values.username.trim(),
        password: values.password,
      };
      try {
        return await passwordLogin(submitData);
      } catch (error) {
        throw new Error(getPasswordLoginErrorMessage(error));
      }
    },
    onSuccess: (tokens, values) => {
      setAuthSession({ tokens, username: values.username.trim() });
      navigate({ to: redirect, replace: true });
    },
  });

  const skipLogin = () => {
    setDevelopmentBypass(true);
    showMessage({ type: "info", content: "已进入开发预览模式" });
    navigate({ to: redirect, replace: true });
  };

  return (
    <main className={styles.page}>
      <img className={styles.background} src={backgroundImageUrl} alt="" aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <img className={styles.brandLogo} src={logoUrl} alt="" />
          <span>常青云平台</span>
        </div>
      </header>

      <section className={styles.loginCard} aria-labelledby="login-page-title">
        <img className={styles.cardLogo} src={logoUrl} alt="常青云" />
        <h1 id="login-page-title" className={styles.title}>
          登录常青云平台
        </h1>

        <Form<PasswordLoginValues>
          className={styles.form}
          layout="vertical"
          requiredSymbol={false}
          initialValues={{ tenant_name: "tenant-a", username: "admin", password: "Correct@123" }}
          disabled={login.isPending}
          onSubmit={(values) => login.mutate(values)}
        >
          <Form.Item
            label="租户标识"
            field="tenant_name"
            rules={[{ required: true, message: "请输入租户标识" }]}
          >
            <Input
              size="large"
              placeholder="请输入租户标识"
              maxLength={64}
              allowClear
              autoComplete="organization"
            />
          </Form.Item>
          <Form.Item
            label="账号"
            field="username"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input
              size="large"
              placeholder="请输入账号"
              maxLength={64}
              allowClear
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item
            className={styles.passwordItem}
            label={
              <span className={styles.passwordLabel}>
                <span>密码</span>
                <span className={styles.forgotPassword} aria-disabled="true">
                  忘记密码？
                </span>
              </span>
            }
            field="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              size="large"
              placeholder="请输入密码"
              maxLength={256}
              autoComplete="current-password"
            />
          </Form.Item>
          <Button
            className={styles.submitButton}
            type="primary"
            size="large"
            htmlType="submit"
            long
            loading={login.isPending}
          >
            立即登录
          </Button>
        </Form>

        <div hidden>
          <Divider className={styles.divider}>OR</Divider>
          <div className={styles.alternativeMethods} aria-label="其他登录方式">
            <span className={styles.alternativeMethod} aria-disabled="true">
              <IconDriveFile />
              Ukey登录
            </span>
            <span className={styles.alternativeMethod} aria-disabled="true">
              <IconLock />
              AD/LDAP账户
            </span>
          </div>
        </div>

        {import.meta.env.DEV ? (
          <Button className={styles.developmentButton} type="text" size="mini" onClick={skipLogin}>
            跳过登录（开发预览）
          </Button>
        ) : null}
      </section>

      <footer className={styles.footer}>Copyright © 2021-2025 广州常青云科技有限公司</footer>
    </main>
  );
}

interface PasswordLoginValues {
  tenant_name: string;
  username: string;
  password: string;
}

function getPasswordLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") return "用户名或密码错误";
  if (error instanceof ApiError && error.code === "TENANT_NOT_FOUND")
    return "租户不存在，请检查租户标识";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "网络异常，请稍后重试";
  return error instanceof Error && error.message.trim() ? error.message : "登录失败，请稍后重试";
}
