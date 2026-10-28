import { isDecimal } from '../../api/lossless.ts'
import type { FactDocument, ProviderDocument } from '../../api/factTypes.ts'
export const validPointer = (value: string) => typeof value==='string' && /^(?:|\/(?:[^~/]|~[01])*(?:\/(?:[^~/]|~[01])*)*)$/.test(value) && value.length<=512
export const validId = (value: string) => /^[a-z][a-z0-9_-]{2,63}$/.test(value)
export function factErrors(value: FactDocument): string[] {
  const errors: string[]=[]
  if(!validId(value.factId)) errors.push('factId 必须为 3～64 位小写字母、数字、下划线或连字符，并以字母开头')
  if(!value.name.trim() || value.name.length>128) errors.push('名称必须为 1～128 个字符')
  if(value.description.length>1024) errors.push('说明不能超过 1024 个字符')
  const tokens=value.path.slice(1).split('/').map(token=>token.replaceAll('~1','/').replaceAll('~0','~'))
  if(!validPointer(value.path) || !value.path.startsWith('/') || tokens.some(token=>!token || /^\d+$/.test(token) || ['__proto__','constructor','prototype'].includes(token))) errors.push('事实路径必须为对象叶子路径；不能含空段、数字或危险名称')
  if(value.binding && (!validId(value.binding.providerId) || !validPointer(value.binding.responsePointer))) errors.push('请选择 Provider 并填写合法的响应 JSON Pointer（根路径可为空）')
  return errors
}
export function providerErrors(value: ProviderDocument): string[] {
  const errors: string[]=[]
  if(!validId(value.providerId)) errors.push('providerId 必须为 3～64 位小写字母、数字、下划线或连字符，并以字母开头')
  if(!value.name.trim() || value.name.length>128) errors.push('名称必须为 1～128 个字符')
  if(value.description.length>1024) errors.push('说明不能超过 1024 个字符')
  if(value.type==='HTTP') {
    if(!/^https?:\/\/[^/?#@\s]+(?:\/[^?#\s]*)?$/.test(value.endpoint) || value.endpoint.length>2048) errors.push('HTTP(S) 端点不能含凭证、query 或 fragment')
    if(![value.connectTimeoutMillis,value.readTimeoutMillis].every(number=>Number.isInteger(number) && number>=1 && number<=60000) || value.connectTimeoutMillis>value.readTimeoutMillis) errors.push('超时必须为 1～60000 ms，连接超时不能大于完整响应预算')
    if(value.secretRef!==null && !/^env:OPENRULE_[A-Z0-9_]+$/.test(value.secretRef)) errors.push('secretRef 仅允许 env:OPENRULE_<NAME> 引用，不填写凭证值')
  }
  if(!value.requestMap || typeof value.requestMap!=='object' || Array.isArray(value.requestMap) || isDecimal(value.requestMap)) errors.push('请求映射必须是对象')
  else {
    if(Object.keys(value.requestMap).length>64) errors.push('请求映射最多 64 项')
    for(const [key,mapping] of Object.entries(value.requestMap)) {
      if(!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) errors.push(`无效的映射目标键：${key}`)
      if(!mapping || typeof mapping!=='object' || Array.isArray(mapping) || !((mapping.source==='FACT' && validPointer(mapping.pointer) && Object.keys(mapping).sort().join(',')==='pointer,source') || (mapping.source==='CONSTANT' && Object.hasOwn(mapping,'value') && Object.keys(mapping).sort().join(',')==='source,value'))) errors.push(`映射 ${key} 仅支持 FACT + pointer 或 CONSTANT + value`)
    }
  }
  if(value.mock.outcome==='RESPONSE' && (!value.mock.response || typeof value.mock.response!=='object' || Array.isArray(value.mock.response) || isDecimal(value.mock.response))) errors.push('Mock RESPONSE 的 response 必须是对象')
  return errors
}
