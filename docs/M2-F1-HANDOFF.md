# Studio M2-F1 交接

前端第一段：2026-10-27；真实联调：2026-10-28。源码基线：`1c520ca753213a8fea95bd1976887fe1a8c84c02`，包含工作区未提交的 M2 实现。已有修改和 V1 未跟踪证据均保留。

**M2-F1 前端必验项 PASS，真实 Java/MySQL/HTTP 联调完成。Studio M2 总体验收 NOT_RUN。** 本轮未修改后端或共享契约，未提交、未 push。完成后停止，没有开始 M2-V1。

## 2026-10-28 真实联调结论

以下 PASS 仅覆盖本轮前端可观测子项。MF/MS/MT 编号用于关联共享矩阵，不表示其全部 Java、并发、取消、SecretResolver 和重启子项已经验收。

| 本轮必验项 | 状态 | 真实证据与结果 |
| --- | --- | --- |
| 目录、Provider、映射、Mock 配置新增/修改/刷新/启停 | PASS | 目录新增、binding 修改；HTTP 和 MOCK 均由 UI 新增并刷新；HTTP 停用/启用；目录 7 条按每页 5 条切第二页、来源过滤 4 条、q 搜索 1 条；Provider 搜索/刷新。见 browser-summary 的管理条目 |
| CAS 和本地输入保留（MS-07、MT-10 子项） | PASS | 事实、Provider 均用外部真实 PUT 推进 revision；UI 保存收到 409，名称和响应映射输入保留，没有覆盖服务端 |
| 一次 HTTP 补齐三字段（MF-01） | PASS | 真实 APPROVE / 15；正式计数证据 8→9；三个字段来源为 PROVIDER，调用报告为 HTTP / SUCCEEDED |
| 完整 facts、已有值和显式 null（MF-02～04） | PASS | 完整 facts 0 调用；ageDays=12 保留，补齐另两字段后 APPROVE / 40；refundRate=null 0 调用，原 Core 到达 data_review |
| partial、局部超时、缺 buyer/id、类型错误、总 Deadline（MF-05～09） | PASS | 有预算时 DECIDED / REVIEW / data_review；总 Deadline 返回 504、FAILED、execution=null，没有虚构节点结果 |
| Core 复核与技术失败区分（MF-18） | PASS | amount 字符串导致 Core FAILED，无 decision；区别于节点 CONTINUE 后 DECIDED / REVIEW |
| Mock 与 HTTP 隔离（MF-10 前端/HTTP 子项） | PASS | Mock 补数 APPROVE / 15，真实上游计数 6→6；已保存配置 mock-tests 为 8→8；真实失败不回退契约 Mock |
| 当次报告和精度（MT-08/09 前端子项） | PASS | 来源、字段错误、脱敏摘要、调用/总耗时、trace 和配置 revision 可见；请求映射/Mock 的大整数、39 位小数真实保存刷新保留 |
| M1 默认试运行和编辑/发布（MF-21/22、MT-11 相关子项） | PASS | 默认 INPUT 仍请求原 simulations；完整输入 APPROVE / 15、缺失输入 REVIEW，均 0 上游调用；阶段名编辑保存刷新，发布 v2/r3 后只读，再创建 v3/r1 |
| 状态保护（MT-10 前端子项） | PASS | 关闭/路由取消保留输入；修改输入或预算标记旧结果；真实 PUT 响应丢失后 GET 确认，无重发；迟到 PUT 响应推进 revision，保留后续输入 B，再保存刷新仍为 B |
| 三视口与原型对照（MT-10 视觉子项） | PASS | 1440×900、1920×1080、640×900；目录/Provider/输入页及真实报告截图；640 弹窗宽 608、左边距 16；各页面 scrollWidth 等于 viewport |

本轮范围内 **FAIL 0、BLOCKED 0**。没有发现需要后端修改的契约缺陷。以下仍为 **NOT_RUN**：SecretResolver 内部调用计数、完整 MF/MS/MT 矩阵、全量 M1 OA/ST、LIVE fact-executions、后端并发/取消/重启总体验收。它们不属于本轮前端闭环完成声明。

### 实际 Flow 与调用证据

