const get = exports.get = function get (field, bit) {
  const n = field.BYTES_PER_ELEMENT * 8

  const offset = bit & (n - 1)
  const i = (bit - offset) / n

  return (field[i] & (1 << offset)) !== 0
}

exports.set = function set (field, bit, value = true) {
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

  value = !!value

  for (let i = position; i >= 0; i--) {
    if (get(field, i) === value) return i
  }

  return -1
}

exports.Index = class Index {}
