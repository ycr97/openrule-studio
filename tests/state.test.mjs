import test from 'node:test'
import assert from 'node:assert/strict'
import { createEditorState } from '../src/features/editor/state.ts'
import { ApiError } from '../src/api/client.ts'
const resource = (revision = '1', flowName = 'Flow') => ({ flowId:'test_flow', flowName, version:'1', status:'DRAFT', revision, definitionChecksum:null, document:{ schemaVersion:2, flowId:'test_flow', flowName, version:'1', description:'', stages:[] }, validation:{valid:false,issues:[]}, changeNote:null, updatedAt:'2026-09-28T00:00:00Z' })
const deferred = () => { let resolve; const promise = new Promise(r => resolve=r); return { promise, resolve } }

test('late save response advances revision without replacing newer edits', async () => {
  const pending = deferred()
  const api = { saveDraft: () => pending.promise }
  const state = createEditorState(api)
  state.install(resource())
  state.mutate(doc => { doc.flowName = 'A' })
  const save = state.save()
  state.mutate(doc => { doc.flowName = 'B' })
  pending.resolve(resource('2','A'))
  assert.equal(await save, true)
  assert.equal(state.resource.value.revision, '2')
  assert.equal(state.document.value.flowName, 'B')
  assert.equal(state.dirty.value, true)
})
test('save failure and revision conflict preserve local input', async () => {
  const body = {code:'OR-REVISION-CONFLICT',message:'conflict',requestId:null,traceId:null,issues:[],execution:null}
  const state = createEditorState({saveDraft:async () => {throw new ApiError(409,body)}})
  state.install(resource())
  state.mutate(doc => {doc.flowName='My edit'})
  assert.equal(await state.save(), false)
  assert.equal(state.document.value.flowName,'My edit')
  assert.equal(state.resource.value.revision,'1')
  assert.match(state.message.value,/OR-REVISION-CONFLICT/)
})
test('result becomes stale after facts or rule edits', async () => {
  const execution = {revision:'1',status:'DECIDED',decision:null,nodeResults:[],stageResults:[]}
  const api = {validate:async () => ({valid:true,issues:[]}),simulate:async () => execution}
  const state = createEditorState(api)
  state.install(resource())
  await state.saveAndSimulate()
  assert.equal(state.staleResult.value,false)
  state.factsText.value = '{"x":null}'
  assert.equal(state.staleResult.value,true)
  state.factsText.value = '{"x":1}'
  await state.saveAndSimulate()
  assert.equal(state.staleResult.value,false)
  state.mutate(doc => {doc.flowName='Changed'})
  assert.equal(state.staleResult.value,true)
})

test('save-and-simulate stops if edits continue during save', async () => {
  const pending = deferred()
  let runs = 0
  const state = createEditorState({saveDraft: () => pending.promise, validate:async () => ({valid:true,issues:[]}), simulate:async () => {runs++; return {revision:'2'}}})
  state.install(resource())
  state.mutate(doc => {doc.flowName='First'})
  const action = state.saveAndSimulate()
  state.mutate(doc => {doc.flowName='Second'})
  pending.resolve(resource('2','First'))
  await action
  assert.equal(runs,0)
  assert.equal(state.document.value.flowName,'Second')
  assert.match(state.message.value,/再次保存/)
})

test('late version response cannot replace a newer exact-version read', async () => {
  const old = deferred()
  const state = createEditorState({getVersion: (_id, version) => version === '1' ? old.promise : Promise.resolve({...resource('1','New'), version:'2'})})
  const first = state.load('test_flow','1')
  await state.load('test_flow','2')
  old.resolve(resource('1','Old'))
  await first
  assert.equal(state.resource.value.version,'2')
  assert.equal(state.document.value.flowName,'New')
})

test('publish requires saved content and uses current revision', async () => {
  let calls = 0
  const state = createEditorState({publish:async (_id,_version,revision,note) => {calls++; assert.equal(revision,'2'); assert.equal(note,'reviewed'); return {...resource('3'),status:'PUBLISHED'}}})
  state.install(resource('2'))
  state.mutate(doc => {doc.flowName='Local edit'})
  assert.equal(await state.publish('reviewed'),false)
  assert.equal(calls,0)
  state.install(resource('2'))
  assert.equal(await state.publish('reviewed'),true)
  assert.equal(state.readOnly.value,true)
  assert.equal(calls,1)
})

test('lost publish response checks exact resource before deciding outcome', async () => {
  let reads = 0
  const state = createEditorState({publish:async () => {throw new Error('network lost')},getVersion:async () => {reads++; return {...resource('3'),status:'PUBLISHED'}}})
  state.install(resource('2'))
  assert.equal(await state.publish('reviewed'),true)
  assert.equal(reads,1)
  assert.equal(state.readOnly.value,true)
  assert.match(state.message.value,/已确认服务端发布成功/)
})

test('publish revision conflict retains the draft and does not retry', async () => {
  let calls = 0
  const body = {code:'OR-REVISION-CONFLICT',message:'conflict',requestId:null,traceId:null,issues:[],execution:null}
  const state = createEditorState({publish:async () => {calls++; throw new ApiError(409,body)}})
  state.install(resource('2'))
  assert.equal(await state.publish('reviewed'),false)
  assert.equal(calls,1)
  assert.equal(state.resource.value.revision,'2')
  assert.equal(state.readOnly.value,false)
  assert.match(state.message.value,/OR-REVISION-CONFLICT/)
})

