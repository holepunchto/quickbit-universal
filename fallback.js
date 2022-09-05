const get = exports.get = function get (field, bit) {
  if (bit < 0 || bit >= field.byteLength * 8) throw new RangeError('Out of bounds')

  const n = field.BYTES_PER_ELEMENT * 8

  const offset = bit & (n - 1)
  const i = (bit - offset) / n

  return (field[i] & (1 << offset)) !== 0
}

exports.set = function set (field, bit, value = true) {
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

exports.indexOf = function indexOf (field, value, position = 0) {
  if (typeof position === 'object') {
    position = 0
  }

  if (position < 0 || position >= field.byteLength * 8) throw new RangeError('Out of bounds')

  value = !!value

  for (let i = position, n = field.byteLength * 8; i < n; i++) {
    if (get(field, i) === value) return i
  }

  return -1
}

exports.lastIndexOf = function lastIndexOf (field, value, position = field.byteLength * 8 - 1) {
  if (typeof position === 'object') {
    position = field.byteLength * 8 - 1
  }

  if (position < 0 || position >= field.byteLength * 8) throw new RangeError('Out of bounds')

  value = !!value

  for (let i = position; i >= 0; i--) {
    if (get(field, i) === value) return i
  }

  return -1
}

exports.Index = class Index {
  constructor (field) {
    if (field.byteLength > 1 << 18) throw new RangeError('Field is too large to index')

    this.field = field
  }

  update (bit) {
    if (bit < 0 || bit >= this.field.byteLength * 8) throw new RangeError('Out of bounds')
  }
}
