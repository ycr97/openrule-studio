# F3 交接：专用编辑器、完整订单与发布

> 本文保留2026-10-01的F3交接事实与待验事项。2026-10-04 V1已完成总体验收并修复下文两项后端定位问题；当前状态见 [V1交接](V1-HANDOFF.md) 与 [总体验收报告](../../open-rule/docs/contracts/studio-m1/V1-ACCEPTANCE.md)。

日期：2026-10-01。前端沿用 F1/F2 的 Vue/Vite/shadcn-vue 工程和 npm 锁文件；运行能力依据 D0 和 B3。后端源码未修改。F3 功能及本说明中的真实闭环已经验证，可进入 V1 总体验收；下方未覆盖项继续保留。

## 实现入口

| 入口 | 行为 |
| --- | --- |
| `src/features/editor/components/NodeConfigDialog.vue` | RuleSet FIRST_MATCH/ALL_MATCH、规则增删排序/条件/输出/原因；Scorecard 维度/分箱增删排序/名称/精确分值/原因；DecisionTable FIRST、条件行增删排序/输出/原因。旧 ID 保留，新 ID 一次生成 |
| `ConditionBuilder.vue` | 复用 F2 AST 编辑和无损 JSON 适配；无效 JSON 输入向父级传播，阻止保存/试运行/发布 |
| `InspectorPanel.vue` / `NodePalette.vue` | 五类节点配置及添加；已发布配置只读 |
| `ExecutionPanel.vue` | 实际 Flow/version/revision/checksum/Terminal、维度命中分箱/分数/原因、命中规则/行/输出、未命中、节点失败和跳过路径。CONTINUE 到达 Terminal 为 DECIDED |
| `issueLocation.ts` | 按服务端稳定 ID / JSON Pointer 定位 Stage、Node、Rule、Characteristic、Bin 和字段；明确的 node-level between 结构错误可回溯当前配置中的异常分箱 |
| `state.ts` / `FlowEditorPage.vue` | CAS 保存与发布、说明/确认/提交/弹窗内错误、未保存保护、响应丢失 GET 确认、发布成功只读和下一草稿。事实/规则变更标记结果过时，跨版本迟到响应受保护 |
| `src/api/` | 共用 DTO、错误映射和 lossless JSON。无浏览器规则执行器 |

高级编辑器的所有有效修改经过同一个 `editor.mutate`、同一个 DraftDocument 保存接口；业务数字不经 JS Number 中转。评分未配置使用 null 草稿，发布前由服务端检查完整性。执行 API 的 score/detail.score 展示服务端十进制字符串。

## 本次实际验证

```sh
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
node scripts/f3-acceptance.mjs order_admission_f3_20261001 1 2
node --experimental-strip-types scripts/f3-validation-diagnostics.mjs order_admission_f3_20261001 3
```

20 项状态/无损适配/定位测试通过，typecheck、lint、build、diff 检查通过。新测试覆盖发布保存保护、当前 revision、409 无重试、网络/502 响应丢失后 GET 确认、状态不可用禁止重复写、恢复不同内容时保留输入、facts 在校验期间修改的过时标记、重复试运行保护、跨版本迟到保存/发布、HTTP 500 执行结果展示。既有 F2 迟到保存、保存失败、数值/null/missing 测试保留。

真实浏览器检查：RuleSet 策略切换、增删排序与稳定 ID；DecisionTable 增删排序；Scorecard 维度/分箱增删排序、30 位小数输入、null 未配置输入；无效规则删除后保存恢复可用。临时编辑均恢复，未改写已发布原规则。保存刷新重新打开高退款分箱，实际显示 5。未保存时发布确认禁用。修改 facts 后过时标记出现。missing 与 null 的错误信息不同；HTTP 500 的失败节点原因和 ABORTED 路径可见。控制台 warn/error 检查为空。

