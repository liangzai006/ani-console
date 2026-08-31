# AGENTS.md

## 项目定位

本仓库只包含 ANI Console 前端。

## 开发入口

1. 阅读 [设计规范冻结令](./docs/design/DESIGN-SPEC-FREEZE.md) 和同目录下冻结的 2.0 设计规范。
2. 阅读 [工程约定](./docs/CONVENTIONS.md)。
3. 当前状态与变更记录见 [docs/CONSOLE-TASK-PLAN.md](./docs/CONSOLE-TASK-PLAN.md)。
4. 默认运行 TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测；不得运行 `pnpm run verify`、production build，或启动、重启 `pnpm dev`，构建、页面与交互由用户手动验证。

## 强制规则

- 本仓库根目录已经代表产品原型中的 Console 范围；路由、页面、组件及其文件或目录不得再使用 `console`、`console-*`、`*Console` 等重复表达 Console 层级的命名，应直接按业务领域或资源命名。
- UI 只使用 Arco Design React；颜色使用 Arco Token，Tailwind 仅负责布局。
- 实现 UI 与交互时优先使用 Arco Design React 组件；只有确认组件库无法满足需求时才允许自行实现，并在变更说明中记录原因。
- 新增组件或样式前，先检索 `src/components/` 和同类页面是否已有符合需求的实现；已有实现应优先复用或扩展公共组件，不得复制为页面私有版本。
- 资源创建模态框，以及包含动态列表、异步选项、字段联动或复杂校验的表单项，必须抽到 `src/components/<domain>/` 作为可复用组件；路由页面只负责页面级查询、状态编排与导航，不得长期内联或复制同类表单。
- 创建、部署等表单默认使用单页表单；不得仅因产品原型展示了步骤结构就改为分步表单，只有用户明确指定分步流程时才允许使用 Steps/Wizard。
- 页面或路由文件体积过大、包含可独立识别的复杂展示/交互区域时，必须按领域拆到 `src/components/<domain>/`；路由页面只保留页面级查询、状态编排、导航和组件组合，不得以单文件长期承载完整复杂页面。
- 新建页面时必须先参考同类型的已有页面；若已有布局可复用或沿用，除非用户另有指定，应优先按照已有布局实现，例如列表页、带 Tab 的详情页。
- 一般不改动页面 Layout，包括菜单栏、导航及相关壳层骨架；只有用户明确指定时才允许调整。
- 页面与路由同放在 `src/routes/`；共享组件放在 `src/components/`。
- `src/components/` 必须按 page scope 组织，每个组件使用独立目录：`src/components/<scope>/<ComponentName>/index.tsx`；组件私有样式放在同目录的 `index.css`、`index.less`、`index.module.css` 或 `index.module.less`；子组件使用 `src/components/<scope>/<ComponentName>/<SubComponentName>/index.tsx`。禁止在 scope 目录直接平铺 `<ComponentName>.tsx` 或 `<ComponentName>.module.css`。
- 跨页面、跨领域复用的通用组件必须归入独立的 `common` scope，即 `src/components/common/<ComponentName>/index.tsx`；业务领域组件保留在对应 page scope。scope 级 `index.ts` 仅允许作为导出清单，不得承载组件实现。
- 后端由独立的 ANI 仓库维护；接口契约与后端行为以其 Core OpenAPI、实现代码和 GitNexus 索引 `ANI` 为准。
- Core API 统一通过 `src/api/client.ts` 的 `coreApi` 调用。
- POST 及有副作用的 PUT/PATCH 必须携带 `idempotency_key`。
- 不修改冻结设计规范正文。
- 当前快速迭代阶段不保留自动化测试资产；默认检查为 TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测。Agent 不得运行 `pnpm run verify` 或 production build，也不得启动、重启或中断用户后台运行的 `pnpm dev`。
- 不覆盖或清理用户已有的无关工作区改动。

## 开发记录

- 完成并验证实现、修复或测试后，必须在最终回复前更新项目开发记录。
- Console 功能、API、网络、存储、工具链和验证规则的变化统一记录在 `docs/CONSOLE-TASK-PLAN.md`；设计规范批次状态记录在 `docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md`。
- 记录应简短且事实准确，覆盖变更区域、用户可见行为、重要集成说明及已执行的验证，不粘贴冗长命令输出。
- 不创建重复的记录文件；找不到合适记录位置时，在最终回复中说明。
- 更新记录后，对记录文件运行 `git diff --check`，最终回复说明记录位置和验证结果。

## GitNexus

仓库索引名为 `ani-console`，后端索引名为 `ANI`，产品原型索引名为 `产品原型-8.25`。

- 修改函数、类或方法前运行 upstream impact 分析。
- HIGH/CRITICAL 风险必须先告知用户。
- GitNexus 查询必须使用当前会话已接入的 GitNexus 工具（如 `query`、`context`、`impact`、`detect_changes`），不得改用仓库索引目录下的 CLI 或 `.gitnexus/run.cjs` 作为查询替代。
- 完成后使用已接入的 `detect_changes({ repo: "ani-console", scope: "all" })` 工具检查变更。
- 查看接口、后端契约或执行流时，必须使用已接入的 GitNexus 工具查询索引 `ANI`（`repo: "ANI"`）。
- 查看产品原型、页面信息架构或交互布局时，必须使用已接入的 GitNexus 工具查询索引 `产品原型-8.25`（`repo: "产品原型-8.25"`）。
- 文档指定的仓库或索引不可用、未建立或无法访问时，不得根据前端代码、训练数据或经验猜测接口契约、后端行为、产品原型和交互布局；必须立即停止相关判断并提示用户建立或恢复对应索引，待索引可用后再继续。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ani-console** (1971 symbols, 4772 relationships, 159 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ani-console/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ani-console/clusters` | All functional areas |
| `gitnexus://repo/ani-console/processes` | All execution flows |
| `gitnexus://repo/ani-console/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
