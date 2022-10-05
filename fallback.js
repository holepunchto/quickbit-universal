const simdle = require('simdle-universal')

const INDEX_LEN = (16 /* root */ + 128 * 16 /* children */) * 2

const get = exports.get = function get (field, bit) {
  const n = field.byteLength * 8

  if (bit < 0) bit += n
  if (bit < 0 || bit >= n) return false

  const m = field.BYTES_PER_ELEMENT * 8

  const offset = bit & (m - 1)
  const i = (bit - offset) / m

  return (field[i] & (1 << offset)) !== 0
}

const set = exports.set = function set (field, bit, value = true) {
  const n = field.byteLength * 8

  if (bit < 0) bit += n
  if (bit < 0 || bit >= n) return false

  const m = field.BYTES_PER_ELEMENT * 8

  const offset = bit & (m - 1)
  const i = (bit - offset) / m
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
  const n = field.byteLength * 8

  if (start < 0) start += n
  if (end < 0) end += n
  if (start < 0 || start >= field.byteLength * 8 || start >= end) return field

  const m = field.BYTES_PER_ELEMENT * 8

  let i, j

  {
    const offset = start & (m - 1)
    i = (start - offset) / m

    if (offset !== 0) {
      let shift = m - offset
      if (end - start < shift) shift = end - start

      const mask = ((1 << shift) - 1) << offset

      if (value) field[i] |= mask
      else field[i] &= ~mask

      i++
    }
  }

  {
    const offset = end & (m - 1)
    j = (end - offset) / m

    if (offset !== 0 && j >= i) {
      const mask = (1 << offset) - 1

      if (value) field[j] |= mask
      else field[j] &= ~mask
    }
  }

  if (i < j) field.fill(value ? (2 ** m) - 1 : 0, i, j)

  return field
}

function bitOffset (bit, offset) {
  return !bit ? offset : (INDEX_LEN * 8 / 2) + offset
}

function byteOffset (bit, offset) {
  return !bit ? offset : (INDEX_LEN / 2) + offset
}

exports.findFirst = function findFirst (field, value, position = 0) {
  const n = field.byteLength * 8

  if (position < 0) position += n
  if (position < 0) position = 0
  if (position >= n) return -1

  value = !!value

  for (let i = position; i < n; i++) {
    if (get(field, i) === value) return i
  }

  return -1
}

exports.findLast = function findLast (field, value, position = field.byteLength * 8 - 1) {
  const n = field.byteLength * 8

  if (position < 0) position += n
  if (position < 0) return -1
  if (position >= n) position = n - 1

  value = !!value

  for (let i = position; i >= 0; i--) {
    if (get(field, i) === value) return i
  }

  return -1
}

const Index = exports.Index = class Index {
  static from (fieldOrChunks) {
    if (Array.isArray(fieldOrChunks)) {
      return new SparseIndex(fieldOrChunks)
    } else {
      return new DenseIndex(fieldOrChunks)
    }
  }

  get byteLength () {
    return 0
  }

  constructor () {
    this.handle = new Uint32Array(INDEX_LEN / 4)
  }

  skipFirst (value, position = 0) {
    const n = this.field.byteLength * 8

    if (position < 0) position += n
    if (position < 0) position = 0
    if (position >= n) return n - 1

    let i = Math.floor(position / 16384)

    if (i > 127) return position

    while (i <= 127 && get(this.handle, bitOffset(value, i))) {
      i++
    }

    if (i === 128) return n - 1

    let k = i * 16384
    let j = 0

    if (position > k) j = Math.floor((position - k) / 128)

    while (j <= 127 && get(this.handle, bitOffset(value, i * 128 + j + 128))) {
      j++
      k += 128
    }

    if (j === 128 && i !== 127) return this.skipFirst(value, (i + 1) * 16384)

    if (k > position) position = k

    return position < n ? position : n - 1
  }

  skipLast (value, position = this.field.byteLength * 8 - 1) {
    const n = this.field.byteLength * 8

    if (position < 0) position += n
    if (position < 0) return 0
    if (position >= n) position = n - 1

    let i = Math.floor(position / 16384)

    if (i > 127) return position

    while (i >= 0 && get(this.handle, bitOffset(value, i))) {
      i--
    }

    if (i === -1) return 0

    let k = ((i + 1) * 16384) - 1
    let j = 127

    if (position < k) j = Math.floor((k - position) / 128)

    while (j >= 0 && get(this.handle, bitOffset(value, i * 128 + j + 128))) {
      j--
      k -= 128
    }

    if (j === -1 && i !== 0) return this.skipLast(value, i * 16384 - 1)

    if (k < position) position = k

    return position
  }
}

class DenseIndex extends Index {
  constructor (field) {
    super()
    this.field = field

    const m = field.BYTES_PER_ELEMENT

    const maxSum = m === 1 ? 0xffn * 16n : m === 2 ? 0xffffn * 8n : 0xffffffffffn * 4n

    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        const offset = (i * 128 + j) * 16
        let sum = 0n

        if (offset + 16 <= this.field.byteLength) {
          sum = simdle.sum(this.field.subarray(offset / m, (offset + 16) / m))
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

  get byteLength () {
    return this.field.byteLength
  }

  update (bit) {
    const n = this.field.byteLength * 8

    if (bit < 0) bit += n
    if (bit < 0 || bit >= n) return false

    const m = this.field.BYTES_PER_ELEMENT

    const i = Math.floor(bit / 16384)
    const j = Math.floor(bit / 128)

    const offset = (j * 16) / m
    const sum = simdle.sum(this.field.subarray(offset, offset + (16 / m)))

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

function selectChunk (chunks, offset) {
  for (let i = 0; i < chunks.length; i++) {
    const next = chunks[i]

    const start = next.offset
    const end = next.offset + next.field.byteLength

    if (offset >= start && offset + 16 <= end) {
      return next
    }
  }

  return null
}

class SparseIndex extends Index {
  constructor (chunks) {
    super()
    this.chunks = chunks

    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        const offset = (i * 128 + j) * 16
        let sum = 0n
        let maxSum = -1n

        const chunk = selectChunk(this.chunks, offset)

        if (chunk !== null) {
          const m = chunk.field.BYTES_PER_ELEMENT

          maxSum = m === 1 ? 0xffn * 16n : m === 2 ? 0xffffn * 8n : 0xffffffffffn * 4n

          sum = simdle.sum(chunk.field.subarray((offset - chunk.offset) / m, (offset - chunk.offset + 16) / m))
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

  get byteLength () {
    const last = this.chunks[this.chunks.length - 1]
    return last ? last.offset + last.field.byteLength : 0
  }

  update (bit) {
    if (this.chunks.length === 0) return false

    const last = this.chunks[this.chunks.length - 1]

    const n = (last.offset + last.field.byteLength) * 8

    if (bit < 0) bit += n
    if (bit < 0 || bit >= n) return false

    const i = Math.floor(bit / 16384)
    const j = Math.floor(bit / 128)

    const offset = j * 16

    const chunk = selectChunk(this.chunks, offset)

    if (chunk === null) return false

    const m = chunk.field.BYTES_PER_ELEMENT

    const sum = simdle.sum(chunk.field.subarray((offset - chunk.offset) / m, (offset - chunk.offset + 16) / m))

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