- 隔离 Flow：`m2_f1_20261028`。预置 v1/r3，UI 从它创建 v2/r1 进行场景测试；随后 UI 编辑为 r2，发布为 **v2/r3 PUBLISHED**，再创建 **v3/r1 DRAFT**。
- v2 测试时 checksum：`sha256:8e8254c637ad1ab8904b750ffb32977ed5631f41893fc02d0142c6eafe9998cd`。
- v2 发布 checksum：`sha256:2ff1c979d29731beb3fe2071f4d47b5da36e6c078f94c7a7404642c8264537e5`。实际发布状态保存在 [published-v2.json](../output/m2-f1-real/published-v2.json)，下一草稿见 [draft-v3.json](../output/m2-f1-real/draft-v3.json)。
- 主 HTTP Provider：`b2_demo_risk`，测试初始 r1；高精度配置保存 r2，停用 r3，恢复启用 r4。另有 UI 新增的 HTTP/MOCK Provider 和事实，仅用于隔离验收。
- [browser-summary.json](../output/m2-f1-real/browser-summary.json) 索引每项请求、响应、DOM、统计及截图；[environment.json](../output/m2-f1-real/environment.json) 记录进程入口、源码 HEAD、实际 JAR SHA-256 和数据库容器。

计数来自受控服务 `/stats.postCount`，不是从页面调用条目推算。上游场景由 `/control` 切换，每次浏览器请求前后保存计数。浏览器独占执行请求，主线程前置探测单独记录为 0→1。首次浏览器正常场景观察到 1→2，但当时未单独落盘统计，正式 MF-01 使用重跑的 8→9 文件。

| 关联编号 / 场景 | 实际计数 | 结果 |
| --- | --- | --- |
| MF-01 normal-final | 8→9 | APPROVE / 15，一次补齐三字段 |
| MF-02 full | 2→2 | APPROVE / 15，CALLER |
| MF-03 existing | 6→7 | APPROVE / 40，保留 ageDays=12 |
| MF-04 null | 2→2 | DECIDED / REVIEW / data_review |
| MF-05 partial | 2→3 | missing 退款率，DECIDED / REVIEW |
| MF-06 timeout | 3→4 | OR-FACT-TIMEOUT，DECIDED / REVIEW |
| MF-07 missing-buyer | 4→4 | OR-FACT-REQUEST-INPUT，DECIDED / REVIEW |
| MF-08 type | 4→5 | OR-FACT-TYPE，DECIDED / REVIEW |
| MF-09 deadline | 5→6 | HTTP 504，FAILED，未进入 Core |
| MF-10 mock | 6→6 | MOCK，APPROVE / 15 |
| MF-18 core-failed | 7→8 | Core FAILED，无 decision |
| MF-21 M1 缺失 facts | 9→9 | 原 simulations，REVIEW |
| MF-22 M1 完整 facts | 6→6 | 原 simulations，APPROVE / 15 |
| MF-12 停用 Provider | 8→8 | OR-FACT-DISABLED，REVIEW；启用后 MF-01 恢复 |

### 本轮前端修复与故障注入

沿用第一段真实 API adapter，无需改动后端协议。本轮修复 `ProviderPage.vue`：映射测试使用独立请求序号，新测试发生网络错误时，旧报告保持“结果已过时”，不显示为新测试成功。真实 mock-tests 成功后只对下一次请求注入 `route.abort`，页面显示连接错误和过时标记，随后移除路由。

配置响应丢失与迟到响应测试也只拦截浏览器传输：`route.fetch` 先完成真实后端 PUT，再丢弃或延迟真实响应。没有伪造保存结果、规则结果或 Provider 响应。迟到测试中 r3 提交 A，后续输入 B；返回后为 r4 且 B 未保存，再保存为 r5，刷新保留 B。控制脚本串行运行，实时日志在 `/tmp`。

### 本轮实际检查

```sh
npm run test
npm run typecheck
npm run lint
npm run build
python3 output/m2-f1-real/validate-responses.py
git diff --check
```

- test **48/48 PASS**；typecheck、lint、build、diff 检查均退出 0。输出保存在 [checks.json](../output/m2-f1-real/checks.json)。
- 共享 Schema 只读校验：**20 个实际 M2 请求/响应实例 PASS**，包括正常、partial 和 504 错误体。该检查不替代行为验收；M1 响应继续由既有测试与本轮浏览器检查覆盖。
- 浏览器由 `gpt-6.1-terra` 使用 Playwright 串行操作。预期故障为 CAS 409 和主动中断响应；没有用契约 Mock 补齐真实服务失败。

### 本轮截图与视觉差异

实际 viewport 为 **1440×900、1920×1080、640×900**，不是仅修改截图尺寸。目录、Provider、试运行和原型三页均保存三个尺寸。真实页面的 scrollWidth 均等于 viewport；640 弹窗在内部滚动，可切换事实来源和 Provider 类型。

