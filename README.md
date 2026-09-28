# OpenRule Studio

Vue 3 + TypeScript + Vite + Vue Router + shadcn-vue + Tailwind CSS 4. F1 provides the prototype-based workbench; F2 connects Flow editing to the real Studio v2 API. The browser sends definitions and facts to the server and does not execute rules.

## Start

Node.js 24.14+ and npm are required. Start the backend described in [`openrule-studio-server/README.md`](../open-rule/openrule-studio-server/README.md) on port 8080, then:

```sh
cd /Users/ycr/IdeaProjects/Sandbox/openrule-studio
npm ci
npm run dev
# http://127.0.0.1:5173/
```

Vite proxies `/api/v2` to `http://127.0.0.1:8080`. Set `STUDIO_API_ORIGIN=http://127.0.0.1:PORT` when starting Vite to change the proxy target. For an API mounted at a different browser path, set `VITE_API_BASE` at build time. The Studio host's MySQL configuration uses `STUDIO_JDBC_URL`, `STUDIO_DB_USER`, and `STUDIO_DB_PASSWORD` as documented in its README.

```sh
npm run test
npm run typecheck
npm run lint
npm run build
```

## F2 behavior

- Lists Flows and versions, reads exact versions, creates Flows and drafts, and opens published versions read-only. A published version can seed the next draft.
- Edits Stage order, execution mode, timeout, `when`, Operator conditions/output, and Terminal decisions. The shared condition builder supports the D0 condition AST. RuleSet, Scorecard, and DecisionTable show their complete server configuration read-only; saving a document preserves them.
- Saves with `expectedRevision`, displays validation issues with Stage/Node/field targets, and runs the saved revision through server validation and SIMULATE. The result shows actual version/revision, decision, reasons, checksum, and node statuses/failures. Editing the definition or facts marks a previous result stale.
- Preserves business JSON number lexemes during parse, edit, and transport, including integers beyond JavaScript's safe range. `null` and absent properties stay distinct. Protocol version/revision are strings.
- On save failure or 409, local input stays in place. A save response arriving after additional edits advances the server revision but does not replace those edits. Navigation away from an unsaved draft opens a discard dialog; browser unload is guarded.

The UI uses `src/api/` for transport/DTOs, `src/features/editor/state.ts` for request and edit state, and `src/features/editor/components/` for the canvas and property controls. The D0 order fixture in `src/features/editor/fixtures/` remains a visual reference; route content comes from the API. The Publish button stays disabled until F3.

## Verification and screenshots

F2 was checked against the local MySQL-backed Studio server through Vite's proxy. The small `f2_smoke` Flow completed create, edit, save, reload, validation, and SIMULATE with Operator + Terminal; the server returned `DECIDED / APPROVE` and successful node statuses. A comparison using `9007199254740992` and `9007199254740993` produced different Operator hit results. The full `order_admission` definition (6 stages, 8 nodes) was loaded and saved unchanged; Decimal-aware comparison showed document equality after refresh. A concurrent write produced `OR-REVISION-CONFLICT` while the browser kept its unsaved edit. A published version was read-only and could create the next draft. The unsaved-leave dialog's cancel and discard paths were checked in the browser.

- [F2 order admission, 1440×900](output/playwright/f2-order-admission-1440x900.png)
- F1 visual baseline: [Vue 1440×900](output/playwright/studio-1440x900.png), [prototype 1440×900](output/playwright/prototype-1440x900.png), [Vue 1920×1080](output/playwright/studio-1920x1080.png), [prototype 1920×1080](output/playwright/prototype-1920x1080.png), [mobile 390×844](output/playwright/studio-mobile-390x844.png)

The F2 screenshot is from the live API-backed order-admission page. The F1 screenshots document the original visual comparison and are not F2 behavior evidence.

## F3 continuation

Add dedicated RuleSet, Scorecard, and DecisionTable configuration editors; complete order-admission result presentation; and the publish workflow. Keep the existing lossless JSON transport and revision handling. The server capability boundary is documented in [`B2-IMPLEMENTATION.md`](../open-rule/docs/contracts/studio-m1/B2-IMPLEMENTATION.md); do not synthesize execution results in the browser.
