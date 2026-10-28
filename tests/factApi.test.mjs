import test from 'node:test'
import assert from 'node:assert/strict'
import {factApi,contractMockEnabled} from '../src/api/facts.ts'
import {ApiError} from '../src/api/client.ts'
import {decodeTransport,parseJson,stringifyJson} from '../src/api/lossless.ts'
test('real adapter uses all 12 contract paths and exact CAS payloads',async()=>{
 const original=globalThis.fetch,calls=[]
 globalThis.fetch=async(path,options)=>{calls.push({path,options});return new Response('{"revision":"9223372036854775807","document":{}}',{status:200})}
 try {
  const document={providerId:'test_provider',requestMap:{threshold:{source:'CONSTANT',value:parseJson('9007199254740995')}},mock:{outcome:'RESPONSE',response:parseJson('{"value":0.123456789012345678901234567890123456789}')}}
  await factApi.listFacts({q:'a%_',source:'PROVIDER',page:2,pageSize:5});await factApi.getFact('a/b');await factApi.createFact({factId:'test_fact'});await factApi.updateFact('test_fact','9223372036854775807',{factId:'test_fact'})
  await factApi.listProviders({page:2,pageSize:20});await factApi.getProvider('test_provider');await factApi.createProvider(document);await factApi.updateProvider('test_provider','2',document)
  await factApi.testProviderMock('test_provider',{expectedRevision:'2',requestId:'mock',facts:{},timeoutMillis:3000})
  await factApi.requiredFacts('flow/one','1');await factApi.simulate('flow','1',{expectedRevision:'4',requestId:'r',bizId:'b',facts:{},timeoutMillis:3000,factMode:'MOCK'});await factApi.executeVersion('flow','1',{requestId:'r',bizId:'b',facts:{},timeoutMillis:3000,factMode:'HTTP'})
  assert.equal(calls.length,12);assert.equal(calls[0].path,'/api/v2/admin/facts?q=a%25_&source=PROVIDER&page=2&pageSize=5');assert.equal(calls[1].path,'/api/v2/admin/facts/a%2Fb');assert.equal(calls[9].path,'/api/v2/admin/flows/flow%2Fone/versions/1/required-facts');assert.match(calls[10].path,/fact-simulations$/);assert.match(calls[11].path,/fact-executions$/)
  assert.equal(parseJson(calls[3].options.body).expectedRevision,'9223372036854775807');assert.match(calls[7].options.body,/9007199254740995/);assert.match(calls[7].options.body,/0\.123456789012345678901234567890123456789/)
 } finally {globalThis.fetch=original}
})
test('real failures never fall back to Mock and preserve M2 error reports',async()=>{
 const original=globalThis.fetch;let calls=0
 const body={code:'OR-EXECUTION-TIMEOUT',message:'deadline',requestId:'r',traceId:'t',issues:[],execution:null,factResolution:{status:'FAILED',mode:'HTTP',elapsedMillis:20,fields:[],calls:[]},totalElapsedMillis:21}
 globalThis.fetch=async()=>{calls++;return new Response(stringifyJson(body),{status:504})}
 try {await assert.rejects(factApi.simulate('flow','1',{}),error=>error instanceof ApiError && error.body.factResolution.status==='FAILED' && error.body.totalElapsedMillis===21);assert.equal(calls,1);assert.equal(contractMockEnabled,false)}finally{globalThis.fetch=original}
})
test('protocol timeouts convert safely while nested mock and mapping values remain lexical',()=>{
 const value=decodeTransport(parseJson('{"connectTimeoutMillis":100,"readTimeoutMillis":300,"totalElapsedMillis":21,"mock":{"outcome":"RESPONSE","response":{"totalElapsedMillis":9007199254740995}},"requestMap":{"elapsedMillis":{"source":"CONSTANT","value":0.123456789012345678901234567890123456789}}}'))
 assert.equal(value.connectTimeoutMillis,100);assert.equal(value.totalElapsedMillis,21);assert.equal(value.mock.response.totalElapsedMillis.text,'9007199254740995');assert.equal(value.requestMap.elapsedMillis.value.text,'0.123456789012345678901234567890123456789')
})
