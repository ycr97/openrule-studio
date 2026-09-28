<script setup lang="ts">
import { ArrowDown, Braces, Flag, GitBranch, Minus, Plus, Save, Play, Upload } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { studioApi, errorText } from '@/api/client'
import type { FlowSummary, ValidationIssue } from '@/api/types'
import { createEditorState } from './state'
import type { FlowNode, Stage } from './sample'
import StageCard from './components/StageCard.vue'
import NodePalette from './components/NodePalette.vue'
import InspectorPanel from './components/InspectorPanel.vue'
import NodeConfigDialog from './components/NodeConfigDialog.vue'
const route = useRoute(), router = useRouter()
const editor = createEditorState()
const selectedStageId = ref(''), selectedNodeId = ref(''), dialogOpen = ref(false), zoom = ref(100), activeTab = ref<'canvas'|'facts'|'versions'>('canvas')
const versions = ref<FlowSummary[]>([]), versionError = ref('')
const stages = computed(() => [...(editor.document.value?.stages ?? [])].sort((a,b) => a.order - b.order))
const selectedStage = computed(() => stages.value.find(s => s.stageId === selectedStageId.value) ?? stages.value[0])
const selectedNode = computed(() => selectedNodeId.value ? stages.value.flatMap(s => s.nodes).find(n => n.nodeId === selectedNodeId.value) : undefined)
const nodeCount = computed(() => stages.value.reduce((sum,s) => sum+s.nodes.length, 0))
const currentFlowId = computed(() => String(route.params.flowId ?? ''))
const currentVersion = computed(() => String(route.params.version ?? ''))
function selectStage(id: string) { selectedStageId.value = id; selectedNodeId.value = '' }
function selectNode(id: string, stageId: string) { selectedStageId.value = stageId; selectedNodeId.value = id }
async function load() {
  await editor.load(currentFlowId.value, currentVersion.value)
  selectedStageId.value = editor.document.value?.stages[0]?.stageId ?? ''
  selectedNodeId.value = ''
  await loadVersions()
}
async function loadVersions() { try { versions.value = (await studioApi.listVersions(currentFlowId.value)).items; versionError.value = '' } catch (e) { versionError.value = errorText(e) } }
watch([currentFlowId, currentVersion], load, { immediate: true })
function beforeUnload(event: BeforeUnloadEvent) { if (editor.dirty.value) event.preventDefault() }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(() => !editor.dirty.value || window.confirm('草稿有未保存修改。确定离开吗？'))
onBeforeRouteUpdate(() => !editor.dirty.value || window.confirm('草稿有未保存修改。确定切换版本吗？'))
function editStage(patch: Partial<Stage>) { const id = selectedStage.value?.stageId; editor.mutate(doc => Object.assign(doc.stages.find(s => s.stageId === id)!, patch)) }
function editNode(patch: Partial<FlowNode>) { const id = selectedNodeId.value; editor.mutate(doc => Object.assign(doc.stages.flatMap(s => s.nodes).find(n => n.nodeId === id)!, patch)) }
function editConfig(patch: Record<string, unknown>) { const id = selectedNodeId.value; editor.mutate(doc => Object.assign(doc.stages.flatMap(s => s.nodes).find(n => n.nodeId === id)!.config, patch)) }
function reorder<T extends { order: number }>(items: T[], index: number, offset: number) { const target = index + offset; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target]!, items[index]!]; items.forEach((item,i) => item.order = i+1) }
function moveStage(offset: number) { const id = selectedStage.value?.stageId; editor.mutate(doc => { const items = doc.stages.sort((a,b) => a.order-b.order); reorder(items, items.findIndex(s => s.stageId === id), offset) }) }
function removeStage() { const id = selectedStage.value?.stageId; if (!window.confirm('删除此阶段及全部节点？')) return; editor.mutate(doc => { doc.stages = doc.stages.filter(s => s.stageId !== id); doc.stages.forEach((s,i) => s.order = i+1) }); selectedStageId.value = stages.value[0]?.stageId ?? ''; selectedNodeId.value = '' }
function addStage() { const id = `stage_${crypto.randomUUID().slice(0,8)}`; editor.mutate(doc => doc.stages.push({ stageId:id, stageName:'新阶段', order:doc.stages.length+1, executionMode:'SERIAL', when:null, timeoutMillis:1000, nodes:[] })); selectStage(id); activeTab.value = 'canvas' }
function moveNode(offset: number) { const stageId = selectedStageId.value, id = selectedNodeId.value; editor.mutate(doc => { const items = doc.stages.find(s => s.stageId === stageId)!.nodes.sort((a,b) => a.order-b.order); reorder(items, items.findIndex(n => n.nodeId === id), offset) }) }
function removeNode() { if (!window.confirm('删除此节点？')) return; const stageId = selectedStageId.value, id = selectedNodeId.value; editor.mutate(doc => { const stage = doc.stages.find(s => s.stageId === stageId)!; stage.nodes = stage.nodes.filter(n => n.nodeId !== id); stage.nodes.forEach((n,i) => n.order = i+1) }); selectedNodeId.value = '' }
function addNode(type: 'openrule.operator'|'openrule.terminal') { const stageId = selectedStage.value?.stageId; if (!stageId) return; const id = `node_${crypto.randomUUID().slice(0,8)}`; editor.mutate(doc => { const stage = doc.stages.find(s => s.stageId === stageId)!; const base = { nodeId:id, nodeName:type === 'openrule.operator' ? '新条件判断' : '新最终决策', order:stage.nodes.length+1, type, configVersion:1, timeoutMillis:Math.min(stage.timeoutMillis,1000) }; stage.nodes.push(type === 'openrule.operator' ? { ...base, type, failPolicy:'ABORT', config:{ condition:null, outputKey:`output${stage.nodes.length+1}`, reasonCode:null } } : { ...base, type, config:{ decisionCode:null, reasonCodes:[], scoreRef:null } }) }); selectNode(id,stageId); activeTab.value = 'canvas' }
function jumpIssue(issue: ValidationIssue) { if (issue.stageId) selectStage(issue.stageId); if (issue.nodeId && issue.stageId) selectNode(issue.nodeId,issue.stageId); activeTab.value='canvas'; if (issue.nodeId) dialogOpen.value = false; requestAnimationFrame(() => document.querySelector('.inspector')?.scrollIntoView({ block:'nearest' })) }
async function createNextDraft() { const resource = editor.resource.value; if (!resource || resource.status !== 'PUBLISHED') return; try { const next = await studioApi.createDraft(resource.flowId, resource.version); await router.push(`/flows/${next.flowId}/versions/${next.version}`) } catch(e) { editor.message.value = errorText(e) } }
function openVersions() { activeTab.value = 'versions'; loadVersions() }
</script>
<template>
  <div class="editor-page" v-if="editor.document.value && editor.resource.value">
    <div class="editor-title"><div class="editor-name"><span class="flow-symbol"><GitBranch :size="23" /></span><div><div class="title-line"><h1>{{ editor.document.value.flowName }}</h1><Badge variant="secondary">v{{ editor.resource.value.version }}</Badge><span class="sample-badge">{{ editor.resource.value.status }} · r{{ editor.resource.value.revision }}</span><span v-if="editor.dirty.value" class="unsaved-badge">未保存</span></div><p><code>{{ editor.resource.value.flowId }}</code><span>·</span>调用方提供完整 facts · 服务端执行</p></div></div>
      <div class="editor-actions"><Button v-if="editor.readOnly.value" variant="outline" @click="createNextDraft">从此版本创建草稿</Button><template v-else><Button variant="outline" :disabled="editor.saving.value" @click="editor.save()"><Save :size="15" />{{ editor.saving.value ? '保存中…' : '保存草稿' }}</Button><Button variant="outline" :disabled="editor.validating.value" @click="editor.validate()">校验</Button><Button :disabled="editor.simulating.value || editor.saving.value" @click="editor.saveAndSimulate()"><Play :size="15" />{{ editor.simulating.value ? '试运行中…' : '保存并试运行' }}</Button></template><Button variant="outline" disabled title="F3 完整发布交互"><Upload :size="15" />发布版本</Button></div></div>
    <div class="editor-tabbar"><div class="editor-tabs"><button class="editor-tab" :class="{active:activeTab==='canvas'}" @click="activeTab='canvas'"><GitBranch :size="15" />可视化编排</button><button class="editor-tab" :class="{active:activeTab==='facts'}" @click="activeTab='facts'"><Braces :size="15" />输入事实</button><button class="editor-tab" :class="{active:activeTab==='versions'}" @click="openVersions">版本记录</button></div><span class="tab-context">{{ editor.readOnly.value ? '已发布 · 只读' : '草稿 · CAS revision' }}</span></div>
    <div v-if="editor.message.value" class="notice" :class="{error: editor.message.value.includes('OR-') || editor.message.value.includes('失败') || editor.message.value.includes('无法')}">{{ editor.message.value }}</div>
    <div v-if="editor.issues.value.length" class="issue-strip"><strong>校验问题 {{ editor.issues.value.length }}</strong><button v-for="(issue,index) in editor.issues.value" :key="index" type="button" @click="jumpIssue(issue)">{{ issue.stageId ?? 'Flow' }}{{ issue.nodeId ? ` / ${issue.nodeId}` : '' }} · {{ issue.message }} <small>{{ issue.pointer }}</small></button></div>
    <div v-if="activeTab==='canvas'" class="editor-content"><NodePalette :stage-count="stages.length" :node-count="nodeCount" :read-only="editor.readOnly.value" @add-node="addNode" /><section class="flow-canvas" aria-label="决策流程画布"><div class="canvas-toolbar"><span class="canvas-tag">LINEAR FLOW</span><span>按阶段顺序展示</span><button v-if="!editor.readOnly.value" class="inline-action" @click="addStage">+ 阶段</button><div class="zoom-control"><button type="button" aria-label="缩小画布" @click="zoom=Math.max(80,zoom-10)"><Minus :size="13" /></button><span>{{ zoom }}%</span><button type="button" aria-label="放大画布" @click="zoom=Math.min(120,zoom+10)"><Plus :size="13" /></button></div></div><div class="canvas-scroll"><div class="flow-chain" :style="{zoom:`${zoom}%`}"><div class="flow-start"><span class="start-dot" />开始 <span class="start-badge">调用方 facts</span></div><div class="chain-line"><ArrowDown :size="12" /></div><StageCard v-for="(stage,index) in stages" :key="stage.stageId" :stage="stage" :selected-stage-id="selectedStageId" :selected-node-id="selectedNodeId" :last="index===stages.length-1" @select-stage="selectStage" @select-node="selectNode" /><div class="chain-line" /><div class="canvas-end"><Flag :size="13" />最终决策由 Terminal 输出</div></div></div><div class="canvas-status"><span><i class="status-dot" />{{ editor.resource.value.status }} · revision {{ editor.resource.value.revision }}</span><span>{{ stages.length }} stages <span class="dot-separator">/</span>{{ nodeCount }} nodes</span></div></section><InspectorPanel :node="selectedNode" :stage="selectedStage" :read-only="editor.readOnly.value" @edit-stage="editStage" @edit-node="editNode" @edit-config="editConfig" @move-stage="moveStage" @remove-stage="removeStage" @move-node="moveNode" @remove-node="removeNode" @open-config="dialogOpen=true" /></div>
    <section v-if="activeTab==='facts'" class="workspace-panel"><h2>试运行输入</h2><p>完整 facts JSON；数字按原始字面量发送，null 与缺失字段保持不同。</p><textarea v-model="editor.factsText.value" spellcheck="false" aria-label="facts JSON" /><div class="panel-actions"><Button :disabled="editor.readOnly.value || editor.simulating.value" @click="editor.saveAndSimulate()">保存并试运行</Button></div><div v-if="editor.result.value" class="execution-result"><div class="result-head"><strong>服务端结果 · {{ editor.result.value.status }}</strong><span v-if="editor.staleResult.value" class="unsaved-badge">结果已过时</span></div><p>实际版本 v{{ editor.result.value.version }} · revision {{ editor.result.value.revision }}</p><p>决策 {{ editor.result.value.decision?.decisionCode ?? '无' }} · 原因 {{ editor.result.value.decision?.reasonCodes.join(', ') ?? '无' }} · score {{ editor.result.value.decision?.score ?? 'null' }}</p><p>checksum <code>{{ editor.result.value.definitionChecksum }}</code></p><p>trace <code>{{ editor.result.value.traceId }}</code></p><div v-for="node in editor.result.value.nodeResults" :key="node.nodeId" class="result-node"><b>{{ node.nodeId }}</b><span>{{ node.status }}{{ node.hit ? ' · 命中' : '' }}</span><span v-if="node.failure">{{ node.failure.code }} · {{ node.failure.message }}</span></div></div></section>
    <section v-if="activeTab==='versions'" class="workspace-panel"><h2>版本记录</h2><p>精确读取服务端版本。已发布版本始终只读。</p><div v-if="versionError" class="notice error">{{ versionError }}</div><div v-for="version in versions" :key="version.version" class="version-row"><RouterLink :to="`/flows/${version.flowId}/versions/${version.version}`">v{{ version.version }}</RouterLink><span>{{ version.status }}</span><span>revision {{ version.revision }}</span><code>{{ version.definitionChecksum ?? '未发布' }}</code></div></section>
    <NodeConfigDialog :node="selectedNode" :open="dialogOpen" @update:open="dialogOpen=$event" />
  </div><div v-else class="workspace-panel">{{ editor.loading.value ? '正在读取精确版本…' : editor.message.value || '未找到版本' }} <RouterLink to="/">返回列表</RouterLink></div>
</template>
