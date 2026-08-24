# Console 当前状态

> 本文件是当前任务状态与简短开发记录的唯一真来源。

## 当前口径

- 项目：独立 ANI Console 前端。
- 后端：独立 ANI 仓库（GitNexus 索引 `ANI`）。
- API：`/api/v1`，通过 `coreApi` 调用。
- 产品原型：GitNexus 索引 `产品原型-8.19`；页面信息架构与交互布局以该版本为准。
- 验证：默认运行 TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测；Agent 不运行 `pnpm run verify` 或 production build，构建、页面与交互由用户通过后台 `pnpm dev` 等方式手动验证。
- 测试：快速迭代阶段不保留自动化测试资产。
- 菜单约束：信息架构、名称与顺序对齐产品原型；实现保留现有顶部一级导航，二、三级菜单使用现有 Arco 侧栏、缩进与折叠交互，不复刻原型的导航视觉样式。

## 已覆盖模块

登录、概览、实例、GPU、Sandbox、K8s、镜像、块/文件/对象存储、网络、向量库、Registry、加密、密钥、监控、用量和操作详情。

## 当前缺口

- Bare Metal、Notifications、Audit 仍为占位页面，等待后端契约。
- OIDC 登录入口暂时隐藏；当前使用租户账密登录。
- 浏览器自动化回归暂时移除。

## 最近变更

