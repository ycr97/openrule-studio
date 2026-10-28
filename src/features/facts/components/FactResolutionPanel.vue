<script setup lang="ts">
import type { FactResolutionReport } from '@/api/factTypes'
defineProps<{report: FactResolutionReport; totalElapsedMillis: number | null; stale?: boolean}>()
</script>
<template>
  <section class="resolution-panel" aria-label="事实解析结果" :class="{'execution-stale':stale}">
    <div class="result-head"><h2>事实解析 · {{ report.status }}</h2><span v-if="stale" class="unsaved-badge">结果已过时 · 请重新运行</span></div>
    <p class="muted">{{ report.mode==='HTTP' ? 'HTTP 补数' : 'Mock 补数' }} · 解析耗时 {{ report.elapsedMillis }} ms · 请求总耗时 {{ totalElapsedMillis ?? '—' }} ms</p>
    <p>摘要由服务端脱敏；resolved 表示取得值，不代表规则类型校验通过。摘要不能作为原始 facts 回传。</p>
    <div class="table-scroll"><table class="catalog-table"><thead><tr><th>事实路径</th><th>状态 / 来源</th><th>脱敏摘要</th><th>配置 revision</th><th>字段错误</th></tr></thead><tbody><tr v-for="field in report.fields" :key="field.path"><td><code>{{ field.path }}</code><small>{{ field.factId ?? '未登记' }}</small></td><td><span class="state-pill" :class="field.status">{{ field.status }}</span><small>{{ field.source }}</small></td><td><code class="summary-value">{{ field.valueSummary ?? '—' }}</code></td><td>Catalog {{ field.catalogRevision ?? '—' }}<small>{{ field.providerId ?? '无 Provider' }} · r{{ field.providerRevision ?? '—' }}</small></td><td><span v-if="field.error" class="field-error">{{ field.error.code }}<small>{{ field.error.message }}</small></span><span v-else>—</span></td></tr></tbody></table></div>
    <h3>Provider 调用 · {{ report.calls.length }}</h3><p v-if="!report.calls.length">没有 Provider 调用记录。</p>
    <article v-for="call in report.calls" :key="call.providerId" class="provider-call"><div class="result-head"><strong>{{ call.providerId }} · r{{ call.providerRevision }}</strong><span class="state-pill">{{ call.status }}</span></div><p>{{ call.transport }} · 适配器{{ call.attempted ? '已开始' : '未开始' }} · {{ call.elapsedMillis }} ms</p><p><code>{{ call.requestedPaths.join('、') }}</code></p><small>trace {{ call.traceId }}</small><p v-if="call.error" class="field-error">{{ call.error.code }} · {{ call.error.message }}</p></article>
  </section>
</template>
