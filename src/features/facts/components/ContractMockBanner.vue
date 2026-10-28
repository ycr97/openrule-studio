<script setup lang="ts">
import { onMounted, ref } from 'vue'
const scenario=ref('normal'), writeFault=ref('none'), error=ref(''), busy=ref(false)
const scenarios=[['normal','正常 · MF-01'],['partial','partial · MF-05'],['provider-timeout','Provider 超时 · MF-06'],['deadline','请求超时 · MF-09'],['mock','Mock 补数 · MF-10'],['technical-failure','技术失败 · MF-18'],['precision','精确数值 · MT-08']]
async function inspect() {try {const response=await fetch('/__studio_mock');if(!response.ok)throw new Error('契约 Mock 服务未启用');const value=await response.json();scenario.value=value.scenario;writeFault.value=value.writeFault} catch(e) {error.value=String(e)}}
onMounted(inspect)
async function apply(reset: boolean) {
  if(reset && !window.confirm('载入固定 fixture 并重置契约 Mock 数据？请先保存或关闭本地编辑。')) return
  busy.value=true;error.value=''
  try {const response=await fetch('/__studio_mock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reset?{scenario:scenario.value}:{writeFault:writeFault.value})});if(!response.ok)throw new Error('契约 Mock 控制请求失败');const value=await response.json();if(reset){sessionStorage.setItem('studio-contract-input',value.requestText);window.location.assign('/flows/order_admission/versions/1?tab=facts')}} catch(e) {error.value=String(e)} finally {busy.value=false}
}
</script>
<template><aside class="contract-mock-banner" aria-label="契约 Mock 控制"><div><strong>开发专用 · 契约 Mock</strong><span>固定响应 fixture；没有真实 HTTP / Java / MySQL 联调。</span></div><label>响应场景<select v-model="scenario" aria-label="契约响应场景"><option v-for="[id,label] in scenarios" :key="id" :value="id">{{ label }}</option></select></label><button :disabled="busy" @click="apply(true)">载入场景并重置 Mock</button><label>配置写入<select v-model="writeFault" aria-label="配置写入故障"><option value="none">正常</option><option value="conflict">CAS 冲突</option><option value="failure">保存失败</option><option value="lost">保存后丢响应</option></select></label><button :disabled="busy" @click="apply(false)">设置写入故障</button><p v-if="error" role="alert">{{ error }}</p></aside></template>
