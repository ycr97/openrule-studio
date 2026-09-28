<script setup lang="ts">
import { LockKeyhole } from '@lucide/vue'
import { typeMeta, type NodeType } from '../sample'
import NodeIcon from './NodeIcon.vue'
const props = defineProps<{ stageCount: number; nodeCount: number; readOnly: boolean }>()
const emit = defineEmits<{ addNode: [type: 'openrule.operator' | 'openrule.terminal'] }>()
const types = Object.keys(typeMeta) as NodeType[]
</script>
<template>
  <aside class="node-palette" aria-label="节点库">
    <div class="section-label">节点库 <span>5</span></div><p class="palette-help">选择阶段后添加基础节点</p>
    <button v-for="type in types" :key="type" type="button" class="palette-node" :disabled="props.readOnly || !['openrule.operator','openrule.terminal'].includes(type)" :title="['openrule.operator','openrule.terminal'].includes(type) ? '添加到所选阶段' : 'F3 开放专用编辑器'" @click="emit('addNode', type as 'openrule.operator' | 'openrule.terminal')"><NodeIcon :type="type" compact /><span><strong>{{ typeMeta[type].name }}</strong><small>{{ typeMeta[type].english }}</small></span></button>
    <div class="palette-divider" /><div class="section-label">流程概览</div><div class="flow-stats"><span>执行阶段 <b>{{ stageCount }}</b></span><span>规则节点 <b>{{ nodeCount }}</b></span><span>输入来源 <b>调用方 facts</b></span></div>
    <div class="palette-note"><LockKeyhole :size="17" /><strong>服务端执行</strong><p>保存、校验与试运行通过 B2 API。高级节点在 F3 编辑。</p></div>
  </aside>
</template>
