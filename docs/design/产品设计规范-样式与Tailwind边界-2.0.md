# 产品设计规范 · 样式与 Tailwind 边界 2.0

> **🔒 冻结（2026-06-25）**：禁止修改正文。见 [DESIGN-SPEC-FREEZE.md](./DESIGN-SPEC-FREEZE.md)。

> **版本**：2.0  
> **更新日期**：2026-06-25  
> **受众**：产品设计师、前端工程师、联调负责人  
> **适用范围**：ANI Console、ANI BOSS 及同源 B 端管理界面

---

## 1. 结论（必读）

**ANI 前端 2.0 采用「Arco 组件 + Tailwind 布局工具」混用，分工明确：**

| 层级 | 2.0 指定方案 | 禁止 |
|------|--------------|------|
| UI 组件 | **Arco Design React**（`@arco-design/web-react`） | TDesign、Ant Design、shadcn/ui、用 div+Tailwind 仿 Table/Form |
| 图标 | `@arco-design/web-react/icon` | 其他图标库与 Arco 混用 |
| 颜色与语义 | **Arco Design Token**（`var(--color-*)`） | Tailwind 色板类（`text-blue-500`、`bg-gray-100`）替代 Token |
| 布局与间距 | **Tailwind utilities**（`flex`、`gap-*`、`p-*` 等）或 Arco `Layout`/`Space` | Tailwind preflight 覆盖 Arco；大面积手写 `style={{}}` |
| 全局样式入口 | `arco.css` + `src/styles/global.css`（Tailwind theme+utilities，**无 preflight**） | 第二套平行色板或 shadcn `components/ui` |
| 图表 | ECharts（色板对齐 Arco 状态色） | 未评审的其他图表库 |

**Console 已落地**：`frontends/console` 安装 `tailwindcss` + `@tailwindcss/vite`，`global.css` 仅引入 `theme` 与 `utilities`，不引入 `preflight`。

工程依据：[UI规范-2.0.md](./UI规范-2.0.md)、[产品设计规范-Arco组件与Token-2.0.md](./产品设计规范-Arco组件与Token-2.0.md)、[frontends/console/README.md](./frontends/console/README.md)。

---

## 2. 为何曾有「纯 Arco、不用 Tailwind」表述

1.0 草稿混用 Tailwind/shadcn 时缺少边界，易出现：

- Tailwind preflight 与 Arco 重置冲突
- 用 utility class 拼出平行 Button/Table
- 设计交付写 `mt-4` 而非 Arco 组件名

2.0 的修正不是「完全禁止 Tailwind」，而是 **限定 Tailwind 只做布局胶水，组件与语义色仍归 Arco**。

| 主题 | 1.0（历史） | 2.0（现行） |
|------|-------------|-------------|
| 组件 | 可能 shadcn / 手写 | **Arco 唯一** |
| 布局 | Tailwind 任意使用 | Tailwind **仅 utilities**，preflight 关闭 |
| 颜色 | shadcn 语义名或 hex | **Arco Token** |
| 设计交付 | 可能写 class 名 | 标注 **Arco 组件 + Token**；布局可注明 Tailwind 意图 |

---

## 3. 样式分层（实现顺序）

```text
1. Arco 组件 props（type / status / size / bordered …）
2. Arco Design Token（var(--color-*) / 主题配置）
3. Tailwind utilities（壳层 flex、gap、padding、宽高）
4. 极少量 style={{}}（仅 Arco 组件不暴露的 Token 绑定，如 borderColor: var(--color-border-2)）
```

**允许示例：**

```tsx
<Layout className="min-h-screen">
  <Content className="p-5" style={{ background: 'var(--color-bg-1)' }}>
    <Button type="primary">创建</Button>
  </Content>
</Layout>
```

**禁止示例：**

```tsx
<div className="rounded-lg border bg-white shadow">
  <button className="px-4 py-2 bg-blue-600 text-white">创建</button>
</div>
```

---

## 4. 设计师习惯对照

| 设计意图 | 2.0 推荐落地 |
|----------|--------------|
| 页面内边距 | Arco `Layout.Content` 或 Tailwind `p-5`（与 Token 密度一致） |
| 元素间距 | Arco `Space` 或 Tailwind `gap-4` |
| 栅格 | Arco `Grid` 优先；复杂响应式可用 Tailwind `grid` |
| 主色/危险/禁用 | Arco `Button` props + Token，**不用** Tailwind 颜色类 |
| 列表页 | Arco `Table` + 三态 |

---

## 5. Console 工程配置摘要

```text
frontends/console/
├── vite.config.ts          # @tailwindcss/vite 插件
├── src/main.tsx            # arco.css → global.css
└── src/styles/global.css   # theme + utilities（无 preflight）
```

```css
/* global.css */
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
```

---

## 6. 评审检查

- [ ] 交互组件均为 Arco，非 Tailwind 仿造
- [ ] 语义色来自 Arco Token，非 Tailwind 调色板
- [ ] 未引入 Tailwind preflight 或 shadcn
- [ ] 设计稿标注 Arco 组件名；布局补充说明即可，不必写完整 class 字符串
- [ ] 未新增 `components/ui` 平行体系

---

## 7. 历史文档

| 文档 | 状态 |
|------|------|
| [UI规范-2.0.md](./UI规范-2.0.md) | **现行权威** |
| [产品设计规范-Arco组件与Token-2.0.md](./产品设计规范-Arco组件与Token-2.0.md) | **现行权威** |
| [产品设计规范-TDesign组件与Token-2.0.md](./产品设计规范-TDesign组件与Token-2.0.md) | **已废止** |

---

## 8. 维护说明

> **🔒 已冻结**：不得再编辑本节。工程适配见 `frontends/console/CONVENTIONS.md`。

- 新页面：Arco 组件优先；壳层布局可逐步用 Tailwind 替换冗长 `style={{}}`。
- 若需 Tailwind 主题扩展：只允许映射到 Arco Token，不新增独立色板。
- Arco 大版本升级：回归检查 `global.css` 与 Shell 页无样式冲突。
