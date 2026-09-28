<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { stringifyJson } from '@/api/lossless'
import { conditionText, type FlowNode, typeMeta } from '../sample'

const props = defineProps<{ node: FlowNode | undefined; open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="config-dialog">
      <DialogHeader>
        <DialogTitle>{{ props.node?.nodeName }} · {{ props.node && typeMeta[props.node.type].name }}</DialogTitle>
        <DialogDescription>服务端配置只读预览；三类高级节点的专用编辑器在 F3 接入。</DialogDescription>
      </DialogHeader>
      <div v-if="props.node" class="config-dialog-body">
        <div class="config-meta"><span>节点 ID <code>{{ props.node.nodeId }}</code></span><span>超时 <code>{{ props.node.timeoutMillis }} ms</code></span><span v-if="props.node.failPolicy">失败策略 <code>{{ props.node.failPolicy }}</code></span></div>
        <template v-if="props.node.type === 'openrule.operator'"><h3>判断条件</h3><div class="condition-preview">{{ conditionText(props.node.config.condition ?? null) }}</div><p class="config-caption">命中原因 · {{ props.node.config.reasonCode }}</p></template>
        <template v-else-if="props.node.type === 'openrule.scorecard'"><div v-for="characteristic in props.node.config.characteristics" :key="characteristic.id" class="config-group"><h3>{{ characteristic.name }}</h3><div v-for="bin in characteristic.bins" :key="bin.id" class="config-row"><span>{{ conditionText(bin.condition) }}</span><strong>+{{ bin.score === null ? 'null' : stringifyJson(bin.score) }}</strong></div></div></template>
        <template v-else-if="props.node.type === 'openrule.rule-set' || props.node.type === 'openrule.decision-table'"><h3>有序条件 · {{ props.node.config.matchPolicy ?? props.node.config.hitPolicy }}</h3><div v-for="rule in props.node.config.rules" :key="rule.id" class="config-row"><span><small>{{ rule.id }}</small>{{ conditionText(rule.condition) }}</span><strong>{{ stringifyJson(rule.value) }}</strong></div></template>
        <template v-else><h3>最终业务决策</h3><div class="config-row"><span>决策码</span><strong>{{ props.node.config.decisionCode }}</strong></div><div class="config-row"><span>原因码</span><strong>{{ props.node.config.reasonCodes?.join(', ') }}</strong></div><div class="config-row"><span>评分变量</span><strong>{{ props.node.config.scoreRef ?? '无' }}</strong></div></template>
      </div>
    </DialogContent>
  </Dialog>
</template>