| 内容 | 1440×900 | 1920×1080 | 640×900 |
| --- | --- | --- | --- |
| 事实目录 | [截图](../output/playwright/m2-f1-real-facts-1440x900.png) | [截图](../output/playwright/m2-f1-real-facts-1920x1080.png) | [截图](../output/playwright/m2-f1-real-facts-640x900.png) |
| Provider | [截图](../output/playwright/m2-f1-real-providers-1440x900.png) | [截图](../output/playwright/m2-f1-real-providers-1920x1080.png) | [截图](../output/playwright/m2-f1-real-providers-640x900.png) |
| 真实试运行报告 | [截图](../output/playwright/m2-f1-real-report-1440x900.png) | [截图](../output/playwright/m2-f1-real-report-1920x1080.png) | [截图](../output/playwright/m2-f1-real-report-640x900.png) |

原型对照文件：`output/playwright/m2-f1-real-prototype-{facts,providers,simulate}-{viewport}.png`。沿用侧栏、蓝色选中态、浅背景、卡片和弹窗。正式响应映射仍由事实 binding 持有；JAVA/删除隐藏；试运行复用现有 Flow 输入页，因此布局与原型独立实验室有明确差异。窄屏弹窗测量、操作、CAS、已发布只读等证据由 browser-summary 索引。

### 真实环境启动配置

本次实际使用独立 MySQL 容器 `openrule-m2-f1-20261028`，数据库 `studio_m2_f1`，端口 `3311`，持久卷 `openrule-m2-f1-20261028-mysql`。没有复用或清理其他容器。MySQL healthy 后启动 Java；首次早于数据库就绪的连接失败已通过等待 healthy 后重启解决。

以下是本次实际启动命令，服务当前保留供复核。分别在后端、后端、前端目录运行；实时日志在工程外：

```sh
# /Users/ycr/IdeaProjects/Sandbox/open-rule
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
STUDIO_JDBC_URL='jdbc:mysql://127.0.0.1:3311/studio_m2_f1?serverTimezone=UTC' \
STUDIO_DB_USER=openrule_f1 STUDIO_DB_PASSWORD=f1-local PORT=8092 \
./scripts/start-studio-m2.sh > /tmp/openrule-m2-f1-java.log 2>&1

# /Users/ycr/IdeaProjects/Sandbox/open-rule
python3 scripts/studio-m2-upstream.py --port 19092 \
  > /tmp/openrule-m2-f1-upstream.log 2>&1

# /Users/ycr/IdeaProjects/Sandbox/openrule-studio
STUDIO_CONTRACT_MOCK=0 STUDIO_API_ORIGIN=http://127.0.0.1:8092 \
npm run dev -- --port 5176 --strictPort \
  > /tmp/openrule-m2-f1-vite-real.log 2>&1
```

入口：http://127.0.0.1:5176 。Java：8092；受控上游：19092。原先 5175 的契约 Mock 服务已停止。检查了实际启动脚本、Controller 路径、DDL 配置和 JAR 内容，并执行真实读写、试运行后才认定 B2 API 可用。

## 已实现功能

- `/facts`：服务端分页、q 搜索、CALLER/PROVIDER 来源过滤、新增和编辑。默认敏感；factId/path/type 创建后只读。响应映射编辑 `binding.providerId` 和 `binding.responsePointer`。Provider 选择器按 API 分页加载。
- `/providers`：分页和搜索，HTTP/MOCK 配置、新增和编辑、启停、请求映射 JSON、Mock RESPONSE/TIMEOUT/ERROR。HTTP 配置含固定 POST endpoint、连接预算、完整响应预算、secretRef 引用和 allowSimulationHttp。MOCK 类型不提交 HTTP 专属字段。隐藏 JAVA 和删除入口。
- 配置保存：使用服务端当前字符串 revision 做 CAS。409、保存失败保留输入。保存期间可以继续编辑；迟到响应只推进基线和 revision。稳定 ID 查询确认未知写入结果；查询未成功时不重发 POST/PUT。若用户点击“查询保存状态”并确认未保存，只更新状态，下一次明确点击保存才重发。
- 未保存保护：关闭弹窗、路由离开和浏览器卸载均有保护。无效映射 JSON 也计入未保存输入。取消离开保留输入。
- 现有 Flow 输入事实页：新增“仅使用输入 / HTTP 补数 / Mock 补数”。默认 INPUT，调用原 M1 simulations。M1 预算固定 3000 ms；从补数方式切回 INPUT 时显示预算同步复位。HTTP/MOCK 调用新增 fact-simulations，发送已保存 expectedRevision。可读取已保存版本的 required-facts。
- 结果：字段 status/source/error/valueSummary、catalogRevision/providerRevision；调用 transport/attempted/status/elapsedMillis/requestedPaths/traceId；解析耗时和总耗时。脱敏摘要原样展示，不当作 facts 再提交。未进入 Core 的请求错误不生成节点结果；进入 Core 的 FAILED execution 复用现有结果面板。PARTIAL + DECIDED/REVIEW 可同时显示。
- 旧结果：规则、输入、方式、预算和本页面观察到的配置 revision 变化会标记过时。旧版本请求隔离；新请求失败不会把旧执行伪装成新结果。外部配置不轮询，下一次请求以服务端快照为准。

