# Studio M1 V1 交付交接

日期：2026-10-04。Studio M1已验收通过，本轮只整理本地提交。收尾开始时，后端15个、前端17个待提交文件与验收 `source-manifest.json` 的SHA256逐个一致，复用原有成功证据；随后只更新文档入口和版本管理选择，没有新增源码行为。

## 范围与依据

- 后端：结构化编译位置贯通原始数组JSON Pointer及稳定Stage/Node/item ID，修复退款分箱between和并行输出冲突位置；并行输出保护的null-key检查；定位、timeout、真实MySQL事务回滚/并发/精度/旧v1回归。
- 前端：按服务端位置定位，删除文案猜测；未知保存结果查询并保留后续编辑；限定Tailwind扫描和Vite监听避免日志加载反馈环；桌面画布高度及980px紧凑专用编辑器，条件展开和错误自动聚焦。
- 验收：OA19个冻结子用例×SIMULATE/LIVE=38次；ST13项；Java140、MySQL IT16、前端25测试，D0/typecheck/lint/build；真实浏览器和3尺寸30状态视觉检查。MockMvc、JDBC、代理合成504与真实浏览器的层级在报告中明确区分。
- 契约/冻结fixture/预期未改。Provider、Scene/Release、历史Trace查询不在本轮。

完整结果、版本基线、命令及剩余项：[后端V1报告](../../open-rule/docs/contracts/studio-m1/V1-ACCEPTANCE.md)。异常及恢复：[浏览器重复加载事件](V1-AUTOMATION-INCIDENT.md)。[F3交接](F3-HANDOFF.md)和原始F3证据作为历史记录保留。

## 可复用验证入口

| 仓库 / 脚本 | 用途与前置条件 |
| --- | --- |
| 后端 `scripts/v1-acceptance.mjs` | 冻结OA全例、生命周期/负例/完整F3定位请求、原始数字HTTP/JDBC；`V1_RUN_ID`使用唯一身份；写本地output/v1 |
| 后端 `scripts/v1-extra-acceptance.mjs` | 生成独立不完整/重排/精度/checksum/匹配策略数据；`V1_EXTRA_ID`默认新时间身份；生成extra-manifest |
| 后端 `scripts/v1-persistence-check.mjs` | before/after比较留存精确资源及执行；corruption只允许extra-manifest中的独立测试行且finally恢复。依赖HTTP/extra manifest、F3/V1留存版本；固定本验收MySQL容器，不能直接用于生产 |
| 前端 `scripts/v1-fault-proxy.mjs` | 专用本地8082→8081；外部临时日志、一次性故障注入、>60请求/10秒锁定熔断；`V1_PROXY_PORT`、`STUDIO_API_ORIGIN`、`V1_EVIDENCE_DIR`可配置 |
| 前端 `scripts/v1-seed-fault.mjs` | 用唯一V1_FAULT_FLOW创建完整独立草稿；不会覆盖已有Flow |
| 前端 `scripts/v1-order-browser.mjs` | 唯一V1_UI_FLOW；真实15/75、45→5保存刷新35、发布新旧版本隔离，生成final-ui-manifest |
| 前端 `scripts/v1-editor-browser.mjs` | final-ui-manifest中的v3；五类编辑、增删排序/条件JSON、ALL_MATCH真实执行 |
| 前端 `scripts/v1-extra-browser.mjs` | incomplete/locations/precision；依赖后端extra-manifest，precision用尚未发布的独立种子，不反复修改旧证据版本 |
| 前端 `scripts/v1-browser-acceptance.mjs` | saves→conflicts→simulations→publication严格串行；相同独立V1_FAULT_FLOW，V1_UI_FLOW为订单闭环新flow。任一模态/错误/无最终PASS立即停当前用例 |
| 前端 `scripts/v1-visual-acceptance.mjs` | 1440x900 / 1920x1080 / 640x900；V1_UI_FLOW为具有v2发布35和v3草稿的测试flow |
| 前端 `scripts/v1-prototype-capture.mjs` | 本地原型HTTP5176及指定订单路由；3尺寸4状态真实截图，不作为业务执行证据 |

浏览器使用已有Playwright CLI技能包装器，默认会话v1；包装器位置可用 `PWCLI` 覆盖。V1前端5175的STUDIO_API_ORIGIN指向专用代理8082；代理转发到真实Java8081。F3前端5174直连后端，继续保留。重新执行使用新的唯一测试身份，不覆盖F3发布版本和历史故障数据。

## 证据保留与本地提交

源码、测试、全部11个可复用V1脚本、验收/交接文档按明确路径提交。前端沿用 `.gitignore` 中“selected screenshots live in output/playwright/”的约定，精选当前截图提交，不将整个output目录加入Git。

精选截图涵盖1440编排/三个编辑器/发布确认/执行明细/只读、1920编排、640编排/评分卡、1440原型参照、两项错误定位及保存/发布响应丢失恢复；这些文件在当前V1 evidence-index中核对SHA256一致。

原始证据保持原位置且不提交：后端 `output/v1/` 的日志、请求/响应、manifest、MySQL备份和验收源码zip；前端 `output/v1/` 的全部运行/故障/负载日志及未精选的 `output/playwright/v1-*.png`。历史F3已跟踪证据不改写；外部临时代理日志也保留。报告中本机证据链接用于这次本地复核，重新clone不会自带未跟踪原始日志。

验收时base HEAD（后端ab106e4、前端cb892d4）和原始source-manifest保持为历史事实；本地提交对应同一份已验证源码补丁。最终commit及文档整理摘要由本轮交付返回；无需为相同源码重复启动浏览器或执行故障注入。

V1专用浏览器已关闭。Java/MySQL/前端/代理服务、F3和V1已发布版本保持原状。本轮没有push、合并、部署或进入M2。
