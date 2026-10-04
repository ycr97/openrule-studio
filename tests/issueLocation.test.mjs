import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { locateIssue } from '../src/features/editor/issueLocation.ts'
const document = JSON.parse(readFileSync(new URL('../src/features/editor/fixtures/order-admission.definition.json', import.meta.url),'utf8'))
const issue = (pointer, message, stageId=null, nodeId=null, itemId=null) => ({ pointer,message,stageId,nodeId,itemId,code:'OR-DEF-VALIDATION',severity:'ERROR' })
test('schema pointer locates a concrete score bin and field', () => {
  assert.deepEqual(locateIssue(document,issue('/stages/2/nodes/0/config/characteristics/1/bins/0/score','invalid')), {stageId:'s_score',nodeId:'buyer_score',itemId:'b_refund_high',field:'score'})
})
test('stable IDs and explicit pointer locate the bin after reordering without message parsing', () => {
  const reordered = structuredClone(document)
  reordered.stages.reverse()
  const scoreStage = reordered.stages.find(s => s.stageId === 's_score')
  scoreStage.nodes.reverse()
  const score = scoreStage.nodes.find(n => n.nodeId === 'buyer_score')
  score.config.characteristics.reverse()
  score.config.characteristics[0].bins.reverse()
  assert.deepEqual(locateIssue(reordered,issue('/stages/2/nodes/0/config/characteristics/1/bins/0/condition/value','arbitrary text','s_score','buyer_score','b_refund_high')), {stageId:'s_score',nodeId:'buyer_score',itemId:'b_refund_high',field:'value'})
})
test('parallel output conflict opens the actual participant output field', () => {
  assert.deepEqual(locateIssue(document,issue('/stages/2/nodes/1/config/outputKey','arbitrary text','s_score','order_segment')), {stageId:'s_score',nodeId:'order_segment',itemId:null,field:'outputKey'})
})
