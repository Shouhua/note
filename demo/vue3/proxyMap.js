/**
 * Many built-in objects, for example Map, Set, Date, Promise and others make use of so-called internal slots.
These are like properties but reserved for internal, specification-only purposes.
For instance, Map stores items in the internal slot [[MapData]].
Built-in methods access them directly, not via [[Get]]/[[Set]] internal methods. So Proxy can’t intercept that.
https://javascript.info/proxy#proxy-limitations
(target, key, receiver) 其中target是原生对象，receiver是代理后的proxy对象，map，set代理后，使用的对象
是proxy对象，自然报receiver错误的信息
 */
const reactive = (o) => new Proxy(o, {
  get: createInstrumentations(instrumentations)
})

createInstrumentations = function(instrumentations) {
  return function(target, key, receiver) {
    console.log(`getter: get, key: ${key}`)
    Object.defineProperty(target, '__raw', {
      configurable: true,
      value: target
    })
    target =
    instrumentations.hasOwnProperty(key) && key in target
      ? instrumentations
      : target
    return Reflect.get(target, key, receiver);
  }
}

const instrumentations = {
  get(key) {
    return get(this, key)
  },
  set,
  has,
  add
}

function get(target, key) {
  console.log(`get, key: ${key}`)
  target = target.__raw
  const proto = Reflect.getPrototypeOf(target)
  const res = proto.get.call(target, key)
  return res
}

function has(key) {
  console.log(`has, key: ${key}`)
  const target = this.__raw
  const { has } = Reflect.getPrototypeOf(target)
  return has.call(target, key)
}

function set(key, val) {
  console.log(`set, key: ${key}; value: ${val}`)
  const target = this.__raw
  const { set } = Reflect.getPrototypeOf(target)
  return set.call(target, key, val);
}

function add(key, val) {
  console.log(`add, key: ${key}; value: ${val}`)
  const target = this.__raw
  const { add } = Reflect.getPrototypeOf(target)
  return add.call(target, key, val);
}

let raw = new Map();
// let raw = new Set()
let r = reactive(raw);
// r.add('hello, world')
r.set('label', 'hello world')
console.log(r.has('label'))
console.log(r.get('label'))
console.log(raw)

let s = new Set();
let rs = reactive(s);
rs.add('hello, reactive set')
console.log('ractive set: ', rs)
console.log('raw set: ', rs)

let m = new Map(
  [
    ['label', 'hello'],
    ['count', 10]
  ]
)
m.forEach((value, key, source) => {
  console.log(value, key) // label hello; count 10
})