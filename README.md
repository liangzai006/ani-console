# ANI Console

独立的 ANI Web Console。后端由独立的 ANI 仓库维护；平台 API 使用 `/api/v1` 前缀，外部预签名直传地址除外。

## 开发

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run fmt
pnpm run typecheck
git diff --check
```

日常改动由 Agent 按工程约定执行 Oxlint、全仓 oxfmt、TypeScript、差异格式与 GitNexus 变更检测；构建、页面与交互通过用户后台运行的 `pnpm dev` 等方式手动验证。Agent 不执行 production build，也不启动、重启或中断该服务。

环境变量按 [Vite 的 Env Variables and Modes](https://v6.vite.dev/guide/env-and-mode) 约定配置；本地覆盖可写入不提交的 `.env.local`。

## 技术栈

React 18、TypeScript、Vite、TanStack Router/Query、Arco Design React、Zustand、Axios、ECharts。

## 文档

- [文档索引](./docs/README.md)
- [工程约定](./docs/ENGINEERING-CONVENTIONS.md)
- [API 对接流程](./docs/API-INTEGRATION.md)
- [UI 开发约定](./docs/UI-CONVENTIONS.md)
