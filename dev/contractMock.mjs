import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {decodeTransport,parseJson,stringifyJson} from '../src/api/lossless.ts'
import {factErrors,providerErrors} from '../src/features/facts/validation.ts'
const fixture=name=>decodeTransport(parseJson(readFileSync(new URL(`./fixtures/${name}`,import.meta.url),'utf8')))
const clone=value=>decodeTransport(parseJson(stringifyJson(value)))
const stable=value=>Array.isArray(value)?`[${value.map(stable)}]`:value && typeof value==='object' && !value.__decimal?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:stringifyJson(value)
const same=(a,b)=>stable(a)===stable(b)
const scenarios=fixture('scenarios.json').map(item=>({...item,httpStatus:Number(item.httpStatus.text)}))
const baseCatalog=fixture('catalog.json')
const definition=decodeTransport(parseJson(readFileSync(new URL('../src/features/editor/fixtures/order-admission.definition.json',import.meta.url),'utf8')))
export function createContractMock() {
 let scenario, facts, providers, expectedProvider, flow, writeFault='none'
 function reset(key='normal') {
  scenario=scenarios.find(item=>item.id===key);if(!scenario) throw new Error('Unknown fixture scenario')
  facts=new Map(clone(baseCatalog).map(item=>[item.document.factId,item]))
  expectedProvider={...fixture(scenario.providerFile),...clone(scenario.providerPatch)}
  providers=new Map([expectedProvider,fixture('risk-profile-mock.provider.json')].map(document=>[document.providerId,{document:clone(document),revision:'1',updatedAt:'2026-10-07T00:00:00Z'}]))
  flow={flowId:definition.flowId,flowName:definition.flowName,version:definition.version,status:'DRAFT',revision:'1',definitionChecksum:null,document:clone(definition),validation:{valid:true,issues:[]},changeNote:null,updatedAt:'2026-10-07T00:00:00Z'}
  writeFault='none'
 }
 reset()
 const error=(status,code,message,issues=[])=>({status,body:{code,message,requestId:null,traceId:null,issues,execution:null,factResolution:null,totalElapsedMillis:0}})
 const unsupported=()=>error(501,'OR-MOCK-NO-FIXTURE','没有匹配当前输入、模式、revision 或配置的响应 fixture；未执行规则或事实补数')
 const conflict=()=>error(409,'OR-REVISION-CONFLICT','配置 revision 已变化；本地输入保留')
 function snapshotMatches() {return same([...facts.values()].sort((a,b)=>a.document.factId.localeCompare(b.document.factId)),clone(baseCatalog).sort((a,b)=>a.document.factId.localeCompare(b.document.factId))) && providers.get('risk_profile').revision==='1' && same(providers.get('risk_profile').document,expectedProvider)}
 async function handle(path,method='GET',bodyText) {
  const url=new URL(path,'http://localhost');const pathName=url.pathname
  let body
  try {body=bodyText===undefined?undefined:decodeTransport(parseJson(bodyText))} catch {return error(400,'OR-FACT-CONFIG','Invalid JSON')}
  if(pathName==='/__studio_mock') {
   if(method==='POST') {if(body.scenario) reset(body.scenario);if(body.writeFault) writeFault=body.writeFault}
   return {status:200,body:{scenario:scenario.id,writeFault,requestText:stringifyJson(scenario.request),scenarios:scenarios.map(({id,acceptance})=>({id,acceptance}))}}
  }
  const configMatch=pathName.match(/^\/api\/v2\/admin\/(facts|fact-providers)(?:\/([^/]+))?(\/mock-tests)?$/)
  if(configMatch) {
   const [,kind,rawId,test]=configMatch, id=rawId?decodeURIComponent(rawId):undefined, store=kind==='facts'?facts:providers, identity=kind==='facts'?'factId':'providerId'
   if(test) {
    const resource=store.get(id)
    if(!resource)return error(404,'OR-FACT-NOT-FOUND','Provider not found')
    if(body.expectedRevision!==resource.revision)return conflict()
    const sample=fixture('provider-mock-test.request.json')
    if(method!=='POST' || id!=='risk_profile' || resource.revision!=='1' || !snapshotMatches() || !same(body.facts,sample.facts) || body.timeoutMillis!==sample.timeoutMillis || scenario.id!=='normal')return unsupported()
    return {status:200,body:{...fixture('mock-test.response.json'),requestId:body.requestId}}
   }
   if(method==='GET') {
    if(id)return store.has(id)?{status:200,body:clone(store.get(id))}:error(404,'OR-FACT-NOT-FOUND','Configuration not found')
    const q=(url.searchParams.get('q')??'').toLowerCase(),source=url.searchParams.get('source'),page=Number(url.searchParams.get('page')??1),pageSize=Number(url.searchParams.get('pageSize')??20)
    if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)return error(400,'OR-FACT-CONFIG','Invalid pagination')
    const all=[...store.values()].filter(item=>{const d=item.document;return `${d[identity]} ${d.name} ${d.path??''}`.toLowerCase().includes(q) && (!source || kind!=='facts' || (source==='PROVIDER')===!!d.binding)}).sort((a,b)=>a.document[identity]<b.document[identity]?-1:1)
    return {status:200,body:{items:clone(all.slice((page-1)*pageSize,page*pageSize)),page,pageSize,total:all.length}}
   }
   if(method!=='PUT' && method!=='POST')return unsupported()
   if(writeFault==='conflict')return conflict()
   if(writeFault==='failure')return error(503,'OR-FACT-STORE','Contract Mock: configuration store unavailable')
   const document=method==='POST'?body:body.document, docId=document?.[identity], prior=store.get(id)
   if(method==='PUT' && !prior)return error(404,'OR-FACT-NOT-FOUND','Configuration not found')
   if(method==='POST' && store.has(docId))return error(409,'OR-FACT-CONFLICT','Duplicate configuration ID')
   if(method==='PUT' && body.expectedRevision!==prior.revision)return conflict()
   if(method==='PUT' && (id!==docId || (kind==='facts' && (document.path!==prior.document.path || document.type!==prior.document.type)) || (kind==='fact-providers' && document.type!==prior.document.type)))return error(409,'OR-FACT-IDENTITY','Identity is immutable')
   const errors=kind==='facts'?factErrors(document):providerErrors(document)
   if(kind==='facts') {
    if(document.binding && !providers.has(document.binding.providerId))errors.push('Referenced Provider does not exist')
    const tokens=value=>value.slice(1).split('/').map(token=>token.replaceAll('~1','/').replaceAll('~0','~'))
    const next=tokens(document.path)
    if([...facts.values()].some(item=>item.document.factId!==docId && tokens(item.document.path).every((part,index)=>next[index]===part)))errors.push('Catalog path conflict')
    if([...facts.values()].some(item=>item.document.factId!==docId && next.every((part,index)=>tokens(item.document.path)[index]===part)))errors.push('Catalog path conflict')
   }
   if(errors.length)return error(400,'OR-FACT-CONFIG',errors.join('; '),[{code:'OR-FACT-CONFIG',severity:'ERROR',message:errors.join('; '),pointer:'/document',stageId:null,nodeId:null,itemId:null}])
   const saved={document:clone(document),revision:prior?String(BigInt(prior.revision)+1n):'1',updatedAt:new Date().toISOString()}
   store.set(docId,saved)
   if(writeFault==='lost') {writeFault='none';return error(502,'OR-FACT-STORE','Contract Mock: response lost after save')}
   return {status:method==='POST'?201:200,body:clone(saved)}
  }
  if(pathName==='/api/v2/admin/flows' && method==='GET')return {status:200,body:{items:[{flowId:flow.flowId,flowName:flow.flowName,currentDraft:{...flow,document:undefined,validation:undefined,changeNote:undefined,updatedAt:undefined},latestPublished:null}].map(item=>({...item,currentDraft:{flowId:flow.flowId,flowName:flow.flowName,version:flow.version,status:flow.status,revision:flow.revision,definitionChecksum:flow.definitionChecksum}})),page:1,pageSize:100,total:1}}
  if(pathName===`/api/v2/admin/flows/${flow.flowId}/versions` && method==='GET')return {status:200,body:{items:[{flowId:flow.flowId,flowName:flow.flowName,version:flow.version,status:flow.status,revision:flow.revision,definitionChecksum:flow.definitionChecksum}],page:1,pageSize:100,total:1}}
  const flowPath=`/api/v2/admin/flows/${flow.flowId}/versions/${flow.version}`
  if(pathName===flowPath && method==='GET')return {status:200,body:clone(flow)}
  if(pathName===flowPath && method==='PUT') {
   if(body.expectedRevision!==flow.revision)return conflict()
   flow={...flow,document:clone(body.document),flowName:body.document.flowName,revision:String(BigInt(flow.revision)+1n)}
   return {status:200,body:clone(flow)}
  }
  if(pathName===flowPath+'/validations')return same(body.document,definition)?{status:200,body:{valid:true,issues:[]}}:unsupported()
  if(pathName===flowPath+'/required-facts')return same(flow.document,definition)&&flow.revision==='1'?{status:200,body:fixture('order-admission.required-facts.json')}:unsupported()
  if(pathName===flowPath+'/simulations') {
   const sample=fixture('m1-complete.request.json')
   if(body.expectedRevision!==flow.revision)return conflict()
   if(Object.hasOwn(body,'factMode') || !same(flow.document,definition) || flow.revision!=='1' || !same(body.facts,sample.facts))return unsupported()
   const result=fixture('m1-normal.response.json');result.requestId=body.requestId;result.bizId=body.bizId
   return {status:200,body:result}
  }
  if(pathName===flowPath+'/fact-simulations') {
   if(body.expectedRevision!==flow.revision)return conflict()
   if(!snapshotMatches() || !same(flow.document,definition) || flow.revision!=='1' || body.factMode!==scenario.request.factMode || !same(body.facts,scenario.request.facts) || body.timeoutMillis!==scenario.request.timeoutMillis)return unsupported()
   const response=fixture(scenario.response)
   if(response.execution){response.execution.requestId=body.requestId;response.execution.bizId=body.bizId}
   if(Object.hasOwn(response,'requestId'))response.requestId=body.requestId
   return {status:scenario.httpStatus,body:response}
  }
  return unsupported()
 }
 return {handle,reset}
}
export function contractMockPlugin() {
 const service=createContractMock()
 return {name:'studio-m2-contract-mock',configureServer(server) {server.middlewares.use(async(req,res,next)=>{
  if(!req.url?.startsWith('/api/v2/') && !req.url?.startsWith('/__studio_mock'))return next()
  try {let text='';for await(const chunk of req) {text+=chunk;if(text.length>1048576) {res.writeHead(413);res.end();return}}
   const result=await service.handle(req.url,req.method,text||undefined);res.statusCode=result.status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(stringifyJson(result.body))
  } catch {res.statusCode=500;res.end(JSON.stringify({code:'OR-MOCK-INVALID',message:'Contract Mock request is not supported',requestId:null,traceId:null,issues:[],execution:null,factResolution:null,totalElapsedMillis:0}))}
 })}}
}
export const fixtureDirectory=fileURLToPath(new URL('./fixtures/',import.meta.url))
