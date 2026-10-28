import { ref } from 'vue'
import { request } from './client.ts'
import type { ConfigQuery, FactDocument, FactExecutionRequest, FactExecutionResult, FactPage, FactResource, FactSimulationRequest, MockTestRequest, MockTestResult, ProviderDocument, ProviderPage, ProviderResource, RequiredFactsResource } from './factTypes.ts'
export const configurationSerial = ref(0)
declare const __STUDIO_CONTRACT_MOCK__: boolean
export const contractMockEnabled = typeof __STUDIO_CONTRACT_MOCK__ !== 'undefined' && __STUDIO_CONTRACT_MOCK__
export const queryString = (query: ConfigQuery & { source?: string }) => new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== '').map(([key,value]) => [key,String(value)])).toString()
const id = encodeURIComponent
const versionPath = (flow: string, version: string) => `/admin/flows/${id(flow)}/versions/${id(version)}`
export const factApi = {
  listFacts: (query: ConfigQuery & { source?: 'CALLER' | 'PROVIDER' } = {}) => request<FactPage>(`/admin/facts?${queryString(query)}`),
  getFact: (factId: string) => request<FactResource>(`/admin/facts/${id(factId)}`),
  createFact: (document: FactDocument) => request<FactResource>('/admin/facts','POST',document),
  updateFact: (factId: string, expectedRevision: string, document: FactDocument) => request<FactResource>(`/admin/facts/${id(factId)}`,'PUT',{expectedRevision,document}),
  listProviders: (query: ConfigQuery = {}) => request<ProviderPage>(`/admin/fact-providers?${queryString(query)}`),
  getProvider: (providerId: string) => request<ProviderResource>(`/admin/fact-providers/${id(providerId)}`),
  createProvider: (document: ProviderDocument) => request<ProviderResource>('/admin/fact-providers','POST',document),
  updateProvider: (providerId: string, expectedRevision: string, document: ProviderDocument) => request<ProviderResource>(`/admin/fact-providers/${id(providerId)}`,'PUT',{expectedRevision,document}),
  testProviderMock: (providerId: string, payload: MockTestRequest) => request<MockTestResult>(`/admin/fact-providers/${id(providerId)}/mock-tests`,'POST',payload),
  requiredFacts: (flowId: string, version: string) => request<RequiredFactsResource>(`${versionPath(flowId,version)}/required-facts`),
  simulate: (flowId: string, version: string, payload: FactSimulationRequest) => request<FactExecutionResult>(`${versionPath(flowId,version)}/fact-simulations`,'POST',payload),
  executeVersion: (flowId: string, version: string, payload: FactExecutionRequest) => request<FactExecutionResult>(`/flows/${id(flowId)}/versions/${id(version)}/fact-executions`,'POST',payload),
}
