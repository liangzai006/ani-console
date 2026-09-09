/// <reference types="vite/client" />
/// <reference types="novnc__novnc" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_OIDC_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "@arco-design/web-react/dist/css/arco.css";
