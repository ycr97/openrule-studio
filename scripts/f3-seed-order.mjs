import { readFileSync } from 'node:fs'
const flowId = process.argv[2]
if (!flowId || !/^[a-z][a-z0-9_-]{2,63}$/.test(flowId)) throw new Error('Usage: node scripts/f3-seed-order.mjs FLOW_ID')
const base = process.env.STUDIO_API_BASE ?? 'http://127.0.0.1:8081/api/v2'
const flowName = `订单准入 ${flowId}`
const created = await fetch(`${base}/admin/flows`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({flowId,flowName})})
if (!created.ok) throw new Error(`create ${created.status}: ${await created.text()}`)
const resource = await created.json()
let definition = readFileSync(new URL('../src/features/editor/fixtures/order-admission.definition.json', import.meta.url),'utf8')
definition = definition.replace('"flowId": "order_admission"',`"flowId": "${flowId}"`).replace('"flowName": "订单准入决策"',`"flowName": "${flowName}"`)
definition = definition.replace('"version": "1"', `"version": "${resource.version}"`)
const saved = await fetch(`${base}/admin/flows/${flowId}/versions/${resource.version}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:`{"expectedRevision":"${resource.revision}","document":${definition}}`})
if (!saved.ok) throw new Error(`save ${saved.status}: ${await saved.text()}`)
const draft = await saved.json()
console.log(`${flowId} v${draft.version} revision=${draft.revision} valid=${draft.validation.valid}`)
