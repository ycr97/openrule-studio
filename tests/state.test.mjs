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
