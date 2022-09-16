const simdle = require('simdle-universal')

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

    while (i < 128 && get(index.handle, i)) {
      const bit = i * 16384

      if (bit >= n || get(field, bit) === value) break

      i++
    }

    const k = i * 16384
    let j = 0

    if (position > k) j = Math.floor((position - k) / 128)

    while (j < 128 && get(index.handle, i * 128 + j + 128)) {
      const bit = k + j * 128

      if (bit >= n || get(field, bit) === value) break

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

    while (i >= 0 && (index.handle, i)) {
      const bit = i * 16384

      if (i === 0 || bit >= n || get(field, bit) === value) break

      i--
    }

    const k = ((i + 1) * 16384) - 1
    let j = 127

    if (position < k) j = Math.floor((k - position) / 128)

    while (j >= 0 && get(index.handle, i * 128 + j + 128)) {
      const bit = k + j * 128

      if (j === 0 || bit >= n || get(field, bit) === value) break

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
    this.handle = new Uint32Array(516)

    const n = field.BYTES_PER_ELEMENT

    for (let i = 0; i < 128; i++) {
      let allZeros = true
      let allOnes = true

      for (let j = 0; j < 128; j++) {
        const offset = (i * 128 + j) * 16
        let sum = -1n

        if (offset + 16 <= this.field.byteLength) {
          sum = simdle.sum(this.field.subarray(offset / n, (offset + 16) / n))
        }

        set(this.handle, i * 128 + 128 + j, sum === 0n || sum === 0xffn * 16n)

        allZeros = allZeros && sum === 0n
        allOnes = allOnes && sum === 0xffn * 16n
      }

      set(this.handle, i, allZeros || allOnes)
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

    if (set(this.handle, 128 + j, sum === 0n || sum === 0xffn * 16n)) {
      const offset = (i * 16 + 16) / 4
      const sum = simdle.sum(this.handle.subarray(offset, offset + 4))

      set(this.handle, i, sum === 0n || sum === 0xffn * 16n)

      return true
    }

    return false
  }
}
