/** 登录 / OIDC 回调等无壳层页面的居中布局（页面模板 2.0 表单页变体） */
export function AuthCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--color-bg-1)" }}
    >
      {children}
    </div>
  );
}
