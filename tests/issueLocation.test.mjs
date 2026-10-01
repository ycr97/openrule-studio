import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { locateIssue } from '../src/features/editor/issueLocation.ts'
const document = JSON.parse(readFileSync(new URL('../src/features/editor/fixtures/order-admission.definition.json', import.meta.url),'utf8'))
const issue = (pointer, message, stageId=null, nodeId=null, itemId=null) => ({ pointer,message,stageId,nodeId,itemId,code:'OR-DEF-VALIDATION',severity:'ERROR' })
test('schema pointer locates a concrete score bin and field', () => {
  assert.deepEqual(locateIssue(document,issue('/stages/2/nodes/0/config/characteristics/1/bins/0/score','invalid')), {stageId:'s_score',nodeId:'buyer_score',itemId:'b_refund_high',field:'score'})
})
test('node-level invalid between report locates the matching bin', () => {
  document.stages[2].nodes[0].config.characteristics[1].bins[0].condition.op='between'
  assert.deepEqual(locateIssue(document,issue('/stages/2/nodes/0','buyer_score: Invalid between bounds','s_score','buyer_score')), {stageId:'s_score',nodeId:'buyer_score',itemId:'b_refund_high',field:'value'})
})
