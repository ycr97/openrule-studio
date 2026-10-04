# V1 浏览器验收重复加载事件

时间：2026-10-01，Asia/Shanghai。以下正文保留当时暂停记录；后续恢复与最终验收见文末。中断或缺少最终结果的脚本始终不计 PASS。

## 根因与证据

V1 代理把每次真实 API 请求/响应追加到工程内 `output/v1/proxy-events.jsonl`。Tailwind 默认扫描工程根目录，把该文件和验收 `.txt` 纳入扫描及 CSS 依赖。安装版本 `@tailwindcss/vite` 的 `hotUpdate` 对此类已扫描资产发送 `full-reload`。

反馈环：浏览器读取草稿和版本列表 → 代理追加日志 → Tailwind/Vite 全页刷新 → 浏览器再次读取同一资源。刷新碰到未保存编辑时出现 `beforeunload`；它不是最初的循环触发源。验收脚本未及时识别此反馈环并暂停，这是本次工具配置与负载控制的缺陷。

- [扫描清单](../output/v1/tailwind-scanned-evidence-files.txt) 明确包含代理日志和验收输出。
- 全部浏览器关闭后，仅连接本地 HMR WebSocket，向**已有**代理日志追加一条明确标记的 `PROBE`，没有业务 API 请求；[修复前输出](../output/v1/hmr-before-fix.txt) 收到 `full-reload`，以及指向该日志的 `file-changed`。
- 新建文件的首次追加没有触发刷新，不能用这一次阴性结果排除已有扫描依赖。已有文件的单次追加给出了直接复现。
- 原代理日志保留全部原始记录，诊断追加的 `method=PROBE` 不是业务请求，统计时排除。

## 暂停与负载

仅关闭本次创建的 Playwright 会话 `v1`、`v1fault`、`v1visual`；Java 8081、MySQL 容器 `openrule-f3-mysql`、前端 5174/5175 和代理 8082 保留。F3 已发布版本和历史证据没有删除或覆盖。

暂停后真实代理请求在连续 60 秒统计中为 0；采样时两个 Vite、Java、代理 CPU 均为 0.0%。暂停前 Vite 5174/5175 的 CPU 采样分别为 114.6%/222.1%，5174 RSS 约 1.65 GiB。系统压缩内存不能从单个进程 RSS 推导归属；这里不把系统压缩量归因到某个进程。

## 修复及验证

- `src/style.css`：关闭 Tailwind 根目录自动扫描，明确只扫描 `src/` 和 `index.html`。
- `vite.config.ts`：文件监听排除 `output/` 和 `.playwright-cli/`。
- `scripts/v1-fault-proxy.mjs`：实时证据默认写到系统临时目录 `openrule-v1-evidence`；内存记录最多 500 条；10 秒超过 60 次请求时熔断且保持锁定，后续不转发也不反复写日志。解除需要重启专用代理。
- `scripts/v1-browser-acceptance.mjs`：缺少明确最终 `PASS` 或返回模态状态的运行视为未完成，不能凭 CLI 退出码判通过。

浏览器始终保持关闭。重复同一个已有日志追加探针：[修复后输出](../output/v1/hmr-after-fix.txt) 只有 `connected`，`reloadEvents=0`。

为排除重启 Vite 后尚未加载 CSS 导致的假阴性，进一步显式请求 `/src/style.css` 建立扫描依赖，再写已有日志，并仅更新源码文件的 mtime 作为正向对照：[有界验证](../output/v1/hmr-bounded-check.txt) 为 `PASS`，日志写入刷新 0 次，源码 HMR 更新 1 次，浏览器会话和真实业务 API 请求均为 0。

代理熔断在独立假上游和临时端口验证：[结果](../output/v1/proxy-fuse-check.txt)。66 次合成请求中仅前 60 次转发，后 6 次返回 503；熔断后日志不增长。真实 Java/MySQL 请求数为 0。当前 8082 仍是暂停前启动的进程，新代理代码需在恢复验收前重启后生效。

前端 test 25/25、typecheck、lint、build、`git diff --check` 均通过，日志见 `output/v1/*after-pause.txt`。没有恢复浏览器验收，没有 push、合并或部署。

恢复前需使用修复后的专用代理，并以单浏览器、单用例及有界请求计数确认稳定；本轮中断的保存/发布故障、迟到响应及视觉验收必须完整重跑。Studio M1 尚未宣告验收通过。


## 恢复验证（2026-10-01～2026-10-04）

恢复前已重启 8082 专用代理，运行修复后的扫描隔离、外部日志和锁定熔断代码。单会话逐项重跑保存失败/未知结果、CAS、执行迟到/超时、发布成功后响应丢失、错误定位、精度和视觉对照。每个成功用例都有明确最终 PASS，完整原始事件保存于 `output/v1/resumed-proxy-events.jsonl`；最终有界负载统计为 `output/v1/close-load-summary.json`。正常源码 HMR 保留，证据写入不再触发浏览器 full-reload。

Oct4补充重跑曾遇到未保存 beforeunload，并在前项未完成时误启动下一脚本；两次均未计 PASS，专用会话关闭重开后严格等待每项 PASS，再执行下一项。重跑证据为 `close-browser-saves-retry.txt`、`close-browser-conflicts-retry.txt`、`close-browser-simulations-retry.txt`、`close-browser-publication.txt`。该过程没有重新产生高频加载反馈环。

最终范围、逐项 OA/ST 状态、缺陷修复、Java/JDBC与浏览器验证层级见[后端 V1 总体验收报告](/Users/ycr/IdeaProjects/Sandbox/open-rule/docs/contracts/studio-m1/V1-ACCEPTANCE.md)。F3 数据与最初异常日志全部保留；没有自动进入 M2、push、合并或部署。
