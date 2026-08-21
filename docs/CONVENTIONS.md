# ANI Console 工程约定

## 目录

- `src/routes/`：TanStack Router 路由与页面，必须同文件。
- `src/components/`：跨页面共享组件。
- 资源创建模态框统一放在 `src/components/<domain>/`，通过 `visible`、`onCancel`、成功回调及必要的上下文默认值暴露复用接口，避免绑定具体路由。
- `src/api/`：`coreApi` 与后端类型快照。
- `src/stores/`：客户端状态。
- `src/lib/`、`src/hooks/`：共享逻辑。
- 禁止新增 `src/pages/`。

## UI

- 组件库：`@arco-design/web-react`。
- 图标：`@arco-design/web-react/icon`。
- 颜色与状态：Arco Token。
- 动态规则、联动选择器、异步选项、复杂校验等表单项必须拆为领域共享组件；路由页面负责页面级数据和交互编排，不复制字段结构与校验逻辑。
- 页面或路由文件体积过大、包含可独立识别的复杂展示或交互区域时，必须拆为 `src/components/<domain>/` 下的领域组件；路由页面仅保留页面级查询、状态编排、导航和组件组合。
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
