/** Business JSON numbers retain their source lexeme until they reach Java. */
export type Decimal = { readonly __decimal: true; readonly text: string }
export const decimal = (text: string): Decimal => {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text)) throw new Error('无效 JSON 数字')
  return { __decimal: true, text }
}
export const isDecimal = (value: unknown): value is Decimal => !!value && typeof value === 'object' && (value as Decimal).__decimal === true
const integerKeys = new Set(['schemaVersion', 'order', 'configVersion', 'timeoutMillis', 'elapsedMillis', 'page', 'pageSize', 'total'])
export function parseJson(text: string): unknown {
  let nonce = crypto.randomUUID()
  while (text.includes(nonce)) nonce = crypto.randomUUID()
  const marker = `__or_num_${nonce}_`
  let rewritten = '', quoted = false, escaped = false
  const values: string[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quoted) {
      rewritten += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') { quoted = true; rewritten += char; continue }
    if (char === '-' || (char >= '0' && char <= '9')) {
      const match = text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)
      if (!match) throw new SyntaxError('Invalid JSON number')
      values.push(match[0]); rewritten += JSON.stringify(`${marker}${values.length - 1}`)
      i += match[0].length - 1; continue
    }
    rewritten += char
  }
  const parsed: unknown = JSON.parse(rewritten)
  function restore(value: unknown): unknown {
    if (typeof value === 'string' && value.startsWith(marker)) {
      const index = Number(value.slice(marker.length))
      if (Number.isInteger(index) && index >= 0 && index < values.length) {
        const raw = values[index]!
        return decimal(raw)
      }
    }
    if (Array.isArray(value)) return value.map(item => restore(item))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restore(v)]))
    return value
  }
  return restore(parsed)
}
export function stringifyJson(value: unknown): string {
  if (isDecimal(value)) return value.text
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new RangeError('普通 Number 仅用于安全的传输整数')
    return String(value)
  }
  if (Array.isArray(value)) return `[${value.map(stringifyJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}:${stringifyJson(v)}`).join(',')}}`
  throw new TypeError('不支持的 JSON 值')
}

/** Only fixed protocol integers are converted; arbitrary facts/config values are untouched. */
export function decodeTransport(value: unknown, business = false): unknown {
  if (Array.isArray(value)) return value.map(item => decodeTransport(item, business))
  if (isDecimal(value)) return value
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const nextBusiness = business || ['facts', 'value', 'variables', 'outputs', 'details', 'config'].includes(key)
    if (!nextBusiness && integerKeys.has(key) && isDecimal(item)) {
      const number = Number(item.text)
      if (!Number.isSafeInteger(number)) throw new RangeError(`传输整数超出安全范围: ${key}`)
      return [key, number]
    }
    return [key, decodeTransport(item, nextBusiness)]
  }))
  return value
}
