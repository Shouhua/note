// import { reactive, toRef } from 'vue'
// import { effect } from '@vue/reactivity'

// const obj = reactive({ foo: 1 })
// const obj2 = { foo: toRef(obj, 'foo') } // 修改了这里

// effect(() => {
//   console.log(obj2.foo.value)  // 由于 obj2.foo 现在是一个 ref，因此要访问 .value
// })

// obj.foo = 2 // 有效

let s = new Set()
const fn = function() {
  s.delete(fn)
  s.add(fn)
  console.log('in fn')
}
s.add(fn)
s.forEach(fn => fn())
