import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dropdown, Input, Menu, Modal } from "@arco-design/web-react";
import {
  IconApps,
  IconDown,
  IconHome,
  IconLocation,
  IconSearch,
  IconUser,
} from "@arco-design/web-react/icon";
import clsx from "clsx";
import { logout as logoutRequest } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { useBrandingStore } from "@/stores/branding";

interface TopNavProps {
  activeKey: string;
  productPanelVisible: boolean;
  onProductPanelVisibleChange: (visible: boolean) => void;
}

export function TopNav({
  activeKey,
  productPanelVisible,
  onProductPanelVisibleChange,
}: TopNavProps) {
  const navigate = useNavigate();
  const branding = useBrandingStore((s) => s.branding);
  const name = branding?.platform_name ?? "常青云平台";
  const clear = useAuthStore((s) => s.clear);
  const username = useAuthStore(
    (s) => (s.hasKnownUsername ? s.username : null) ?? (s.developmentBypass ? "admin" : "用户"),
  );

  const logout = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "logout",
        action: "操作",
        errorFallback: "操作失败，请稍后重试",
      },
    },
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

  const userMenu = (
    <Menu onClickMenuItem={(key) => key === "logout" && confirmLogout()}>
      <Menu.Item key="logout">退出登录</Menu.Item>
    </Menu>
  );

  return (
    <header className="top-nav h-(--topnav-height) basis-(--topnav-height)">
      <div className="topnav-left">
        <div className="topnav-brand" aria-label={name}>
          <span className="topnav-brand-mark">{name.slice(0, 1).toUpperCase()}</span>
          <span className="topnav-brand-name">{name}</span>
        </div>
        <nav className="topnav-primary" aria-label="主导航">
          <button
            type="button"
            className={clsx("topnav-primary-item", activeKey === "/" && "is-active")}
            onClick={() => {
              onProductPanelVisibleChange(false);
              navigate({ to: "/" });
            }}
          >
            <IconHome />
            <span>概览</span>
          </button>
          <button
            type="button"
            className={clsx(
              "topnav-primary-item",
              (activeKey === "products" || productPanelVisible) && "is-active",
            )}
            aria-expanded={productPanelVisible}
            aria-controls="product-services-panel"
            onClick={() => onProductPanelVisibleChange(!productPanelVisible)}
          >
            <IconApps />
            <span>产品与服务</span>
          </button>
          <div className="topnav-region" aria-label="当前区域：广州-A">
            <IconLocation />
            <span>广州-A</span>
            <IconDown className="topnav-region-arrow" />
          </div>
        </nav>
      </div>
      <div className="topnav-right">
        <Input
          className="topnav-search"
          prefix={<IconSearch />}
          placeholder="请输入内容"
          aria-label="全局搜索"
        />
        <button type="button" className="topnav-kaiwu" aria-label="进入开物">
          <span className="topnav-kaiwu-switch" aria-hidden="true">
            <span className="topnav-kaiwu-knob" />
          </span>
          <span>开物</span>
        </button>
        <Dropdown droplist={userMenu} trigger="click" position="br">
          <button type="button" className="topnav-user" aria-label={`打开 ${username} 用户菜单`}>
            <span className="topnav-user-avatar">
              <IconUser />
            </span>
            <span className="topnav-user-name">{username}</span>
            <IconDown className="topnav-user-chevron" />
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
