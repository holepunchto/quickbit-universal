import test from 'brittle'
import b4a from 'b4a'

import { get, set, indexOf, Index } from './fallback.js'

test('get', (t) => {
  const field = b4a.alloc(1)
  field[0] = 0b10000000

  t.is(get(field, 7), true)
})

test('set', (t) => {
  const field = b4a.alloc(1)

  t.is(set(field, 7), true)
  t.is(field[0], 0b10000000)
})

test('indexOf', (t) => {
  const field = b4a.alloc(1 << 18)
  field[100000] = 1

  t.is(indexOf(field, true), 800000)
})

test('indexOf + index', (t) => {
  const field = b4a.alloc(1 << 18)
  field[100000] = 1

  const index = new Index(field)

  t.is(indexOf(field, true, index), 800000)
})
