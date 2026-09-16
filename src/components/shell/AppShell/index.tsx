import { Layout, Space, Typography } from "@arco-design/web-react";
import { useRouterState } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { TopNav, TOPNAV_HEIGHT } from "../TopNav";
import { Sidebar, SIDEBAR_WIDTH } from "../Sidebar";
import { activeTopNavKeyForPath, sidebarItemsForTopNavKey } from "@/lib/side-menu-match";

const { Content } = Layout;

const APP_CONTENT_STYLE = {
  background: "#F7F8FA",
  boxSizing: "border-box",
  minWidth: 0,
  paddingInline: "var(--app-content-padding-inline)",
  paddingTop: "var(--app-content-padding-top)",
  paddingBottom: "var(--app-content-padding-bottom)",
  "--app-content-padding-inline": "24px",
  "--app-content-padding-bottom": "24px",
  "--app-content-available-height":
    "calc(100vh - var(--topbar-height) - var(--app-content-padding-top) - var(--app-content-padding-bottom))",
} as CSSProperties;

const SIDEBAR_CONTENT_STYLE = {
  ...APP_CONTENT_STYLE,
  "--app-content-padding-top": "24px",
} as CSSProperties;

const HOME_CONTENT_STYLE = {
  ...APP_CONTENT_STYLE,
  "--app-content-padding-top": "16px",
} as CSSProperties;

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const topNavKey = activeTopNavKeyForPath(pathname);
  const sidebarItems = sidebarItemsForTopNavKey(topNavKey);
  const showSidebar = pathname !== "/";

  return (
    <Layout className="h-screen overflow-hidden" style={{ background: "var(--color-bg-1)" }}>
      <TopNav activeKey={topNavKey} />
      <Layout className="min-h-0 flex-1 overflow-hidden" style={{ paddingTop: 0 }}>
        {showSidebar ? (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Sidebar
              items={sidebarItems}
              activePathname={pathname}
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
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

export { TOPNAV_HEIGHT, SIDEBAR_WIDTH };
