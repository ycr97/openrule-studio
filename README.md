# OpenRule Studio · F1 视觉基础与 F2 编辑接入

Vue 3 + TypeScript + Vite + Vue Router + shadcn-vue + Tailwind CSS 4。F1 完成工作台视觉基础；F2 已接入服务端 Flow 列表、精确版本读取、草稿编辑、保存、校验和试运行。发布操作仍未接入，页面按钮保持禁用。高级节点配置编辑留待后续阶段。

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

本地联调时先启动 `open-rule/openrule-studio-server`。Vite 将 `/api/v2` 代理到 `http://127.0.0.1:8080`；可用 `STUDIO_API_ORIGIN` 改写目标地址。

`src/components/ui/` 中 Button、Badge、Dialog、Separator 由 shadcn-vue CLI 生成；主题和原型布局变量集中在 `src/style.css`。`src/features/editor/fixtures/` 保留 D0 订单准入定义作为视觉参考。编辑器通过 `src/api/` 访问后端，数值 JSON 保留原始十进制字面量；浏览器不执行规则。

## 浏览器视觉对照

同一 Playwright Chromium、相同 viewport 下打开了原型根目录的离线 `index.html` 和本工程的 Vite 页面。对照尺寸为 1440×900、1920×1080；另外检查了 390×844 窄屏。1920 宽度下，216px 工作台侧栏、节点库/画布/属性区分界、Stage 卡片水平位置与原型一致；颜色、字体回退、边框和圆角沿用原型变量。F1 的按钮禁用、只读字段和静态样例标识属于本阶段真实状态。

- [Vue 1440×900](output/playwright/studio-1440x900.png) / [原型 1440×900](output/playwright/prototype-1440x900.png)
- [Vue 1920×1080](output/playwright/studio-1920x1080.png) / [原型 1920×1080](output/playwright/prototype-1920x1080.png)
- [评分卡只读弹窗](output/playwright/studio-scorecard-dialog-1440x900.png) / [窄屏 390×844](output/playwright/studio-mobile-390x844.png)

浏览器控制台检查：0 errors、0 warnings。弹窗实际打开并可通过 Escape 关闭；窄屏主画布可滚动，属性面板位于下方。

## F2 当前范围与后续

- 已接入 Flow 列表与创建、版本切换、草稿 revision、未保存提醒、Stage/基础节点及条件编辑、保存、校验和保存后试运行。
- RuleSet、Scorecard、DecisionTable 当前保留完整配置供查看，专用编辑器和发布交互尚未接入。
- 上述视觉截图记录的是 F1 静态界面，不能作为 F2 功能验收截图。
