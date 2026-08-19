---
name: development-record
description: 在经过验证的代码变更后更新项目开发记录。在本仓库中完成实现、修复、测试或验证代码后使用，尤其是在变更涉及 Console 页面、API、网络/存储流程，或 sprint 范围内工作时，应在发送最终完成总结前使用。
---

# 开发记录

代码变更和验证完成后，在最终回复前更新项目记录。


## 必须读取顺序

在进行修改或审查前，按顺序读取：

1. `AGENTS.md`
2. `.codex/skills/development-record/SKILL.md`
3. 本次任务相关的契约、代码、测试和开发记录


## 工作流程

1. 在创建任何新文件之前，先用 `rg` 找到相关的记录文件。
   - Console 状态统一记录在 `docs/CONSOLE-TASK-PLAN.md`。
   - 设计规范批次状态记录在 `docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md`。
   - 不要编辑已经冻结的产品规范文件。
2. 添加一条简洁记录，覆盖：
   - 变更的文件或区域
   - 用户可见的行为
   - 重要的验证或集成说明
   - 已运行的验证命令
3. 记录要事实准确且简短。不要重复粘贴很长的终端输出。
4. 如果不存在合适的记录文件，在最终回复中说明这一点，而不是随意创建一个新文档。
5. 在最终回复前，对被修改的记录文件运行 `git diff --check`。


## Console 实现规则

- 后端契约和实现以独立 `ANI` 仓库为准。
- 前端类型快照保留在 `src/api/core-schema.d.ts`。
- POST 和有副作用的 PUT/PATCH 必须携带 `idempotency_key`。
- 当前默认验证为 TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测，不保留自动化测试资产。
- Agent 不运行 `pnpm run verify` 或 production build；不得启动、重启或中断用户后台运行的 `pnpm dev`，构建与页面交互由用户手动验证。


## 最终回复

说明已更新的记录文件，以及通过的验证命令。如果无法更新记录文件，说明原因。
