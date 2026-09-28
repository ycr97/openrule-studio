<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { studioApi, errorText } from '@/api/client'
import type { FlowListItem } from '@/api/types'
import { Button } from '@/components/ui/button'
const router = useRouter()
const flows = ref<FlowListItem[]>([])
const loading = ref(false), creating = ref(false), message = ref(''), query = ref(''), flowId = ref(''), flowName = ref('')
async function refresh() { loading.value = true; try { flows.value = (await studioApi.listFlows(query.value)).items; message.value = '' } catch (e) { message.value = errorText(e) } finally { loading.value = false } }
async function create() { creating.value = true; try { const next = await studioApi.createFlow(flowId.value.trim(), flowName.value.trim()); await router.push(`/flows/${next.flowId}/versions/${next.version}`) } catch (e) { message.value = errorText(e) } finally { creating.value = false } }
onMounted(refresh)
</script>
<template><section class="flow-list-page"><div class="list-heading"><div><h1>决策流</h1><p>从服务端读取草稿与已发布版本</p></div><Button @click="refresh">刷新列表</Button></div><div class="list-controls"><input v-model="query" placeholder="搜索 Flow ID 或名称" @keydown.enter="refresh" /><Button variant="outline" @click="refresh">搜索</Button></div><div v-if="message" class="notice error">{{ message }}</div><p v-if="loading">正在读取…</p><div v-else class="flow-list-items"><article v-for="flow in flows" :key="flow.flowId" class="flow-list-card"><div><strong>{{ flow.flowName }}</strong><code>{{ flow.flowId }}</code></div><div class="flow-list-links"><RouterLink v-if="flow.currentDraft" :to="`/flows/${flow.flowId}/versions/${flow.currentDraft.version}`">草稿 v{{ flow.currentDraft.version }}</RouterLink><RouterLink v-if="flow.latestPublished" :to="`/flows/${flow.flowId}/versions/${flow.latestPublished.version}`">已发布 v{{ flow.latestPublished.version }}</RouterLink></div></article><p v-if="!flows.length">暂无决策流</p></div><form class="create-flow" @submit.prevent="create"><h2>新建 Flow</h2><input v-model="flowId" required pattern="[a-z][a-z0-9_-]{2,63}" placeholder="flow_id" /><input v-model="flowName" required placeholder="流程名称" /><Button type="submit" :disabled="creating">创建草稿</Button></form></section></template>
