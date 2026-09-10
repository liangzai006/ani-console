import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button, Menu, Modal, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { logout as logoutRequest } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { useBrandingStore } from "@/stores/branding";
import { firstLeafPath, menuItems } from "@/lib/menu-items";

export const TOPNAV_HEIGHT = 56;

interface TopNavProps {
  activeKey: string;
}

export function TopNav({ activeKey }: TopNavProps) {
  const navigate = useNavigate();
  const branding = useBrandingStore((s) => s.branding);
  const name = branding?.platform_name ?? "ANI Console";
  const clear = useAuthStore((s) => s.clear);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([activeKey]);

  useEffect(() => {
    setSelectedKeys([activeKey]);
  }, [activeKey]);

  const logout = useMutation({
    mutationFn: async () => {
      const jti = useAuthStore.getState().getAccessTokenJti();
      if (!jti) throw new Error("当前 access token 缺少 jti，无法调用服务端登出");
      const submitData = { jti };
      await logoutRequest(submitData);
    },
    onSettled: () => {
      clear();
      navigate({ to: "/login" });
    },
  });

  const confirmLogout = () => {
    Modal.confirm({
      title: "确认退出登录",
      content: "退出后需重新登录。",
      okButtonProps: { status: "danger" },
      onOk: () => logout.mutateAsync(),
    });
  };

  const handleClick = (key: string) => {
    const item = menuItems.find((m) => m.key === key);
    if (!item) return;
    const target = firstLeafPath(item);
    if (target) navigate({ to: target });
  };

  return (
    <header
      data-component="topnav"
      className="box-border flex shrink-0 items-center justify-between border-b px-6"
      style={{
        height: TOPNAV_HEIGHT,
        flexBasis: TOPNAV_HEIGHT,
        background: "var(--color-bg-2)",
        borderColor: "var(--color-border-2)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded text-[13px] font-bold text-white"
          style={{ width: 24, height: 24, background: "rgb(var(--primary-6))" }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <Typography.Text
          className="text-[17px] font-bold"
          style={{ color: "rgb(var(--primary-6))" }}
        >
          {name}
        </Typography.Text>
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={selectedKeys}
        onClickMenuItem={(key) => handleClick(key)}
        className="topnav-menu border-none"
        style={{ flex: 1, marginLeft: 24, background: "transparent" }}
      >
        {menuItems.map((item) => (
          <Menu.Item key={item.key}>{item.label}</Menu.Item>
        ))}
      </Menu>
      <Button type="text" status="danger" loading={logout.isPending} onClick={confirmLogout}>
        退出登录
      </Button>
    </header>
  );
}
