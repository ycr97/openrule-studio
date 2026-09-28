import { ref, computed } from 'vue'
import { studioApi, errorText } from '../../api/client.ts'
import type { ExecutionResult, FlowResource, ValidationIssue, ValidationReport } from '../../api/types.ts'
import { decodeTransport, parseJson, stringifyJson } from '../../api/lossless.ts'
import type { FlowDefinition } from './sample.ts'

export function createEditorState(api: typeof studioApi = studioApi) {
  const resource = ref<FlowResource | null>(null)
  const document = ref<FlowDefinition | null>(null)
  const baseline = ref('')
  const editSerial = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const validating = ref(false)
  const simulating = ref(false)
  const message = ref('')
  const issues = ref<ValidationIssue[]>([])
  const result = ref<ExecutionResult | null>(null)
  const resultSerial = ref(-1)
  const resultFacts = ref('')
  let loadSerial = 0
  const factsText = ref('{\n  "order": { "amount": 680, "country": "JP" },\n  "buyer": { "id": "buyer_1024", "ageDays": 365 },\n  "metrics": { "refundRate": 0.08 },\n  "risk": { "blacklisted": false },\n  "channel": "web"\n}')
  const dirty = computed(() => !!document.value && stringifyJson(document.value) !== baseline.value)
  const staleResult = computed(() => !!result.value && (resultSerial.value !== editSerial.value || resultFacts.value !== factsText.value || result.value.revision !== resource.value?.revision))
  const readOnly = computed(() => resource.value?.status !== 'DRAFT')
  function install(next: FlowResource) {
    resource.value = next
    document.value = next.document
    baseline.value = stringifyJson(next.document)
    editSerial.value++
    issues.value = next.validation.issues
    message.value = ''
    result.value = null
  }
  async function load(flowId: string, version: string) {
    const serial = ++loadSerial
    loading.value = true
    resource.value = null
    document.value = null
    result.value = null
    issues.value = []
    message.value = ''
    try { const next = await api.getVersion(flowId, version); if (serial === loadSerial) install(next) }
    catch (error) { if (serial === loadSerial) message.value = errorText(error) }
    finally { if (serial === loadSerial) loading.value = false }
  }
  function mutate(change: (value: FlowDefinition) => void) {
    if (!document.value || readOnly.value) return
    const next = decodeTransport(parseJson(stringifyJson(document.value))) as FlowDefinition
    change(next)
    document.value = next
    editSerial.value++
    issues.value = []
  }
  async function save(): Promise<boolean> {
    if (!resource.value || !document.value || saving.value || readOnly.value) return false
    saving.value = true
    message.value = ''
    const serial = editSerial.value
    const snapshot = document.value
    try {
      const saved = await api.saveDraft(resource.value.flowId, resource.value.version, resource.value.revision, snapshot)
      resource.value = saved
      baseline.value = stringifyJson(saved.document)
      if (editSerial.value === serial) { issues.value = saved.validation.issues; document.value = saved.document }
      message.value = editSerial.value === serial ? `草稿已保存 · revision ${saved.revision}` : `revision ${saved.revision} 已保存；后续编辑仍未保存`
      return true
    } catch (error) { message.value = errorText(error); if (error instanceof Error && 'body' in error) issues.value = (error as { body: { issues: ValidationIssue[] } }).body.issues ?? []; return false }
    finally { saving.value = false }
  }
  async function validate(): Promise<ValidationReport | null> {
    if (!resource.value || !document.value || validating.value) return null
    validating.value = true; message.value = ''
    const serial = editSerial.value
    try { const report = await api.validate(resource.value.flowId, resource.value.version, document.value); if (serial === editSerial.value) { issues.value = report.issues; message.value = report.valid ? '校验通过' : `校验发现 ${report.issues.length} 项问题` }; return serial === editSerial.value ? report : null }
    catch (error) { message.value = errorText(error); return null }
    finally { validating.value = false }
  }
  async function saveAndSimulate() {
    if (dirty.value && !(await save())) return
    if (dirty.value) { message.value = '保存期间发生新的编辑；请再次保存后试运行'; return }
    if (!resource.value || !document.value) return
    let facts: unknown
    try { facts = parseJson(factsText.value); if (!facts || typeof facts !== 'object' || Array.isArray(facts)) throw new Error('facts 必须是 JSON 对象') }
    catch (error) { message.value = errorText(error); return }
    const report = await validate()
    if (!report?.valid) return
    simulating.value = true; message.value = ''
    const serial = editSerial.value
    const text = factsText.value
    const revision = resource.value.revision
    try {
      const response = await api.simulate(resource.value.flowId, resource.value.version, revision, facts)
      if (resource.value?.revision === revision) { result.value = response; resultSerial.value = serial; resultFacts.value = text }
      message.value = '服务端试运行完成'
    } catch (error) { message.value = errorText(error); if (error instanceof Error && 'body' in error) issues.value = (error as { body: { issues: ValidationIssue[] } }).body.issues ?? [] }
    finally { simulating.value = false }
  }
  return { resource, document, dirty, readOnly, loading, saving, validating, simulating, message, issues, result, staleResult, factsText, install, load, mutate, save, validate, saveAndSimulate }
}
