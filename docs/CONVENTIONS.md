# ANI Console 工程约定

## 目录

- `src/routes/`：TanStack Router 路由与页面，必须同文件。
- `src/components/`：跨页面共享组件。
- `src/api/`：`coreApi` 与后端类型快照。
- `src/stores/`：客户端状态。
- `src/lib/`、`src/hooks/`：共享逻辑。
- 禁止新增 `src/pages/`。

## UI

- 组件库：`@arco-design/web-react`。
- 图标：`@arco-design/web-react/icon`。
- 颜色与状态：Arco Token。
- Tailwind 仅用于布局。
- 列表必须覆盖 loading、empty、error。
- 危险操作必须二次确认。
- 冻结规范正文禁止修改。

## API

- 所有请求通过 `src/api/client.ts` 的 `coreApi`。
- 类型保留在 `src/api/core-schema.d.ts` 快照；契约核对独立 ANI 仓库的 Core OpenAPI 与实现。
- POST 和有副作用的 PUT/PATCH 必须携带 `idempotency_key`。
- 服务端数据使用 TanStack Query，客户端 UI 状态使用 Zustand。

## 验证

```bash
pnpm run typecheck
git diff --check
gitnexus detect-changes -r ani-console -s all
```

快速迭代阶段默认只运行 TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测，不保留自动化测试资产。构建、页面和交互由用户通过后台运行的 `pnpm dev` 等方式手动验证；Agent 不运行 `pnpm run verify` 或 production build，也不启动、重启或中断该服务。

## 记录

功能、工具链或验证规则变化后，在 [CONSOLE-TASK-PLAN.md](./CONSOLE-TASK-PLAN.md) 追加一条简短记录。
