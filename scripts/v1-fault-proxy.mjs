import http from 'node:http'
import {appendFileSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const port=Number(process.env.V1_PROXY_PORT??8082)
const upstream=process.env.STUDIO_API_ORIGIN??'http://127.0.0.1:8081'
// Live evidence stays outside the Vite/Tailwind source tree. Copy it after stopping acceptance.
const evidenceDir=process.env.V1_EVIDENCE_DIR??join(tmpdir(),'openrule-v1-evidence')
mkdirSync(evidenceDir,{recursive:true})
let mode='normal',remaining=0
const records=[]
const recentRequests=[]
let loadFuse=false
const log=record=>{records.push(record);if(records.length>500)records.shift();appendFileSync(join(evidenceDir,'proxy-events.jsonl'),JSON.stringify(record)+'\n')}
const server=http.createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk
  if(req.url==='/__v1/control'&&req.method==='POST'){const c=JSON.parse(raw);mode=c.mode;remaining=c.count??1;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mode,remaining}));return}
  if(req.url==='/__v1/events'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(records));return}
  const now=Date.now()
  while(recentRequests.length&&recentRequests[0]<now-10000)recentRequests.shift()
  recentRequests.push(now)
  if(loadFuse||recentRequests.length>60){
    if(!loadFuse){loadFuse=true;log({at:now,method:req.method,url:req.url,inject:'V1-LOAD-FUSE',forwarded:false})}
    // Stay latched until this dedicated proxy is restarted; do not keep logging the loop.
    res.writeHead(503,{'Content-Type':'application/json'})
    res.end(JSON.stringify({code:'V1-LOAD-FUSE',message:'Acceptance paused: more than 60 requests in 10 seconds',issues:[],execution:null}))
    return
  }
  let inject=mode
  const applicable=remaining>0&&((inject.startsWith('publish')&&req.url.endsWith('/publish'))||(inject.startsWith('save')&&req.method==='PUT')||(inject.startsWith('simulation')&&req.url.endsWith('/simulations')))
  if(applicable)remaining--
  else inject='normal'
  if(inject==='save-fail'){log({at:Date.now(),method:req.method,url:req.url,inject,forwarded:false});res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'V1-SAVE-FAULT',message:'controlled save failure',issues:[],execution:null}));return}
  // Deterministic transport/UI timeout fixture. Real engine deadlines are tested in Java/API.
  if(inject==='simulation-timeout'){log({at:Date.now(),method:req.method,url:req.url,inject,forwarded:false});res.writeHead(504,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'OR-EXECUTION-TIMEOUT',message:'controlled V1 timeout response',issues:[],execution:null}));return}
  const body=raw
  try{
    const response=await fetch(upstream+req.url,{method:req.method,headers:{'Content-Type':'application/json'},body:['GET','HEAD'].includes(req.method)?undefined:body})
    const text=await response.text()
    log({at:Date.now(),method:req.method,url:req.url,inject,forwarded:true,upstreamStatus:response.status,request:body,response:text})
    if(inject==='publish-lost'||inject==='save-lost'){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'V1-RESPONSE-LOST',message:'upstream write completed; response dropped by controlled proxy',issues:[],execution:null}));return}
    if(inject==='simulation-late')await new Promise(resolve=>setTimeout(resolve,2500))
    if(inject==='save-late')await new Promise(resolve=>setTimeout(resolve,1800))
    res.writeHead(response.status,{'Content-Type':'application/json'});res.end(text)
  }catch(error){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'V1-PROXY-ERROR',message:error.message,issues:[],execution:null}))}
})
server.listen(port,'127.0.0.1',()=>console.log(`V1 controlled proxy 127.0.0.1:${port} -> ${upstream}`))
