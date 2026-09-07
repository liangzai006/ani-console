# AGENTS.md

## 项目定位

本仓库只包含 ANI Console 前端。

## 开发入口

1. 阅读 [UI 开发约定](./docs/UI-CONVENTIONS.md) 和 [工程约定](./docs/CONVENTIONS.md)。
2. 当前状态与变更记录见 [docs/PROJECT-STATUS.md](./docs/PROJECT-STATUS.md)。
3. 任何新增或修改完成后，必须分别执行：对本次新增或修改的代码文件运行 Oxlint、仅对本次新增或修改的文件运行项目内 Prettier、运行 `pnpm typecheck`、运行 `git diff --check`、运行 GitNexus 变更检测；不得对全仓运行格式化。
4. 不得运行 `pnpm run verify`、production build，或启动、重启、中断用户的 `pnpm dev`。

## 强制规则

- 本仓库根目录已经代表产品原型中的 Console 范围；路由、页面、组件及其文件或目录不得再使用 `console`、`console-*`、`*Console` 等重复表达 Console 层级的命名，应直接按业务领域或资源命名。
- UI 实现顺序、组件复用和样式边界以 `docs/UI-CONVENTIONS.md` 为准；目录及组件组织以 `docs/CONVENTIONS.md` 为准。
- 后端由独立的 ANI 仓库维护；接口契约与后端行为以其 Core OpenAPI、实现代码和 GitNexus 索引 `ANI` 为准。
- 开始任何 Core API 接口对接前，必须先使用 GitNexus 查询索引 `ani-console对接文档补充`，并将命中内容作为 Core OpenAPI 与后端实现之外的临时契约补充。该补充用于覆盖“后端测试环境已经部署、对应代码尚未合并”的过渡期：部分功能会先在独立补充文档索引中整理接口说明；未完成查询不得开始对接。若补充内容与 Core OpenAPI、`ANI` 索引中的后端实现或实际测试环境表现存在差异，不得自行推断，必须停止相关对接并提示用户确认，以免产生接口偏差。
- Core API 统一通过 `src/api/client.ts` 的 `coreApi` 调用。
- POST 及有副作用的 PUT/PATCH 必须通过公共幂等作用域注入 `idempotency_key`：React 代码使用 `useIdempotencyScope`，非 React 流程使用 `createIdempotencyScope`；key 仅由公共幂等库使用外部 `uuid` 包生成，不得保留本地手写 UUID 实现，业务代码不得直接生成 key，也不得包装或修改 `useMutation` 的行为。
- 幂等作用域依赖至少包含请求方法，并包含会影响请求身份、但不在实际 body 中的稳定业务参数；路由模板和实际 URL 不得作为依赖。实际提交内容必须先构造为不含 key 的 `submitData`，再以 `scope.withKey(submitData, runtimeDependencies?)` 生成最终 body。
- 同一作用域内，相同依赖与相同提交内容的失败重试必须复用原 key；提交内容、固定依赖或运行时依赖变化时必须生成新 key。请求成功或用户取消时调用 `reset()`，任何失败均保留 key；多阶段流程的每个写请求步骤使用独立作用域。
- 当前快速迭代阶段不保留自动化测试资产；页面与交互由用户手动验证。
- 不覆盖或清理用户已有的无关工作区改动。

### 组件拆分判断

文件行数用于提示职责是否过多，不作为机械拆分目标：

- 路由文件尽量控制在 150–300 行，只负责路由参数、页面状态编排和组件组合。
- 业务组件通常控制在 80–200 行；超过 250 行时，应检查是否承担了多个职责。
- Hook 或状态逻辑超过 80–120 行，或包含多组相互独立的操作流程时，应考虑抽取。
- 单文件页面超过 500 行时通常应拆分，除非内容高度线性且拆分后无法形成清晰、可复用的职责边界。

满足以下任一条件时，优先拆为具有明确业务名称的领域组件或 Hook：

- 区域拥有独立标题、表格、弹窗或交互边界。
- 区域拥有独立状态和操作流程。
- 可以用明确业务名称描述，例如“设备表”或“租户分配台账”。
- 区域需要单独维护、验证或复用。
- 修改一个区域时，经常需要在大文件中来回查找相关代码。
- `useState`、事件处理函数或表格 `columns` 明显成组出现。

以下情况不应仅为缩短文件而拆分：

- 只有十几行、没有独立业务语义的 JSX。
- 组件只转发一层 props，未隔离状态、行为或展示复杂度。
- 拆分后需要传递大量零散参数，反而增加调用关系和理解成本。

## 开发记录

- 完成并验证实现、修复或测试后，必须在最终回复前更新项目开发记录。
- Console 功能、UI、API、网络、存储、工具链和验证规则的变化统一记录在 `docs/PROJECT-STATUS.md`。
- 记录应简短且事实准确，覆盖变更区域、用户可见行为、重要集成说明及已执行的验证，不粘贴冗长命令输出。
- 不创建重复的记录文件；找不到合适记录位置时，在最终回复中说明。
- 更新记录后，对记录文件运行 `git diff --check`，最终回复说明记录位置和验证结果。

## GitNexus

仓库索引名为 `ani-console`，后端索引名为 `ANI`，产品原型索引名为 `产品原型-9.03`。GitNexus 查询使用当前会话接入的工具，不使用仓库内 CLI 作为替代。

- 查看接口、后端契约或执行流时，必须使用已接入的 GitNexus 工具查询索引 `ANI`（`repo: "ANI"`）。
- 查看产品原型、页面信息架构或交互布局时，必须使用已接入的 GitNexus 工具查询索引 `产品原型-9.03`（`repo: "产品原型-9.03"`）。
- 文档指定的仓库或索引不可用、未建立或无法访问时，不得根据前端代码、训练数据或经验猜测接口契约、后端行为、产品原型和交互布局；必须立即停止相关判断并提示用户建立或恢复对应索引，待索引可用后再继续。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ani-console** (2309 symbols, 6395 relationships, 182 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
