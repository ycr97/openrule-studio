<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseJson, stringifyJson } from '@/api/lossless'
import type { Condition, Ref } from '../sample'
const props = defineProps<{ modelValue: Condition | null; disabled?: boolean; depth?: number; field?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: Condition | null] }>()
const depth = computed(() => props.depth ?? 0)
const kind = computed(() => props.modelValue?.kind ?? 'none')
const valueText = ref('null')
const valueError = ref('')
watch(() => props.modelValue, value => { if (value?.kind === 'compare') valueText.value = stringifyJson(value.value) }, { immediate: true })
function setKind(next: string) {
  if (next === 'none') return emit('update:modelValue', null)
  if (next === 'all' || next === 'any' || next === 'not') return emit('update:modelValue', { kind: next, children: [{ kind: 'is-present', ref: { source: 'FACT', pointer: '/order/amount' } }] })
  const ref: Ref = { source: 'FACT', pointer: '/order/amount' }
  if (next === 'compare') return emit('update:modelValue', { kind: 'compare', ref, op: 'eq', value: null })
  emit('update:modelValue', { kind: next as 'is-present', ref })
}
function patchRef(key: keyof Ref, value: string) {
  const current = props.modelValue
  if (!current || !('ref' in current)) return
  emit('update:modelValue', { ...current, ref: { ...current.ref, [key]: value } } as Condition)
}
function patchValue() {
  const current = props.modelValue
  if (current?.kind !== 'compare') return
  try { const value = parseJson(valueText.value); emit('update:modelValue', { ...current, value }); valueError.value = '' }
  catch { valueError.value = '请输入有效 JSON 值（字符串需加引号）' }
}
function patchChild(index: number, value: Condition | null) {
  const current = props.modelValue
  if (!current || !('children' in current)) return
  const children = [...current.children]
  if (value) children[index] = value
  else children.splice(index, 1)
  if (!children.length) return emit('update:modelValue', null)
  emit('update:modelValue', { ...current, children })
}
function addChild() {
  const current = props.modelValue
  if (!current || !('children' in current) || current.kind === 'not') return
  emit('update:modelValue', { ...current, children: [...current.children, { kind: 'is-present', ref: { source: 'FACT', pointer: '/order/amount' } }] })
}
</script>
<template>
  <div class="condition-builder" :style="{ marginLeft: depth ? '12px' : '0' }">
    <div class="condition-line"><select :data-field="field ?? 'condition'" :value="kind" :disabled="disabled" aria-label="条件类型" @change="setKind(($event.target as HTMLSelectElement).value)"><option value="none">无条件</option><option value="compare">比较</option><option value="is-present">存在</option><option value="is-missing">缺失</option><option value="is-null">为 null</option><option value="not-null">非 null</option><option value="all">全部满足</option><option value="any">任一满足</option><option value="not">取反</option></select><span v-if="depth" class="condition-depth">子条件</span></div>
    <template v-if="modelValue && 'ref' in modelValue"><div class="condition-line"><select data-field="source" :value="modelValue.ref.source" :disabled="disabled" aria-label="引用来源" @change="patchRef('source', ($event.target as HTMLSelectElement).value)"><option>FACT</option><option>VARIABLE</option><option>NODE</option></select><input :value="modelValue.ref.pointer" :disabled="disabled" data-field="pointer" aria-label="JSON Pointer" placeholder="/order/amount" @input="patchRef('pointer', ($event.target as HTMLInputElement).value)" /></div><div v-if="modelValue.kind === 'compare'" class="condition-line"><select data-field="op" :value="modelValue.op" :disabled="disabled" aria-label="比较操作" @change="emit('update:modelValue', { ...modelValue, op: ($event.target as HTMLSelectElement).value })"><option v-for="op in ['eq','ne','gt','gte','lt','lte','in','not-in','between','contains','not-contains','starts-with','ends-with']" :key="op">{{ op }}</option></select><input data-field="value" v-model="valueText" :disabled="disabled" aria-label="比较值 JSON" @blur="patchValue" @keydown.enter="patchValue" /></div><small v-if="valueError" class="field-error">{{ valueError }}</small></template>
    <template v-if="modelValue && 'children' in modelValue"><ConditionBuilder v-for="(child, index) in modelValue.children" :key="index" :model-value="child" :disabled="disabled" :depth="depth + 1" @update:model-value="patchChild(index, $event)" /><button v-if="modelValue.kind !== 'not' && !disabled" type="button" class="inline-action" @click="addChild">+ 子条件</button></template>
  </div>
</template>
