import { computed, shallowRef, ref } from 'vue'
import { ApiError, errorText } from '../../api/client.ts'
import { parseJson, decodeTransport, stringifyJson } from '../../api/lossless.ts'
import { configurationSerial } from '../../api/facts.ts'
import type { ConfigResource } from '../../api/factTypes.ts'
import type { ValidationIssue } from '../../api/types.ts'
const clone = <T>(value: T): T => decodeTransport(parseJson(stringifyJson(value))) as T
export function createConfigEditor<D>(api: { get(id: string): Promise<ConfigResource<D>>; create(document: D): Promise<ConfigResource<D>>; update(id: string, revision: string, document: D): Promise<ConfigResource<D>> }, identity: (document: D) => string) {
  const resource = shallowRef<ConfigResource<D> | null>(null), document = ref<D | null>(null) as ReturnType<typeof shallowRef<D | null>>
  const baseline = ref(''), loading = ref(false), saving = ref(false), message = ref(''), issues = ref<ValidationIssue[]>([])
  let epoch = 0
  let pending: { id: string; revision: string | null; snapshot: string } | null = null
  const dirty = computed(() => !!document.value && stringifyJson(document.value) !== baseline.value)
  const uncertain = ref(false)
  function begin(blank: D) { epoch++; pending=null; uncertain.value=false; resource.value=null; document.value=clone(blank); baseline.value=stringifyJson(blank); message.value=''; issues.value=[]; loading.value=false; saving.value=false }
  async function load(id: string) {
    const serial=++epoch; loading.value=true; message.value=''; document.value=null; resource.value=null; pending=null; uncertain.value=false
    try { const value=await api.get(id); if(serial!==epoch) return; resource.value=value; document.value=clone(value.document); baseline.value=stringifyJson(value.document) }
    catch(error) { if(serial===epoch) message.value=errorText(error) }
    finally { if(serial===epoch) loading.value=false }
  }
  function accept(value: ConfigResource<D>, snapshot: string) {
    resource.value=value; baseline.value=stringifyJson(value.document)
    if(document.value && stringifyJson(document.value)===snapshot) document.value=clone(value.document)
    pending=null; uncertain.value=false; configurationSerial.value++
    message.value=dirty.value ? `revision ${value.revision} 已保存；后续修改尚未保存` : `配置已保存 · revision ${value.revision}`
  }
  async function reconcile(serial: number): Promise<'confirmed' | 'unchanged' | 'blocked'> {
    const target=pending
    if(!target) return 'unchanged'
    try {
      const current=await api.get(target.id)
      if(serial!==epoch) return 'blocked'
      if(stringifyJson(current.document)===target.snapshot && (target.revision===null || current.revision!==target.revision)) { accept(current,target.snapshot); return 'confirmed' }
      if(current.revision===target.revision) { pending=null; uncertain.value=false; return 'unchanged' }
      message.value='OR-REVISION-CONFLICT：保存状态已变化；本地输入保留，请核对服务端配置'; return 'blocked'
    } catch(error) {
      if(serial!==epoch) return 'blocked'
      if(target.revision===null && error instanceof ApiError && error.status===404) { pending=null; uncertain.value=false; return 'unchanged' }
      message.value=`保存结果未知；查询失败，未重发写请求。${errorText(error)}`; return 'blocked'
    }
  }
  async function save(): Promise<boolean> {
    if(!document.value || saving.value || loading.value) return false
    const serial=epoch; saving.value=true; message.value=''; issues.value=[]
    try {
      if(pending) { const outcome=await reconcile(serial); if(outcome==='unchanged') message.value='已确认上次写入未保存；本地输入保留，请再次点击保存配置'; return outcome==='confirmed' }
      if(serial!==epoch || !document.value) return false
      const snapshot=stringifyJson(document.value), value=clone(document.value), id=identity(value), revision=resource.value?.revision ?? null
      try {
        const saved=revision===null ? await api.create(value) : await api.update(id,revision,value)
        if(serial!==epoch) { configurationSerial.value++; return false }
        accept(saved,snapshot); return true
      } catch(error) {
        if(serial!==epoch) return false
        if(!(error instanceof ApiError) || error.status>=500) { pending={id,revision,snapshot}; uncertain.value=true; const outcome=await reconcile(serial); if(outcome==='confirmed') return true; if(outcome==='blocked') return false }
        throw error
      }
    } catch(error) { if(serial===epoch) { message.value=errorText(error); if(error instanceof ApiError) issues.value=error.body.issues ?? [] }; return false }
    finally { if(serial===epoch) saving.value=false }
  }
  function invalidate() { epoch++ }
  return {resource,document,dirty,loading,saving,message,issues,uncertain,begin,load,save,invalidate}
}
