import { Layout, Space, Typography } from "@arco-design/web-react";
import { useRouterState } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import "./index.css";
import { ProductServicesPanel } from "./ProductServicesPanel";
import { TopNav } from "./TopNav";
import { Sidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./Sidebar";
import { activeTopNavKeyForPath, sidebarNavigationForPath } from "./navigation";

const { Content } = Layout;

const APP_CONTENT_STYLE = {
  background: "linear-gradient(135deg, #f2f5fb 0%, #f7f9fc 100%)",
  boxSizing: "border-box",
  minWidth: 0,
  paddingInline: "var(--app-content-padding-inline)",
  paddingTop: "var(--app-content-padding-top)",
  paddingBottom: "var(--app-content-padding-bottom)",
  "--app-content-padding-inline": "24px",
  "--app-content-padding-bottom": "24px",
  "--app-content-available-height":
    "calc(100vh - var(--topnav-height) - var(--app-content-padding-top) - var(--app-content-padding-bottom))",
} as CSSProperties;

const SIDEBAR_CONTENT_STYLE = {
  ...APP_CONTENT_STYLE,
  "--app-content-padding-top": "16px",
} as CSSProperties;

const HOME_CONTENT_STYLE = {
  ...APP_CONTENT_STYLE,
  "--app-content-padding-top": "16px",
} as CSSProperties;

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [productPanelVisible, setProductPanelVisible] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const topNavKey = activeTopNavKeyForPath(pathname);
  const sidebarNavigation = sidebarNavigationForPath(pathname);
  const showSidebar = pathname !== "/";

  return (
    <Layout className="h-screen overflow-hidden" style={{ background: "var(--color-bg-1)" }}>
      <TopNav
        activeKey={topNavKey}
        productPanelVisible={productPanelVisible}
        onProductPanelVisibleChange={setProductPanelVisible}
      />
      <Layout className="min-h-0 flex-1 overflow-hidden" style={{ paddingTop: 0 }}>
        {showSidebar ? (
          <div className="app-layout-body">
            <div
              className="app-layout-sidebar-slot"
              style={{
                width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
              }}
            >
              <Sidebar
                items={sidebarNavigation?.items ?? null}
                label={sidebarNavigation?.label ?? "计算产品与服务"}
                activePathname={pathname}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
              />
            </div>
            <Content
              data-component="page-scroll-region"
              className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
              style={SIDEBAR_CONTENT_STYLE}
            >
              {children}
            </Content>
          </div>
        ) : (
          <Content
            data-component="page-scroll-region"
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
            style={HOME_CONTENT_STYLE}
          >
            {children}
          </Content>
        )}
      </Layout>
      <ProductServicesPanel
        visible={productPanelVisible}
        onClose={() => setProductPanelVisible(false)}
      />
    </Layout>
  );
}

export function PageHeader({
  title,
  subtitle,
  extra,
}: {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
}) {
  return (
    <header className="mb-5">
      <Space align="start" className="w-full justify-between">
        <div className="min-w-0">
          <Typography.Title heading={5} className="!m-0 !text-[20px] !font-semibold">
            {title}
          </Typography.Title>
          {subtitle ? (
            <Typography.Text type="secondary" className="mt-1 block text-sm">
              {subtitle}
            </Typography.Text>
          ) : null}
        </div>
        {extra ? <Space className="shrink-0">{extra}</Space> : null}
      </Space>
    </header>
  );
}

export { SIDEBAR_WIDTH };
