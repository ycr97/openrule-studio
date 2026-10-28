import test from 'node:test'
import assert from 'node:assert/strict'
import { createConfigEditor } from '../src/features/facts/configState.ts'
import { createEditorState } from '../src/features/editor/state.ts'
import { configurationSerial } from '../src/api/facts.ts'
import { ApiError } from '../src/api/client.ts'
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
const doc=()=>({factId:'refund_rate',name:'退款率',path:'/metrics/refundRate',type:'number',sensitive:false,description:'',binding:null})
const resource=(revision='1',name='退款率')=>({revision,document:{...doc(),name},updatedAt:'2026-10-07T00:00:00Z'})
const apiError=status=>new ApiError(status,{code:status===409?'OR-REVISION-CONFLICT':'OR-FACT-STORE',message:'failure',issues:[],execution:null,factResolution:null,totalElapsedMillis:0})
const setup=api=>createConfigEditor(api,value=>value.factId)
test('CAS preserves configuration input and revision',async()=>{
 const state=setup({get:async()=>resource(),update:async()=>{throw apiError(409)}})
 await state.load('refund_rate');state.document.value.name='本地修改'
 assert.equal(await state.save(),false);assert.equal(state.document.value.name,'本地修改');assert.equal(state.resource.value.revision,'1');assert.match(state.message.value,/OR-REVISION-CONFLICT/)
})
test('late configuration save advances revision and preserves subsequent edits',async()=>{
 const pending=deferred();const state=setup({get:async()=>resource(),update:()=>pending.promise})
 await state.load('refund_rate');state.document.value.name='A';const action=state.save();state.document.value.name='B';pending.resolve(resource('2','A'))
 assert.equal(await action,true);assert.equal(state.resource.value.revision,'2');assert.equal(state.document.value.name,'B');assert.equal(state.dirty.value,true)
})
test('unknown create outcome queries stable ID and never repeats POST',async()=>{
 let saved=false,writes=0;const state=setup({get:async()=>{if(!saved)throw apiError(503);return resource()},create:async()=>{writes++;saved=true;throw new Error('response lost')}})
 state.begin(doc());assert.equal(await state.save(),true);assert.equal(writes,1);assert.equal(state.resource.value.revision,'1')
})
test('unavailable status blocks further writes and preserves local input',async()=>{
 let writes=0,reads=0;const state=setup({get:async()=>{reads++;if(reads>1)throw apiError(503);return resource()},update:async()=>{writes++;throw new Error('lost')}})
 await state.load('refund_rate');state.document.value.name='My edit';assert.equal(await state.save(),false);assert.equal(await state.save(),false);assert.equal(writes,1);assert.equal(state.document.value.name,'My edit');assert.equal(state.uncertain.value,true)
})
test('late read and late save cannot overwrite a newly selected configuration',async()=>{
 const pending=deferred();const state=setup({get:async id=>resource('1',id),update:()=>pending.promise})
 await state.load('refund_rate');state.document.value.name='A';const action=state.save();state.begin({...doc(),factId:'another_fact',name:'New'});pending.resolve(resource('2','A'));assert.equal(await action,false);assert.equal(state.document.value.factId,'another_fact')
})
const flow=()=>({flowId:'order_admission',flowName:'Order',version:'1',status:'DRAFT',revision:'1',document:{schemaVersion:2,flowId:'order_admission',flowName:'Order',version:'1',description:'',stages:[]},validation:{valid:true,issues:[]}})
const execution={flowId:'order_admission',version:'1',revision:'1',traceId:'trace',status:'DECIDED',decision:null,nodeResults:[],stageResults:[]}
const report={mode:'HTTP',status:'PARTIAL',elapsedMillis:1,fields:[],calls:[]}
const m1={validate:async()=>({valid:true,issues:[]}),simulate:async()=>execution}
test('default INPUT uses only the M1 simulation endpoint',async()=>{
 let m2Calls=0;const state=createEditorState(m1,{simulate:async()=>{m2Calls++;throw new Error('must not call')}});state.install(flow());await state.saveAndSimulate();assert.equal(state.factMode.value,'INPUT');assert.equal(m2Calls,0);assert.equal(state.resolution.value,null)
})
test('M2 failure before Core clears old execution and retains report',async()=>{
 const state=createEditorState(m1,{simulate:async()=>{throw new ApiError(504,{code:'OR-EXECUTION-TIMEOUT',message:'deadline',issues:[],execution:null,factResolution:{...report,status:'FAILED'},totalElapsedMillis:20,traceId:'before-core'})}})
 state.install(flow());await state.saveAndSimulate();state.factMode.value='HTTP';await state.saveAndSimulate();assert.equal(state.result.value,null);assert.equal(state.resolution.value.status,'FAILED');assert.equal(state.traceId.value,'before-core');assert.equal(state.staleResult.value,false)
})
test('M2 exact request and result are stale after mode, facts or local configuration changes',async()=>{
 const pending=deferred();let payload;const state=createEditorState(m1,{simulate:(_id,_version,body)=>{payload=body;return pending.promise}})
 state.install(flow());state.factMode.value='HTTP';state.factsText.value='{"x":null,"huge":9007199254740995}';const action=state.saveAndSimulate();await Promise.resolve();state.factMode.value='MOCK';pending.resolve({execution,factResolution:report,totalElapsedMillis:5});await action
 assert.equal(payload.factMode,'HTTP');assert.equal(payload.expectedRevision,'1');assert.equal(payload.facts.huge.text,'9007199254740995');assert.equal(state.staleResult.value,true)
 state.factMode.value='HTTP';assert.equal(state.staleResult.value,false);configurationSerial.value++;assert.equal(state.staleResult.value,true)
})
test('M2 error with FAILED Core execution keeps node failures',async()=>{
 const state=createEditorState(m1,{simulate:async()=>{throw new ApiError(500,{code:'OR-NODE-FAILED',message:'type',issues:[],execution:{...execution,status:'FAILED'},factResolution:report,totalElapsedMillis:10})}})
 state.install(flow());state.factMode.value='MOCK';await state.saveAndSimulate();assert.equal(state.result.value.status,'FAILED');assert.equal(state.resolution.value.status,'PARTIAL')
})
test('numeric root cannot masquerade as facts object',async()=>{
 const state=createEditorState(m1);state.install(flow());state.factsText.value='680';await state.saveAndSimulate();assert.match(state.message.value,/JSON 对象/);assert.equal(state.result.value,null)
})

test('returning to INPUT resets the displayed budget to the M1 request budget',()=>{
 const state=createEditorState(m1)
 state.factMode.value='HTTP';state.timeoutMillis.value=20;state.factMode.value='INPUT'
 assert.equal(state.timeoutMillis.value,3000)
})

test('querying an unknown save outcome never silently resubmits the write',async()=>{
 let available=false,firstRead=true,writes=0
 const state=setup({get:async()=>{if(firstRead){firstRead=false;return resource()}if(!available)throw apiError(503);return resource()},update:async()=>{writes++;if(writes===1)throw new Error('response lost');return resource('2','Pending')}})
 await state.load('refund_rate');state.document.value.name='Pending'
 assert.equal(await state.save(),false);assert.equal(writes,1)
 available=true
 assert.equal(await state.save(),false);assert.equal(writes,1);assert.equal(state.uncertain.value,false)
 assert.match(state.message.value,/再次点击保存/)
 assert.equal(await state.save(),true);assert.equal(writes,2)
})