视觉检查沿用 F1 的颜色、字体、间距、圆角、导航和卡片，未引入后台模板。桌面实际 1280×720；窄窗口实际宽 827，已修复画布+属性面板列最小宽度造成的页面水平溢出。尝试设置 1440×900 时浏览器未应用该尺寸，不把截图标为 1440。结果截图为整页，展示完整路径。F1 的原型基线截图继续保留，V1 做最终设计确认。

## 真实 Java + MySQL 环境

B3 既有 boot jar，Java 21；MySQL 8 独立容器 `openrule-f3-mysql`，绑定 `127.0.0.1:3308`，数据库/user/password 均为本地测试 `openrule`。本次容器保留，未使用 `--rm`，避免中断后丢失验收数据。服务端 8081，Vite 5174。

```sh
# 容器停止后恢复已有数据；不重新 docker run 同名容器
docker start openrule-f3-mysql
cd /Users/ycr/IdeaProjects/Sandbox/open-rule
STUDIO_JDBC_URL='jdbc:mysql://127.0.0.1:3308/openrule?serverTimezone=UTC' \
STUDIO_DB_USER=openrule STUDIO_DB_PASSWORD=openrule PORT=8081 \
/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java \
  -jar openrule-studio-server/target/openrule-studio-server-1.0.0-SNAPSHOT.jar
# 另一个终端
cd /Users/ycr/IdeaProjects/Sandbox/openrule-studio
STUDIO_API_ORIGIN=http://127.0.0.1:8081 npm run dev -- --port 5174
```

全新隔离环境可用 `node scripts/f3-seed-order.mjs NEW_FLOW_ID` 创建冻结原始订单定义。脚本不覆盖已有 Flow。已运行环境不要重复 seed。`f3-bump-draft.mjs` 仅用于手动异常测试，会对指定草稿保存原文以推进 revision。

## Flow / 精确版本 / 验收映射

本次 Flow 为 `order_admission_f3_20261001`。版本和 revision 均来自真实服务端响应。

| 版本 | 服务端状态 | 内容 / checksum |
| --- | --- | --- |
| v1 / r3 | PUBLISHED | 原始 45 分分箱；`sha256:7ceaee0240616975d4c86cb8866dfd9090a407fe3bd678dbb3513b09aa75e81f` |
| v2 / r3 | PUBLISHED | UI 将 `b_refund_high.score` 45→5；`sha256:1e8b705ea17938bc8cef2822be129c35cf347d2732ce621bd4df88e7488cb739` |
| v3 / r3 | DRAFT | 从 v2 创建；两次外部原文保存用于发布冲突。配置保持 v2，未发布 |

| OA / ST | 实际证据 | 结果及覆盖范围 |
| --- | --- | --- |
| OA-01 | 浏览器 v1/r2 SIMULATE；v1/r3 LIVE | DECIDED / APPROVE / 15 / LOW / approve |
| OA-02 | 浏览器 v1/r2 SIMULATE；v1/r3 LIVE | DECIDED / REVIEW / 75 / MEDIUM / risk_review |
| OA-03 | 浏览器 UI 创建 v2、45→5、保存刷新；v2/r2 SIMULATE、v2/r3 LIVE | 同一份 OA-02 facts 得到 DECIDED / APPROVE / 35；原 v1 再执行仍 75 |
| OA-07 | 浏览器 v3 SIMULATE；v1 LIVE | missing，buyer_score FAILED/CONTINUE，HTTP 200 DECIDED / REVIEW / data_review |
| OA-08 | 浏览器 v3 SIMULATE；v1 LIVE | 显式 null，失败信息是 type mismatch，不是 missing；仍 DECIDED / REVIEW |
| OA-09 | 浏览器 v3 SIMULATE；v1 LIVE | amount 字符串，base_rules FAILED/ABORT，HTTP 500 FAILED，decision=null |
| ST-02～06 / ST-10 | 保存刷新、两版发布、只读、下一草稿、未保存禁发布、真实精确 LIVE | 生命周期中的前端闭环和版本隔离通过；重启/事务故障完整矩阵留给 V1 |
| ST-09 | 服务端 Invalid between bounds →点击→具体高退款分箱 | 前端定位验证；运行时重叠/缺口矩阵仍由 V1 复验 |
| ST-11 | lossless 测试 + UI 精确小数输入 | 长小数、大整数、null/missing 适配通过；checksum 向量由后端契约套件验证 |
| ST-12 | 真实发布 revision 冲突 | v3/r1 对服务器 r2、v3/r2 对服务器 r3 均 409；草稿和发布说明保留；v1 损坏兼容测试留给 V1 |

