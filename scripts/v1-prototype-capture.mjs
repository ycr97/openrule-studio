import {execFileSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
async function capture(page){
  const checks=[]
  await page.goto('http://127.0.0.1:5176/index.html#/editor/order_admission/4',{waitUntil:'domcontentloaded'})
  if(await page.getByRole('button',{name:'取消',exact:true}).count())await page.getByRole('button',{name:'取消',exact:true}).click()
  for(const [width,height] of [[1440,900],[1920,1080],[640,900]]){
    await page.setViewportSize({width,height})
    await page.screenshot({path:`output/playwright/v1-prototype-${width}x${height}-canvas.png`,animations:'disabled'})
    for(const [name,node,open] of [['ruleset','订单准入规则','打开规则集编辑器'],['scorecard','买家风险评分卡','打开评分卡编辑器'],['decisiontable','订单金额分层','打开决策表编辑器']]){
      await page.locator('.canvas-node').filter({hasText:node}).click()
      await page.getByRole('button',{name:open,exact:true}).click()
      await page.getByRole('button',{name:'应用配置',exact:true}).waitFor()
      const path=`output/playwright/v1-prototype-${width}x${height}-${name}.png`
      await page.screenshot({path,animations:'disabled'})
      checks.push({name,path,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,devicePixelRatio})),font:await page.evaluate(()=>getComputedStyle(document.body).fontFamily)})
      await page.getByRole('button',{name:'取消',exact:true}).click()
    }
  }
  return {status:'PASS',purpose:'local prototype visual reference only; no Java execution evidence',checks}
}
const result=execFileSync(process.env.PWCLI??'/Users/ycr/.codex/skills/playwright/scripts/playwright_cli.sh',['-s=v1','run-code',`async(page)=>await (${capture.toString()})(page)`],{encoding:'utf8',timeout:65000,maxBuffer:2e6})
writeFileSync('output/v1/prototype-captures.txt',result)
if(result.includes('### Error')||!result.includes('"status":"PASS"'))throw new Error(result)
console.log(result)
