const browser = require('./browser')

try {
  const native = require('field-native')

  exports.get = browser.get
  exports.set = browser.set

  exports.indexOf = native.indexOf
  exports.lastIndexOf = native.lastIndexOf
  exports.Index = native.Index
} catch {
  module.exports = browser
}
