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
  const publishing = ref(false)
  const message = ref('')
  const issues = ref<ValidationIssue[]>([])
  const result = ref<ExecutionResult | null>(null)
  const resultSerial = ref(-1)
  const resultFacts = ref('')
  let loadSerial = 0
  let simulationSerial = 0
  let publicationUnknown = false
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
    publicationUnknown = false
    simulationSerial++
    saving.value = false; validating.value = false; simulating.value = false; publishing.value = false
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
    if (!document.value || readOnly.value || publishing.value) return
    const next = decodeTransport(parseJson(stringifyJson(document.value))) as FlowDefinition
    change(next)
    document.value = next
    editSerial.value++
    issues.value = []
  }
  async function save(): Promise<boolean> {
    if (!resource.value || !document.value || saving.value || publishing.value || readOnly.value) return false
    saving.value = true
    message.value = ''
    const epoch = loadSerial
    const serial = editSerial.value
    const snapshot = document.value
    try {
      const saved = await api.saveDraft(resource.value.flowId, resource.value.version, resource.value.revision, snapshot)
      if (epoch !== loadSerial) return false
      resource.value = saved
      baseline.value = stringifyJson(saved.document)
      if (editSerial.value === serial) { issues.value = saved.validation.issues; document.value = saved.document }
      message.value = editSerial.value === serial ? `草稿已保存 · revision ${saved.revision}` : `revision ${saved.revision} 已保存；后续编辑仍未保存`
      return true
    } catch (error) { if (epoch !== loadSerial) return false; message.value = errorText(error); if (error instanceof Error && 'body' in error) issues.value = (error as { body: { issues: ValidationIssue[] } }).body.issues ?? []; return false }
    finally { if (epoch === loadSerial) saving.value = false }
  }
  async function validate(): Promise<ValidationReport | null> {
    if (!resource.value || !document.value || validating.value) return null
    const epoch = loadSerial
    validating.value = true; message.value = ''
    const serial = editSerial.value
    try { const report = await api.validate(resource.value.flowId, resource.value.version, document.value); if (epoch === loadSerial && serial === editSerial.value) { issues.value = report.issues; message.value = report.valid ? '校验通过' : `校验发现 ${report.issues.length} 项问题` }; return epoch === loadSerial && serial === editSerial.value ? report : null }
    catch (error) { if (epoch === loadSerial) message.value = errorText(error); return null }
    finally { if (epoch === loadSerial) validating.value = false }
  }
  async function saveAndSimulate() {
    if (simulating.value || publishing.value || validating.value) return
    const requestSerial = ++simulationSerial
    const epoch = loadSerial
    simulating.value = true
    try {
      if (dirty.value && !(await save())) return
      if (epoch !== loadSerial) return
      if (dirty.value) { message.value = '保存期间发生新的编辑；请再次保存后试运行'; return }
      if (!resource.value || !document.value) return
      const text = factsText.value
      let facts: unknown
      try { facts = parseJson(text); if (!facts || typeof facts !== 'object' || Array.isArray(facts)) throw new Error('facts 必须是 JSON 对象') }
      catch (error) { message.value = errorText(error); return }
      const serial = editSerial.value
      const { flowId, version, revision } = resource.value
      const report = await validate()
      if (!report?.valid || epoch !== loadSerial || resource.value?.revision !== revision) return
      message.value = ''
      try {
        const response = await api.simulate(flowId, version, revision, facts)
        if (requestSerial === simulationSerial && epoch === loadSerial && resource.value?.revision === revision) { result.value = response; resultSerial.value = serial; resultFacts.value = text; message.value = '服务端试运行完成' }
      } catch (error) {
        if (requestSerial === simulationSerial && epoch === loadSerial) {
          message.value = errorText(error)
          if (error instanceof Error && 'body' in error) {
            const body = (error as { body: { issues: ValidationIssue[]; execution?: ExecutionResult | null } }).body
            issues.value = body.issues ?? []
            if (body.execution) { result.value = body.execution; resultSerial.value = serial; resultFacts.value = text }
          }
        }
      }
    } finally { if (requestSerial === simulationSerial && epoch === loadSerial) simulating.value = false }
  }
  async function publish(changeNote: string): Promise<boolean> {
    if (!resource.value || !document.value || readOnly.value || dirty.value || saving.value || publishing.value) { message.value = dirty.value ? '请先保存当前修改，再确认发布' : '当前草稿无法发布'; return false }
    if (!changeNote.trim()) { message.value = '请填写发布说明'; return false }
    const epoch = loadSerial
    const snapshot = baseline.value
    publishing.value = true; message.value = ''
    const { flowId, version, revision } = resource.value
    try {
      if (publicationUnknown) {
        const current = await api.getVersion(flowId, version)
        if (epoch !== loadSerial) return false
        if (current.status === 'PUBLISHED' && stringifyJson(current.document) === snapshot) { install(current); publicationUnknown = false; message.value = `已确认服务端发布成功 · v${current.version}`; return true }
        if (current.status !== 'DRAFT' || current.revision !== revision) { message.value = '发布状态已变化；请核对服务端版本，本地输入保留'; return false }
        publicationUnknown = false
      }
      const published = await api.publish(flowId, version, revision, changeNote.trim())
      if (epoch !== loadSerial) return false
      install(published); message.value = `已发布精确版本 v${published.version} · revision ${published.revision}`
      return true
    } catch (error) {
      if (epoch !== loadSerial) return false
      if (!(error instanceof Error && 'status' in error) || Number((error as { status?: number }).status) >= 500) {
        publicationUnknown = true
        try {
          const current = await api.getVersion(flowId, version)
          if (epoch !== loadSerial) return false
          if (current.status === 'PUBLISHED' && stringifyJson(current.document) !== snapshot) { message.value = '服务端已发布不同内容；请核对精确版本，本地输入保留'; return false }
          if (current.status === 'PUBLISHED') { publicationUnknown = false; install(current); message.value = `已确认服务端发布成功 · v${current.version}`; return true }
          if (current.status === 'DRAFT' && current.revision === revision) publicationUnknown = false
          if (current.revision !== revision) { message.value = '发布响应丢失且 revision 已变化；请核对服务端版本，本地输入保留'; return false }
        } catch { /* retain the original transport error */ }
      }
      message.value = errorText(error)
      if (error instanceof Error && 'body' in error) issues.value = (error as { body: { issues: ValidationIssue[] } }).body.issues ?? []
      return false
    } finally { if (epoch === loadSerial) publishing.value = false }
  }
  return { resource, document, dirty, readOnly, loading, saving, validating, simulating, publishing, message, issues, result, staleResult, factsText, install, load, mutate, save, validate, saveAndSimulate, publish }
}
