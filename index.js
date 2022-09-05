const fallback = require('./fallback')

try {
  const native = require('./native')

  exports.get = fallback.get
  exports.set = fallback.set

  exports.indexOf = native.indexOf
  exports.lastIndexOf = native.lastIndexOf
  exports.Index = native.Index
} catch {
  module.exports = fallback
}
