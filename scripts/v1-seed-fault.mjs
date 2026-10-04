import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const flowId=process.env.V1_FAULT_FLOW??`v1_fault_${Date.now()}`
assert.match(flowId,/^[a-z][a-z0-9_]{2,40}$/)
const base=process.env.STUDIO_API_BASE??'http://127.0.0.1:8081/api/v2'
async function call(path,method,body,status){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,status,await r.clone().text());return r.json()}
await call('/admin/flows','POST',{flowId,flowName:'V1 isolated fault test'},201)
const document={...JSON.parse(readFileSync('src/features/editor/fixtures/order-admission.definition.json','utf8')),flowId,version:'1'}
const resource=await call(`/admin/flows/${flowId}/versions/1`,'PUT',{expectedRevision:'1',document},200)
assert.equal(resource.validation.valid,true)
console.log(JSON.stringify({status:'PASS',flowId,version:resource.version,revision:resource.revision}))
