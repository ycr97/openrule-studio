import rawDefinition from './fixtures/order-admission.definition.json'
import { isDecimal } from '@/api/lossless'

export type NodeType = 'openrule.operator' | 'openrule.rule-set' | 'openrule.scorecard' | 'openrule.decision-table' | 'openrule.terminal'
export type Ref = { source: 'FACT' | 'VARIABLE' | 'NODE'; pointer: string }
export type Condition =
  | { kind: 'compare'; ref: Ref; op: string; value: unknown }
  | { kind: 'is-present' | 'is-missing' | 'is-null' | 'not-null'; ref: Ref }
  | { kind: 'all' | 'any' | 'not'; children: Condition[] }
export type Rule = { id: string; condition: Condition | null; value: unknown; reasonCode: string | null }
export type Bin = { id: string; condition: Condition | null; score: unknown; reasonCode: string | null }
export type Characteristic = { id: string; name: string; bins: Bin[] }
export type NodeConfig = {
  condition?: Condition | null
  outputKey?: string
  reasonCode?: string | null
  matchPolicy?: 'FIRST_MATCH' | 'ALL_MATCH'
  hitPolicy?: 'FIRST'
  rules?: Rule[]
  characteristics?: Characteristic[]
  decisionCode?: string | null
  reasonCodes?: string[]
  scoreRef?: string | null
}
export type FlowNode = {
  nodeId: string
  nodeName: string
  order: number
  type: NodeType
  configVersion: number
  timeoutMillis: number
  failPolicy?: 'ABORT' | 'CONTINUE'
  config: NodeConfig
}
export type Stage = {
  stageId: string
  stageName: string
  order: number
  executionMode: 'SERIAL' | 'PARALLEL'
  when: Condition | null
  timeoutMillis: number
  nodes: FlowNode[]
}
export type FlowDefinition = {
  schemaVersion: number
  flowId: string
  flowName: string
  version: string
  description: string
  stages: Stage[]
}

export const flow = rawDefinition as FlowDefinition

export const typeMeta: Record<NodeType, { name: string; english: string; color: string; description: string }> = {
  'openrule.operator': { name: '条件判断', english: 'Operator', color: 'blue', description: '字段比较与布尔条件' },
  'openrule.rule-set': { name: '规则集', english: 'Rule set', color: 'violet', description: '按顺序匹配一组规则' },
  'openrule.scorecard': { name: '评分卡', english: 'Scorecard', color: 'cyan', description: '多维分箱与精确累加' },
  'openrule.decision-table': { name: '决策表', english: 'Decision table', color: 'amber', description: '条件矩阵，首条命中' },
  'openrule.terminal': { name: '最终决策', english: 'Terminal', color: 'green', description: '输出业务决策并结束流程' },
}

const operators: Record<string, string> = {
  eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', in: '属于',
  'not-in': '不属于', between: '介于', contains: '包含', 'not-contains': '不包含',
  'starts-with': '以…开头', 'ends-with': '以…结尾',
}

export function conditionText(condition: Condition | null): string {
  if (!condition) return '无条件进入'
  if ('children' in condition) {
    if (condition.kind === 'not') return `非 (${conditionText(condition.children[0] ?? null)})`
    return condition.children.map(child => conditionText(child)).join(condition.kind === 'all' ? ' 且 ' : ' 或 ')
  }
  const name = condition.ref.pointer.replaceAll('/', '.').slice(1)
  if (condition.kind === 'is-present') return `${name} 存在`
  if (condition.kind === 'is-missing') return `${name} 缺失`
  if (condition.kind === 'is-null') return `${name} 为空`
  if (condition.kind === 'not-null') return `${name} 不为空`
  if ('value' in condition) {
    const value = Array.isArray(condition.value) ? condition.value.join('、') : String(isDecimal(condition.value) ? condition.value.text : condition.value)
    return `${name} ${operators[condition.op] ?? condition.op} ${value}`
  }
  return name
}

export function nodeSummary(node: FlowNode): string {
  switch (node.type) {
    case 'openrule.operator': return conditionText(node.config.condition ?? null)
    case 'openrule.rule-set': return `${node.config.rules?.length ?? 0} 条有序规则 · ${node.config.matchPolicy ?? ''}`
    case 'openrule.scorecard': return `${node.config.characteristics?.length ?? 0} 个评分维度 · 输出 ${node.config.outputKey}`
    case 'openrule.decision-table': return `${node.config.rules?.length ?? 0} 条条件行 · FIRST`
    case 'openrule.terminal': return `${node.config.decisionCode} · ${node.config.reasonCodes?.join('、') ?? ''}`
  }
}

export function stageSummary(stage: Stage): string {
  return conditionText(stage.when)
}
