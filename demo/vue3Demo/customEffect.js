import { reactive, watchEffect, ref, computed } from 'vue'
import { effect } from '@vue/reactivity'

/*
const obj = reactive({
  count: 1
})

// effect
// effect(() => {
//   console.log(obj.count)
// })

// watch effect, 添加scheduler
effect(() => {
  console.log(obj.count)
}, {
  scheduler: queueJob
})

const queue = []
let isFlushing = false
function queueJob(effect) {
  if(!queue.includes(effect)) queue.push(effect)
  if(!isFlushing) {
    isFlushing = true
    Promise.resolve().then(() => {
      let fn
      while(fn = queue.shift()) {
        fn()
      }
    }) 
  }
}

obj.count++
obj.count++
obj.count += 10
*/

//computed
const refCount = ref(1)
let doubleCount = 0
let dirty = true

const runner = effect(() => {
  console.log('runner')
  doubleCount = refCount.value * 2
}, {lazy: true, scheduler: (runner) => dirty = true})

// 迭代
// function getDoubleCount() {
//   if(dirty) {
//     runner()
//     dirty = false
//   }
//   return doubleCount
// }

const refDoubleCount = {
  get value() {
    if(dirty) {
      runner()
      dirty = false
    }
    return doubleCount
  }
}

console.log(refDoubleCount.value)
console.log(refDoubleCount.value)