# ANI 产品设计规范 2.0

> **🔒 冻结（2026-06-25）**：本文档已锁定，**禁止修改正文**。实现只读遵循；变更须新版本流程。见 [DESIGN-SPEC-FREEZE.md](./DESIGN-SPEC-FREEZE.md)。

> **版本**：2.0  
> **更新日期**：2026-06-25  
> **受众**：产品设计师、交互设计师、视觉设计师、前端联调负责人  
> **适用范围**：ANI Console（租户控制台）、ANI BOSS（运营后台）及同源 B 端管理界面

---

## 1. 规范定位

本规范 2.0 是 ANI 前端 **产品设计层** 的权威文档，定义：

- 设计原则与信息架构约束
- 页面模板与布局职责
- Arco Design React 组件选型与 Design Token 使用边界
- 设计评审与交付检查口径

**本规范不替代** 以下工程文档；发生冲突时，以右侧为准：

| 层级 | 文档 | 约束内容 |
|------|------|----------|
| 工程栈（最高） | `ANI-04-技术栈设计.md`、`ANI-SERVICES-TEAM-GUIDE.md` | React 18、Arco Design React **唯一指定**、Vite、TanStack Router/Query |
| 工程实现 | `ANI-11-代码实现规范.md` §六、`frontends/console/CONVENTIONS.md` | 路由结构、API Client、状态管理、**页面文件组织** |
| 产品/API | `repo/api/openapi/services/v1.yaml` | Console/BOSS 业务接口契约 |

**设计师需知的核心约束：**

1. **组件库唯一指定为 Arco Design React**（包名 `@arco-design/web-react`，图标使用 `@arco-design/web-react/icon`）。禁止在交付稿中引入 TDesign、Ant Design、Material UI、Element Plus 等平行组件体系。
2. **颜色、间距、圆角、字体优先使用 Arco Design Token**（CSS 变量或主题配置）。**布局**可用 Tailwind utilities（见 [样式与 Tailwind 边界 2.0](./产品设计规范-样式与Tailwind边界-2.0.md)），禁止用 Tailwind 色板替代 Token。
3. **图表使用 ECharts**（`echarts-for-react`），样式需与 Arco 语义色对齐。
4. Console 与 BOSS **共用同一套设计规范与组件映射**；差异仅体现在信息架构与权限，不在基础组件层分叉。

**2.0 当前升级方向：**

- 从“能用的后台”升级为“有秩序感的专业产品界面”
- 以 Arco 的企业级基线为骨架，减少拼装感、堆砌感和模板味
- 高级感来自信息层级、密度控制、留白节奏和精确强调，而不是炫技视觉

---

## 2. 文档结构

| 序号 | 文档 | 用途 |
|------|------|------|
| 1 | [产品设计规范-设计原则-2.0](./产品设计规范-设计原则-2.0.md) | 设计定位、原则、视觉策略、交互与可访问性 |
| 2 | [产品设计规范-Arco组件与Token-2.0](./产品设计规范-Arco组件与Token-2.0.md) | 组件选型、按钮层级、Token 对照、共享组件边界 |
| 3 | [产品设计规范-页面模板-2.0](./产品设计规范-页面模板-2.0.md) | 页面骨架、六种标准模板、Console 壳层结构 |
| 4 | [产品设计规范-评审清单-2.0](./产品设计规范-评审清单-2.0.md) | 设计评审、联调走查、上线前检查 |
| 5 | [产品设计规范-样式与Tailwind边界-2.0](./产品设计规范-样式与Tailwind边界-2.0.md) | **样式分层**、Tailwind 废止说明、设计习惯 → Arco 对照 |
| 6 | [frontends/console/docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md](./frontends/console/docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md) | **规范落地批次** SCB-01～12（冻结后按序改页面） |
| 7 | [DESIGN-SPEC-FREEZE.md](./DESIGN-SPEC-FREEZE.md) | 设计规范 2.0 **冻结令** |
| 8 | [frontends/console/CONVENTIONS.md](./frontends/console/CONVENTIONS.md) | Console **工程**约定 |
| 9 | [frontends/console/docs/CONSOLE-SPRINT-PHASES.md](./frontends/console/docs/CONSOLE-SPRINT-PHASES.md) | Console 分阶段交付记录 |
| 10 | [frontends/console/docs/CONSOLE-TASK-PLAN.md](./frontends/console/docs/CONSOLE-TASK-PLAN.md) | Console **任务计划** |

