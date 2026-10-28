<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Plus, Database, Globe, PlugZap, ShieldCheck, Settings2, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { factApi, configurationSerial } from '@/api/facts'
import { ApiError, errorText } from '@/api/client'
import { formatJson, isDecimal, parseJson, stringifyJson } from '@/api/lossless'
import type { FactErrorBody, FactResolutionReport, ProviderDocument, ProviderPage } from '@/api/factTypes'
import { createConfigEditor } from '../facts/configState'
import { providerErrors } from '../facts/validation'
import { useUnsavedGuard } from '../facts/unsaved'
import UnsavedDialog from '../facts/components/UnsavedDialog.vue'
import FactResolutionPanel from '../facts/components/FactResolutionPanel.vue'
const page=ref(1), pageSize=ref(20), q=ref(''), loading=ref(false), message=ref(''), data=ref<ProviderPage|null>(null)
let listSerial=0, previewSerial=0
async function load() { const serial=++listSerial; loading.value=true; message.value=''; try { const result=await factApi.listProviders({q:q.value,page:page.value,pageSize:pageSize.value}); if(serial===listSerial) data.value=result } catch(error) { if(serial===listSerial) message.value=errorText(error) } finally { if(serial===listSerial) loading.value=false } }
watch([page,pageSize],load,{immediate:true})
function search() { if(page.value!==1) page.value=1; else void load() }
const editor=createConfigEditor<ProviderDocument>({get:factApi.getProvider,create:factApi.createProvider,update:factApi.updateProvider},value=>value.providerId)
const formOpen=ref(false), mapText=ref(''), responseText=ref(''), mapError=ref(''), responseError=ref('')
const dirty=computed(()=>formOpen.value && (editor.dirty.value || !!mapError.value || !!responseError.value)), guard=useUnsavedGuard(dirty)
const errors=computed(()=>editor.document.value?providerErrors(editor.document.value):[])
const testing=ref(false), testMessage=ref(''), testFacts=ref('{"order":{"amount":680,"country":"JP"},"buyer":{"id":"buyer_1024"},"channel":"web"}'), report=ref<FactResolutionReport|null>(null), totalElapsed=ref<number|null>(null), traceId=ref(''), resultKey=ref('')
const testAttempt=ref(0), resultAttempt=ref(-1)
const currentKey=computed(()=>stringifyJson([editor.document.value,editor.resource.value?.revision ?? null,mapText.value,responseText.value,testFacts.value,configurationSerial.value]))
const stale=computed(()=>!!report.value && (resultKey.value!==currentKey.value || resultAttempt.value!==testAttempt.value))
async function open(id?: string) {
  if(!(await guard.confirmDiscard())) return
  const serial=++previewSerial; testing.value=false; report.value=null; testMessage.value=''; mapError.value=''; responseError.value=''; formOpen.value=true
  if(id) await editor.load(id)
  else editor.begin({providerId:`provider_${crypto.randomUUID().slice(0,8)}`,name:'',description:'',type:'HTTP',enabled:true,requestMap:{buyerId:{source:'FACT',pointer:'/buyer/id'}},mock:{outcome:'RESPONSE',response:{}},endpoint:'',connectTimeoutMillis:100,readTimeoutMillis:300,secretRef:null,readOnly:true,allowSimulationHttp:false})
  if(serial!==previewSerial || !formOpen.value) return
  if(editor.document.value) { mapText.value=formatJson(editor.document.value.requestMap); responseText.value=formatJson(editor.document.value.mock.response) }
}
async function close(value=false) { if(value || !(await guard.confirmDiscard())) return; previewSerial++; testing.value=false; formOpen.value=false; editor.invalidate() }
function changeType(type: string) {
  const current=editor.document.value
  if(!current || editor.resource.value) return
  const common={providerId:current.providerId,name:current.name,description:current.description,enabled:current.enabled,requestMap:current.requestMap,mock:current.mock}
  editor.document.value=type==='MOCK'?{...common,type:'MOCK'}:{...common,type:'HTTP',endpoint:'',connectTimeoutMillis:100,readTimeoutMillis:300,secretRef:null,readOnly:true,allowSimulationHttp:false}
}
function updateMap() {
  try { const value=parseJson(mapText.value); if(!value || typeof value!=='object' || Array.isArray(value) || isDecimal(value)) throw new Error('请求映射必须是 JSON 对象'); editor.document.value!.requestMap=value as ProviderDocument['requestMap']; mapError.value='' } catch(error) { mapError.value=errorText(error) }
}
function updateResponse() {
  try { const value=parseJson(responseText.value); if(!value || typeof value!=='object' || Array.isArray(value) || isDecimal(value)) throw new Error('Mock 响应必须是 JSON 对象'); editor.document.value!.mock={outcome:'RESPONSE',response:value as Record<string,unknown>}; responseError.value='' } catch(error) { responseError.value=errorText(error) }
}
function changeOutcome(outcome: string) { if(!editor.document.value) return; responseError.value=''; if(outcome==='RESPONSE') { responseText.value='{}'; editor.document.value.mock={outcome:'RESPONSE',response:{}} } else { editor.document.value.mock={outcome:outcome as 'TIMEOUT'|'ERROR',response:null}; responseText.value='null' } }
async function save() { if(mapError.value || responseError.value || errors.value.length) return; if(await editor.save()) void load() }
async function testMapping() {
  if(testing.value || !editor.resource.value || dirty.value || editor.saving.value || editor.uncertain.value) return
  let facts: unknown
  try { facts=parseJson(testFacts.value); if(!facts || typeof facts!=='object' || Array.isArray(facts) || isDecimal(facts)) throw new Error('测试 facts 必须是 JSON 对象') } catch(error) { testMessage.value=errorText(error); return }
  const serial=++previewSerial, attempt=++testAttempt.value, key=currentKey.value, target=editor.resource.value
  testing.value=true; testMessage.value=''
  try { const response=await factApi.testProviderMock(target.document.providerId,{requestId:crypto.randomUUID(),facts:facts as Record<string,unknown>,expectedRevision:target.revision,timeoutMillis:3000}); if(serial!==previewSerial) return; report.value=response.factResolution; totalElapsed.value=response.totalElapsedMillis; traceId.value=response.traceId; resultKey.value=key; resultAttempt.value=attempt }
  catch(error) { if(serial!==previewSerial) return; testMessage.value=errorText(error); if(error instanceof ApiError) { const body=error.body as FactErrorBody; report.value=body.factResolution ?? null; totalElapsed.value=body.totalElapsedMillis ?? null; traceId.value=body.traceId ?? ''; resultKey.value=key; resultAttempt.value=attempt } }
  finally { if(serial===previewSerial) testing.value=false }
}
onBeforeUnmount(()=>{listSerial++; previewSerial++; editor.invalidate()})
</script>
<template>
  <div class="catalog-page"><header class="catalog-head"><div><span class="eyebrow">FACT PROVIDERS</span><h1>数据源</h1><p>集中配置事实来源、请求映射和读取预算。</p></div><Button @click="open()"><Plus :size="16" />新增 Provider</Button></header><div class="catalog-info"><ShieldCheck :size="22" /><div><strong>查询型 POST · 凭证引用管理</strong><p>只填写 secretRef 引用。HTTP 补数由服务端发起，Mock 不读取凭证。</p></div></div>
    <form class="catalog-toolbar" @submit.prevent="search"><label class="catalog-search"><Search :size="16" /><input v-model="q" maxlength="128" aria-label="搜索 Provider" placeholder="搜索 Provider ID 或名称" /></label><Button variant="outline" type="submit">搜索</Button><Button variant="ghost" type="button" @click="load">刷新</Button></form><p v-if="message" class="notice error" role="alert">{{ message }}</p><p v-if="loading" role="status">正在读取 Provider…</p>
    <div class="provider-grid"><article v-for="item in data?.items" :key="item.document.providerId" class="provider-card"><div class="provider-card-head"><span class="provider-symbol"><component :is="item.document.type==='HTTP'?Globe:PlugZap" :size="23" /></span><div><h2>{{ item.document.name }}</h2><code>{{ item.document.providerId }}</code></div><span class="state-pill" :class="item.document.enabled?'resolved':'missing'">{{ item.document.enabled?'已启用':'已停用' }}</span></div><p>{{ item.document.description || '未填写说明' }}</p><div class="provider-endpoint"><span class="state-pill">{{ item.document.type }}</span><code>{{ item.document.type==='HTTP'?item.document.endpoint:'服务端 Mock 配置' }}</code></div><div class="provider-card-metrics"><div><small>revision</small><strong>{{ item.revision }}</strong></div><div><small>连接预算</small><strong>{{ item.document.type==='HTTP'?`${item.document.connectTimeoutMillis} ms`:'—' }}</strong></div><div><small>完整响应预算</small><strong>{{ item.document.type==='HTTP'?`${item.document.readTimeoutMillis} ms`:'—' }}</strong></div></div><footer><span><ShieldCheck :size="14" />凭证仅保存引用</span><Button variant="outline" @click="open(item.document.providerId)"><Settings2 :size="14" />配置与测试</Button></footer></article></div><p v-if="!loading && !data?.items.length" class="catalog-empty">没有匹配的 Provider。</p><footer class="catalog-pagination"><span>共 {{ data?.total ?? 0 }} 条 · 第 {{ page }} 页</span><label>每页 <select v-model="pageSize" aria-label="Provider 每页数量" @change="page=1"><option :value="5">5</option><option :value="20">20</option><option :value="50">50</option></select></label><Button variant="outline" :disabled="loading || page<=1" @click="page--">上一页</Button><Button variant="outline" :disabled="loading || !data || page*pageSize>=data.total" @click="page++">下一页</Button></footer>
    <Dialog :open="formOpen" @update:open="close"><DialogContent class="catalog-dialog provider-dialog"><DialogHeader><DialogTitle>{{ editor.resource.value?'配置 Provider':'新增 Provider' }}</DialogTitle><DialogDescription>保存配置后测试响应映射。所有测试读取服务端已保存的精确 revision。</DialogDescription></DialogHeader><p v-if="editor.loading.value">正在读取配置…</p><form v-if="editor.document.value" @submit.prevent="save"><div class="form-grid"><label>数据源名称<input v-model="editor.document.value.name" maxlength="128" required /></label><label>providerId<input v-model="editor.document.value.providerId" :disabled="!!editor.resource.value" required /></label><label>Provider 类型<select :value="editor.document.value.type" :disabled="!!editor.resource.value" @change="changeType(($event.target as HTMLSelectElement).value)"><option>HTTP</option><option>MOCK</option></select></label><label class="checkbox-field"><input v-model="editor.document.value.enabled" type="checkbox" />启用数据源</label></div><label>说明<textarea v-model="editor.document.value.description" rows="2" maxlength="1024" /></label><template v-if="editor.document.value.type==='HTTP'"><label>POST 端点<input v-model="editor.document.value.endpoint" required placeholder="https://risk.example.com/v1/batch" /></label><div class="form-grid"><label>连接超时（ms）<input v-model.number="editor.document.value.connectTimeoutMillis" type="number" min="1" max="60000" /></label><label>完整响应预算（ms）<input v-model.number="editor.document.value.readTimeoutMillis" type="number" min="1" max="60000" /></label></div><label>凭证引用 secretRef<input :value="editor.document.value.secretRef ?? ''" placeholder="env:OPENRULE_RISK_TOKEN" autocomplete="off" @input="editor.document.value.secretRef=($event.target as HTMLInputElement).value || null" /><small>只填写引用，不能填写秘密凭证。</small></label><label class="checkbox-field"><input v-model="editor.document.value.allowSimulationHttp" type="checkbox" />允许试运行发起真实 HTTP 查询</label></template>
      <div class="form-grid"><label>请求映射 JSON<textarea v-model="mapText" class="mono" rows="9" spellcheck="false" @input="updateMap" /><small>支持 CONSTANT + value、FACT + pointer。FACT 只读取原始输入。</small><small v-if="mapError" class="field-error">{{ mapError }}</small></label><div><label>Mock 行为<select :value="editor.document.value.mock.outcome" @change="changeOutcome(($event.target as HTMLSelectElement).value)"><option>RESPONSE</option><option>TIMEOUT</option><option>ERROR</option></select></label><label>Mock 响应 JSON<textarea v-model="responseText" class="mono" rows="6" spellcheck="false" :disabled="editor.document.value.mock.outcome!=='RESPONSE'" @input="updateResponse" /><small>partial 通过缺少实际响应字段表示。</small><small v-if="responseError" class="field-error">{{ responseError }}</small></label></div></div>
      <div class="mapping-guide"><Database :size="22" /><div><strong>响应映射由事实字段持有</strong><p>在事实目录中配置 binding.providerId 和 responsePointer。</p><RouterLink to="/facts?source=PROVIDER">配置事实响应映射 →</RouterLink></div></div>
      <p v-if="errors.length" class="field-error">{{ errors.join('；') }}</p><p v-if="dirty" class="unsaved-badge">未保存 · 先保存再测试映射</p><p v-if="editor.resource.value" class="muted">revision {{ editor.resource.value.revision }} · {{ editor.resource.value.updatedAt }}</p><p v-for="issue in editor.issues.value" :key="issue.pointer" class="field-error"><code>{{ issue.pointer }}</code> {{ issue.message }}</p><p v-if="editor.message.value" class="notice" role="status">{{ editor.message.value }}</p><footer class="config-form-footer"><Button variant="outline" type="button" @click="close()">关闭</Button><Button :disabled="editor.saving.value || errors.length>0 || !!mapError || !!responseError" type="submit">{{ editor.saving.value?'保存中…':editor.uncertain.value?'查询保存状态':'保存 Provider' }}</Button></footer>
      <section class="mapping-test"><h3>测试映射 · 服务端 Mock</h3><p>不执行规则。只测试已保存配置和当前绑定字段，不直接访问外部 Provider。</p><label>测试 facts JSON<textarea v-model="testFacts" class="mono" rows="3" spellcheck="false" /></label><Button variant="outline" type="button" :disabled="!editor.resource.value || dirty || editor.saving.value || editor.uncertain.value || testing || errors.length>0" @click="testMapping">{{ testing?'测试中…':'测试映射' }}</Button><p v-if="testMessage" class="notice error" role="alert">{{ testMessage }}</p><p v-if="traceId" class="muted">trace {{ traceId }}</p><FactResolutionPanel v-if="report" :report="report" :total-elapsed-millis="totalElapsed" :stale="stale" /></section>
    </form><p v-else-if="editor.message.value" class="notice error">{{ editor.message.value }}</p></DialogContent></Dialog><UnsavedDialog :open="guard.open.value" @settle="guard.settle" />
  </div>
</template>
