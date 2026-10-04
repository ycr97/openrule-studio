<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isDecimal, parseJson, stringifyJson } from '@/api/lossless'
import { conditionText, type Bin, type Characteristic, type Condition, type FlowNode, type Rule, typeMeta } from '../sample'
import ConditionBuilder from './ConditionBuilder.vue'

const props = defineProps<{ node: FlowNode | undefined; open: boolean; readOnly: boolean; focusItemId?: string | null; focusField?: string | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; editConfig: [patch: Record<string, unknown>]; invalid: [value: boolean] }>()
const errors = ref<Record<string, string>>({})
const raw = ref<Record<string, string>>({})
const expandedConditions = ref<Record<string, boolean>>({})
const rules = computed(() => props.node?.config.rules ?? [])
const characteristics = computed(() => props.node?.config.characteristics ?? [])
const canEdit = computed(() => !props.readOnly)
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`
const starterCondition = (): Condition => ({ kind: 'is-present', ref: { source: 'FACT', pointer: '/order/amount' } })
watch(() => props.node?.nodeId, () => { errors.value = {}; raw.value = {}; expandedConditions.value = {}; emit('invalid', false) })
watch(() => props.open, async open => {
  if (!open || !props.focusItemId) return
  expandedConditions.value = { ...expandedConditions.value, [props.focusItemId]: true }
  await nextTick()
  document.querySelector(`[data-item-id="${props.focusItemId}"]`)?.scrollIntoView({ block: 'center' })
  const field = props.focusField ? document.querySelector(`[data-item-id="${props.focusItemId}"] [data-field="${props.focusField}"]`) as HTMLElement | null : null
  field?.focus()
})
function setError(key: string, value: string) { const next = { ...errors.value }; if (value) next[key] = value; else delete next[key]; errors.value = next; emit('invalid', Object.keys(next).length > 0) }
function rawValue(key: string, value: unknown) { return raw.value[key] ?? stringifyJson(value) }
function updateJson(key: string, text: string, apply: (value: unknown) => void, numeric = false) {
  raw.value = { ...raw.value, [key]: text }
  try {
    const value = parseJson(text)
    if (numeric && value !== null && !isDecimal(value)) throw new Error('分值必须是 JSON 数字')
    setError(key, '')
    apply(value)
  } catch { setError(key, numeric ? '请输入有效十进制数字；未配置可填 null' : '请输入有效 JSON 值；字符串需加引号') }
}
function patchRule(ruleId: string, patch: Partial<Rule>) { emit('editConfig', { rules: rules.value.map(rule => rule.id === ruleId ? { ...rule, ...patch } : rule) }) }
function addRule() { emit('editConfig', { rules: [...rules.value, { id: id('rule'), condition: starterCondition(), value: null, reasonCode: null }] }) }
function clearItem(ids: string[]) { for (const key of Object.keys(errors.value)) if (ids.some(id => key.startsWith(`${id}:`))) setError(key, ''); for (const key of Object.keys(raw.value)) if (ids.some(id => key.startsWith(`${id}:`))) delete raw.value[key] }
function removeRule(ruleId: string) { clearItem([ruleId]); emit('editConfig', { rules: rules.value.filter(rule => rule.id !== ruleId) }) }
function shift<T>(items: T[], index: number, offset: number): T[] { const to = index + offset; if (to < 0 || to >= items.length) return items; const next = [...items]; [next[index], next[to]] = [next[to]!, next[index]!]; return next }
function moveRule(index: number, offset: number) { emit('editConfig', { rules: shift(rules.value, index, offset) }) }
function patchCharacteristic(characteristicId: string, patch: Partial<Characteristic>) { emit('editConfig', { characteristics: characteristics.value.map(item => item.id === characteristicId ? { ...item, ...patch } : item) }) }
function addCharacteristic() { emit('editConfig', { characteristics: [...characteristics.value, { id: id('char'), name: '新评分维度', bins: [] }] }) }
function removeCharacteristic(characteristicId: string) { clearItem([characteristicId, ...(characteristics.value.find(item => item.id === characteristicId)?.bins.map(bin => bin.id) ?? [])]); emit('editConfig', { characteristics: characteristics.value.filter(item => item.id !== characteristicId) }) }
function moveCharacteristic(index: number, offset: number) { emit('editConfig', { characteristics: shift(characteristics.value, index, offset) }) }
function patchBin(characteristic: Characteristic, binId: string, patch: Partial<Bin>) { patchCharacteristic(characteristic.id, { bins: characteristic.bins.map(bin => bin.id === binId ? { ...bin, ...patch } : bin) }) }
function addBin(characteristic: Characteristic) { patchCharacteristic(characteristic.id, { bins: [...characteristic.bins, { id: id('bin'), condition: starterCondition(), score: null, reasonCode: null }] }) }
function removeBin(characteristic: Characteristic, binId: string) { clearItem([binId]); patchCharacteristic(characteristic.id, { bins: characteristic.bins.filter(bin => bin.id !== binId) }) }
function moveBin(characteristic: Characteristic, index: number, offset: number) { patchCharacteristic(characteristic.id, { bins: shift(characteristic.bins, index, offset) }) }
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="config-dialog">
      <DialogHeader>
        <DialogTitle>{{ node?.nodeName }} · {{ node && typeMeta[node.type].name }}</DialogTitle>
        <DialogDescription>规则和分箱按列表顺序执行。{{ readOnly ? '已发布版本只读。' : '修改后保存草稿，再校验或试运行。' }}</DialogDescription>
      </DialogHeader>
      <div v-if="node" class="config-dialog-body">
        <div class="config-meta"><span>节点 ID <code>{{ node.nodeId }}</code></span><span>超时 <code>{{ node.timeoutMillis }} ms</code></span><span v-if="node.failPolicy">失败策略 <code>{{ node.failPolicy }}</code></span></div>
        <template v-if="node.type === 'openrule.rule-set' || node.type === 'openrule.decision-table'">
          <div class="config-top-fields">
            <label class="field-label">输出变量<input data-field="outputKey" :value="node.config.outputKey" :disabled="readOnly" @input="emit('editConfig', { outputKey: ($event.target as HTMLInputElement).value })" /></label>
            <label class="field-label">命中策略<select v-if="node.type === 'openrule.rule-set'" data-field="matchPolicy" :value="node.config.matchPolicy" :disabled="readOnly" @change="emit('editConfig', { matchPolicy: ($event.target as HTMLSelectElement).value })"><option>FIRST_MATCH</option><option>ALL_MATCH</option></select><input v-else value="FIRST" disabled /></label>
          </div>
          <div class="config-section-head"><h3>{{ node.type === 'openrule.rule-set' ? '规则列表' : '条件行' }} · {{ rules.length }}</h3><button v-if="canEdit" class="inline-action" @click="addRule">+ 添加{{ node.type === 'openrule.rule-set' ? '规则' : '条件行' }}</button></div>
          <div class="config-table-scroll">
            <table class="config-table">
              <thead><tr><th>顺序 / 条件</th><th>输出值 · JSON</th><th>原因码</th><th>操作</th></tr></thead>
              <tbody v-for="(rule,index) in rules" :key="rule.id" class="config-edit-card" :data-item-id="rule.id">
                <tr>
                  <td><div class="config-row-condition"><span class="number">{{ index + 1 }}</span><div><button type="button" class="config-condition-toggle" :aria-expanded="!!expandedConditions[rule.id]" @click="expandedConditions[rule.id] = !expandedConditions[rule.id]">{{ conditionText(rule.condition) }}</button><code>{{ rule.id }}</code><small v-if="errors[`${rule.id}:condition`]" class="field-error">{{ errors[`${rule.id}:condition`] }}</small></div></div></td>
                  <td><input data-field="ruleValue" :aria-label="`${rule.id} 输出值 · JSON`" :value="rawValue(`${rule.id}:value`, rule.value)" :disabled="readOnly" @input="updateJson(`${rule.id}:value`, ($event.target as HTMLInputElement).value, value => patchRule(rule.id, { value }))" /><small v-if="errors[`${rule.id}:value`]" class="field-error">{{ errors[`${rule.id}:value`] }}</small></td>
                  <td><input data-field="reasonCode" :aria-label="`${rule.id} 命中原因码`" :value="rule.reasonCode ?? ''" :disabled="readOnly" @input="patchRule(rule.id,{reasonCode:($event.target as HTMLInputElement).value || null})" /></td>
                  <td><div v-if="canEdit" class="config-card-actions"><button :disabled="index===0" @click="moveRule(index,-1)">上移</button><button :disabled="index===rules.length-1" @click="moveRule(index,1)">下移</button><button class="danger" @click="removeRule(rule.id)">删除</button></div><span v-else class="row-readonly">只读</span></td>
                </tr>
                <tr v-if="expandedConditions[rule.id]"><td colspan="4" class="config-expanded-condition"><ConditionBuilder :model-value="rule.condition" :disabled="readOnly" @update:model-value="patchRule(rule.id,{condition:$event})" @invalid="setError(`${rule.id}:condition`, $event ? '条件 JSON 值无效' : '')" /></td></tr>
              </tbody>
            </table>
          </div>
        </template>
        <template v-else-if="node.type === 'openrule.scorecard'">
          <label class="field-label">总分输出变量<input data-field="outputKey" :value="node.config.outputKey" :disabled="readOnly" @input="emit('editConfig', { outputKey: ($event.target as HTMLInputElement).value })" /></label>
          <div class="config-section-head"><h3>评分维度 · {{ characteristics.length }}</h3><button v-if="canEdit" class="inline-action" @click="addCharacteristic">+ 添加维度</button></div>
          <section v-for="(characteristic,ci) in characteristics" :key="characteristic.id" class="config-characteristic" :data-item-id="characteristic.id">
            <div class="config-card-head">
              <span class="number">{{ ci+1 }}</span>
              <label class="field-label characteristic-name"><span class="sr-only">维度名称</span><input data-field="name" :value="characteristic.name" :disabled="readOnly" @input="patchCharacteristic(characteristic.id,{name:($event.target as HTMLInputElement).value})" /></label>
              <code>{{ characteristic.id }}</code>
              <div v-if="canEdit" class="config-card-actions"><button :disabled="ci===0" @click="moveCharacteristic(ci,-1)">上移</button><button :disabled="ci===characteristics.length-1" @click="moveCharacteristic(ci,1)">下移</button><button class="danger" @click="removeCharacteristic(characteristic.id)">删除维度</button></div>
            </div>
            <div class="config-section-head"><h3>分箱 · {{ characteristic.bins.length }}</h3><button v-if="canEdit" class="inline-action" @click="addBin(characteristic)">+ 添加分箱</button></div>
            <div class="config-table-scroll">
              <table class="config-table">
                <thead><tr><th>顺序 / 条件</th><th>分值 · 精确十进制</th><th>原因码</th><th>操作</th></tr></thead>
                <tbody v-for="(bin,bi) in characteristic.bins" :key="bin.id" class="config-edit-card" :data-item-id="bin.id">
                  <tr>
                    <td><div class="config-row-condition"><span class="number">{{ bi+1 }}</span><div><button type="button" class="config-condition-toggle" :aria-expanded="!!expandedConditions[bin.id]" @click="expandedConditions[bin.id] = !expandedConditions[bin.id]">{{ conditionText(bin.condition) }}</button><code>{{ bin.id }}</code><small v-if="errors[`${bin.id}:condition`]" class="field-error">{{ errors[`${bin.id}:condition`] }}</small></div></div></td>
                    <td><input data-field="score" inputmode="decimal" :aria-label="`${bin.id} 分值 · 精确十进制`" :value="rawValue(`${bin.id}:score`, bin.score)" :disabled="readOnly" @input="updateJson(`${bin.id}:score`, ($event.target as HTMLInputElement).value, score => patchBin(characteristic, bin.id, { score }), true)" /><small v-if="errors[`${bin.id}:score`]" class="field-error">{{ errors[`${bin.id}:score`] }}</small></td>
                    <td><input data-field="reasonCode" :aria-label="`${bin.id} 命中原因码`" :value="bin.reasonCode ?? ''" :disabled="readOnly" @input="patchBin(characteristic,bin.id,{reasonCode:($event.target as HTMLInputElement).value || null})" /></td>
                    <td><div v-if="canEdit" class="config-card-actions"><button :disabled="bi===0" @click="moveBin(characteristic,bi,-1)">上移</button><button :disabled="bi===characteristic.bins.length-1" @click="moveBin(characteristic,bi,1)">下移</button><button class="danger" @click="removeBin(characteristic,bin.id)">删除</button></div><span v-else class="row-readonly">只读</span></td>
                  </tr>
                  <tr v-if="expandedConditions[bin.id]"><td colspan="4" class="config-expanded-condition"><ConditionBuilder :model-value="bin.condition" :disabled="readOnly" @update:model-value="patchBin(characteristic,bin.id,{condition:$event})" @invalid="setError(`${bin.id}:condition`, $event ? '条件 JSON 值无效' : '')" /></td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
        <template v-else><h3>配置预览</h3><div class="condition-preview">{{ node.type === 'openrule.operator' ? conditionText(node.config.condition ?? null) : node.config.decisionCode }}</div></template>
      </div>
    </DialogContent>
  </Dialog>
</template>
