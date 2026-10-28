import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createContractMock} from '../dev/contractMock.mjs'
import {parseJson,decodeTransport,stringifyJson,formatJson} from '../src/api/lossless.ts'
const load=name=>decodeTransport(parseJson(readFileSync(new URL(`../dev/fixtures/${name}`,import.meta.url),'utf8')))
const post=(mock,path,body,method='POST')=>mock.handle(path,method,stringifyJson(body))
test('Mock lists use server query pagination, literal filtering and source',async()=>{
 const mock=createContractMock();const first=await mock.handle('/api/v2/admin/facts?page=1&pageSize=5');const second=await mock.handle('/api/v2/admin/facts?page=2&pageSize=5');assert.equal(first.body.items.length,5);assert.equal(second.body.items.length,1);assert.equal(first.body.total,6)
 const source=await mock.handle('/api/v2/admin/facts?source=PROVIDER&page=1&pageSize=20');assert.equal(source.body.total,3);assert.equal(source.body.items.every(item=>!!item.document.binding),true)
 const literal=await mock.handle('/api/v2/admin/facts?q=%25');assert.equal(literal.body.total,0)
})
test('unknown inputs do not evaluate rules or fall back to a normal response',async()=>{
 const mock=createContractMock();const request=load('scenarios.json')[0].request;request.facts.order.amount=parseJson('999999');const response=await post(mock,'/api/v2/admin/flows/order_admission/versions/1/fact-simulations',request);assert.equal(response.status,501);assert.equal(response.body.code,'OR-MOCK-NO-FIXTURE')
})
test('explicit fixed scenarios return expected normal, partial, timeout and technical failure',async()=>{
 for(const scenario of load('scenarios.json')) {const mock=createContractMock();mock.reset(scenario.id);const response=await post(mock,'/api/v2/admin/flows/order_admission/versions/1/fact-simulations',scenario.request);assert.equal(response.status,Number(scenario.httpStatus.text),scenario.id);const expected=load(scenario.response);if(expected.execution){expected.execution.requestId=scenario.request.requestId;expected.execution.bizId=scenario.request.bizId}if(Object.hasOwn(expected,'requestId'))expected.requestId=scenario.request.requestId;assert.equal(stringifyJson(response.body),stringifyJson(expected),scenario.id)}
})
test('saved revision CAS and response loss keep the persisted configuration queryable',async()=>{
 const mock=createContractMock();const provider=(await mock.handle('/api/v2/admin/fact-providers/risk_profile')).body;provider.document.name='Updated'
 await post(mock,'/__studio_mock',{writeFault:'lost'});const response=await post(mock,'/api/v2/admin/fact-providers/risk_profile',{expectedRevision:'1',document:provider.document},'PUT');assert.equal(response.status,502)
 const persisted=(await mock.handle('/api/v2/admin/fact-providers/risk_profile')).body;assert.equal(persisted.revision,'2');assert.equal(persisted.document.name,'Updated')
 assert.equal((await post(mock,'/api/v2/admin/fact-providers/risk_profile',{expectedRevision:'1',document:provider.document},'PUT')).status,409)
})
test('mock-tests checks saved revision and exact fixture, not browser mapping evaluation',async()=>{
 const mock=createContractMock();const request=load('provider-mock-test.request.json');assert.equal((await post(mock,'/api/v2/admin/fact-providers/risk_profile/mock-tests',request)).status,200);request.expectedRevision='2';assert.equal((await post(mock,'/api/v2/admin/fact-providers/risk_profile/mock-tests',request)).status,409)
})
test('M1 default path rejects factMode and M2 endpoints never fall back to M1',async()=>{
 const mock=createContractMock();const request=load('m1-complete.request.json');assert.equal((await post(mock,'/api/v2/admin/flows/order_admission/versions/1/simulations',request)).status,200);request.factMode='HTTP';assert.equal((await post(mock,'/api/v2/admin/flows/order_admission/versions/1/simulations',request)).status,501)
})
test('precision values survive Provider editing/formatting/transport with null intact',()=>{
 const provider=load('precision.provider.json');const response=provider.mock.response;assert.match(formatJson(response),/9007199254740995/);assert.match(formatJson(response),/0\.123456789012345678901234567890123456789/)
 const roundTrip=parseJson(formatJson(provider));assert.equal(stringifyJson(roundTrip),stringifyJson(provider));assert.equal(roundTrip.secretRef,null)
})
