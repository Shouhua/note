// let raw = []
// let raw = {
//   count: 0
// }
let raw = new Map()

const isSymbol = (s) => typeof s === 'symbol'
const builtInSymbols = Object.getOwnPropertyNames(Symbol)
  .map(key => Symbol[key])
  .filter(isSymbol)

const p = new Proxy(raw, {
  get(target, key, receiver) {
    if(key in builtInSymbols) {
      console.log(`get: ${key.toString()}`)
    } else {
      console.log(`get: ${key}`)
    }
    return Reflect.get(target, key, receiver)
  },
  set(target, key, newVal, receiver) {
    console.log(`set: ${key}, newVal: ${newVal}`)
    return Reflect.set(target, key, newVal, receiver)
  },
  has(target, key) {
    console.log(`has: ${key}`)
    return Reflect.has(target, key)
  },
  deleteProperty(target, key) {
    console.log(`deleteProperty: ${key}`)
    return Reflect.deleteProperty(target, key)
  },
  ownKeys(target) {
    console.log(`ownKeys`)
    return Reflect.ownKeys(target)
  }
})

p.set('count', 1)


// Object.keys(p)
// Reflect.ownKeys(p) // Reflect.ownKeys会取得Symbol和enumerable为false的key，而Object.keys不能
// var a = {
//   [Symbol(2)]: 2,
// }

// Object.defineProperty(a, 'b', {
//   enumerable: false,
// })

// console.log(Reflect.ownKeys(a)) // [Symbol(2), 'b']
// console.log(Object.keys(a)) // []


// p.push(1)
// p.shift()
// p.push(3)
// p.map(console.log)
// for(let item of p) {
// }
// p.includes(1)
// p.forEach(console.log)
// p.indexOf(2)