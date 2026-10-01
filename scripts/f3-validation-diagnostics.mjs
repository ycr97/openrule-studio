import assert from 'node:assert/strict'
import { parseJson, decodeTransport, stringifyJson } from '../src/api/lossless.ts'
const [flowId,version] = process.argv.slice(2)
if (!flowId || !version) throw new Error('Usage: node --experimental-strip-types scripts/f3-validation-diagnostics.mjs FLOW_ID DRAFT_VERSION')
const base = process.env.STUDIO_API_BASE ?? 'http://127.0.0.1:8081/api/v2'
const path = `/admin/flows/${encodeURIComponent(flowId)}/versions/${encodeURIComponent(version)}`
const original = decodeTransport(parseJson(await (await fetch(base+path)).text()))
const evidence=[]
for (const scenario of ['between-bin','parallel-output']) {
  const document=decodeTransport(parseJson(stringifyJson(original.document)))
  const score=document.stages.flatMap(stage=>stage.nodes).find(node=>node.nodeId==='buyer_score')
  if(scenario==='between-bin') score.config.characteristics.find(item=>item.id==='c_refund').bins.find(bin=>bin.id==='b_refund_high').condition.op='between'
  else score.config.outputKey='segment'
  const body=stringifyJson({document})
  const response=await fetch(base+path+'/validations',{method:'POST',headers:{'Content-Type':'application/json'},body})
  const payload=decodeTransport(parseJson(await response.text()))
  assert.equal(response.status,200)
  assert.equal(payload.valid,false)
  evidence.push({scenario,request:{method:'POST',url:base+path+'/validations',body:{document}},response:{status:response.status,body:payload}})
}
console.log(stringifyJson(evidence))