沿用 Vue/Vite/shadcn-vue、Tailwind 和 npm/package-lock。没有新增包依赖。没有浏览器规则执行器、事实补数算法、外部 Provider 请求或 secret 解析。配置与输入不写浏览器持久存储；开发场景载入仅临时使用 sessionStorage 传递固定 fixture，读取后删除。

## 实现入口

| 文件 | 责任 |
| --- | --- |
| `src/api/factTypes.ts` | M2 DTO；复用 M1 ExecutionResult/ValidationIssue |
| `src/api/facts.ts` | 12 个真实 API adapter、配置变化标记、显式开发标志 |
| `src/api/client.ts` / `lossless.ts` | 共用传输/错误处理；M2 协议整数；requestMap/mock 业务值保真；重复 JSON 键拒绝；无损格式化 |
| `src/features/facts/configState.ts` | 配置加载、CAS、保存未知状态查询、后续编辑和迟到响应保护 |
| `src/features/facts/FactCatalogPage.vue` | 事实目录和 binding 响应映射 |
| `src/features/providers/ProviderPage.vue` | Provider 配置、启停、已保存 revision 的 mock-tests |
| `src/features/facts/components/FactResolutionPanel.vue` | 字段/调用报告；复用于试运行和映射测试 |
| `src/features/editor/state.ts` / `FlowEditorPage.vue` | 三种试运行方式及结果隔离 |
| `dev/contractMock.mjs` / `dev/fixtures/` | Vite 开发中间件和固定契约样例，不进入生产运行路径 |

## API 清单

统一基址为 `VITE_API_BASE`，默认 `/api/v2`。下面列出相对路径；默认 Vite 代理到 8080，可通过 STUDIO_API_ORIGIN 修改。

| 方法 | 路径 | 操作 |
| --- | --- | --- |
| GET / POST | `/admin/facts` | listFacts / createFact |
| GET / PUT | `/admin/facts/{factId}` | getFact / updateFact |
| GET / POST | `/admin/fact-providers` | listProviders / createProvider |
| GET / PUT | `/admin/fact-providers/{providerId}` | getProvider / updateProvider |
| POST | `/admin/fact-providers/{providerId}/mock-tests` | testProviderMock；只发送已保存 revision 和测试 facts，不发送未保存 document |
| GET | `/admin/flows/{flowId}/versions/{version}/required-facts` | getRequiredFacts |
| POST | `/admin/flows/{flowId}/versions/{version}/fact-simulations` | simulateWithFacts；HTTP/MOCK |
| POST | `/flows/{flowId}/versions/{version}/fact-executions` | executeWithFacts；HTTP-only adapter，本段未增加 LIVE 页面 |

PUT 请求为 `{expectedRevision,document}`。ID/版本/修订号按契约传字符串。错误体保留 M2 factResolution/totalElapsedMillis。真实请求失败直接报告错误，不自动进入契约 Mock。

## 启动配置与契约 Mock

```sh
cd /Users/ycr/IdeaProjects/Sandbox/openrule-studio
npm ci
STUDIO_CONTRACT_MOCK=1 npm run dev -- --port 5175 --strictPort
# http://127.0.0.1:5175/facts
# http://127.0.0.1:5175/providers
# http://127.0.0.1:5175/flows/order_admission/versions/1?tab=facts
```

必须在开发服务启动时显式设置 `STUDIO_CONTRACT_MOCK=1`。页面显示黄色“开发专用 · 契约 Mock”控制栏。构建或 production 模式不会启用中间件；生产产物没有 `/__studio_mock` 控制代码。真实模式启动：

