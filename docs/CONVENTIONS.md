# ANI Console 工程约定

## 目录

- `src/routes/`：仅保留 TanStack Router 薄入口，负责 `createFileRoute`、路由参数、search 校验、loader/beforeLoad 等路由编排；具体页面实现必须从 `src/components/<scope>/<PageName>/index.tsx` 导入，避免页面实现与文件路由生成耦合导致热更新失效。
- route component 是路由适配层：在入口内通过当前 `Route` 的 `useParams`、`useSearch` 或 loader 数据读取并整理路由输入，再以普通 props 传给 `src/components/<scope>/` 下的页面组件；不强制箭头函数语法，没有路由输入时也只组合页面组件，不在 route 文件内保留查询、业务状态或完整页面 JSX，领域页面不应仅为读取 path/search 而依赖 route 对象或 `getRouteApi`。
- 页面级组件的目录名与导出名必须以 `Page` 结尾（例如 `VmInstancesPage`），普通业务组件不得使用 `Page` 后缀，以便从命名上明确区分路由页面与可复用组件。
- `src/components/`：按 page scope 组织的组件目录。组件必须使用 `src/components/<scope>/<ComponentName>/index.tsx`；私有样式使用同目录的 `index.css`、`index.less`、`index.module.css` 或 `index.module.less`；子组件使用 `src/components/<scope>/<ComponentName>/<SubComponentName>/index.tsx`。禁止在 scope 目录直接平铺组件或组件样式文件。
- 跨页面、跨领域复用的通用组件统一放在 `src/components/common/<ComponentName>/index.tsx`；业务组件放在对应 page scope。scope 级 `index.ts` 仅作为导出清单，不承载组件实现。
- 资源创建模态框统一放在 `src/components/<domain>/<ComponentName>/index.tsx`，通过 `visible`、`onCancel`、成功回调及必要的上下文默认值暴露复用接口，避免绑定具体路由。
- `src/api/`：按业务资源组织的 API 请求函数、静态类型与 Axios 公共请求基础设施。
- `src/stores/`：客户端状态。
- `src/lib/`、`src/hooks/`：共享逻辑。
- 禁止新增 `src/pages/`。

## UI

- UI 组件、样式降级顺序和交互底线统一遵循 [UI 开发约定](./UI-CONVENTIONS.md)。
- 动态规则、联动选择器、异步选项、复杂校验等表单项必须拆为领域共享组件；路由页面负责页面级数据和交互编排，不复制字段结构与校验逻辑。
- 创建、部署等表单默认使用单页表单；除非用户明确指定，不得把原型中的步骤说明直接实现为 Steps/Wizard 分步表单。
- 页面实现放在 `src/components/<domain>/<PageName>/index.tsx`，由领域页面负责页面级数据和交互编排；可独立识别的复杂展示或交互区域继续拆为同领域组件，路由文件只保留路由输入适配与页面组件组合。

## API

- 新增或调整接口的完整步骤遵循 [API 对接流程](./API-INTEGRATION.md)；本节只保留长期有效的结构边界。
- Core 与 Services 请求分别由 `src/api/request.ts` 的 Axios 实例统一处理认证、刷新、响应解包与错误归一化；页面只调用对应 `src/api/<domain>/` 模块的业务请求函数。
- 接口类型随业务资源保存在各模块 `types.ts`；契约核对独立 ANI 仓库的 Core/Services OpenAPI、实现与 GitNexus 接口补充索引，不在前端保留整份生成式 schema 快照。
- POST 和有副作用的 PUT/PATCH 由业务 API 模块内部注入 `idempotency_key`；页面仅提交无 key DTO，相同内容失败重试复用 key，成功或请求取消后重置。
- SSE 使用 Axios fetch adapter 的流式响应；预签名直传使用不带平台 JWT 的隔离 Axios 实例。
- 服务端状态使用 TanStack Query；跨组件客户端状态使用 Zustand，组件局部 UI 状态使用 React 状态。

## 验证

```bash
pnpm lint
pnpm fmt
pnpm typecheck
git diff --check
```

pnpm 命令执行门禁：所有 Agent 执行任何 `pnpm` 命令时，都必须在 Codex 沙箱外的系统环境运行，由系统 Corepack 根据 `package.json` 的 `packageManager` 选择 pnpm 版本；不得使用沙箱内的 fallback pnpm，也不得绕过项目声明手动选择其他版本。

任何新增或修改完成后必须运行 `pnpm lint`、通过 `pnpm fmt` 对全仓运行项目内 oxfmt、TypeScript typecheck、`git diff --check`，并通过当前会话接入的 GitNexus `detect_changes` 工具执行变更检测；回归审查与默认分支 `master` 比较。快速迭代阶段不保留自动化测试资产。构建、页面和交互由用户通过后台运行的 `pnpm dev` 等方式手动验证；Agent 不运行 production build，也不启动、重启或中断该服务。

## 记录

功能、工具链或验证规则变化后，在 [PROJECT-STATUS.md](./PROJECT-STATUS.md) 追加一条简短记录。
