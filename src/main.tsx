import "@arco-design/web-react/dist/css/arco.css";
import "@/assets/iconfont/iconfont.css";
import "@/styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "@arco-design/web-react";
import { AppRoot } from "@/components/shell/AppRoot";

const ARCO_THEME = { primaryColor: "#0079D3" };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider theme={ARCO_THEME}>
      <AppRoot />
    </ConfigProvider>
  </StrictMode>,
);
