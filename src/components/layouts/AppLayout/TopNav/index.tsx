import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dropdown, Input, Modal } from "@arco-design/web-react";
import {
  IconApps,
  IconCalendar,
  IconDown,
  IconExport,
  IconHome,
  IconInfoCircle,
  IconLocation,
  IconRight,
  IconSearch,
  IconTag,
  IconUser,
} from "@arco-design/web-react/icon";
import clsx from "clsx";
import { useState } from "react";
import { logout as logoutRequest } from "@/api/auth";
import { formatDateTime } from "@/lib/format";
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
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const branding = useBrandingStore((s) => s.branding);
  const name = branding?.platform_name ?? "常青云平台";
  const clear = useAuthStore((s) => s.clear);
  const username = useAuthStore(
    (s) => (s.hasKnownUsername ? s.username : null) ?? (s.developmentBypass ? "admin" : "用户"),
  );
  const sessionIssuedAt = useAuthStore((s) => {
    if (!s.tokens || !("issued_at" in s.tokens)) return null;
    return typeof s.tokens.issued_at === "string" ? s.tokens.issued_at : null;
  });

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
    setUserMenuVisible(false);
    Modal.confirm({
      title: "确认退出登录",
      content: "退出后需重新登录。",
      okButtonProps: { status: "danger" },
      onOk: () => logout.mutateAsync(),
    });
  };

  const userMenu = (
    <div className="topnav-user-card" role="menu" aria-label="个人中心">
      <div className="topnav-user-card-header">
        <span className="topnav-user-card-avatar" aria-hidden="true">
          <IconUser />
        </span>
        <div className="topnav-user-card-profile">
          <strong>{username}</strong>
          <span className="topnav-user-card-meta">
            <IconTag />
            <span>console</span>
          </span>
          <span className="topnav-user-card-meta">
            <IconCalendar />
            <span>{formatDateTime(sessionIssuedAt)}</span>
          </span>
        </div>
      </div>
      <div className="topnav-user-card-menu">
        <span className="topnav-user-card-divider" aria-hidden="true" />
        <button
          type="button"
          role="menuitem"
          className="topnav-user-card-action"
          onClick={() => {
            setUserMenuVisible(false);
            setAboutVisible(true);
          }}
        >
          <IconInfoCircle />
          <span className="topnav-user-card-action-label">关于我们</span>
          <IconRight className="topnav-user-card-action-arrow" />
        </button>
      </div>
      <div className="topnav-user-card-footer">
        <button
          type="button"
          role="menuitem"
          className="topnav-user-card-logout"
          onClick={confirmLogout}
        >
          <IconExport />
          <span>安全退出</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
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
          <span className="topnav-user-divider" aria-hidden="true" />
          <Dropdown
            droplist={userMenu}
            trigger="hover"
            position="br"
            popupVisible={userMenuVisible}
            onVisibleChange={setUserMenuVisible}
            triggerProps={{ mouseEnterDelay: 0, mouseLeaveDelay: 200 }}
          >
            <button
              type="button"
              className="topnav-user"
              aria-label={`打开 ${username} 用户菜单`}
              aria-haspopup="menu"
              aria-expanded={userMenuVisible}
            >
              <span className="topnav-user-avatar">
                <IconUser />
              </span>
              <span className="topnav-user-name">{username}</span>
            </button>
          </Dropdown>
        </div>
      </header>
      <Modal
        className="topnav-about-modal"
        title="关于我们"
        visible={aboutVisible}
        footer={null}
        onCancel={() => setAboutVisible(false)}
      >
        <div className="topnav-about-overview">
          <span className="topnav-about-mark" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h3>{name}</h3>
            <p>系统介绍</p>
          </div>
        </div>
        <div className="topnav-about-placeholder">
          系统定位、核心能力与相关说明将在文案确认后补充。
        </div>
      </Modal>
    </>
  );
}
