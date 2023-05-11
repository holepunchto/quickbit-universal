import test from 'brittle'
import b4a from 'b4a'

import { get, set, fill, findFirst, Index } from './fallback.js'

test('get', (t) => {
  const field = b4a.alloc(1)

  field[0] = 0xff
  t.is(get(field, 0), true)
  t.is(get(field, 7), true)

  field[0] = 0xfe
  t.is(get(field, 0), false)
  t.is(get(field, 7), true)
})

test('set', (t) => {
  const field = b4a.alloc(1)
  field[0] = 0xfe

  t.is(set(field, 0), true)
  t.is(field[0], 0xff)

  t.is(set(field, 0), false)

  t.is(set(field, 0, false), true)
  t.is(field[0], 0xfe)
})

test('fill', (t) => {
  const field = b4a.alloc(4)

  fill(field, true, 4, 28)
  t.alike([...field], [0xf0, 0xff, 0xff, 0x0f])
})

test('findFirst', (t) => {
  const field = b4a.alloc(1 << 18)
  field[100000] = 1

  t.is(findFirst(field, true), 800000)
  t.is(findFirst(field, true, 800000), 800000)
  t.is(findFirst(field, true, 800001), -1)
  t.is(findFirst(field, true, -1), -1)
})

test('findFirst + index', (t) => {
  const field = b4a.alloc(1 << 18)
  field[100000] = 1

  const index = Index.from(field)

  t.is(findFirst(field, true, index.skipFirst(false, 0)), 800000)
  t.is(findFirst(field, true, index.skipFirst(false, 800000)), 800000)
  t.is(findFirst(field, true, index.skipFirst(false, 800001)), -1)
  t.is(findFirst(field, true, index.skipFirst(false, -1)), -1)
})

test('index dense', (t) => {
  const field = b4a.alloc(1 << 18)
  field[0] = 1
  field[2048] = 1

  const index = Index.from(field)

  const expected = b4a.alloc(index.handle.byteLength / 2, 0xff)
  expected[0] = 0xfc
  expected[16] = expected[32] = 0xfe

  t.alike(b4a.from(index.handle.buffer).subarray(0, expected.byteLength), expected)

  field[4096] = 1
  index.update(32768)

  expected[0] = 0xf8
  expected[48] = 0xfe

  t.alike(b4a.from(index.handle.buffer).subarray(0, expected.byteLength), expected)
})

test('index sparse', (t) => {
  const chunks = [
    { field: b4a.alloc(32), offset: 0 },
    { field: b4a.alloc(32), offset: 2048 }
  ]

  chunks[0].field[0] = 1
  chunks[1].field[0] = 1

  const index = Index.from(chunks)

  const expected = b4a.alloc(index.handle.byteLength / 2, 0xff)
  expected[0] = 0xfc
  expected[16] = expected[32] = 0xfe

  t.alike(b4a.from(index.handle.buffer).subarray(0, expected.byteLength), expected)

  chunks.push({
    field: b4a.alloc(32), offset: 4096
  })

  chunks[2].field[0] = 1
  index.update(32768)

  expected[0] = 0xf8
  expected[48] = 0xfe

  t.alike(b4a.from(index.handle.buffer).subarray(0, expected.byteLength), expected)
})

test('skipLast at index boundary', (t) => {
  const field = b4a.alloc(1 << 18)

  set(field, 12800, true)

  const index = Index.from(field)

  t.is(index.skipLast(false, 12808), 12808)
})