| 日期 | 事项 |
|------|------|
| 2026-08-24 | 登录页增加仅 Vite 开发模式可见的“跳过登录”入口：用户主动进入后可通过认证路由守卫并在刷新后保持开发预览状态；无令牌请求返回 401 时不再立即跳回登录页，正式登录或退出会清除跳过状态，生产环境始终忽略该状态。仓库现有 TypeScript 编译器执行 `tsc -p tsconfig.app.json --noEmit`、`git diff --check` 与 GitNexus 变更检测通过；`pnpm run typecheck` 因当前 pnpm 与既有锁文件版本不兼容并尝试在非交互环境重建依赖而中止，页面交互由用户手动验证。 |
| 2026-08-21 | 对照 `产品原型-8.19` 重做向量存储列表、创建与独立详情页：列表接入统一资源页骨架，提供就绪/创建中/异常状态筛选、名称/ID 搜索、刷新、分页、三态与删除确认；创建表单抽为可复用 `CreateVectorStoreModal`，支持维度及 Cosine/L2/IP 距离度量并携带幂等键；新增 `/vector-stores/$vectorStoreId` 详情并复用 `DetailPageFrame`，展示基本信息与索引摘要，将复杂的原始向量检索、元数据过滤及文本批量写入抽为 `VectorStoreWorkbench`，写入后展示真实异步任务回执。ANI 当前未提供向量数量、嵌入模型、索引重建、文档列表、知识库关联和事件接口，相关区域明确展示缺失值或能力空态，不提供虚假操作。TypeScript `tsc -p tsconfig.app.json --noEmit` 与 `git diff --check` 通过，页面交互由用户手动验证。 |
| 2026-08-21 | 对照 `产品原型-8.19` 重做文件存储列表、创建与独立详情页：列表接入统一资源页骨架，补齐状态筛选、名称/ID 搜索、刷新、分页、三态及删除确认；创建表单抽为可复用 `CreateFilesystemModal`，支持 NFS/CephFS 与容量配置并携带幂等键；详情复用 `DetailPageFrame`，按原型展示基本信息、关联摘要、真实挂载目标、可复制 Linux 挂载命令、监控和事件 Tab。ANI 当前仅提供文件系统 CRUD 与挂载目标查询，因此扩容、挂载目标增删和实例一键挂载未提供虚假入口，缺失能力使用明确空态。现有 TypeScript 编译器执行 `tsc --noEmit` 与 `git diff --check` 通过；`pnpm run typecheck` 因当前 pnpm 与既有锁文件版本不兼容、尝试重建依赖时在非交互终端中止，页面交互由用户手动验证。 |
| 2026-08-20 | 对象存储详情的对象浏览器由表格改为文件管理器式列表，并拆为领域组件 `ObjectBrowser`：文件夹与文件使用不同 Arco 图标，点击文件夹进入下一级，子目录固定提供 `..` 返回上一级，保留面包屑、大小、更新时间、存储类型及对象操作；新增 CSS Module 仅负责布局并使用 Arco Token。同步在 `AGENTS.md` 与工程约定中增加“页面或路由过大、含独立复杂区域时必须拆为领域组件”的强制规则。现有 TypeScript 编译器执行 `tsc --noEmit` 与 `git diff --check` 通过，页面交互由用户手动验证。 |
| 2026-08-20 | 对照 `产品原型-8.19` 重做对象存储详情页：复用 `DetailPageFrame` 并按原型顺序补齐对象浏览器、权限、生命周期、访问信息、概览 5 个 Tab；对象浏览器支持前缀面包屑、上传、登记元数据、新建文件夹、复制路径、下载、复制临时链接和确认删除，并展示大小、更新时间及存储类型；权限与存储类型配置分别归入对应 Tab，生命周期支持真实规则查询、创建、编辑和删除，访问信息展示且可复制 Endpoint。所有写操作继续使用现有 Core API，POST 和有副作用的 PUT 携带幂等键。现有 TypeScript 编译器执行 `tsc --noEmit` 与 `git diff --check` 通过；`pnpm run typecheck` 因当前 pnpm 与既有锁文件版本不兼容、尝试重建依赖时在非交互终端中止，页面交互由用户手动验证。 |
| 2026-08-20 | 对照 `产品原型-8.19` 完成块存储独立详情页：复用 `DetailPageFrame` 展示卷类型、StorageClass、IOPS、加密、可用区、快照数、状态与时间信息，增加挂载实例关联摘要及可直达的关联资源 Tab；页头接入真实实例生命周期接口，支持选择运行中/已停止实例挂载及对当前实例卸载，复杂挂载表单抽为可复用 `AttachVolumeModal`，请求携带幂等键；快照 Tab 展示真实快照，并通过当前 Tab 的 `extra` 区域按需显示创建快照操作，保留自动快照、挂载历史、事件的原型信息架构。ANI 当前 Core 前端契约未提供扩容、自动快照策略、挂载历史和事件接口，因此相关区域明确显示能力空态，不提供虚假操作。TypeScript typecheck 与 `git diff --check` 通过，页面交互由用户手动验证。 |
| 2026-08-20 | 对照 `产品原型-8.19` 重做网络负载均衡列表、创建与独立详情页：列表接入统一资源页骨架，按全部/运行中/异常筛选并展示名称/ID、状态、VIP、监听器、后端数、创建时间和操作；创建模态框抽为 `CreateLoadBalancerModal`，配置名称、VPC/子网、公网/私网类型及一个必填监听器。该监听器修复空 `listeners` 被 ANI 渲染成无 `spec.ports` 的 Kubernetes Service 后返回 422 的问题，端口限制为 1–65535。移除通用详情抽屉，新增 `/networks/load-balancers/$loadBalancerId` 并复用 `DetailPageFrame`；详情移除与左侧基本信息重复的概览 Tab，保留监听器、后端组、监控、事件，并按子网详情模式增加关联摘要，展示且可直达真实 VPC 和子网。ANI 当前仅提供整体负载均衡 CRUD 与创建时监听器数组，因此监听器只读展示真实数据，后端数及后端组/监控/事件使用明确缺失值或空态，不提供虚假操作入口。VPC 详情关联项同步直达负载均衡详情。TypeScript typecheck 与 `git diff --check` 通过，页面交互由用户手动验证。 |
| 2026-08-20 | 参考 VPC 资源页重做网络路由列表与独立详情页：移除 `SimpleResourceCrud` 通用详情抽屉，新增 `/networks/routes/$routeId` 路由并复用 `DetailPageFrame`；列表统一名称/ID、VPC、目标网段、下一跳、类型、下一跳优先级和操作列，补充全部/可用 Tab、名称/ID 搜索、VPC 筛选、刷新、分页与三态。ANI 当前路由响应只返回已持久化条目且未提供状态与优先级，因此全部返回项视为可用，优先级以 `—` 明确展示缺失值；创建表单抽为可复用 `CreateRouteModal`，名称设为必填并映射现有 `description` 字段。详情展示真实契约字段及可确认的 VPC、实例型下一跳关联；删除继续使用危险操作确认。TypeScript typecheck 与 `git diff --check` 通过，页面交互由用户手动验证。 |
| 2026-08-20 | 对照 `产品原型-8.19` 重做网络安全组列表、创建和独立详情页：移除通用资源抽屉，新增 `/networks/security-groups/$securityGroupId` 路由并复用 `DetailPageFrame`；列表调整为名称/ID、VPC、规则数、关联实例、创建时间和操作列。创建模态框抽为可复用 `CreateSecurityGroupModal`，仅输入名称、绑定 VPC 和规则模板。详情 Tab 对齐入站规则、出站规则、关联资源；删除整组规则编辑弹窗，改用可复用 `SecurityGroupRuleModal` 在各规则 Tab 中逐条添加、编辑和删除，并接入 ANI 逐条规则 CRUD 接口；关联资源复用 VPC 详情页的分组卡片结构，按真实数据展示单一 VPC 网络关联及绑定实例算力关联，不构造“所属 VPC”或重复资源。同步安全组、规则和绑定相关 Core 类型快照，同时在 `AGENTS.md` 与工程约定中补充资源创建模态框及复杂表单项的共享组件约束。TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测通过，页面交互由用户手动验证。 |
| 2026-08-19 | 对照产品原型与 ANI 契约重做网络 VPC、子网列表及独立详情页：统一列表页头、筛选搜索、刷新、分页、三态表格、创建校验与删除冲突提示，并关闭无批量操作列表的多选；详情统一资源页头、基本信息、关联摘要和 Tab 布局，关联资源使用 Arco List/Empty 单行展示真实可判定对象。子网详情最终保留“关联资源”和“路由”Tab：关联资源仅展示实例，路由固定展示系统默认路由并映射自定义路由；未伪造 ANI 契约缺失字段。产品原型索引更新为 `产品原型-8.19`，开发验证规则同步收敛为 TypeScript typecheck、`git diff --check` 与 GitNexus 变更检测；相关检查通过，页面交互由用户手动验证。 |
| 2026-08-19 | 统一项目文档目录：工程约定迁入 `docs/`，冻结设计规范整体迁入 `docs/design/` 并保持正文不变；新增文档索引，更新 README、AGENTS、Cursor 规则与开发记录技能中的有效入口，移除不再维护的 Sprint 占位文档及前后端合并时期的 Core/OpenAPI/CLAUDE 路径描述。根目录 `pnpm run verify`（typecheck + production build）通过。 |
| 2026-08-19 | 将独立 ANI Console 从 `frontends/console` 提升为仓库根项目：迁移应用源码、配置、部署与文档，移除遗留 Services OpenAPI 镜像，更新根级入口和忽略规则，并让 Docker 构建使用 `pnpm-lock.yaml`。根目录 `pnpm run verify`（typecheck + production build）通过。 |
| 2026-08-18 | 移除 K8s 集群详情页不存在的“创建节点池”能力：删除 `DetailPageFrame` actions 中的入口，以及对应创建弹窗、表单状态、POST 请求和 GPU 参数构造逻辑；详情页操作仅保留删除集群。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 精简 K8s 集群详情基本信息中的关联对象文案，由“1 个 · 见右侧摘要”调整为“1 个”。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 修正 K8s 集群详情路由与公共骨架：列表不再通过页面内 `selectedId` 切换详情，新增 `/k8s-clusters/$clusterId` 文件路由并自动更新路由树；详情改用 `DetailPageFrame` 复用统一面包屑、页头、信息卡与 Tab 布局，actions 区保留明确的“创建节点池”和“删除”操作。TypeScript typecheck 与 `git diff --check` 通过；production build 被 Node 运行时 `uv_os_get_passwd returned ENOMEM` 阻断。 |
| 2026-08-18 | 修正 K8s 集群详情基本信息 Key/Value 对齐：Descriptions 使用固定表格布局，Key 列统一为 104px 并左对齐，Value 列统一从同一位置左对齐。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 收敛 K8s 集群详情“节点”Tab 列表，仅保留名称、规格、状态三列；移除节点数与操作列，并清理随操作列失去入口的节点池详情、调整、删除请求及弹窗代码。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 按指定内容收敛 K8s 集群详情“基本信息”为 ID、状态、规格、K8s 版本、节点数、创建时间、关联对象 7 项；开发 Mock 首个集群调整为 `k8s_5oi7sx`、运行中、规格 `—`、版本 `1.28`、3 节点、`2026-07-10 09:10`，右侧关联摘要同步显示 1 个对象且不臆造资源类型。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 按产品要求移除 K8s 集群详情页的版本升级能力：删除页头升级入口、升级弹窗及仅供该入口使用的状态、请求和任务跟踪代码，保留创建节点池与删除操作。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 修复公共列表操作列遮罩：缩短透明渐变区并让操作文字区域保持不透明，分别匹配普通、悬停与选中行背景；扩大遮罩宽度并收紧操作间距，解决 K8s 集群列表“详情 / kubeconfig / 更多”与底层单元格文字重叠的问题。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 修正 K8s 详情“关联摘要”：经 GitNexus 核对 `产品原型-7.29` 的 `relatedOf()` 与 `ANI` 的 `K8sClusterRecord`，当前均无可展示的 K8s 关联对象字段，移除错误填入的节点池、工作负载和 Kubeconfig 信息，改为标准空态；相关数据仍在各自 Tab 展示。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 提升 K8s 节点池创建入口：将“创建节点池”从节点 Tab 内容区移动到集群详情页头主操作区，使默认概览及任意 Tab 下均可直接创建，并移除原位置的重复按钮。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 清理 K8s 详情页中的对标/能力边界说明文案；按 `产品原型-7.29` 补齐集群列表行操作“详情 / kubeconfig / 更多”，更多菜单提供带二次确认的删除操作，开发 Mock 模式支持下载示例 kubeconfig。TypeScript typecheck 与 `git diff --check` 通过。 |
| 2026-08-18 | 通过 GitNexus 对照 `产品原型-7.29` 的 K8s 详情定义，详情页由左右分栏检查器改为“面包屑 + 页头 + 全宽 Tabs + 内容区”；Tabs 对齐为概览、节点、工作负载、kubeconfig、事件，概览采用基本信息/关联摘要双栏，工作负载增加摘要指标，kubeconfig 强调短时下载，并移除原型未包含的 API Proxy 可见入口。TypeScript typecheck 通过；production build 被 Node 运行时 `uv_os_get_passwd returned ENOMEM` 阻断。 |
| 2026-08-18 | 修复 K8s 集群列表名称对齐：对照云主机与容器列表，将 `ListNameCell` 内带默认内边距的 Arco 文本按钮改为同类页面使用的路由链接，使名称与下方集群 ID 左边缘对齐。`git diff --check` 通过。 |
| 2026-08-18 | 为 K8s 集群页面增加可移除的开发预览 Mock：数据集中在路由私有 `-mock-data.ts`，覆盖集群状态、节点池与工作负载；仅开发模式默认启用，可通过 `VITE_K8S_MOCK_DATA=false` 恢复真实查询，生产构建不启用。`git diff --check` 通过；当前会话无 Node/pnpm 可执行环境，typecheck 与 production build 未能启动。 |
| 2026-08-18 | 对照已落地的同类型原型布局完成 K8s 集群页面：列表接入统一 `ListPageFrame`、状态 Tab、名称/ID 搜索、刷新、固定分页与三态表格；详情接入统一 `DetailPageFrame`，按基本信息与节点池/工作负载/API Proxy Tab 组织内容，并保留创建、升级、Kubeconfig、节点池管理和删除能力。`git diff --check` 通过；当前会话未提供 Node/pnpm 可执行环境，typecheck 与 production build 未能启动。 |
| 2026-08-18 | 更新 Agent 强制约束：UI/交互优先使用 Arco Design React，确认组件库无法满足后才允许自实现并记录原因；新增组件或样式前必须先检索并复用/扩展项目公共组件及同类页面实现。 |
| 2026-08-18 | 抽取公共 `ListPageTitle`：统一承载列表页头的图标、标题和副标题；`ListPageHeader` 收敛为卡片容器与右侧操作区，后续页面可集中替换页头内容表现。 |
| 2026-08-18 | 公共列表操作列组件化：`ListRowActionButton` 从原生按钮切换为 Arco `Button type="text"`，与已有 Arco `Dropdown/Menu` 共同统一行操作按钮、悬停态和菜单交互。 |
| 2026-08-18 | 公共列表下拉统一使用 Arco `Select`：替换搜索字段和分页每页条数的原生 `<select>`，统一下拉弹层、选中态和控件尺寸，已接入 `pagebase` 的实例列表同步生效。 |
| 2026-08-18 | 抽取公共 `ListNameCell` 并接入云主机、容器、GPU 容器和 Sandbox 列表：名称链接统一无下划线，名称下方显示实例 ID，列标题统一为“名称 / ID”；移除 VM/容器重复的页面私有样式。TypeScript typecheck 通过。 |
| 2026-08-18 | 检查实例模块并修复列表样式：GPU 容器与 Sandbox 接入与云主机一致的 `ListPageFrame + ListPageHeader + StatusTabs + ListToolbar + DataTable` 公共结构，补充状态筛选、名称/ID 搜索和刷新；表格撑满剩余视口且分页固定在底部，容器与 Sandbox 空数据时均保留表头和表格区域。四类实例均已接入列表、独立创建和详情；GPU/Sandbox 尚未补齐批量操作、列设置及列表行操作。TypeScript typecheck 通过。 |
| 2026-08-18 | 对齐原型 GPU 模块：`/gpu-inventory` 从“GPU / GPU 清单”三级结构调整为“算力与实例”下的二级模块“GPU 算力管理”，并同步页面标题；二级模块按“GPU 算力管理 / 实例 / 集群”排列，API 契约路径保持不变。 |
| 2026-08-18 | 菜单改为三级信息架构：一级继续位于顶部，二、三级位于侧栏；“算力与实例”下由“实例”“集群”等二级模块组织三级叶子，“集群”从顶部一级菜单调整为二级模块；详情路由可自动展开对应侧栏祖先分组。TypeScript typecheck 与 `git diff --check` 通过；production build 仍被当前 Node 运行时 `uv_os_get_passwd returned ENOMEM` 阻断。 |
| 2026-08-18 | 对齐原型菜单信息架构：统一“云主机 VM”“块存储卷”等资源名称；按 VM、容器、GPU 顺序排列算力菜单；将“可启动镜像”归入“镜像与 Registry”；一级菜单按安全、监控、用量、设置排列；隐藏 Sandbox 模板入口（路由与创建页模板能力保留）。TypeScript typecheck 通过；production build 因当前 Node 运行时 `uv_os_get_passwd returned ENOMEM` 未能启动。 |
| 2026-08-18 | 登录表单默认填充测试租户 `tenant-a`、用户名 `admin` 和密码 `Correct@123`，方便本地联调；TypeScript typecheck 与 production build 通过。 |
| 2026-08-18 | 精简项目文档：根 `AGENTS.md` 改为独立 Console 入口；移除全部 `CLAUDE.md`、分离前 ANI 综合文档、旧 PRD/计划和逐 Sprint 流水账；保留冻结设计规范、工程约定与当前状态真来源。验证：链接扫描、`pnpm run verify`、GitNexus detect-changes、`git diff --check`。 |
| 2026-08-18 | 移除全部自动化测试资产及 Vitest/Testing Library/jsdom，`verify` 收敛为 typecheck + production build。 |
| 2026-08-18 | 登录页接入 `POST /auth/password/login`，暂时隐藏 OIDC 登录入口。 |
| 2026-08-18 | 工具链固定 TanStack Router `1.121.21`，保留后端类型快照并移除本地 OpenAPI 镜像与生成流程。 |
