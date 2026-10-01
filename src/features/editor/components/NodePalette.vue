<script setup lang="ts">
import { LockKeyhole } from '@lucide/vue'
import { typeMeta, type NodeType } from '../sample'
import NodeIcon from './NodeIcon.vue'
const props = defineProps<{ stageCount: number; nodeCount: number; readOnly: boolean }>()
const emit = defineEmits<{ addNode: [type: NodeType] }>()
const types = Object.keys(typeMeta) as NodeType[]
</script>
<template>
  <aside class="node-palette" aria-label="节点库">
    <div class="section-label">节点库 <span>5</span></div><p class="palette-help">选择阶段后添加节点</p>
    <button v-for="type in types" :key="type" type="button" class="palette-node" :disabled="props.readOnly" title="添加到所选阶段" @click="emit('addNode', type)"><NodeIcon :type="type" compact /><span><strong>{{ typeMeta[type].name }}</strong><small>{{ typeMeta[type].english }}</small></span></button>
    <div class="palette-divider" /><div class="section-label">流程概览</div><div class="flow-stats"><span>执行阶段 <b>{{ stageCount }}</b></span><span>规则节点 <b>{{ nodeCount }}</b></span><span>输入来源 <b>调用方 facts</b></span></div>
    <div class="palette-note"><LockKeyhole :size="17" /><strong>服务端执行</strong><p>五类节点均通过 Studio API 校验与运行。</p></div>
  </aside>
</template>
