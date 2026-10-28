import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
export function useUnsavedGuard(dirty: Ref<boolean>) {
  const open=ref(false)
  let resolve: ((value: boolean) => void) | null=null
  function settle(discard: boolean) { open.value=false; resolve?.(discard); resolve=null }
  function confirmDiscard(): Promise<boolean> { if(!dirty.value) return Promise.resolve(true); open.value=true; return new Promise(result=>{resolve=result}) }
  const unload=(event: BeforeUnloadEvent)=>{if(dirty.value) event.preventDefault()}
  onMounted(()=>window.addEventListener('beforeunload',unload))
  onBeforeUnmount(()=>{window.removeEventListener('beforeunload',unload); settle(false)})
  onBeforeRouteLeave(()=>confirmDiscard())
  return {open,settle,confirmDiscard}
}
