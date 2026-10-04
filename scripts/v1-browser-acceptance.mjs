import {execFileSync} from 'node:child_process'
import {appendFileSync,mkdirSync} from 'node:fs'
const phase=process.argv[2]
const cfg={faultFlow:process.env.V1_FAULT_FLOW??'order_admission_v1_fault_20261001',uiFlow:process.env.V1_UI_FLOW??'order_admission_v1_ui_20261001',session:process.env.V1_BROWSER_SESSION??'v1'}
const cli=process.env.PWCLI??'/Users/ycr/.codex/skills/playwright/scripts/playwright_cli.sh'
mkdirSync('output/v1',{recursive:true})
const phases={
  async saves(page,cfg){
    await page.goto(`http://127.0.0.1:5175/flows/${cfg.faultFlow}/versions/1`,{waitUntil:'domcontentloaded'})
    await page.getByLabel('阶段名称',{exact:true}).fill('V1 recovered save')
    let start=Date.now()
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'save-lost',count:1}})
    await page.getByRole('button',{name:'保存草稿',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('已确认草稿保存成功'))
    if(await page.locator('.unsaved-badge').count())throw new Error('confirmed save still dirty')
    let events=(await(await page.request.get('http://127.0.0.1:8082/__v1/events')).json()).filter(e=>e.at>=start)
    if(events.filter(e=>e.method==='PUT').length!==1||events.at(-1).method!=='GET')throw new Error('save blindly retried or did not query')
    await page.screenshot({path:'output/playwright/v1-save-lost-recovered.png'})
    await page.getByLabel('阶段名称',{exact:true}).fill('V1 retained on save failure')
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'save-fail',count:1}})
    await page.getByRole('button',{name:'保存草稿',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('V1-SAVE-FAULT'))
    if(await page.getByLabel('阶段名称',{exact:true}).inputValue()!=='V1 retained on save failure')throw new Error('lost failed input')
    if(!(await page.locator('.unsaved-badge').count()))throw new Error('save failure falsely clean')
    await page.screenshot({path:'output/playwright/v1-save-failure.png'})
    // A real PUT commits before its delayed response; a later edit must remain dirty.
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'save-late',count:1}})
    await page.getByRole('button',{name:'保存草稿',exact:true}).click()
    await page.getByLabel('阶段名称',{exact:true}).fill('V1 edit made while saving')
    await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('后续编辑仍未保存'))
    if(await page.getByLabel('阶段名称',{exact:true}).inputValue()!=='V1 edit made while saving')throw new Error('late save overwrote edit')
    await page.screenshot({path:'output/playwright/v1-save-late-edit.png'})
    await page.getByRole('link',{name:'OpenRule STUDIO',exact:true}).click()
    await page.getByRole('button',{name:'放弃修改并离开',exact:true}).click()
    await page.waitForURL('http://127.0.0.1:5175/')
    return {status:'PASS',tests:['save lost: PUT then GET, no repeated PUT','save failure retains input','late save retains newer edit'],viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio})),saveRecoveryRequests:events.map(e=>({method:e.method,url:e.url,inject:e.inject,upstreamStatus:e.upstreamStatus}))}
  },
  async conflicts(page,cfg){
    const url=`http://127.0.0.1:5175/flows/${cfg.faultFlow}/versions/1`
    await page.goto(url,{waitUntil:'domcontentloaded'})
    const other=await page.context().newPage();await other.goto(url,{waitUntil:'domcontentloaded'})
    await page.getByLabel('阶段名称',{exact:true}).fill('V1 session A retained')
    await other.getByLabel('阶段名称',{exact:true}).fill('V1 session B wins')
    await other.getByRole('button',{name:'保存草稿',exact:true}).click()
    await other.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('草稿已保存'))
    await page.getByRole('button',{name:'保存草稿',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('OR-REVISION-CONFLICT'))
    if(await page.getByLabel('阶段名称',{exact:true}).inputValue()!=='V1 session A retained')throw new Error('CAS overwrote session A')
    await page.screenshot({path:'output/playwright/v1-save-cas-conflict.png'})
    await page.getByRole('link',{name:'OpenRule STUDIO',exact:true}).click()
    await page.getByRole('button',{name:'放弃修改并离开',exact:true}).click()
    await page.waitForURL('http://127.0.0.1:5175/')
    await page.goto(url,{waitUntil:'domcontentloaded'})
    await other.getByLabel('阶段名称',{exact:true}).fill('V1 second concurrent revision')
    await other.getByRole('button',{name:'保存草稿',exact:true}).click()
    await other.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('草稿已保存'))
    await page.getByRole('button',{name:'发布版本',exact:true}).click()
    await page.getByPlaceholder('描述本次规则变更').fill('V1 publish conflict note retained')
    await page.getByRole('button',{name:'确认发布',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.publish-card')?.textContent.includes('OR-REVISION-CONFLICT'))
    if(await page.getByPlaceholder('描述本次规则变更').inputValue()!=='V1 publish conflict note retained')throw new Error('lost note')
    if(await page.getByLabel('阶段名称',{exact:true}).inputValue()!=='V1 session B wins')throw new Error('publish conflict replaced local document')
    await page.screenshot({path:'output/playwright/v1-publish-cas-conflict.png'})
    await other.close();await page.getByRole('button',{name:'取消',exact:true}).click();await page.reload({waitUntil:'domcontentloaded'})
    return {status:'PASS',tests:['real two browser session save CAS','publish CAS preserves document and note'],viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio}))}
  },
  async simulations(page,cfg){
    await page.goto(`http://127.0.0.1:5175/flows/${cfg.faultFlow}/versions/1`,{waitUntil:'domcontentloaded'})
    await page.getByRole('button',{name:'输入事实',exact:true}).click()
    const results=[]
    for(const [preset,status,decision,reason] of [['OA-07 · REVIEW','DECIDED','REVIEW','Missing value'],['OA-08 · REVIEW','DECIDED','REVIEW','Type mismatch'],['OA-09 · 技术失败','FAILED','无业务决策','Type mismatch']]){
      await page.getByRole('button',{name:preset,exact:true}).click()
      const pending=page.waitForResponse(r=>r.url().endsWith('/simulations'))
      await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
      const response=await pending,payload=await response.json(),execution=payload.execution??payload
      if(execution.status!==status||!JSON.stringify(execution).includes(reason))throw new Error(preset+' wrong failure path')
      await page.waitForFunction(decision=>document.querySelector('.result-summary')?.textContent.includes(decision),decision)
      await page.screenshot({path:`output/playwright/v1-${preset.slice(0,5).toLowerCase()}-failure.png`,fullPage:true})
      results.push({preset,http:response.status(),status:execution.status,decision:execution.decision,failures:execution.nodeResults.filter(n=>n.failure).map(n=>({nodeId:n.nodeId,failure:n.failure}))})
    }
    await page.getByRole('button',{name:'OA-02 · REVIEW',exact:true}).click()
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'simulation-late',count:1}})
    await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
    await page.getByLabel('facts JSON').fill('{"order":{"amount":680,"country":"JP"},"buyer":{"ageDays":365},"metrics":{"refundRate":0.08},"risk":{"blacklisted":false}}')
    await page.waitForFunction(()=>document.querySelector('.execution-stale')?.textContent.includes('结果已过时'))
    await page.screenshot({path:'output/playwright/v1-late-result-stale.png',fullPage:true})
    // Start an old request, navigate via the actual version-record link, and run the new exact version.
    await page.getByRole('button',{name:'版本记录',exact:true}).click()
    await page.getByRole('link',{name:'v1',exact:true}).click()
    await page.getByRole('button',{name:'输入事实',exact:true}).click()
    await page.getByRole('button',{name:'OA-02 · REVIEW',exact:true}).click()
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'simulation-late',count:1}})
    await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
    await page.goto(`http://127.0.0.1:5175/flows/${cfg.uiFlow}/versions/3`,{waitUntil:'domcontentloaded'})
    await page.getByRole('button',{name:'输入事实',exact:true}).click()
    await page.getByRole('button',{name:'OA-02 · REVIEW',exact:true}).click()
    await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
    await page.waitForFunction(()=>document.querySelector('.result-summary')?.textContent.includes('35'))
    const current=await page.locator('.result-meta').innerText()
    await page.waitForTimeout(2700)
    if(await page.locator('.result-meta').innerText()!==current)throw new Error('old request replaced newer result')
    // Transport timeout state is injected once; Core/API deadline semantics are independently tested in Java.
    const timeoutStart=Date.now()
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'simulation-timeout',count:1}})
    const pending=page.waitForResponse(r=>r.url().endsWith('/simulations'))
    await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
    const response=await pending,payload=await response.json()
    if(response.status()!==504||payload.code!=='OR-EXECUTION-TIMEOUT')throw new Error('controlled transport timeout did not return 504: '+JSON.stringify(payload))
    await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('OR-EXECUTION-TIMEOUT'))
    await page.screenshot({path:'output/playwright/v1-request-timeout.png',fullPage:true})
    await page.waitForTimeout(1100)
    const events=(await(await page.request.get('http://127.0.0.1:8082/__v1/events')).json()).filter(e=>e.at>=timeoutStart&&e.method==='POST'&&e.url.endsWith('/simulations'))
    if(events.length!==1||events[0].inject!=='simulation-timeout')throw new Error('automatic retry: '+JSON.stringify(events))
    return {status:'PASS',results,lateResponse:'stale input / older exact version ignored',requestTimeout:{http:response.status(),code:payload.code,execution:payload.execution,requests:events.map(e=>({method:e.method,url:e.url,inject:e.inject}))},viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio}))}
  },
  async publication(page,cfg){
    await page.goto(`http://127.0.0.1:5175/flows/${cfg.faultFlow}/versions/1`,{waitUntil:'domcontentloaded'})
    const start=Date.now()
    await page.request.post('http://127.0.0.1:8082/__v1/control',{data:{mode:'publish-lost',count:1}})
    await page.getByRole('button',{name:'发布版本',exact:true}).click()
    await page.getByPlaceholder('描述本次规则变更').fill('V1 real publish with dropped response')
    await page.getByRole('button',{name:'确认发布',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('已确认服务端发布成功'))
    if(!(await page.locator('.title-line').innerText()).includes('PUBLISHED'))throw new Error('not readonly published')
    const events=(await(await page.request.get('http://127.0.0.1:8082/__v1/events')).json()).filter(e=>e.at>=start)
    if(events.filter(e=>e.url.endsWith('/publish')).length!==1)throw new Error('blind publish retry')
    const publishIndex=events.findIndex(e=>e.url.endsWith('/publish'))
    if(events[publishIndex].upstreamStatus!==200||events[publishIndex+1].method!=='GET')throw new Error('not real committed publish then status GET')
    await page.screenshot({path:'output/playwright/v1-publish-lost-recovered.png'})
    return {status:'PASS',notice:await page.locator('.notice').innerText(),requests:events.map(e=>({method:e.method,url:e.url,inject:e.inject,upstreamStatus:e.upstreamStatus})),viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio}))}
  }
}
if(!phases[phase])throw new Error('Usage: node scripts/v1-browser-acceptance.mjs saves|conflicts|simulations|publication; requires V1 seed, proxy on 8082 and Vite on 5175. Set V1_UI_FLOW/V1_FAULT_FLOW for an independent repeat.')
const source=`async(page)=>{return await (${phases[phase].toString().replace(/^async \w+\(/,'async function(')})(page,${JSON.stringify(cfg)});}`
const result=execFileSync(cli,[`-s=${cfg.session}`,'run-code',source],{encoding:'utf8',timeout:65000,maxBuffer:2e6})
appendFileSync(`output/v1/browser-${phase}.txt`,result)
if(result.includes('### Error')||!result.includes('### Result')||!result.includes('\"status\":\"PASS\"'))throw new Error(result)
console.log(result)
