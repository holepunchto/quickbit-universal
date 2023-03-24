const fallback = require('./fallback')

try {
  const native = require('quickbit-native')

  exports.get = fallback.get
  exports.set = fallback.set
  exports.fill = fallback.fill

  exports.findFirst = native.findFirst
  exports.findLast = native.findLast
  exports.Index = native.Index
} catch {
  module.exports = fallback
}