完整 LIVE 输出：[f3-live-acceptance.txt](../output/f3-live-acceptance.txt)。脚本实际调用 `/api/v2/flows/{flowId}/versions/{version}/executions`，精确版本分别为服务端发布返回的 1 和 2，使用同一 OA-02 facts 对比。没有新增 LIVE 页面。

## 后端定位问题：可复现、未修改后端

完整请求/响应：[f3-validation-diagnostics.json](../output/f3-validation-diagnostics.json)。请求均为 POST `/api/v2/admin/flows/order_admission_f3_20261001/versions/3/validations`，提交完整 document，未写入草稿。

1. `buyer_score.config.characteristics[1].bins[0].condition.op` 改为 between，value 仍 0.3。HTTP 200，valid=false，issue message=`OR-DEF-VALIDATION: buyer_score: Invalid between bounds`，pointer=`/stages/2/nodes/0`，stageId=s_score、nodeId=buyer_score、itemId=null。预期 pointer 定位 `/stages/2/nodes/0/config/characteristics/1/bins/0/condition/value`，itemId=b_refund_high。前端对这个明确的结构异常可定位分箱；其他编译器异常需要服务端提供细粒度 pointer/ID。
2. `buyer_score.config.outputKey` 改为 segment，与同一 PARALLEL 阶段的 order_segment 冲突。HTTP 200，valid=false，message=`OR-DEF-VALIDATION: Parallel output conflict: segment`，pointer=`/stages/5`，stageId/nodeId/itemId 均 null。预期 s_score 的 `/stages/2` 或参与冲突节点 outputKey 指针，提供实际 Stage/Node ID。当前后端指针会引导到错误阶段，前端未伪造通用推断。

## 截图

全部为真实浏览器和真实 API 数据，保存在 `output/playwright/`：

- [编排页](../output/playwright/f3-canvas.png)
- [RuleSet](../output/playwright/f3-ruleset-editor.png)
- [Scorecard](../output/playwright/f3-scorecard-editor.png)
- [DecisionTable](../output/playwright/f3-decision-table-editor.png)
- [REVIEW / 75](../output/playwright/f3-result-75.png)
- [APPROVE / 35](../output/playwright/f3-result-35.png)
- [已发布只读](../output/playwright/f3-published-readonly.png)
- [发布冲突](../output/playwright/f3-publish-conflict.png)
- [分箱定位](../output/playwright/f3-validation-bin.png)

## V1 仍需验收

- 完整 OA-04～06、OA-10～12 的所有边界，规则集 ALL_MATCH 执行、评分分箱重叠/缺口等完整 OA/ST 矩阵；F3 未将这些标为全部通过。
- MySQL/Java 重启后的两版精确结果、发布不可变性、事务/超时/损坏定义恢复及旧 v1 读取，按 B1/B2/B3 各套件复验。
- 服务端编译错误提供准确 Stage/Node/itemId/field 后，复验所有专用编辑器定位；上面并行 outputKey 指针问题需后端修复。
- 真实网络响应丢失时的发布恢复可再通过受控代理验证；当前网络/502/状态不可用由状态测试注入验证，正常发布与 409 为真实浏览器。
- 最终原型视觉确认、键盘/可访问性、目标桌面尺寸和浏览器矩阵。Provider、Scene、历史 Trace 查询继续保持 M1 既定范围。

本次按最新 F3 边界只做本地中文提交；没有自动 push、合并或部署。
