# ANI Console API 对接流程

本文档约束 ANI Console 新增或调整接口时的契约核对、代码落位和验证流程。它不复制维护后端端点目录；具体路径、字段和行为始终回到 ANI 后端契约与实现核对。

## 契约核对

### Core API

1. 开始对接前，先使用当前会话接入的 GitNexus 工具查询索引 `ani-console对接文档补充`，确认是否存在测试环境已部署、代码尚未合并期间的临时说明。
2. 使用 GitNexus 查询索引 `ANI`，同时核对 Core OpenAPI、路由处理器、请求/响应模型及相关实现流程。
3. 联调时核对测试环境的实际状态码、错误体、空响应、流式响应和副作用行为。

未查询接口补充索引不得开始 Core API 对接。补充说明、OpenAPI、ANI 实现或测试环境表现存在差异时，不得自行选择其一或根据前端旧代码推断，必须停止相关对接并请用户确认。

### Services API

1. 使用 GitNexus 查询索引 `ANI`，核对 Services OpenAPI、网关注册、路由处理器、请求/响应模型及实现流程。
2. 当前 `ani-console对接文档补充` 的强制前置规则只针对 Core API；若查询命中与目标 Services 接口直接相关的补充内容，也必须纳入核对。
3. OpenAPI 已声明但网关未注册、实现尚未开放或测试环境行为不一致时，保持未接入或明确空态，并请用户确认后续口径。

前端不保留 Core 或 Services 的整份生成式 schema 快照。模块内 TypeScript 类型只提供编译期约束，不代表运行时校验，因此每次接口调整仍必须重新核对后端契约。

## 模块与类型落位

- 请求函数与接口类型统一放在 `src/api/<domain>/`，页面、组件、Hook 和 Store 不得直接导入 Axios 或 `src/api/request.ts` 拼装平台请求。
- 简单领域使用 `index.ts` 与 `types.ts`；包含多个独立资源的领域按资源拆分文件或子目录，再由领域 `index.ts` 汇总公开接口。
- 页面提交类型命名为 `*Input`，不得包含 `idempotency_key`；API 内部最终请求类型命名为 `*Request`，需要幂等时在这里加入 key。响应、列表参数及资源记录使用具有业务含义的稳定名称。
- API 函数返回解包后的响应 data，并通过异常报告失败；不得恢复 `{ data, error }` 双通道或要求页面重复解包。
- 服务端请求状态、缓存和失效由页面组件中的 TanStack Query 管理；API 模块不持有 React 状态，也不包装或改变 `useQuery`、`useMutation` 的行为。

## 公共请求层

| 能力 | 使用方式 |
|------|----------|
| Core API | `coreRequest`，基础路径为 `/api/v1` |
| Services API | `servicesRequest`，基础路径为 `/api/v1/svc` |
| 外部预签名地址 | `externalAxios`，不安装平台认证拦截器 |

- `coreRequest` 与 `servicesRequest` 默认要求登录并注入平台访问令牌；只有登录、令牌交换等公开端点显式传入 `auth: "public"`。
- 受保护请求返回 401 时由公共层执行单飞令牌刷新并重试一次；业务 API 和页面不得自行刷新令牌或重复实现 401 重试。
- 普通响应直接返回 `response.data`，204 或空响应按 `undefined` 处理。
- 查询数组序列化为重复参数；`null` 和 `undefined` 不进入查询字符串。
- 请求失败统一转换为 `ApiError`，保留 `status`、`code`、`requestId`、`details` 和原始响应上下文。页面使用公共错误通知或错误态组件展示，不自行解析 Axios 错误结构。
- 需要取消的请求透传 `AbortSignal`。Axios 取消保持为取消错误，以便幂等层识别并重置作用域。

## 幂等写请求

- 所有 POST 及有副作用的 PUT/PATCH 都由业务 API 模块管理幂等；即使 POST 语义偏读取，也不得因页面用途自行跳过。
- 每个独立写操作在模块作用域创建 `createIdempotencyScope`。固定依赖至少包含请求方法；不同写步骤使用不同作用域。
- 页面先构造不含 key 的 `submitData`。影响请求身份但不在 body 中的稳定参数，例如资源 ID、文件指纹或操作类型，通过 `runtimeDependencies` 传入；路由模板和实际 URL 不作为依赖。
- 常规写请求使用 `runIdempotentRequest` 注入 `idempotency_key`。相同依赖和提交内容的普通失败重试复用 key；提交内容或依赖变化时生成新 key；请求成功或 Axios 取消时重置。
- 多阶段流程的每个写请求步骤使用独立作用域，不共享 key。
- DELETE 默认不套用上述 body 规则。若后端契约明确要求 DELETE 幂等，应按契约使用 `Idempotency-Key` Header 等指定形式，不得自行向 body 增加字段。

幂等 key 只能由公共幂等库通过外部 `uuid` 包生成。业务代码不得直接生成 UUID、手工拼接 key、把 key 放回页面状态，或从页面调用作用域的 `reset()`。

## SSE 与预签名上传

- SSE 请求仍从对应业务 API 模块发起，使用 Axios fetch adapter、`responseType: "stream"` 和 `AbortSignal`，返回 `ReadableStream<Uint8Array>`。领域组件负责协议解析、去重、重连和界面状态。
- 预签名上传分为平台侧预约/完成请求与外部文件传输。平台请求继续使用 Core 或 Services 客户端并遵守幂等规则；外部地址只能使用 `externalAxios`。
- 外部预签名请求不得携带平台 JWT、平台 Cookie 或公共客户端默认 Header。只有后端契约为该上传会话返回的专用 Token、Content-Type 等 Header 可以显式加入。
- 外部传输错误通过 `toApiError` 归一化；需要支持取消的上传或轮询阶段必须复用调用方传入的 `AbortSignal`，不得在中途重新创建互不关联的取消作用域。

## 页面接入

- 查询通过 TanStack Query 调用领域 API 函数；mutation 只提交无 key DTO。
- 成功后由页面按资源关系失效或刷新查询缓存，API 模块不直接操作 Query Client。
- 列表加载错误使用公共列表错误通知，页面错误使用 `ApiErrorAlert`，操作失败使用 `showApiError`；只有明确的业务状态映射可以补充更具体的提示。
- 页面、路由和组件中不得出现 `coreRequest`、`servicesRequest`、Axios 平台请求或 `idempotency_key`。

## 完成检查

1. 已按 Core 或 Services 流程查询所需 GitNexus 索引，并核对 OpenAPI、网关、实现和测试环境；不存在未确认的契约差异。
2. 请求函数和静态类型已落在正确领域；页面只传普通业务参数和无 key DTO。
3. 认证、刷新、错误、幂等、取消、SSE 和预签名上传复用公共基础设施，没有平行实现。
4. 已手动核对成功、空数据、典型失败、401 刷新、取消与重复提交；流式或上传接口还需核对中断及重试。
5. 对本次新增或修改的代码运行 Oxlint，通过 `pnpm fmt` 对全仓运行 oxfmt，并运行 `pnpm typecheck`、`git diff --check` 与 GitNexus `detect_changes`。
6. 在 `docs/PROJECT-STATUS.md` 记录功能、API、网络、存储或验证规则变化及实际验证结果。
