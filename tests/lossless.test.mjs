import test from 'node:test'
import assert from 'node:assert/strict'
import { parseJson, stringifyJson, decodeTransport, isDecimal } from '../src/api/lossless.ts'

test('facts preserve decimal lexemes, huge integers, null and missing', () => {
  const input = '{"amount":9007199254740993,"ratio":0.1,"zero":0,"nil":null,"nested":{"order":9007199254740993}}'
  const parsed = parseJson(input)
  assert.equal(parsed.amount.text, '9007199254740993')
  assert.equal(parsed.ratio.text, '0.1')
  assert.equal(parsed.nil, null)
  assert.equal(Object.hasOwn(parsed, 'missing'), false)
  assert.equal(parsed.nested.order.text, '9007199254740993')
  assert.equal(stringifyJson(parsed), input)
})
test('only protocol integers become Number, arbitrary config values stay lexical', () => {
  const parsed = decodeTransport(parseJson('{"revision":"12","page":1,"document":{"schemaVersion":2,"stages":[{"order":1,"config":{"value":{"order":9007199254740993},"score":0.300}}]}}'))
  assert.equal(parsed.page, 1)
  assert.equal(parsed.document.schemaVersion, 2)
  assert.equal(parsed.document.stages[0].order, 1)
  assert.ok(isDecimal(parsed.document.stages[0].config.score))
  assert.equal(parsed.document.stages[0].config.value.order.text, '9007199254740993')
  assert.equal(parsed.revision, '12')
})
test('unsafe ordinary JS numbers cannot be serialized', () => {
  assert.throws(() => stringifyJson({ amount: 9007199254740993 }), RangeError)
  assert.equal(stringifyJson(parseJson('{"a":1e-7}')), '{"a":1e-7}')
})