test('facts changed during validation remain stale and duplicate simulation is blocked', async () => {
  const pending = deferred()
  let calls = 0
  const state = createEditorState({validate:() => pending.promise,simulate:async (_id,_version,_revision,facts) => {calls++; assert.equal(facts.old,true); return {revision:'1',status:'DECIDED',nodeResults:[],stageResults:[]}}})
  state.install(resource())
  state.factsText.value = '{"old":true}'
  const run = state.saveAndSimulate()
  assert.equal(state.simulating.value,true)
  state.factsText.value = '{"new":true}'
  await state.saveAndSimulate()
  pending.resolve({valid:true,issues:[]})
  await run
  assert.equal(calls,1)
  assert.equal(state.staleResult.value,true)
})

test('save response after navigation cannot replace the new version', async () => {
  const pending = deferred()
  const state = createEditorState({saveDraft:() => pending.promise,getVersion:async () => ({...resource('1','Next'),version:'2'})})
  state.install(resource())
  state.mutate(doc => {doc.flowName='Saved'})
  const save = state.save()
  await state.load('test_flow','2')
  pending.resolve(resource('2','Saved'))
  assert.equal(await save,false)
  assert.equal(state.resource.value.version,'2')
  assert.equal(state.document.value.flowName,'Next')
})

test('unknown publish outcome never retries while exact status is unavailable', async () => {
  let writes = 0
  const state = createEditorState({publish:async () => {writes++; throw new Error('response lost')},getVersion:async () => {throw new Error('status unavailable')}})
  state.install(resource())
  assert.equal(await state.publish('reviewed'),false)
  assert.equal(await state.publish('reviewed'),false)
  assert.equal(writes,1)
  assert.equal(state.document.value.flowName,'Flow')
})

test('technical failure displays server execution instead of losing it', async () => {
  const execution = {revision:'1',status:'FAILED',decision:null,nodeResults:[],stageResults:[]}
  const body = {code:'OR-EXECUTION-FAILED',message:'type error',issues:[],execution}
  const state = createEditorState({validate:async () => ({valid:true,issues:[]}),simulate:async () => {throw new ApiError(500,body)}})
  state.install(resource())
  await state.saveAndSimulate()
  assert.equal(state.result.value.status,'FAILED')
  assert.equal(state.staleResult.value,false)
})

test('gateway error also checks publication status before retrying', async () => {
  let writes=0
  const state=createEditorState({publish:async () => {writes++; throw new ApiError(502,{code:'GATEWAY',message:'response lost',issues:[]})},getVersion:async () => ({...resource('2'),status:'PUBLISHED'})})
  state.install(resource())
  assert.equal(await state.publish('reviewed'),true)
  assert.equal(writes,1)
  assert.equal(state.readOnly.value,true)
})

test('recovery of a different published document preserves local content', async () => {
  const state=createEditorState({publish:async () => {throw new Error('response lost')},getVersion:async () => ({...resource('3','Other writer'),status:'PUBLISHED'})})
  state.install(resource('2','Reviewed content'))
  assert.equal(await state.publish('reviewed'),false)
  assert.equal(state.document.value.flowName,'Reviewed content')
  assert.match(state.message.value,/不同内容/)
})

test('publish response after navigation cannot install an old version', async () => {
  const pending=deferred()
  const state=createEditorState({publish:() => pending.promise,getVersion:async () => ({...resource('1','Next'),version:'2'})})
  state.install(resource())
  const publish=state.publish('reviewed')
  await state.load('test_flow','2')
  pending.resolve({...resource('2'),status:'PUBLISHED'})
  assert.equal(await publish,false)
  assert.equal(state.resource.value.version,'2')
  assert.equal(state.document.value.flowName,'Next')
})

test('lost save response queries exact state and confirms persisted content', async () => {
  let writes=0,reads=0
  const state=createEditorState({saveDraft:async()=>{writes++;throw new Error('lost')},getVersion:async()=>{reads++;return resource('2','Saved')}})
  state.install(resource())
  state.mutate(doc=>{doc.flowName='Saved'})
  assert.equal(await state.save(),true)
  assert.equal(writes,1);assert.equal(reads,1)
  assert.equal(state.resource.value.revision,'2');assert.equal(state.dirty.value,false)
})
test('unknown save outcome blocks repeated writes while exact status is unavailable', async()=>{
  let writes=0,reads=0
  const state=createEditorState({saveDraft:async()=>{writes++;throw new Error('lost')},getVersion:async()=>{reads++;throw new Error('offline')}})
  state.install(resource());state.mutate(doc=>{doc.flowName='Saved'})
  assert.equal(await state.save(),false);assert.equal(await state.save(),false)
  assert.equal(writes,1);assert.equal(reads,2);assert.equal(state.document.value.flowName,'Saved')
})
test('save recovery advances revision without overwriting edits made during status lookup',async()=>{
  const pending=deferred()
  const state=createEditorState({saveDraft:async()=>{throw new Error('lost')},getVersion:()=>pending.promise})
  state.install(resource());state.mutate(doc=>{doc.flowName='Saved'})
  const save=state.save();await new Promise(resolve=>setImmediate(resolve))
  state.mutate(doc=>{doc.flowName='Newer'})
  pending.resolve(resource('2','Saved'))
  assert.equal(await save,true);assert.equal(state.resource.value.revision,'2')
  assert.equal(state.document.value.flowName,'Newer');assert.equal(state.dirty.value,true)
})
test('save recovery of different server content retains edits and blocks retries',async()=>{
  let writes=0
  const state=createEditorState({saveDraft:async()=>{writes++;throw new Error('lost')},getVersion:async()=>resource('2','Other writer')})
  state.install(resource());state.mutate(doc=>{doc.flowName='Mine'})
  assert.equal(await state.save(),false);assert.equal(await state.save(),false)
  assert.equal(writes,1);assert.equal(state.document.value.flowName,'Mine');assert.equal(state.resource.value.revision,'1')
})
