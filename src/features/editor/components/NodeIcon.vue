<script setup lang="ts">
import { Calculator, Flag, GitBranch, ListFilter, Table2 } from '@lucide/vue'
import { computed } from 'vue'
import { typeMeta, type NodeType } from '../sample'

const props = defineProps<{ type: NodeType; compact?: boolean }>()
const icon = computed(() => ({
  'openrule.operator': ListFilter,
  'openrule.rule-set': GitBranch,
  'openrule.scorecard': Calculator,
  'openrule.decision-table': Table2,
  'openrule.terminal': Flag,
})[props.type])
</script>
<template>
  <span class="node-icon" :class="[typeMeta[type].color, { compact }]">
    <component :is="icon" :size="compact ? 15 : 18" />
  </span>
</template>
