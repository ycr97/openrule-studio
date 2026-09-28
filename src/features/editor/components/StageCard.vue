<script setup lang="ts">
import { ArrowDown, GitBranch, MoreHorizontal } from '@lucide/vue'
import { stageSummary, type Stage } from '../sample'
import NodeCard from './NodeCard.vue'

defineProps<{ stage: Stage; selectedStageId: string; selectedNodeId: string; last: boolean }>()
const emit = defineEmits<{ selectStage: [stageId: string]; selectNode: [nodeId: string, stageId: string] }>()
</script>
<template>
  <div class="stage-wrap">
    <section class="stage-block" :class="{ 'stage-active': selectedStageId === stage.stageId }" :aria-label="stage.stageName">
      <header class="stage-top">
        <button type="button" class="stage-heading" @click="emit('selectStage', stage.stageId)">
          <span class="stage-number">{{ String(stage.order).padStart(2, '0') }}</span>
          <strong>{{ stage.stageName }}</strong>
          <span class="stage-mode">{{ stage.executionMode }}</span>
        </button>
        <MoreHorizontal :size="15" class="stage-more" aria-hidden="true" />
      </header>
      <div v-if="stage.when" class="stage-guard"><GitBranch :size="12" /><span>WHEN · {{ stageSummary(stage) }}</span></div>
      <div class="stage-nodes" :class="{ parallel: stage.executionMode === 'PARALLEL' }">
        <template v-for="(node, index) in stage.nodes" :key="node.nodeId">
          <NodeCard :node="node" :selected="selectedNodeId === node.nodeId" @select="emit('selectNode', $event, stage.stageId)" />
          <span v-if="stage.executionMode === 'SERIAL' && index < stage.nodes.length - 1" class="node-connector" />
        </template>
      </div>
    </section>
    <div v-if="!last" class="chain-line"><ArrowDown :size="12" /></div>
  </div>
</template>
