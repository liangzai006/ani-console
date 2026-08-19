# ANI Console

独立的 ANI Web Console。后端位于 `D:\Wks\Repos\Work\ANI`，浏览器请求统一使用 `/api/v1` 前缀。

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

- [工程约定](./CONVENTIONS.md)
- [当前任务与变更记录](./docs/CONSOLE-TASK-PLAN.md)
- [设计规范冻结令](./DESIGN-SPEC-FREEZE.md)
