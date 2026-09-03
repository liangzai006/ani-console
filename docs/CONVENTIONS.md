# ANI Console 工程约定

## 目录

- `src/routes/`：仅保留 TanStack Router 薄入口，负责 `createFileRoute`、路由参数、search 校验、loader/beforeLoad 等路由编排；具体页面实现必须从 `src/components/<scope>/<PageName>/index.tsx` 导入，避免页面实现与文件路由生成耦合导致热更新失效。
- 页面级组件的目录名与导出名必须以 `Page` 结尾（例如 `VmInstancesPage`），普通业务组件不得使用 `Page` 后缀，以便从命名上明确区分路由页面与可复用组件。
- `src/components/`：按 page scope 组织的组件目录。组件必须使用 `src/components/<scope>/<ComponentName>/index.tsx`；私有样式使用同目录的 `index.css`、`index.less`、`index.module.css` 或 `index.module.less`；子组件使用 `src/components/<scope>/<ComponentName>/<SubComponentName>/index.tsx`。禁止在 scope 目录直接平铺组件或组件样式文件。
- 跨页面、跨领域复用的通用组件统一放在 `src/components/common/<ComponentName>/index.tsx`；业务组件放在对应 page scope。scope 级 `index.ts` 仅作为导出清单，不承载组件实现。
- 资源创建模态框统一放在 `src/components/<domain>/<ComponentName>/index.tsx`，通过 `visible`、`onCancel`、成功回调及必要的上下文默认值暴露复用接口，避免绑定具体路由。
- `src/api/`：`coreApi` 与后端类型快照。
- `src/stores/`：客户端状态。
- `src/lib/`、`src/hooks/`：共享逻辑。
- 禁止新增 `src/pages/`。

## UI

- UI 组件、样式降级顺序和交互底线统一遵循 [UI 开发约定](./UI-CONVENTIONS.md)。
- 动态规则、联动选择器、异步选项、复杂校验等表单项必须拆为领域共享组件；路由页面负责页面级数据和交互编排，不复制字段结构与校验逻辑。
- 创建、部署等表单默认使用单页表单；除非用户明确指定，不得把原型中的步骤说明直接实现为 Steps/Wizard 分步表单。
- 页面实现放在 `src/components/<domain>/<PageName>/index.tsx`，可独立识别的复杂展示或交互区域继续拆为同领域组件；路由文件不得承载查询、状态、业务交互或大段 JSX。

## API

- 所有请求通过 `src/api/client.ts` 的 `coreApi`。
- 类型保留在 `src/api/core-schema.d.ts` 快照；契约核对独立 ANI 仓库的 Core OpenAPI 与实现。
- POST 和有副作用的 PUT/PATCH 必须携带 `idempotency_key`。
- 服务端数据使用 TanStack Query，客户端 UI 状态使用 Zustand。

## 验证

```bash
pnpm lint
pnpm run typecheck
git diff --check
gitnexus detect-changes -r ani-console -s all
```

任何新增或修改完成后必须运行 `pnpm lint`、TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测。快速迭代阶段不保留自动化测试资产。构建、页面和交互由用户通过后台运行的 `pnpm dev` 等方式手动验证；Agent 不运行 `pnpm run verify` 或 production build，也不启动、重启或中断该服务。

## 记录

功能、工具链或验证规则变化后，在 [PROJECT-STATUS.md](./PROJECT-STATUS.md) 追加一条简短记录。
