# OpenRule Studio

Vue 3 + TypeScript + Vite + Vue Router + shadcn-vue + Tailwind CSS 4。F1 提供原型视觉基础，F2 接入真实 Studio v2 API，F3 完成三类专用编辑器、完整结果和发布闭环；V1 已完成 Studio M1 总体验收与范围内缺陷修复。规则由 Java 服务端执行，调用方提供完整 facts。

## 启动

Node.js 24.14+，沿用 npm/package-lock。先按 [后端启动说明](../open-rule/openrule-studio-server/README.md) 启动 Java 21 + MySQL 8 的 B3 服务，再启动前端：

```sh
cd /Users/ycr/IdeaProjects/Sandbox/openrule-studio
npm ci
STUDIO_API_ORIGIN=http://127.0.0.1:8081 npm run dev -- --port 5174
# http://127.0.0.1:5174/
```

默认 `npm run dev` 使用 5173，代理 `/api/v2` 到 8080；`STUDIO_API_ORIGIN` 修改代理目标，`VITE_API_BASE` 修改构建时 API 路径。MySQL 配置为 `STUDIO_JDBC_URL`、`STUDIO_DB_USER`、`STUDIO_DB_PASSWORD`。

## 已实现功能

- Flow/版本列表、精确版本读取、创建 Flow/草稿、发布版本只读和创建下一草稿。
- Stage 增删排序、SERIAL/PARALLEL、when；五类节点增删排序及配置编辑。RuleSet 支持 FIRST_MATCH/ALL_MATCH、规则条件/输出/原因；Scorecard 支持维度和分箱增删排序、精确分值；DecisionTable 支持条件行和 FIRST。既有 ID 保留，新增 ID 一次生成。
- 共用 ConditionBuilder、API DTO 和编辑状态；业务数字保留原始 JSON 数字字面量，`null` 与 missing 区分，version/revision 为字符串。评分未配置可填 `null`，可保存为不完整草稿，由服务端校验限制发布。
- CAS 保存、字段错误定位、未保存离开保护、保存并服务端试运行。保存失败和 409 保留输入；保存期间继续编辑不会被迟到响应覆盖；切换版本后旧请求不能回写当前页面。
- 完整结果展示实际版本、revision、checksum、Terminal、Stage/节点状态和跳过原因、命中规则/条件行、维度/分箱/精确分值/原因、输出和未命中。CONTINUE 到达 REVIEW 仍显示 DECIDED；技术失败展示 ErrorBody.execution。规则或 facts 修改后标记旧结果。
- 发布说明与确认、未保存/无效输入保护、提交状态、弹窗内错误反馈；成功按服务端状态只读。响应丢失先 GET 精确状态；状态无法确定时后续确认仍先查询，避免盲目重复提交。发布不激活 Scene。

前端入口：`src/api/`、`src/features/editor/state.ts`、`src/features/editor/components/`。能力依据为 [B3-IMPLEMENTATION](../open-rule/docs/contracts/studio-m1/B3-IMPLEMENTATION.md) 和 D0 契约；B3 已替换 B2 的高级节点临时执行限制。

## 检查与真实联调

```sh
npm run test
npm run typecheck
npm run lint
npm run build
STUDIO_API_BASE=http://127.0.0.1:8081/api/v2 \
  node scripts/f3-acceptance.mjs order_admission_f3_20261001 1 2
```

2026-10-01：20 项测试、typecheck、lint、build 通过。真实 Java + 隔离 MySQL 浏览器完成 APPROVE/15、REVIEW/75、发布原规则、下一草稿 UI 改 45→5、保存刷新、APPROVE/35、发布新版。精确 LIVE API 验证原版仍 75、新版 35；missing/null 为 DECIDED/REVIEW，类型错误为 HTTP 500/FAILED。真实发布 409 保留说明和本地草稿。版本均为服务端实际返回值。

完整验收映射、环境、截图与后端问题见 [F3 交接说明](docs/F3-HANDOFF.md)。[LIVE 证据](output/f3-live-acceptance.txt)、[校验定位请求/响应](output/f3-validation-diagnostics.json)。

| 截图 | 内容 |
| --- | --- |
| [编排页](output/playwright/f3-canvas.png) | 真实五类节点、6 Stage / 8 Node |
| [规则集](output/playwright/f3-ruleset-editor.png) | 条件、输出、原因和策略 |
| [评分卡](output/playwright/f3-scorecard-editor.png) | 高退款率分箱 5 分 |
| [决策表](output/playwright/f3-decision-table-editor.png) | FIRST 条件行 |
| [75 分](output/playwright/f3-result-75.png) / [35 分](output/playwright/f3-result-35.png) | 完整服务端执行路径 |
| [发布只读](output/playwright/f3-published-readonly.png) | v2 PUBLISHED / r3 |
| [发布冲突](output/playwright/f3-publish-conflict.png) / [分箱定位](output/playwright/f3-validation-bin.png) | 真实异常反馈 |

F1 原型对照基线保留在 `output/playwright/prototype-*`、`studio-*`；F2 证据为 `f2-order-admission-1440x900.png`。F3 继续使用原有颜色、字体、圆角、工作台和卡片布局；当前浏览器实际桌面视口 1280×720，窄视口 827×850，结果使用整页截图。

## V1 总体验收与交付

2026-10-04：Studio M1 验收通过，OA 的19个冻结子用例共38次 SIMULATE/LIVE、ST-01～ST-13全部通过；前端25项测试、typecheck、lint、build通过。两类后端定位错误已修复，前端按稳定 ID / JSON Pointer 定位，不再解析错误文案推测分箱。保存响应未知时先查询精确状态；代理日志触发 Tailwind/Vite 重复加载的问题已修复；画布与专用编辑器完成1440×900、1920×1080、640×900真实截图对照。

入口：[V1交接](docs/V1-HANDOFF.md)、[完整验收报告](../open-rule/docs/contracts/studio-m1/V1-ACCEPTANCE.md)、[重复加载事件及恢复](docs/V1-AUTOMATION-INCIDENT.md)。上面的F3记录保留为历史证据；当前结论以V1报告为准。

精选V1截图沿用 `output/playwright/` 的版本管理约定；原始日志、数据库备份、源码验收快照和其余截图留在本地证据目录。交付仅本地提交，不push、合并或部署，不自动进入M2。
