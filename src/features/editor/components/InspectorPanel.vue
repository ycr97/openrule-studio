<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import type { FlowNode, Stage, Condition } from '../sample'
import { typeMeta } from '../sample'
import ConditionBuilder from './ConditionBuilder.vue'
import NodeIcon from './NodeIcon.vue'
const props = defineProps<{ node?: FlowNode; stage?: Stage; readOnly: boolean }>()
const emit = defineEmits<{ editStage: [patch: Partial<Stage>]; editNode: [patch: Partial<FlowNode>]; editConfig: [patch: Record<string, unknown>]; moveStage: [offset: number]; removeStage: []; moveNode: [offset: number]; removeNode: []; openConfig: [] }>()
const advanced = computed(() => !!props.node && !['openrule.operator','openrule.terminal'].includes(props.node.type))
function stageWhen(value: Condition | null) { emit('editStage', { when: value }) }
function nodeCondition(value: Condition | null) { emit('editConfig', { condition: value }) }
function number(value: string) { const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1 }
</script>
<template>
  <aside class="inspector" aria-label="属性面板">
    <div class="inspector-heading"><span>{{ node ? '节点配置' : '阶段配置' }}</span><span class="inspector-type">{{ node ? typeMeta[node.type].english : 'Stage' }}</span></div>
    <div class="inspector-scroll">
      <template v-if="node">
        <div class="inspector-node-title"><NodeIcon :type="node.type" /><span><h2>{{ node.nodeName }}</h2><code>{{ node.nodeId }}</code></span></div>
        <label class="field-label">节点名称<input :value="node.nodeName" :disabled="readOnly || advanced" @input="emit('editNode', { nodeName: ($event.target as HTMLInputElement).value })" /></label>
        <template v-if="node.type === 'openrule.operator'">
          <label class="field-label">输出变量<input :value="node.config.outputKey" :disabled="readOnly" @input="emit('editConfig', { outputKey: ($event.target as HTMLInputElement).value })" /></label>
          <label class="field-label">命中原因码<input :value="node.config.reasonCode ?? ''" :disabled="readOnly" @input="emit('editConfig', { reasonCode: ($event.target as HTMLInputElement).value || null })" /></label>
          <div class="inspector-section"><p class="section-label">判断条件</p><ConditionBuilder :model-value="node.config.condition ?? null" :disabled="readOnly" @update:model-value="nodeCondition" /></div>
          <label class="field-label">失败策略<select :value="node.failPolicy" :disabled="readOnly" @change="emit('editNode', { failPolicy: ($event.target as HTMLSelectElement).value as 'ABORT' | 'CONTINUE' })"><option>ABORT</option><option>CONTINUE</option></select></label>
        </template>
        <template v-else-if="node.type === 'openrule.terminal'">
          <label class="field-label">决策码<input :value="node.config.decisionCode ?? ''" :disabled="readOnly" @input="emit('editConfig', { decisionCode: ($event.target as HTMLInputElement).value || null })" /></label>
          <label class="field-label">原因码（逗号分隔）<input :value="node.config.reasonCodes?.join(', ')" :disabled="readOnly" @input="emit('editConfig', { reasonCodes: ($event.target as HTMLInputElement).value.split(',').map(x => x.trim()).filter(Boolean) })" /></label>
          <label class="field-label">评分变量<input :value="node.config.scoreRef ?? ''" :disabled="readOnly" @input="emit('editConfig', { scoreRef: ($event.target as HTMLInputElement).value || null })" /></label>
        </template>
        <template v-else><div class="condition-chip">高级节点配置在 F3 编辑；本阶段完整保留服务端原文档。</div><Button variant="outline" class="config-button" @click="emit('openConfig')">查看完整配置</Button></template>
        <label class="field-label">节点超时（ms）<input type="number" min="1" :value="node.timeoutMillis" :disabled="readOnly || advanced" @change="emit('editNode', { timeoutMillis: number(($event.target as HTMLInputElement).value) })" /></label>
        <div v-if="!readOnly && !advanced" class="inspector-operations"><button @click="emit('moveNode', -1)">上移</button><button @click="emit('moveNode', 1)">下移</button><button class="danger" @click="emit('removeNode')">删除节点</button></div>
      </template>
      <template v-else-if="stage">
        <h2 class="inspector-stage-title">{{ stage.stageName }}</h2>
        <label class="field-label">阶段名称<input :value="stage.stageName" :disabled="readOnly" @input="emit('editStage', { stageName: ($event.target as HTMLInputElement).value })" /></label>
        <label class="field-label">执行模式<select :value="stage.executionMode" :disabled="readOnly" @change="emit('editStage', { executionMode: ($event.target as HTMLSelectElement).value as Stage['executionMode'] })"><option>SERIAL</option><option>PARALLEL</option></select></label>
        <label class="field-label">阶段超时（ms）<input type="number" min="1" :value="stage.timeoutMillis" :disabled="readOnly" @change="emit('editStage', { timeoutMillis: number(($event.target as HTMLInputElement).value) })" /></label>
        <div class="inspector-section"><p class="section-label">进入条件 WHEN</p><ConditionBuilder :model-value="stage.when" :disabled="readOnly" @update:model-value="stageWhen" /></div>
        <div v-if="!readOnly" class="inspector-operations"><button @click="emit('moveStage', -1)">上移</button><button @click="emit('moveStage', 1)">下移</button><button class="danger" @click="emit('removeStage')">删除阶段</button></div>
      </template>
    </div>
    <div class="inspector-foot">{{ readOnly ? '已发布版本 · 只读' : '草稿配置 · 保存后写入服务端' }}</div>
  </aside>
</template>
