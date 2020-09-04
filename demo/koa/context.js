let proto = {}

function defineGetter(prop, name) {
  Object.defineProperty(proto, name, {
    get() {
      return this[prop][name]
    },
    enumerable: true,
    configurable: true
  })
}

function defineSetter(prop, name) {
  Object.defineProperty(proto, name, {
    set(val) {
      this[prop][name] = val
    },
    enumerable: true,
    configurable: true
  })
}

defineGetter('request', 'url')
defineGetter('request', 'path')
defineGetter('request', 'query')

defineGetter('response', 'body')
defineSetter('response', 'body')

module.exports = proto