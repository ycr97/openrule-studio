<script setup lang="ts">
import { computed } from 'vue'
import { stringifyJson } from '@/api/lossless'
import type { ExecutionResult, NodeResult, ScoreDetail } from '@/api/types'
import type { FlowDefinition } from '../sample'
import { typeMeta } from '../sample'
const props = defineProps<{ result: ExecutionResult; document: FlowDefinition; stale: boolean }>()
const stageName = (id: string) => props.document.stages.find(stage => stage.stageId === id)?.stageName ?? id
const nodeName = (id: string) => props.document.stages.flatMap(stage => stage.nodes).find(node => node.nodeId === id)?.nodeName ?? id
const characteristicName = (nodeId: string, detail: ScoreDetail) => (props.document.stages.flatMap(stage => stage.nodes).find(node => node.nodeId === nodeId)?.config.characteristics ?? []).find(item => item.id === detail.characteristicId)?.name ?? detail.characteristicId
const outputText = (node: NodeResult) => Object.keys(node.outputs).length ? stringifyJson(node.outputs) : '无输出'
const failedNodes = computed(() => props.result.nodeResults.filter(node => node.status === 'FAILED' || node.status === 'TIMED_OUT' || node.status === 'CANCELLED'))
</script>
<template>
  <div class="execution-result" :class="{ 'execution-stale': stale }">
    <div class="result-head"><strong>服务端结果 · {{ result.status }}</strong><span v-if="stale" class="unsaved-badge">结果已过时 · 请重新试运行</span></div>
    <div class="result-summary"><div><small>业务决策</small><strong>{{ result.decision?.decisionCode ?? '无业务决策' }}</strong></div><div><small>评分</small><strong>{{ result.decision?.score ?? '—' }}</strong></div><div><small>Terminal</small><strong>{{ result.decision?.terminalNodeId ?? '未到达' }}</strong></div><div><small>原因</small><strong>{{ result.decision?.reasonCodes.join('、') || '—' }}</strong></div></div>
    <p v-if="result.status === 'DECIDED' && failedNodes.length" class="result-notice">{{ failedNodes.length }} 个节点失败或超时后流程按 CONTINUE 到达 Terminal；本次执行仍是 DECIDED。</p>
    <p v-if="result.status === 'FAILED'" class="result-failure">执行技术失败，未产生业务决策。查看失败节点及原因。</p>
    <div class="result-meta"><span>Flow <code>{{ result.flowId }}</code></span><span>精确版本 <code>v{{ result.version }}</code></span><span>revision <code>{{ result.revision }}</code></span><span>耗时 {{ result.elapsedMillis }} ms</span><span>Terminal <code>{{ result.decision?.terminalNodeId ?? '—' }}</code></span><span>checksum <code>{{ result.definitionChecksum }}</code></span><span>trace <code>{{ result.traceId }}</code></span></div>
    <h3>执行路径</h3>
    <section v-for="stage in result.stageResults" :key="stage.stageId" class="result-stage"><div class="result-stage-head"><b>{{ stageName(stage.stageId) }}</b><code>{{ stage.stageId }}</code><span>{{ stage.status }}</span><small v-if="stage.skipReason">跳过 · {{ stage.skipReason }}</small></div><div v-for="node in result.nodeResults.filter(item => item.stageId === stage.stageId)" :key="node.nodeId" class="result-node-card"><div class="result-node-head"><strong>{{ nodeName(node.nodeId) }}</strong><code>{{ node.nodeId }}</code><span>{{ typeMeta[node.type as keyof typeof typeMeta]?.english ?? node.type }}</span><b>{{ node.status }}{{ node.hit ? ' · 命中' : node.status === 'SUCCEEDED' ? ' · 未命中' : '' }}</b></div><p v-if="node.skipReason">跳过原因 · {{ node.skipReason }}</p><p v-if="node.failure" class="result-failure">{{ node.failure.code }} · {{ node.failure.message }}</p><div v-for="(detail,index) in node.details" :key="index" class="result-detail"><template v-if="detail.kind === 'SCORE_BIN'"><span>评分维度 {{ characteristicName(node.nodeId, detail) }} <code>{{ detail.characteristicId }}</code></span><span>命中分箱 <code>{{ detail.binId }}</code></span><strong>{{ detail.score.startsWith('-') ? detail.score : `+${detail.score}` }}</strong><small>{{ detail.reasonCode }}</small></template><template v-else><span>命中行 <code>{{ detail.ruleId }}</code></span><strong>输出 {{ stringifyJson(detail.value) }}</strong><small>{{ detail.reasonCode }}</small></template></div><p v-if="node.status === 'SUCCEEDED' && !node.hit && (node.type === 'openrule.rule-set' || node.type === 'openrule.decision-table')">没有命中行；服务端输出 {{ outputText(node) }}</p><p v-else-if="Object.keys(node.outputs).length">输出 {{ outputText(node) }}</p></div></section>
  </div>
</template>
