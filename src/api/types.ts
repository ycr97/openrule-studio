import type { FlowDefinition } from '../features/editor/sample.ts'
export type ValidationIssue = { code: string; severity: 'ERROR'; message: string; pointer: string; stageId: string | null; nodeId: string | null; itemId: string | null }
export type ValidationReport = { valid: boolean; issues: ValidationIssue[] }
export type FlowSummary = { flowId: string; flowName: string; version: string; status: 'DRAFT' | 'PUBLISHED'; revision: string; definitionChecksum: string | null }
export type FlowResource = FlowSummary & { document: FlowDefinition; validation: ValidationReport; changeNote: string | null; updatedAt: string }
export type FlowListItem = { flowId: string; flowName: string; currentDraft: FlowSummary | null; latestPublished: FlowSummary | null }
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number }
export type RuleDetail = { kind: 'RULE'; ruleId: string; reasonCode: string; value: unknown }
export type ScoreDetail = { kind: 'SCORE_BIN'; characteristicId: string; binId: string; score: string; reasonCode: string }
export type NodeResult = { stageId: string; nodeId: string; type: string; status: 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED' | 'SKIPPED'; skipReason: 'WHEN_FALSE' | 'TERMINATED' | 'ABORTED' | null; hit: boolean; reasonCodes: string[]; outputs: Record<string, unknown>; details: (RuleDetail | ScoreDetail)[]; failure: { code: string; message: string } | null; elapsedMillis: number }
export type ExecutionResult = { requestId: string; traceId: string; bizId: string; purpose: 'SIMULATE' | 'LIVE'; flowId: string; version: string; revision: string; definitionChecksum: string; status: 'DECIDED' | 'FAILED'; decision: { decisionCode: string; reasonCodes: string[]; score: string | null; terminalNodeId: string } | null; variables: Record<string, unknown>; stageResults: { stageId: string; status: string; skipReason: string | null }[]; nodeResults: NodeResult[]; elapsedMillis: number }
export type ErrorBody = { code: string; message: string; requestId: string | null; traceId: string | null; issues: ValidationIssue[]; execution: ExecutionResult | null }
