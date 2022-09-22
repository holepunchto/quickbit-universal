const simdle = require('simdle-universal')

const INDEX_LEN = (16 /* root */ + 128 * 16 /* children */) * 2

const get = exports.get = function get (field, bit) {
  if (bit < 0) bit += field.byteLength * 8
  if (bit < 0 || bit >= field.byteLength * 8) throw new RangeError('Out of bounds')

  const n = field.BYTES_PER_ELEMENT * 8

  const offset = bit & (n - 1)
  const i = (bit - offset) / n

  return (field[i] & (1 << offset)) !== 0
}

const set = exports.set = function set (field, bit, value = true) {
  if (bit < 0) bit += field.byteLength * 8
  if (bit < 0 || bit >= field.byteLength * 8) throw new RangeError('Out of bounds')

  const n = field.BYTES_PER_ELEMENT * 8

  const offset = bit & (n - 1)
  const i = (bit - offset) / n
  const mask = 1 << offset

  if (value) {
    if ((field[i] & mask) !== 0) return false
  } else {
    if ((field[i] & mask) === 0) return false
  }

  field[i] ^= mask

  return true
}

exports.fill = function fill (field, value, start = 0, end = field.byteLength * 8) {
  if (start < 0) start += field.byteLength * 8
  if (end < 0) end += field.byteLength * 8
  if (start < 0 || start >= field.byteLength * 8 || start > end) throw new RangeError('Out of bounds')

  const n = field.BYTES_PER_ELEMENT * 8
  const m = end - start

  let i, j

  {
    const offset = start & (n - 1)
    i = (start - offset) / n

    if (offset !== 0) {
      let shift = n - offset
      if (m < shift) shift = m

      const mask = ((1 << shift) - 1) << offset

      if (value) field[i] |= mask
      else field[i] &= ~mask

      i++
    }
  }

  {
    const offset = end & (n - 1)
    j = (end - offset) / n

    if (offset !== 0 && j >= i) {
      const mask = (1 << offset) - 1

      if (value) field[j] |= mask
      else field[j] &= ~mask
    }
  }

  if (i < j) field.fill(value ? (1 << n) - 1 : 0, i, j)

  return field
}

function bitOffset (bit, offset) {
  return !bit ? offset : (INDEX_LEN * 8 / 2) + offset
}

function byteOffset (bit, offset) {
  return !bit ? offset : (INDEX_LEN / 2) + offset
}

exports.indexOf = function indexOf (field, value, position = 0, index = null) {
  if (typeof position === 'object') {
    index = position
    position = 0
  }

  if (position < 0) position += field.byteLength * 8
  if (position < 0 || position >= field.byteLength * 8) throw new RangeError('Out of bounds')

  value = !!value

  const n = field.byteLength * 8

  if (n === 0) return -1

  if (index !== null) {
    let i = Math.floor(position / 16384)

    while (i < 127 && get(index.handle, bitOffset(!value, i))) {
      i++
    }

    const k = i * 16384
    let j = 0

    if (position > k) j = Math.floor((position - k) / 128)

    while (j < 127 && get(index.handle, bitOffset(!value, i * 128 + j + 128))) {
      j++
    }

    const l = k + j * 128

    if (l > position) position = l
  }

  for (let i = position; i < n; i++) {
    if (get(field, i) === value) return i
  }

  return -1
}

exports.lastIndexOf = function lastIndexOf (field, value, position = field.byteLength * 8 - 1, index = null) {
  if (typeof position === 'object') {
    index = position
    position = field.byteLength * 8 - 1
  }

  if (position < 0) position += field.byteLength * 8
  if (position < 0 || position >= field.byteLength * 8) throw new RangeError('Out of bounds')

  value = !!value

  const n = field.byteLength * 8

  if (n === 0) return -1

  if (index !== null) {
    let i = Math.floor(position / 16384)

    while (i > 0 && get(index.handle, bitOffset(!value, i))) {
      i--
    }

    const k = ((i + 1) * 16384) - 1
    let j = 127

    if (position < k) j = Math.floor((k - position) / 128)

    while (j > 0 && get(index.handle, bitOffset(!value, i * 128 + j + 128))) {
      j--
    }

    const l = k + ((j + 1) * 128) - 1

    if (l < position) position = l
  }

  for (let i = position; i >= 0; i--) {
    if (get(field, i) === value) return i
  }

  return -1
}

exports.Index = class Index {
  constructor (field) {
    if (field.byteLength > 1 << 18) throw new RangeError('Field is too large to index')

    this.field = field
    this.handle = new Uint32Array(INDEX_LEN / 4)

    const n = field.BYTES_PER_ELEMENT

    const maxSum = n === 1 ? 0xffn * 16n : n === 2 ? 0xffffn * 8n : 0xffffffffffn * 4n

    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        const offset = (i * 128 + j) * 16
        let sum = -1n

        if (offset + 16 <= this.field.byteLength) {
          sum = simdle.sum(this.field.subarray(offset / n, (offset + 16) / n))
        }

        const k = i * 128 + 128 + j

        set(this.handle, bitOffset(false, k), sum === 0n)

        set(this.handle, bitOffset(true, k), sum === maxSum)
      }

      {
        const offset = byteOffset(false, i * 16 + 16) / 4
        const sum = simdle.sum(this.handle.subarray(offset, offset + 4))

        set(this.handle, bitOffset(false, i), sum === 0xffffffffn * 4n)
      }

      {
        const offset = byteOffset(true, i * 16 + 16) / 4
        const sum = simdle.sum(this.handle.subarray(offset, offset + 4))

        set(this.handle, bitOffset(true, i), sum === 0xffffffffn * 4n)
      }
    }
  }

  update (bit) {
    if (bit < 0) bit += this.field.byteLength * 8
    if (bit < 0 || bit >= this.field.byteLength * 8) throw new RangeError('Out of bounds')

    const n = this.field.BYTES_PER_ELEMENT

    const i = Math.floor(bit / 16384)
    const j = Math.floor(bit / 128)

    const offset = (j * 16) / n
    const sum = simdle.sum(this.field.subarray(offset, offset + (16 / n)))

    let changed = false

    if (set(this.handle, bitOffset(false, 128 + j), sum === 0n)) {
      changed = true

      const offset = byteOffset(false, i * 16 + 16) / 4
      const sum = simdle.sum(this.handle.subarray(offset, offset + 4))

      set(this.handle, bitOffset(false, i), sum === 0xffffffffn * 4n)
    }

    if (set(this.handle, bitOffset(true, 128 + j), sum === 0n)) {
      changed = true

      const offset = byteOffset(true, i * 16 + 16) / 4
      const sum = simdle.sum(this.handle.subarray(offset, offset + 4))

      set(this.handle, bitOffset(true, i), sum === 0xffffffffn * 4n)
    }

    return changed
  }
}
