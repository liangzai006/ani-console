# 产品设计规范 · Arco 组件与 Token 2.0

> **🔒 冻结（2026-06-25）**：禁止修改正文。见 [DESIGN-SPEC-FREEZE.md](./DESIGN-SPEC-FREEZE.md)。

> 本文档是设计师与前端联调的 **组件选型手册**。  
> 所有 Console / BOSS 界面必须基于 **Arco Design React** 与 **@arco-design/web-react/icon** 实现。

---

## 1. 技术栈边界

| 类别 | 指定方案 | 禁止 |
|------|----------|------|
| UI 组件 | `@arco-design/web-react` | TDesign、Ant Design、MUI、Element Plus、自研平行 Button/Table |
| 图标 | `@arco-design/web-react/icon` | Font Awesome、Heroicons 等与 Arco 混用 |
| 图表 | `echarts` + `echarts-for-react` | 其他图表库（除非评审通过且仍须对齐 Arco 色板） |
| 样式 | Arco Theme Token + Tailwind utilities（布局） | Tailwind 色板类、shadcn、页面内散落 hex（见 [样式与 Tailwind 边界 2.0](../../产品设计规范-样式与Tailwind边界-2.0.md)） |
| 布局壳 | Arco `Layout`、`Menu`、`Breadcrumb` | 完全自定义 shell 且不映射 Arco |

**安装方式：**

```bash
npm i @arco-design/web-react
```

**基础引入：**

```tsx
import { Button } from '@arco-design/web-react'
import '@arco-design/web-react/dist/css/arco.css'
```

**React 19 兼容：**

```tsx
import '@arco-design/web-react/es/_util/react-19-adapter'
```

## 2. Design Token 对照表

设计交付时，请在标注中优先使用 Arco 主题变量。

### 2.1 背景与表面

| 设计语义 | Arco Token | 典型场景 |
|----------|------------|----------|
| 页面背景 | `--color-bg-1` | 主内容区底色 |
| 容器背景 | `--color-bg-2` | Card、面板、表格容器 |
| 白色容器 | `--color-bg-white` | 高亮信息卡、弹窗内容 |
| hover 背景 | `--color-fill-2` | 列表项 hover、弱选中 |

### 2.2 文本

| 设计语义 | Arco Token | 典型场景 |
|----------|------------|----------|
| 主文本 | `--color-text-1` | 标题、表格正文 |
| 次级文本 | `--color-text-2` | 说明、副标题 |
| 三级文本 | `--color-text-3` | placeholder、弱提示 |
| 禁用文本 | `--color-text-4` | 禁用控件 |

### 2.3 品牌与状态

| 设计语义 | Arco Token | 典型场景 |
|----------|------------|----------|
| 品牌色 | `--color-primary-6` | 主按钮、链接、选中态 |
| 品牌浅色 | `--color-primary-light-1` | 选中行、轻强调底 |
| 成功 | `--color-success-6` | 成功 Tag、成功反馈 |
| 警告 | `--color-warning-6` | 告警、待处理 |
| 错误 | `--color-danger-6` | 失败、校验错误、危险提示 |

### 2.4 边框与分割

| 设计语义 | Arco Token | 典型场景 |
|----------|------------|----------|
| 一级边框 | `--color-border-1` | 弱分割 |
| 二级边框 | `--color-border-2` | Card、Input、表格边框 |
| 焦点描边 | `--color-primary-3` | focus ring |

## 3. 按钮语义映射

| 设计语义 | Arco Button 写法 | 示例场景 |
|----------|------------------|----------|
| Primary | `type="primary"` | 「创建」「保存」「部署」 |
| Secondary | 默认按钮 | 「取消」「返回」 |
| Outline | `type="outline"` | 次要强调 |
| Text | `type="text"` | 表格内「详情」 |
| Destructive | `status="danger"` | 「删除」「卸载」 |
| Loading | `loading` | 异步提交中 |

**尺寸：** `size="small" | "default" | "large"`，同一操作组保持一致。

**高级感规则：**

