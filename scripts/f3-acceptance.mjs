import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const [flowId, originalVersion, variantVersion] = process.argv.slice(2)
if (!flowId || !originalVersion || !variantVersion) throw new Error('Usage: node scripts/f3-acceptance.mjs FLOW_ID ORIGINAL_VERSION VARIANT_VERSION')
const base = process.env.STUDIO_API_BASE ?? 'http://127.0.0.1:8081/api/v2'
const cases = JSON.parse(readFileSync(new URL('../src/features/editor/fixtures/order-admission.cases.json', import.meta.url), 'utf8'))
const getCase = id => cases.find(item => item.id === id)
const published = new Map()
async function json(path, body) {
  const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const payload = await response.json()
  return { status: response.status, payload }
}
async function execute(version, id) {
  const sample = getCase(id)
  const { status, payload } = await json(`/flows/${encodeURIComponent(flowId)}/versions/${encodeURIComponent(version)}/executions`, { requestId: crypto.randomUUID(), bizId: `f3-${id.toLowerCase()}-${Date.now()}`, facts: sample.facts, timeoutMillis: 3000 })
  const execution = payload.execution ?? payload
  assert.equal(execution.version, version, `${id}: exact version`)
  assert.equal(execution.revision, published.get(version).revision, `${id}: revision`)
  assert.equal(execution.definitionChecksum, published.get(version).definitionChecksum, `${id}: checksum`)
  assert.equal(status, sample.expected.status === 'FAILED' ? 500 : 200, `${id}: HTTP status`)
  assert.equal(execution.status, sample.expected.status, `${id}: status (HTTP ${status})`)
  assert.equal(execution.decision?.decisionCode ?? null, sample.expected.decisionCode, `${id}: decision`)
  if (sample.expected.score !== undefined) assert.equal(execution.decision?.score ?? null, sample.expected.score, `${id}: score`)
  if (sample.expected.segment !== undefined) assert.equal(execution.variables.segment ?? null, sample.expected.segment, `${id}: segment`)
  if (sample.expected.reasonCodes) assert.deepEqual(execution.decision?.reasonCodes ?? [], sample.expected.reasonCodes, `${id}: reasons`)
  if (sample.expected.terminalNodeId !== undefined) assert.equal(execution.decision?.terminalNodeId ?? null, sample.expected.terminalNodeId, `${id}: terminal`)
  for (const [nodeId, expected] of Object.entries(sample.expected.nodeStatus ?? {})) assert.equal(execution.nodeResults.find(node => node.nodeId === nodeId)?.status, expected, `${id}: ${nodeId} status`)
  if (id === 'OA-07' || id === 'OA-08') assert.equal(status, 200, `${id}: CONTINUE must remain HTTP 200 / DECIDED`)
  console.log(`${id} v${version}: HTTP ${status} ${execution.status} ${execution.decision?.decisionCode ?? 'none'} / ${execution.decision?.score ?? 'null'} terminal=${execution.decision?.terminalNodeId ?? 'none'} checksum=${execution.definitionChecksum}`)
  return execution
}
for (const version of [originalVersion, variantVersion]) {
  const { status, payload } = await json(`/admin/flows/${encodeURIComponent(flowId)}/versions/${encodeURIComponent(version)}`)
  assert.equal(status, 200)
  assert.equal(payload.status, 'PUBLISHED')
  published.set(version,payload)
  console.log(`published v${version}: revision=${payload.revision} checksum=${payload.definitionChecksum}`)
}
const scoreBin = resource => resource.document.stages.flatMap(stage => stage.nodes).find(node => node.nodeId === 'buyer_score').config.characteristics.find(item => item.id === 'c_refund').bins.find(bin => bin.id === 'b_refund_high')
assert.equal(scoreBin(published.get(originalVersion)).score,45)
assert.equal(scoreBin(published.get(variantVersion)).score,5)
await execute(originalVersion,'OA-01')
await execute(originalVersion,'OA-02')
const variantResponse = await json(`/flows/${encodeURIComponent(flowId)}/versions/${encodeURIComponent(variantVersion)}/executions`, { requestId: crypto.randomUUID(), bizId: `f3-oa03-${Date.now()}`, facts: getCase('OA-02').facts, timeoutMillis: 3000 })
assert.equal(variantResponse.status,200)
assert.equal(variantResponse.payload.version,variantVersion)
assert.equal(variantResponse.payload.status,'DECIDED')
assert.equal(variantResponse.payload.revision,published.get(variantVersion).revision)
assert.equal(variantResponse.payload.definitionChecksum,published.get(variantVersion).definitionChecksum)
assert.equal(variantResponse.payload.variables.segment,'MEDIUM')
assert.equal(variantResponse.payload.decision.terminalNodeId,'approve')
assert.equal(variantResponse.payload.decision.decisionCode,'APPROVE')
assert.equal(variantResponse.payload.decision.score,'35')
console.log(`OA-03 v${variantVersion}: HTTP 200 DECIDED APPROVE / 35 terminal=${variantResponse.payload.decision.terminalNodeId} checksum=${variantResponse.payload.definitionChecksum}`)
for (const id of ['OA-07','OA-08','OA-09']) await execute(originalVersion,id)
