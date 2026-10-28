<script setup lang="ts">
import { ref, watch } from 'vue'
import { factApi } from '@/api/facts'
import { errorText } from '@/api/client'
import type { RequiredFactsResource } from '@/api/factTypes'
const props=defineProps<{flowId:string;version:string;revision:string}>()
const value=ref<RequiredFactsResource|null>(null), error=ref(''), busy=ref(false)
let serial=0
watch(()=>[props.flowId,props.version,props.revision],()=>{serial++; value.value=null; error.value=''; busy.value=false})
async function load() { const target=++serial; busy.value=true; error.value=''; try { const next=await factApi.requiredFacts(props.flowId,props.version); if(target===serial) value.value=next } catch(e) {if(target===serial) error.value=errorText(e)} finally {if(target===serial) busy.value=false} }
</script>
<template><details class="required-facts"><summary>已保存版本的事实依赖</summary><p>静态依赖包括条件分支中的事实；它不是全局必填列表。</p><button class="inline-action" :disabled="busy" @click="load">{{ busy?'读取中…':'读取事实依赖' }}</button><p v-if="error" class="field-error">{{ error }}</p><div v-if="value"><p>v{{ value.version }} · revision {{ value.revision }}<span v-if="value.revision!==revision"> · 已过时，请重新读取</span></p><p v-for="field in value.requiredFacts" :key="field.path"><code>{{ field.path || '根对象' }}</code> · {{ field.expectedTypes.join(' / ') || '类型未知' }} · {{ field.uses.length }} 处引用 <span v-if="field.typeConflict" class="field-error">类型提示冲突</span></p></div></details></template>
