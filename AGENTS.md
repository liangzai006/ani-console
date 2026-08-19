# AGENTS.md

## 项目定位

本仓库只包含 ANI Console 前端。后端由独立的 ANI 仓库维护，接口以其 Core OpenAPI、实现代码和 GitNexus 索引 `ANI` 为准。

## 开发入口

1. 阅读 [设计规范冻结令](./docs/design/DESIGN-SPEC-FREEZE.md) 和同目录下冻结的 2.0 设计规范。
2. 阅读 [工程约定](./docs/CONVENTIONS.md)。
3. 当前状态与变更记录见 [docs/CONSOLE-TASK-PLAN.md](./docs/CONSOLE-TASK-PLAN.md)。
4. 在仓库根目录运行 `pnpm run verify`。

## 强制规则

- UI 只使用 Arco Design React；颜色使用 Arco Token，Tailwind 仅负责布局。
- 实现 UI 与交互时优先使用 Arco Design React 组件；只有确认组件库无法满足需求时才允许自行实现，并在变更说明中记录原因。
- 新增组件或样式前，先检索 `src/components/` 和同类页面是否已有符合需求的实现；已有实现应优先复用或扩展公共组件，不得复制为页面私有版本。
- 新建页面时必须先参考同类型的已有页面；若已有布局可复用或沿用，除非用户另有指定，应优先按照已有布局实现，例如列表页、带 Tab 的详情页。
- 一般不改动页面 Layout，包括菜单栏、导航及相关壳层骨架；只有用户明确指定时才允许调整。
- 页面与路由同放在 `src/routes/`；共享组件放在 `src/components/`。
- Core API 统一通过 `src/api/client.ts` 的 `coreApi` 调用。
- POST 及有副作用的 PUT/PATCH 必须携带 `idempotency_key`。
- 不修改冻结设计规范正文。
- 当前快速迭代阶段不保留自动化测试资产；门禁为 typecheck 与 production build。
- 不覆盖或清理用户已有的无关工作区改动。

## GitNexus

仓库索引名为 `ani-console`，后端索引名为 `ANI`，产品原型索引名为 `产品原型-7.29`。

- 修改函数、类或方法前运行 upstream impact 分析。
- HIGH/CRITICAL 风险必须先告知用户。
- 完成后运行 `gitnexus detect-changes -r ani-console -s all`。
- 查看接口、后端契约或执行流时，必须使用 GitNexus 索引 `ANI`（`-r ANI`）。
- 查看产品原型、页面信息架构或交互布局时，必须使用 GitNexus 索引 `产品原型-7.29`（`-r 产品原型-7.29`）。