---

## 3. 推荐阅读顺序

**新接手 ANI 的设计师：**

1. 本页（规范定位与 Arco 约束）
2. 设计原则 → Arco 组件与 Token → 页面模板
3. 对照 `repo/frontends/console/` 现有页面与 `demo-instance-workspace-ui-a` 参考实现

**开始新页面设计：**

1. 在「页面模板」中选型
2. 在「Arco 组件与 Token」中确认组件与状态
3. 交付前用「评审清单」逐项核对

**与前端联调：**

1. 设计稿标注 Arco 组件名（如 `Table`、`Modal`、`Button status="danger"`）
2. 标注使用的 Token 变量名，而非孤立色值
3. 明确 loading / empty / error 三态与 dark 主题是否需要（见各子文档优先级说明）

---

## 4. 与 1.0 版本的主要变化

| 主题 | 1.0 | 2.0 |
|------|-----|-----|
| 组件实现 | 泛化描述（含 Tailwind / `components/ui` 痕迹） | 明确绑定 **Arco Design React** |
| Token 体系 | shadcn 风格语义名（`foreground`、`muted` 等） | 设计语义 → **Arco Token / 主题变量** 对照 |
| 样式工具 | Tailwind 任意（含 preflight/shadcn） | **Arco Token + Tailwind utilities**（preflight 关闭，见边界文档） |
| 图标 | 未约束 | **@arco-design/web-react/icon** 唯一指定 |
| 图表 | 未约束 | **ECharts**，色板对齐 Arco 状态色 |
| 文档链接 | 指向本机外部路径 | 仓库内相对路径，可版本管理 |
| 工程关系 | 未声明 | 明确与 `ANI-SERVICES-TEAM-GUIDE` 的优先级 |

1.0 文档仍保留在同目录供历史参考；**新设计与评审以 2.0 为准**。

---

## 5. 设计交付物建议

向开发移交时，建议至少包含：

1. **页面模板类型**（概览 / 列表 / 详情 / 表格+检查器 / 表单 / 审计）
2. **Arco 组件清单**（含 type / status / size）
3. **Token 标注表**（或引用本文档 Token 章节）
4. **三态设计**：loading、empty、error（列表页与表单页必填）
5. **主操作流程图**（含危险操作确认节点）
6. **术语表**（与 Console 模块文档 `repo/services/docs/console-modules/` 对齐）
7. **高级感检查结果**：是否存在卡片滥用、颜色过满、按钮层级混乱、信息噪音过高

可选（P1 阶段）：

- Dark 主题稿或 Token 切换说明
- 多语言文案长度示意（中英文）

---

## 6. 维护说明

> **🔒 本文档集已冻结（2026-06-25）**，本节仅作历史说明；**不得再编辑**。维护 [DESIGN-SPEC-FREEZE.md](./DESIGN-SPEC-FREEZE.md) 与 [CONSOLE-SPEC-COMPLIANCE-BATCHES.md](./frontends/console/docs/CONSOLE-SPEC-COMPLIANCE-BATCHES.md) 追踪落地进度。

- 产品视觉与交互变更：须发起 **3.0 / 修订版** 新文档，不得直接改 2.0 正文。
- Arco 大版本升级：在工程层适配，规范正文冻结不变。
- 落地进度：写入 `frontends/console/docs/sprints/SPRINT-SCB-*.md`，不写入本规范。
