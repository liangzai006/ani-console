import { useNavigate } from "@tanstack/react-router";
import { Alert, Button, Card, Divider, Form, Input, Message } from "@arco-design/web-react";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { passwordLogin } from "@/api/auth";
import { AuthCenterLayout } from "@/components/shell/AuthCenterLayout";
import { parseApiError } from "@/lib/errors";
import { isAuthenticated, useAuthStore } from "@/stores/auth";

export function LoginPage({ redirect = "/" }: { redirect?: string }) {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setDevelopmentBypass = useAuthStore((state) => state.setDevelopmentBypass);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate({ to: redirect, replace: true });
    }
  }, [navigate, redirect]);

  const login = useMutation({
    mutationFn: async (values: PasswordLoginValues) => {
      const submitData = {
        tenant_name: values.tenant_name.trim(),
        username: values.username.trim(),
        password: values.password,
      };
      return passwordLogin(submitData);
    },
    onSuccess: (tokens) => {
      setTokens(tokens);
      Message.success("登录成功");
      navigate({ to: redirect, replace: true });
    },
    onError: (error) => {
      Message.error(getPasswordLoginErrorMessage(error));
    },
  });

  const skipLogin = () => {
    setDevelopmentBypass(true);
    Message.info("已进入开发预览模式");
    navigate({ to: redirect, replace: true });
  };

  return (
    <AuthCenterLayout>
      <Card className="w-full max-w-[400px]" title="登录 ANI Console">
        <Form<PasswordLoginValues>
          layout="vertical"
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
              placeholder="请输入租户标识"
              maxLength={64}
              allowClear
              autoComplete="organization"
            />
          </Form.Item>
          <Form.Item
            label="用户名"
            field="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" maxLength={64} allowClear autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            field="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              placeholder="请输入密码"
              maxLength={256}
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" long loading={login.isPending}>
            登录
          </Button>
        </Form>
        {import.meta.env.DEV ? (
          <>
            <Divider />
            <Alert
              type="warning"
              content="开发预览模式不会携带登录令牌，依赖后端鉴权的数据可能无法加载。"
            />
            <Button type="text" long className="mt-3" onClick={skipLogin}>
              跳过登录（仅开发模式）
            </Button>
          </>
        ) : null}
      </Card>
    </AuthCenterLayout>
  );
}

interface PasswordLoginValues {
  tenant_name: string;
  username: string;
  password: string;
}

function getPasswordLoginErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);
  if (parsed.code === "INVALID_CREDENTIALS") return "用户名或密码错误";
  if (parsed.code === "TENANT_NOT_FOUND") return "租户不存在，请检查租户标识";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "网络异常，请稍后重试";
  return parsed.message || "登录失败，请稍后重试";
}
