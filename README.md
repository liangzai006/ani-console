# ANI Console

独立的 ANI Web Console。后端由独立的 ANI 仓库维护，浏览器请求统一使用 `/api/v1` 前缀。

## 开发

```bash
pnpm install
pnpm run dev
pnpm run verify
```

`verify` 执行 TypeScript 类型检查和 production build。

开发代理目标由 `.env.development` 的 `VITE_API_PROXY_TARGET` 控制。

## 技术栈

React 18、TypeScript、Vite、TanStack Router/Query、Arco Design React、Zustand、openapi-fetch、ECharts。

## 文档

- [文档索引](./docs/README.md)
- [工程约定](./docs/CONVENTIONS.md)
- [当前状态与变更记录](./docs/CONSOLE-TASK-PLAN.md)
- [设计规范冻结令](./docs/design/DESIGN-SPEC-FREEZE.md)
