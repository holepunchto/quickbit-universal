import test from 'brittle'
import b4a from 'b4a'

import { get, set, fill, indexOf, Index } from './fallback.js'

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

test('indexOf', (t) => {
  const field = b4a.alloc(1 << 18)
  field[100000] = 1

  t.is(indexOf(field, true), 800000)
  t.is(indexOf(field, true, 800000), 800000)
  t.is(indexOf(field, true, 800001), -1)
  t.is(indexOf(field, true, -1), -1)
})

test('indexOf + index', (t) => {
  const field = b4a.alloc(1 << 18)
  field[100000] = 1

  const index = new Index(field)

  t.is(indexOf(field, true, index), 800000)
  t.is(indexOf(field, true, 800000, index), 800000)
  t.is(indexOf(field, true, 800001, index), -1)
  t.is(indexOf(field, true, -1, index), -1)
})
