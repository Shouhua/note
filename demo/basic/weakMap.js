// node --expose-gc *.js
// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap

function usageSize() {
  const used = process.memoryUsage().heapUsed;
  return Math.round((used/ 1024 / 1024) * 100) / 100 + 'M'
}

console.log('start memory usage')
global.gc()
console.log(usageSize())

let arr = new Array(10 * 1024 * 1024)
// const map = new Map()
const map = new WeakMap()
map.set(arr, 1)

console.log('after use map')
global.gc()
console.log(usageSize())

console.log('after set null to key')
arr = null
global.gc()
console.log(usageSize())


const m = new Map()

