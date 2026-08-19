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
   - Console sprint 工作通常记录在 `docs/sprints/SPRINT-*.md`。
   - Console 任务状态可以记录在 `docs/CONSOLE-TASK-PLAN.md` 或 `docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md`。
   - 不要编辑已经冻结的产品规范文件。
2. 添加一条简洁记录，覆盖：
   - 变更的文件或区域
   - 用户可见的行为
   - 重要的验证或集成说明
   - 已运行的验证命令
3. 记录要事实准确且简短。不要重复粘贴很长的终端输出。
4. 如果不存在合适的记录文件，在最终回复中说明这一点，而不是随意创建一个新文档。
5. 在最终回复前，对被修改的记录文件运行 `git diff --check`。


## Core 实现规则

Core 改动按以下顺序执行：

1. 定义成功条件和最小可验证改动。
2. 任何功能变更都先都要遵循 OpenAPI 契约。
3. 在最接近且有意义的层级新增或更新聚焦测试。
4. 仅按 `CLAUDE.md` 中的批次类型规则更新开发记录。
5. 运行必要验证命令，或明确说明为什么无法运行。

保持以下不变量：

- Core API `servers[0].url` 保持为 `https://{host}/api/v1`。
- Services API `servers[0].url` 保持为 `https://{host}/api/v1/svc`。
- POST 创建操作和有副作用的 PUT/PATCH 操作必须支持 `idempotency_key`。
- Core SDK 只能由 Core OpenAPI 生成；Services SDK 只能由 Services OpenAPI 生成。
- Gateway handler、Core domain service、Services business service 不得直接导入 provider SDK。
- Kubernetes API 的使用必须限制在 adapter/controller/preflight 等边界内。


## 最终回复

说明已更新的记录文件，以及通过的验证命令。如果无法更新记录文件，说明原因。
