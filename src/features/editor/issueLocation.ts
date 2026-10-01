import type { ValidationIssue } from '../../api/types.ts'
import type { Condition, FlowDefinition, FlowNode } from './sample.ts'

export function locateIssue(document: FlowDefinition, issue: ValidationIssue) {
  const parts = issue.pointer.split('/').filter(Boolean)
  const stageIndex = parts[0] === 'stages' ? Number(parts[1]) : -1
  const stage = issue.stageId ? document.stages.find(item => item.stageId === issue.stageId) : document.stages[stageIndex]
  const nodeIndex = parts[2] === 'nodes' ? Number(parts[3]) : -1
  const node = issue.nodeId ? document.stages.flatMap(item => item.nodes).find(item => item.nodeId === issue.nodeId) : stage?.nodes[nodeIndex]
  let itemId = issue.itemId
  let field = parts.at(-1) ?? null
  if (node && !itemId) {
    const rulesIndex = parts.indexOf('rules')
    const characteristicIndex = parts.indexOf('characteristics')
    if (rulesIndex >= 0) itemId = node.config.rules?.[Number(parts[rulesIndex + 1])]?.id ?? null
    if (characteristicIndex >= 0) {
      const characteristic = node.config.characteristics?.[Number(parts[characteristicIndex + 1])]
      const binsIndex = parts.indexOf('bins')
      itemId = binsIndex >= 0 ? characteristic?.bins[Number(parts[binsIndex + 1])]?.id ?? null : characteristic?.id ?? null
    }
    if (!itemId && issue.message.includes('between')) { itemId = firstInvalidBetween(node); if (itemId) field = 'value' }
  }
  if (field === 'value' && parts.includes('rules') && !parts.includes('condition')) field = 'ruleValue'
  return { stageId: stage?.stageId ?? null, nodeId: node?.nodeId ?? null, itemId, field }
}
function firstInvalidBetween(node: FlowNode): string | null {
  const invalid = (condition: Condition | null): boolean => condition?.kind === 'compare' ? condition.op === 'between' && (!Array.isArray(condition.value) || condition.value.length !== 2) : !!condition && 'children' in condition && condition.children.some(invalid)
  for (const rule of node.config.rules ?? []) if (invalid(rule.condition)) return rule.id
  for (const characteristic of node.config.characteristics ?? []) for (const bin of characteristic.bins) if (invalid(bin.condition)) return bin.id
  return null
}
