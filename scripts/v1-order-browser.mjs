import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
const flow=process.env.V1_UI_FLOW??`v1_ui_${Date.now()}`
const base='http://127.0.0.1:8081/api/v2'
async function call(path,method,body,expected){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status!==expected)throw new Error(await r.text());return r.json()}
await call('/admin/flows','POST',{flowId:flow,flowName:'V1 UI order acceptance'},201)
const document={...JSON.parse(readFileSync('src/features/editor/fixtures/order-admission.definition.json','utf8')),flowId:flow,flowName:'订单准入 V1',version:'1'}
await call(`/admin/flows/${flow}/versions/1`,'PUT',{expectedRevision:'1',document},200)
async function orders(page,flow){
  await page.setViewportSize({width:1440,height:900})
  await page.goto(`http://127.0.0.1:5175/flows/${flow}/versions/1`,{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'输入事实',exact:true}).click()
  const evidence=[]
  for(const [preset,score,decision] of [['OA-01 · APPROVE','15','APPROVE'],['OA-02 · REVIEW','75','REVIEW']]){
    await page.getByRole('button',{name:preset,exact:true}).click()
    const pending=page.waitForResponse(r=>r.url().endsWith('/simulations'))
    await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
    const result=await(await pending).json()
    if(result.decision.score!==score||result.decision.decisionCode!==decision)throw new Error(preset+' wrong result')
    await page.waitForFunction(score=>document.querySelector('.result-summary')?.textContent.includes(score),score)
    await page.screenshot({path:`output/playwright/v1-final-result-${score}.png`,fullPage:true})
    evidence.push({preset,decision:result.decision,revision:result.revision,checksum:result.definitionChecksum})
  }
  await page.getByRole('button',{name:'发布版本',exact:true}).click()
  await page.getByPlaceholder('描述本次规则变更').fill('V1 original score75')
  await page.getByRole('button',{name:'确认发布',exact:true}).click()
  await page.getByRole('button',{name:'从此版本创建草稿',exact:true}).waitFor()
  await page.getByRole('button',{name:'从此版本创建草稿',exact:true}).click()
  await page.waitForURL('**/versions/2')
  await page.getByRole('button',{name:'可视化编排',exact:true}).click()
  await page.locator('.canvas-node').filter({hasText:'买家风险评分卡'}).click()
  await page.getByRole('button',{name:'编辑完整配置',exact:true}).click()
  const scoreField=page.locator('[data-item-id="b_refund_high"] [data-field="score"]')
  if(await scoreField.inputValue()!=='45')throw new Error('original bin not45')
  await scoreField.fill('5')
  await page.screenshot({path:'output/playwright/v1-final-score-45-to-5.png'})
  await page.getByRole('button',{name:'Close',exact:true}).click()
  await page.getByRole('button',{name:'保存草稿',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.notice')?.textContent.includes('草稿已保存'))
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'输入事实',exact:true}).click()
  await page.getByRole('button',{name:'OA-02 · REVIEW',exact:true}).click()
  const pending=page.waitForResponse(r=>r.url().endsWith('/simulations'))
  await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
  const modified=await(await pending).json()
  if(modified.decision.score!=='35'||modified.decision.decisionCode!=='APPROVE')throw new Error('saved/reloaded score35 missing')
  await page.waitForFunction(()=>document.querySelector('.result-summary')?.textContent.includes('35'))
  await page.screenshot({path:'output/playwright/v1-final-result-35.png',fullPage:true})
  await page.getByRole('button',{name:'发布版本',exact:true}).click()
  await page.getByPlaceholder('描述本次规则变更').fill('V1 UI high refund45 to5')
  await page.getByRole('button',{name:'确认发布',exact:true}).click()
  await page.getByRole('button',{name:'从此版本创建草稿',exact:true}).waitFor()
  const high={order:{amount:1800,country:'JP'},buyer:{ageDays:12},metrics:{refundRate:0.42},risk:{blacklisted:false}}
  for(const [version,score] of [['1','75'],['2','35']]){
    const response=await page.request.post(`http://127.0.0.1:8081/api/v2/flows/${flow}/versions/${version}/executions`,{data:{requestId:crypto.randomUUID(),bizId:'v1-exact',facts:high,timeoutMillis:3000}})
    const result=await response.json()
    if(result.version!==version||result.decision.score!==score||result.purpose!=='LIVE')throw new Error('immutable version mismatch')
    evidence.push({mode:'LIVE',version,decision:result.decision,checksum:result.definitionChecksum})
  }
  await page.getByRole('button',{name:'从此版本创建草稿',exact:true}).click()
  await page.waitForURL('**/versions/3')
  return {status:'PASS',flow,tests:['15 APPROVE','75 REVIEW','UI45→5 save/reload gives35 APPROVE','publish/new draft','exact LIVE v1=75 v2=35'],evidence,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio}))}
}
const result=execFileSync(process.env.PWCLI??'/Users/ycr/.codex/skills/playwright/scripts/playwright_cli.sh',['-s=v1','run-code',`async(page)=>await (${orders.toString()})(page,${JSON.stringify(flow)})`],{encoding:'utf8',timeout:65000,maxBuffer:2e6})
writeFileSync('output/v1/final-browser-orders.txt',result)
if(result.includes('### Error')||!result.includes('"status":"PASS"'))throw new Error(result)
writeFileSync('output/v1/final-ui-manifest.json',JSON.stringify({flow},null,2))
console.log(result)