- 一屏内主按钮数量从严控制，首屏通常只保留 1 个真正的 primary
- 默认按钮优先承担“取消 / 返回 / 更多操作”，不要所有按钮都抢强调
- 表格行内动作优先 `type="text"`，减少小尺寸实体按钮堆积感
- `status="danger"` 仅用于真正危险动作，不把“提醒”设计成“危险”

## 4. 组件选型指南

未列出的能力先查 [Arco React 快速上手](https://arco.design/react/docs/start) 与官方组件文档，再申请纳入本规范。

### 4.1 布局与导航

| 场景 | Arco 组件 | 设计要点 |
|------|-----------|----------|
| 整体壳层 | `Layout` | 顶栏固定；侧栏可折叠 |
| 侧栏导航 | `Menu` | 深浅主题保持对比清晰 |
| 面包屑 | `Breadcrumb` | 反映资源层级，末级为当前页 |
| 页内标签 | `Tabs` | 详情页多视图；不宜超过 7 个 Tab |
| 步骤条 | `Steps` | 向导型表单 |

### 4.2 数据展示

| 场景 | Arco 组件 | 设计要点 |
|------|-----------|----------|
| 资源列表 | `Table` | 必设计 loading / empty / error；操作列右对齐 |
| 简单列表 | `List` | 设置页、通知列表 |
| 卡片网格 | `Grid.Row` + `Grid.Col` + `Card` | 概览 KPI，单行 4–6 卡 |
| 统计数字 | `Statistic` | 仪表盘核心指标 |
| 状态标签 | `Tag` / `Badge` | 与资源状态枚举一一对应，全站一致 |
| 空状态 | `Empty` / 自定义空态块 | 说明原因 + 主操作按钮 |
| 加载 | `Spin`、`Skeleton` | 首屏 Skeleton，局部 Spin |

**高级感规则：**

- KPI 区优先“少而准”，单行建议 3 到 4 张卡，不鼓励 6 张以上平均铺满
- 表格优先成为主工作面，少把表格外再套多层 Card
- 弱信息用文字层级和留白表达，不靠彩色背景块堆提示

### 4.3 表单与输入

| 场景 | Arco 组件 | 设计要点 |
|------|-----------|----------|
| 表单容器 | `Form`、`Form.Item` | label 在上或左，全站统一 |
| 文本 | `Input` | 必填星号、help、error 三件套 |
| 多行 | `Input.TextArea` | 最小高度 80px |
| 下拉 | `Select` | 选项 >10 考虑可搜索模式 |
| 开关 | `Switch` | 即时生效须配反馈 |
| 日期 | `DatePicker`、`RangePicker` | 审计、用量筛选 |
| 上传 | `Upload` | 模型、文档上传需进度 |

**高级感规则：**

- 表单字段宽度按内容类型分层，不要所有输入框一刀切铺满
- 帮助文本只写真正决策需要的信息，避免每个字段都配长说明
- 表单区优先用单个大容器分组，而不是每 2 个字段一张小卡片

### 4.4 反馈与浮层

| 场景 | Arco 组件 | 设计要点 |
|------|-----------|----------|
| 轻提示 | `Message` | 成功/失败自动消失 |
| 页内告警 | `Alert` | 配额、权限、系统公告 |
| 确认 | `Modal` | 危险操作必用；标题+影响说明+主次按钮 |
| 抽屉 | `Drawer` | 窄屏详情、筛选、AI 侧栏 |
| 下拉菜单 | `Dropdown` | 行内「更多」；不放主创建 |
| 通知中心 | `Notification` | 长任务完成、后台作业 |

**高级感规则：**

- `Alert` 优先页面内局部提示，不要首屏一排彩色告警条
- `Modal` 只用于真正需要打断确认的动作，避免把次级信息也做成弹窗
- `Drawer` 更适合详情、筛选和辅助说明，是高级感控制台里比弹窗更自然的次级容器

## 5. 状态 Tag 语义

| 状态含义 | Arco 建议 | 典型写法 |
|----------|-----------|----------|
| 运行中 / 成功 | 绿色 | `Tag color="green"` |
| 部署中 / 处理中 | 蓝色 | `Tag color="arcoblue"` |
| 警告 / 即将过期 | 橙色 | `Tag color="orange"` |
| 失败 / 异常 | 红色 | `Tag color="red"` |
| 已停止 / 草稿 | 灰色 | `Tag color="gray"` |

具体枚举以各模块 OpenAPI `status` 字段为准。

## 6. 共享业务组件边界

以下场景 **允许** 在 `src/components/` 封装，但 **内部必须是 Arco 组合**：

| 组件名（建议） | 组成 | 用途 |
|----------------|------|------|
| `PageHeader` | 标题 + 描述 + 操作区 Slot | 统一页头 |
| `ResourceTable` | `Table` + empty/error + pagination | 资源列表 |
| `ConfirmDeleteModal` | `Modal` + danger 文案模板 | 删除确认 |
| `StatusTag` | `Tag` + 状态映射表 | 统一状态色 |
| `MetricCard` | `Card` + `Statistic` | 概览 KPI |
| `FilterBar` | `Form` inline + `Button` | 列表筛选 |

**禁止：**

- 复制 Arco 源码改样式
- 新建与 Arco Button 并行的 `AniButton`，除非有文档化的扩展 variant

## 6.1 高级感组件落地规则

### 容器

- 优先使用“大容器 + 内部分区”替代“满屏小卡片”
- 容器分层顺序建议：页面底色 → 主容器 → 内部区块，不超过 3 层
- 容器标题与操作区要对齐，不做漂浮式局部标题

### 表格

- 表头颜色克制，避免重底色
- 行 hover 只做轻微底色变化，不做高饱和选中条
- 操作列保持安静，默认隐藏低频项到 `Dropdown`
- 数字列、状态列、时间列保持固定节奏，减少跳动感

### 标签与状态

- `Tag` 尽量轻量，避免厚重彩底和大圆角胶囊感
- 正常状态优先轻表达；异常状态再提高对比度
- 同一屏不要出现过多颜色种类，状态色以 3 到 4 类为上限

### 卡片

- `Card` 更适合摘要、配置块、详情分组，不适合把整页碎片化
- 卡片内部先靠标题、留白、分割组织层级，再考虑局部色块
- 不在卡片上叠加无必要的图标徽章、渐变条、顶部彩条

## 7. AI 辅助面板

使用 Arco `Drawer` 或右侧分栏，**不作为默认壳层**。

推荐结构：

1. 头部：标题、清空、关闭
2. 主体：`Empty`（示例 prompt）/ 消息列表（用户 vs 系统样式区分）
3. 输入区：`Input.TextArea` + `Button type="primary"` 发送

规则：

- 用户消息底色可用 `--color-primary-light-1`
- 系统消息底色可用 `--color-fill-2`
- 处理中用 `Spin` inline，不阻断主列表操作

## 8. 设计稿标注规范

交付开发时，每个页面附 **组件标注表**：

| 区域 | Arco 组件 | 关键 props | Token |
|------|-----------|------------|-------|
| 页头主按钮 | Button | `type="primary"` | `--color-primary-6` |
| 列表 | Table | `loading` / `empty` | `--color-bg-2` |
| 删除 | Modal + Button | `status="danger"` | `--color-danger-6` |

## 9. 反模式

1. 设计稿出现 TDesign 或 Ant Design 组件命名与交互
2. 每页不同主色 hex，未走 Token
3. 列表页缺少 empty / error 态
4. 同一状态在不同页面用不同颜色 Tag
5. 危险操作无 Modal，仅 Message 提示
6. 主操作区出现多个 primary 按钮
7. 图标无文字且无 aria 说明
8. 引入 shadcn / Tailwind 类名作为实现说明
9. 摘要区堆满等权卡片，缺少主次与留白
10. 把每个模块都做成有阴影、有彩边、有图标的“展示卡”

## 10. 参考链接

- Arco React 快速开始：https://arco.design/react/docs/start
- Arco 组件总览：https://arco.design/react/components/overview
