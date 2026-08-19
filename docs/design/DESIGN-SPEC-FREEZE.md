# ANI 产品设计规范 2.0 · 冻结令

> **冻结生效日**：2026-06-25  
> **适用范围**：`design` 仓库内 Console / BOSS 前端及同源 B 端界面  
> **状态**：**🔒 已冻结 — 禁止修改下列文档正文**

---

## 1. 冻结声明

自本日起，**产品设计规范 2.0 全套文档锁定为只读真来源**。AI 与人类开发者：

1. **不得**修改冻结清单内任何 `.md` 的正文（含措辞调整、增删章节、链接重组、Token 表变更）。
2. **不得**在实现中偏离冻结规范自行发明组件体系、色板或页面模板。
3. **必须**在新增或改造页面前，按 [读取顺序](#3-实现前必读顺序只读) 对照规范；完成后用 [评审清单](./产品设计规范-评审清单-2.0.md) 自检。
4. 若产品视觉/交互需变更：**不得直接改 2.0 文档**；须由产品负责人发起 **3.0 或修订版** 新文档流程，本冻结令方可解除或部分解除。

**唯一例外（极窄）：** 纯链接失效修复（路径仍指向同一文档）且须经人工 PR 明确标注 `freeze-exception: link-only`。**不构成**内容或规则变更。

---

## 2. 冻结文档清单

| 序号 | 文档 | 职责 |
|------|------|------|
| 0 | [UI规范-2.0.md](./UI规范-2.0.md) | 规范入口与文档索引 |
| 1 | [产品设计规范-设计原则-2.0.md](./产品设计规范-设计原则-2.0.md) | 设计原则、视觉策略、交互 |
| 2 | [产品设计规范-Arco组件与Token-2.0.md](./产品设计规范-Arco组件与Token-2.0.md) | Arco 组件与 Token |
| 3 | [产品设计规范-页面模板-2.0.md](./产品设计规范-页面模板-2.0.md) | 六种页面模板与壳层 |
| 4 | [产品设计规范-评审清单-2.0.md](./产品设计规范-评审清单-2.0.md) | 评审与联调走查 |
| 5 | [产品设计规范-样式与Tailwind边界-2.0.md](./产品设计规范-样式与Tailwind边界-2.0.md) | Arco + Tailwind 混用边界 |

**已废止（非真来源，禁止引用为实现依据）：**

- [产品设计规范-TDesign组件与Token-2.0.md](./产品设计规范-TDesign组件与Token-2.0.md)
- 一切 1.0 / Tailwind-shadcn 草稿痕迹

**不冻结（可继续演进）：**

| 文档 | 说明 |
|------|------|
| `frontends/console/CONVENTIONS.md` | 工程约定（路由、测试、目录） |
| `frontends/console/docs/CONSOLE-TASK-PLAN.md` | 任务进度与批次状态 |
| `frontends/console/docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md` | 规范落地批次顺序 |
| `frontends/console/docs/sprints/SPRINT-*.md` | 过程记录 |
| `openapi/v1.yaml` | API 契约（与 UI 规范独立演进） |

---

## 3. 实现前必读顺序（只读）

每次新会话、新页面、新批次开始前：

```text
1. DESIGN-SPEC-FREEZE.md（本文件）
2. UI规范-2.0.md
3. 产品设计规范-设计原则-2.0.md
4. 产品设计规范-Arco组件与Token-2.0.md
5. 产品设计规范-页面模板-2.0.md → 选定本页模板类型
6. 产品设计规范-样式与Tailwind边界-2.0.md
7. frontends/console/docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md → 确认当前批次
8. frontends/console/CONVENTIONS.md
```

---

## 4. 实现强制口径（摘要）

| 项 | 要求 |
|----|------|
| 组件 | `@arco-design/web-react` 唯一 |
| 图标 | `@arco-design/web-react/icon` |
| 颜色/语义 | Arco Token（`var(--color-*)`） |
| 布局 | Tailwind utilities **或** Arco Layout/Space（见样式边界文档） |
| 图表 | ECharts，色板对齐 Arco |
| 列表/表单 | 必须 loading / empty / error 三态 |
| 页面组织 | `src/routes/` 路由与页面同文件；禁止 `src/pages/` |

---

## 5. 规范落地批次

存量页面须按 **[CONSOLE-SPEC-COMPLIANCE-BATCHES.md](./frontends/console/docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md)** 顺序分批改造，**不得跳批**、不得单页私自全库重风格。

动态进度只写在 `CONSOLE-TASK-PLAN.md` 与对应 `SPRINT-SCB-*.md`，**不得**回写本冻结令或 2.0 规范正文。

---

## 6. 规则入口索引

| 入口 | 路径 |
|------|------|
| Cursor 规则 | `.cursor/rules/design-spec-frozen.mdc` |
| Console 工程约定 | `frontends/console/CONVENTIONS.md` §0 |
| Console Agent 入口 | `frontends/console/CLAUDE.md` |
| 任务计划 | `frontends/console/docs/CONSOLE-TASK-PLAN.md` |

---

## 7. 变更日志

| 日期 | 事项 |
|------|------|
| 2026-06-25 | 产品设计规范 2.0 全套冻结；建立 SCB 合规落地批次 |
