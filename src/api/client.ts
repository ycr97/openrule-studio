import { decodeTransport, parseJson, stringifyJson } from './lossless.ts'
import type { ErrorBody, ExecutionResult, FlowListItem, FlowResource, FlowSummary, Page, ValidationReport } from './types.ts'
import type { FlowDefinition } from '../features/editor/sample.ts'
const base = import.meta.env?.VITE_API_BASE ?? '/api/v2'
export class ApiError extends Error {
  readonly status: number
  readonly body: ErrorBody
  constructor(status: number, body: ErrorBody) {
    super(body.message)
    this.status = status
    this.body = body
  }
  get conflict() { return this.status === 409 && this.body.code === 'OR-REVISION-CONFLICT' }
}
export function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.conflict ? 'OR-REVISION-CONFLICT：服务端 revision 已变化；本地输入保留，请手动核对最新版本' : `${error.body.code}: ${error.message}${error.body.traceId ? ` · trace ${error.body.traceId}` : ''}`
  return error instanceof Error ? error.message : '请求失败'
}
export async function request<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  let response: Response
  try { response = await fetch(`${base}${path}`, { method, headers: { Accept: 'application/json', ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: payload === undefined ? undefined : stringifyJson(payload) }) }
  catch { throw new Error('无法连接后端 API；请检查服务地址和 Vite 代理') }
  const text = await response.text()
  let parsed: unknown
  try { parsed = decodeTransport(parseJson(text)) } catch { throw new Error(`HTTP ${response.status} 返回了无效 JSON`) }
  if (!response.ok) throw new ApiError(response.status, parsed as ErrorBody)
  return parsed as T
}
const segment = (value: string) => encodeURIComponent(value)
const versionPath = (flowId: string, version: string) => `/admin/flows/${segment(flowId)}/versions/${segment(version)}`
export const studioApi = {
  listFlows: (q = '', page = 1) => request<Page<FlowListItem>>(`/admin/flows?page=${page}&pageSize=100&q=${encodeURIComponent(q)}`),
  createFlow: (flowId: string, flowName: string) => request<FlowResource>('/admin/flows', 'POST', { flowId, flowName }),
  listVersions: (flowId: string) => request<Page<FlowSummary>>(`/admin/flows/${segment(flowId)}/versions?page=1&pageSize=100`),
  getVersion: (flowId: string, version: string) => request<FlowResource>(versionPath(flowId, version)),
  createDraft: (flowId: string, sourceVersion: string) => request<FlowResource>(`/admin/flows/${segment(flowId)}/drafts`, 'POST', { sourceVersion }),
  saveDraft: (flowId: string, version: string, expectedRevision: string, document: FlowDefinition) => request<FlowResource>(versionPath(flowId, version), 'PUT', { expectedRevision, document }),
  validate: (flowId: string, version: string, document: FlowDefinition) => request<ValidationReport>(`${versionPath(flowId, version)}/validations`, 'POST', { document }),
  simulate: (flowId: string, version: string, expectedRevision: string, facts: unknown) => request<ExecutionResult>(`${versionPath(flowId, version)}/simulations`, 'POST', { expectedRevision, requestId: crypto.randomUUID(), bizId: `studio-${Date.now()}`, facts, timeoutMillis: 3000 }),
  publish: (flowId: string, version: string, expectedRevision: string, changeNote: string) => request<FlowResource>(`${versionPath(flowId, version)}/publish`, 'POST', { expectedRevision, changeNote }),
  executeVersion: (flowId: string, version: string, facts: unknown) => request<ExecutionResult>(`/flows/${segment(flowId)}/versions/${segment(version)}/executions`, 'POST', { requestId: crypto.randomUUID(), bizId: `studio-live-${Date.now()}`, facts, timeoutMillis: 3000 }),
}