```sh
STUDIO_API_ORIGIN=http://127.0.0.1:8081 npm run dev -- --port 5173
```

上述 8081 为通用配置示例。本次真实环境使用 8092，命令与隔离数据见本文前部。契约 Mock 仅保留供显式开发和异常测试，不能作为真实联调证据。

Mock 控制栏可载入正常、partial、Provider 超时、请求 deadline、Mock 补数、技术失败和精度样例，并设置配置写入 409/503/保存后丢响应故障。载入场景会明确确认并重置**开发 Mock 数据**，不访问数据库。目录/Provider CRUD 只在该 Vite 进程内保存，浏览器刷新可重读；开发服务重启或重置场景会恢复 fixture。

执行响应匹配冻结的 Flow document/revision、Provider/目录配置快照、facts、factMode 和预算。非匹配输入返回 **501 OR-MOCK-NO-FIXTURE**。规则或配置的任意编辑不会触发浏览器求值。只有 requestId/bizId 相关标识按请求回显，决策、评分、字段解析及耗时来自固定响应文件。Mock-tests 当前提供 normal 场景 risk_profile/r1 的固定映射结果；其他配置不推算映射结果。

`dev/fixtures/SOURCES.json` 记录复制来源和 SHA-256。normal/mock-test/deadline/required-facts 等复制自共享契约。partial/timeout/precision/Core-failure 等额外响应为本前端的展示样例，依据冻结 MF 预期编写并通过 Schema；它们不是 Java 执行证据。

## 2026-10-27 第一段检查（历史契约 Mock 证据）

```sh
npm run test
npm run typecheck
npm run lint
npm run build
python3 scripts/validate-m2-mock-fixtures.py
git diff --check
```

- 测试 **48/48** 通过，保留 M1 的 25 项测试。新增覆盖全部 API 路径、真实 adapter 不回退 Mock、配置 CAS/响应丢失/迟到响应、默认 M1、模式/配置过时、未进入 Core/进入后失败、无损数值、重复键及固定场景匹配。
- typecheck、lint、build、diff 检查通过。额外执行 `STUDIO_CONTRACT_MOCK=1 npm run build`，检查产物无 `/__studio_mock` 或 OR-MOCK-NO-FIXTURE 控制代码。
- 复用共享 Schema 的只读离线检查器，**26 个前端请求/响应实例通过**。脚本需要相邻 open-rule、JDK21、Maven 和已缓存的契约验证依赖；编译与展平数据在系统临时目录。
- Playwright CLI 使用同一个浏览器会话串行执行。等待明确终态后检查 DOM/截图。Vite/原型服务及浏览器实时日志写 `/tmp/openrule-m2-*`，不写进 Tailwind 扫描目录。
- 浏览器已检查目录分页/来源过滤、新增默认敏感、保存刷新、身份字段只读、409/503 保留输入、保存后丢响应查询确认、关闭和路由未保存保护。
- Provider 浏览器检查覆盖：受控延迟的旧 GET 不覆盖另一弹窗中的无效原始输入；保存配置的 mock-tests、未保存禁测试、配置结果过时、HTTP 配置、MOCK/TIMEOUT/null 创建、启停、39 位小数和大整数在映射/Mock 中保存刷新。

### 第一段试运行展示证据（全部为契约 Mock）

下表 NOT_RUN 是 2026-10-27 当时的真实服务端状态。本次真实证据与当前结论以本文前部为准。

| 场景 | 固定响应展示 | 关联用例 | 真实服务端验收 |
| --- | --- | --- | --- |
| 默认仅使用输入 | 原 M1 端点，DECIDED，无事实报告 | MF-22 | NOT_RUN |
| normal | COMPLETE + DECIDED / APPROVE / 15 | MF-01 | NOT_RUN |
| partial | PARTIAL，退款率 missing，DECIDED / REVIEW | MF-05 | NOT_RUN |
| Provider timeout | PARTIAL，字段 failed / OR-FACT-TIMEOUT，REVIEW | MF-06 | NOT_RUN |
| 请求 deadline | FAILED，execution=null，无虚构节点/决策 | MF-09 | NOT_RUN |
| Mock | mode/transport=MOCK，APPROVE/15 | MF-10 | NOT_RUN |
| 技术失败 | 字段 COMPLETE + Core FAILED，无 decision | MF-18 | NOT_RUN |
| precision | 9007199254740995、0.123456789012345678901234567890123456789 原样显示 | MT-08 | NOT_RUN |

