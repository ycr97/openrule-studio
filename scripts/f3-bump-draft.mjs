import { parseJson, stringifyJson } from '../src/api/lossless.ts'
const [flowId, version] = process.argv.slice(2)
if (!flowId || !version) throw new Error('Usage: node --experimental-strip-types scripts/f3-bump-draft.mjs FLOW_ID VERSION')
const base = process.env.STUDIO_API_BASE ?? 'http://127.0.0.1:8081/api/v2'
const url = `${base}/admin/flows/${encodeURIComponent(flowId)}/versions/${encodeURIComponent(version)}`
const currentResponse = await fetch(url)
if (!currentResponse.ok) throw new Error(`GET ${currentResponse.status}`)
const current = parseJson(await currentResponse.text())
if (current.status !== 'DRAFT') throw new Error('Target must be an isolated test draft')
const saveResponse = await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:stringifyJson({expectedRevision:current.revision,document:current.document})})
const saved = parseJson(await saveResponse.text())
if (!saveResponse.ok) throw new Error(`PUT ${saveResponse.status} ${saved.code}`)
console.log(`${flowId} v${version}: revision ${current.revision} -> ${saved.revision}; document unchanged`)
