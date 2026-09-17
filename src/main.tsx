import "@arco-design/web-react/dist/css/arco.css";
import "@/assets/iconfont/iconfont.css";
import "@/styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "@arco-design/web-react";
import { AppRoot } from "@/app/AppRoot";
import { showMessage } from "@/lib/feedback";

const ARCO_THEME = { primaryColor: "#0079D3" };
const COMPONENT_CONFIG = {
  Form: {
    onSubmitFailed: () => showMessage({ type: "error", content: "请检查并修正表单中的错误项" }),
  },
  Modal: {
    maskClosable: false,
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider theme={ARCO_THEME} componentConfig={COMPONENT_CONFIG}>
      <AppRoot />
    </ConfigProvider>
  </StrictMode>,
);