第一段场景检查摘要：[scenario-results.json](../output/m2-f1/scenario-results.json)。第一段没有证明真实 HTTP 调用数、超时取消或 SecretResolver 调用数；本次 HTTP 计数见本文前部，取消与 SecretResolver 内部观测仍留待总体验收。

## 第一段视觉与截图（历史契约 Mock）

实际 viewport 为 **1440×900、1920×1080、640×900**。目录/Provider/试运行都已截图；页面 scrollWidth 与 viewport 宽度相同。640 窄屏已实际打开菜单和新增事实弹窗，弹窗宽608、左右各16；表格在容器内横向滚动。

沿用原型216px侧栏、蓝色选中状态、浅背景、表格、卡片和宽弹窗。与原型的明确差异：新增仅开发可见的契约控制栏；按正式 DTO 显示 revision；响应映射由事实 binding 持有；隐藏 JAVA/删除；试运行复用 M1 输入页而不引入 Scene/Trace 页面。

[viewport-evidence.json](../output/m2-f1/viewport-evidence.json) 记录页面、实际尺寸及文件名。截图在 `output/playwright/m2-f1-*.png`：

| 页面/证据 | 截图 |
| --- | --- |
| 事实目录 | [1440](../output/playwright/m2-f1-facts-1440x900.png)、[1920](../output/playwright/m2-f1-facts-1920x1080.png)、[640](../output/playwright/m2-f1-facts-640x900.png) |
| Provider 列表 | [1440](../output/playwright/m2-f1-providers-1440x900.png)、[1920](../output/playwright/m2-f1-providers-1920x1080.png)、[640](../output/playwright/m2-f1-providers-640x900.png) |
| 试运行完整结果 | [1440](../output/playwright/m2-f1-simulation-1440x900.png)、[1920](../output/playwright/m2-f1-simulation-1920x1080.png)、[640](../output/playwright/m2-f1-simulation-640x900.png) |
| 配置、映射测试、精度 | [Provider 配置](../output/playwright/m2-f1-provider-config-1440x900.png)、[映射测试](../output/playwright/m2-f1-mapping-test-1440x900.png)、[精度保存](../output/playwright/m2-f1-provider-precision-1440x900.png) |
| 异常展示 | [CAS](../output/playwright/m2-f1-fact-cas-1440x900.png)、[partial](../output/playwright/m2-f1-partial-1440x900.png)、[Provider 超时](../output/playwright/m2-f1-provider-timeout-1440x900.png)、[请求超时](../output/playwright/m2-f1-deadline-1440x900.png)、[技术失败](../output/playwright/m2-f1-technical-failure-1440x900.png) |
| 原型对照 | `m2-f1-prototype-facts-*`、`m2-f1-prototype-providers-*`、`m2-f1-prototype-simulate-*`；三个实际尺寸各一组 |

## 留给 M2-V1 的事项（本轮不执行）

| 项目 | 本轮状态 | 后续边界 |
| --- | --- | --- |
| 完整 MF-01～30、MS-01～08、MT-01～11 分层矩阵 | NOT_RUN | 本文只验收前端可观测子项；不能用浏览器子项 PASS 代替全部 J/I/H 证据 |
| SecretResolver 内部调用次数 | NOT_RUN | 前端没有观测入口；0 上游请求不等于已测得 0 SecretResolver 调用 |
| 后端快照并发、路径前缀并发、重启恢复、许可释放与取消、迟到上游 body | NOT_RUN | 由后端/总体验收提供证据；本轮刷新证明读取持久化配置，不代表 Java/MySQL 重启验收 |
| HTTP 精确数值响应、128 位/指数及 body 边界 | NOT_RUN | 前端常量/Mock 的大整数与39位小数保存刷新 PASS；不据此声明完整 MT-08 PASS |
| LIVE fact-executions、LIVE 禁 MOCK、全量 M1 OA/ST/checksum 回归 | NOT_RUN | 本轮没有 LIVE 页面；executeVersion adapter 已有单测，未做本轮真实 LIVE 执行 |
| Scene、Provider 新类型、历史 Trace | 不在范围 | 不由本轮引入 |

API adapter 的12项路径均有单测；本轮真实环境覆盖管理、mock-tests、required-facts 和 fact-simulations，真实 fact-executions 留待总体验收。正式 API 清单不变。

**M2-F1 已完成并停止。没有启动 M2-V1，没有提交或 push。**
