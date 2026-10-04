import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
const [width,height]=(process.argv[2]??'1440x900').split('x').map(Number)
if(!width||!height)throw new Error('Usage: node scripts/v1-visual-acceptance.mjs 1440x900|1920x1080|640x900')
const cfg={width,height,flow:process.env.V1_UI_FLOW??'order_admission_v1_ui_20261001'}
mkdirSync('output/v1',{recursive:true});mkdirSync('output/playwright',{recursive:true})
async function visual(page,cfg){
  await page.setViewportSize({width:cfg.width,height:cfg.height})
  await page.goto(`http://127.0.0.1:5175/flows/${cfg.flow}/versions/3`,{waitUntil:'domcontentloaded'})
  await page.getByLabel('阶段名称',{exact:true}).waitFor()
  const checks=[]
  async function capture(name,selector){
    const metrics=await page.evaluate(selector=>{
      const box=document.querySelector(selector)?.getBoundingClientRect()
      return {viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},documentWidth:document.documentElement.scrollWidth,box:box?{x:box.x,y:box.y,width:box.width,height:box.height}:null}
    },selector)
    if(metrics.documentWidth>cfg.width+1)throw new Error(name+' page horizontal overflow: '+JSON.stringify(metrics))
    if(name==='canvas'&&cfg.width>=768&&metrics.box.y+metrics.box.height>cfg.height+1)throw new Error('desktop canvas exceeds viewport: '+JSON.stringify(metrics))
    if(selector==='.config-dialog'||selector==='.publish-card'){
      const b=metrics.box
      if(!b||b.x<0||b.y<0||b.x+b.width>cfg.width+1||b.y+b.height>cfg.height+1)throw new Error(name+' dialog outside viewport: '+JSON.stringify(metrics))
    }
    const path=`output/playwright/v1-visual-${cfg.width}x${cfg.height}-${name}.png`
    await page.screenshot({path,fullPage:cfg.width<768,timeout:15000})
    checks.push({name,path,...metrics})
  }
  await capture('canvas','.editor-content')
  for(const [name,label] of [['ruleset','订单准入规则'],['scorecard','买家风险评分卡'],['decisiontable','订单金额分层']]){
    await page.locator('.canvas-node').filter({hasText:label}).click()
    await page.getByRole('button',{name:'编辑完整配置',exact:true}).click()
    await page.locator('.config-dialog').waitFor()
    await capture(name,'.config-dialog')
    await page.getByRole('button',{name:'Close',exact:true}).click()
  }
  await page.locator('.canvas-node').filter({hasText:'黑名单校验'}).click()
  await capture('condition','.inspector')
  await page.getByRole('button',{name:'发布版本',exact:true}).click()
  await page.getByPlaceholder('描述本次规则变更').fill('V1 visual confirmation only')
  await capture('publish-confirm','.publish-card')
  await page.getByRole('button',{name:'取消',exact:true}).click()
  await page.getByRole('button',{name:'输入事实',exact:true}).click()
  await page.getByRole('button',{name:'OA-02 · REVIEW',exact:true}).click()
  await page.getByRole('button',{name:'保存并试运行',exact:true}).first().click()
  await page.waitForFunction(()=>document.querySelector('.result-summary')?.textContent.includes('35'))
  await capture('execution-35','.execution-result')
  await page.locator('.result-node-card').filter({hasText:'buyer_score'}).scrollIntoViewIfNeeded()
  await capture('execution-details','.result-node-card')
  await page.goto(`http://127.0.0.1:5175/flows/${cfg.flow}/versions/2`,{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>document.querySelector('.title-line')?.textContent.includes('PUBLISHED'))
  await page.locator('.canvas-node').filter({hasText:'买家风险评分卡'}).click()
  if(!await page.getByLabel('节点名称',{exact:true}).isDisabled())throw new Error('published input editable')
  if(await page.getByRole('button',{name:'保存草稿',exact:true}).count())throw new Error('published save available')
  await capture('published-readonly','.inspector')
  await page.getByRole('button',{name:'查看完整配置',exact:true}).click()
  if(!await page.locator('[data-item-id="b_refund_high"] [data-field="score"]').isDisabled())throw new Error('published score editable')
  await capture('published-scorecard','.config-dialog')
  await page.getByRole('button',{name:'Close',exact:true}).click()
  return {status:'PASS',checks}
}
const code=`async(page)=>await (${visual.toString()})(page,${JSON.stringify(cfg)})`
const result=execFileSync(process.env.PWCLI??'/Users/ycr/.codex/skills/playwright/scripts/playwright_cli.sh',['-s=v1','run-code',code],{encoding:'utf8',timeout:65000,maxBuffer:2e6})
writeFileSync(`output/v1/visual-${width}x${height}.txt`,result)
if(result.includes('### Error')||!result.includes('"status":"PASS"'))throw new Error(result)
console.log(result)
