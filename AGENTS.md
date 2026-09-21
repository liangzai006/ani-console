# AGENTS.md

## 项目范围

本仓库只包含 ANI Console 前端。

## 规范入口

开始工作前按任务范围阅读对应规范：

- 工程目录、命名、路由适配、公共工具、浏览器兼容和验证遵循 [工程约定](./docs/ENGINEERING-CONVENTIONS.md)。
- UI 实现顺序、组件复用、样式、反馈、请求状态展示和组件拆分遵循 [UI 开发约定](./docs/UI-CONVENTIONS.md)。
- 接口契约核对、API 模块与类型落位、公共请求层、幂等、SSE、预签名上传及页面接入遵循 [API 对接流程](./docs/API-INTEGRATION.md)。

具体规则仅在所属规范文档维护；本文件只保留规范入口、Agent 工作流和工具约束，不重复业务或实现细则。

新增或调整规则时，先依据 [文档职责](./docs/README.md#文档职责) 确定唯一归属；完整规则只写入该文档，其他文档仅保留链接。无法唯一归属，或拟记录内容与现有规则的强度、范围、顺序或例外冲突时，必须先请用户确认，不得并行记录或自行取舍。

## 工作边界

- 不覆盖或清理用户已有的无关工作区改动。
- 不运行 production build，也不启动、重启或中断用户的 `pnpm dev`。
- 不维护集中式项目状态或开发记录文件；变更内容和验证结果在最终回复中说明。
- 项目进度、功能清单、验收核对和类似输出中的开发参考内容排除规则遵循 [工程约定](./docs/ENGINEERING-CONVENTIONS.md#开发参考内容)。

## 验证

- 所有 `pnpm` 命令必须在 Codex 沙箱外的系统环境运行，由系统 Corepack 根据 `package.json` 的 `packageManager` 选择版本；不得使用沙箱内的 fallback pnpm，也不得绕过项目声明手动选择其他版本。
- 完成修改后执行 [工程约定](./docs/ENGINEERING-CONVENTIONS.md) 的完整验证清单和 GitNexus 变更检测；检查失败时先修复，无法在当前范围处理的既有问题必须如实记录。

## GitNexus

仓库索引名为 `ani-console`，后端索引名为 `ANI`，产品原型索引名为 `产品原型-9.11`。GitNexus 查询使用当前会话接入的工具，不使用仓库内 CLI 作为替代。

- 查看接口、后端契约或执行流时，必须使用已接入的 GitNexus 工具查询索引 `ANI`（`repo: "ANI"`）。
- 查看产品原型、页面信息架构或交互布局时，必须使用已接入的 GitNexus 工具查询索引 `产品原型-9.11`（`repo: "产品原型-9.11"`）。
- 文档指定的仓库或索引不可用、未建立或无法访问时，不得根据前端代码、训练数据或经验猜测接口契约、后端行为、产品原型和交互布局；必须立即停止相关判断并提示用户建立或恢复对应索引，待索引可用后再继续。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ani-console** (3414 symbols, 8937 relationships, 269 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
