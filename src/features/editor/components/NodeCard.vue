<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { nodeSummary, type FlowNode, typeMeta } from '../sample'
import NodeIcon from './NodeIcon.vue'

defineProps<{ node: FlowNode; selected: boolean }>()
const emit = defineEmits<{ select: [nodeId: string] }>()
</script>
<template>
  <button class="canvas-node" :class="{ selected, 'terminal-node': node.type === 'openrule.terminal' }" type="button" :aria-pressed="selected" @click="emit('select', node.nodeId)">
    <NodeIcon :type="node.type" />
    <span class="canvas-node-label"><strong>{{ node.nodeName }}</strong><small>{{ nodeSummary(node) }}</small></span>
    <span class="node-type-label" :class="typeMeta[node.type].color">{{ typeMeta[node.type].english }}</span>
    <ChevronRight :size="13" />
  </button>
</template>
