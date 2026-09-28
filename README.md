# OpenRule Studio · F1 视觉基础

Vue 3 + TypeScript + Vite + Vue Router + shadcn-vue + Tailwind CSS 4。当前只展示 D0 订单准入定义的静态视觉样例；节点选择、Stage 选择、画布缩放和只读配置弹窗可用。保存、发布、试运行、其它导航入口均没有业务调用或成功反馈。

## 启动与检查

需要 Node.js 24.14+ 和 npm。依赖版本固定在 `package.json` 与 `package-lock.json`。

```sh
npm ci
npm run dev
# http://127.0.0.1:5173/

npm run typecheck
npm run lint
npm run build
```

`src/components/ui/` 中 Button、Badge、Dialog、Separator 由 shadcn-vue CLI 生成；主题和原型布局变量集中在 `src/style.css`。页面入口是 `src/features/editor/FlowEditorPage.vue`，静态定义副本来自 `open-rule/docs/contracts/studio-m1/fixtures/valid/order-admission.definition.json`。F2 接入后端时用 Schema/OpenAPI DTO 替换 `src/features/editor/sample.ts` 的只读展示适配；勿复用浏览器规则解释器。

## 浏览器视觉对照

同一 Playwright Chromium、相同 viewport 下打开了原型根目录的离线 `index.html` 和本工程的 Vite 页面。对照尺寸为 1440×900、1920×1080；另外检查了 390×844 窄屏。1920 宽度下，216px 工作台侧栏、节点库/画布/属性区分界、Stage 卡片水平位置与原型一致；颜色、字体回退、边框和圆角沿用原型变量。F1 的按钮禁用、只读字段和静态样例标识属于本阶段真实状态。

- [Vue 1440×900](output/playwright/studio-1440x900.png) / [原型 1440×900](output/playwright/prototype-1440x900.png)
- [Vue 1920×1080](output/playwright/studio-1920x1080.png) / [原型 1920×1080](output/playwright/prototype-1920x1080.png)
- [评分卡只读弹窗](output/playwright/studio-scorecard-dialog-1440x900.png) / [窄屏 390×844](output/playwright/studio-mobile-390x844.png)

浏览器控制台检查：0 errors、0 warnings。弹窗实际打开并可通过 Escape 关闭；窄屏主画布可滚动，属性面板位于下方。

## F2 接续

1. 按 D0 OpenAPI/Schema 建立 `src/api/` 的无损十进制 JSON 适配、DTO 与错误映射；不要把原型 model 当网络协议。
2. 将 `FlowEditorPage` 的静态定义替换为精确版本读取、草稿 revision 与未保存状态；保存、校验、试运行和发布按钮只在真实服务端路径可用后启用。
3. 将 NodePalette、InspectorPanel 和 NodeConfigDialog 的只读展示扩展为 Stage/条件/五类节点编辑，同时保留现有布局和颜色变量。
4. 以 D0 的 OA/ST fixture 驱动前端 Mock/联调，避免增加第二套浏览器规则执行器。
