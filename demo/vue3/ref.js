import { ref, proxyRefs, reactive, readonly, isReactive, isReadonly, isProxy, shallowReadonly, shallowReactive } from 'vue'
import { effect } from '@vue/reactivity'
import { inspect } from 'util'

// let m = new Map()

// m.set('count', 0)

// let r = reactive(m)

// effect(() => {
//   console.log(`r.size: ${r.size}`)
// })

// console.log(`r is reactive: ${isReactive(r)}`);
// console.log(`r is readonly: ${isReadonly(r)}`);
// console.log(`r is proxy: ${isProxy(r)}`);
// console.log(`r.__v_raw: ${inspect(r.__v_raw)}`);
// console.log(`r.set('hello, 'world'): ${inspect(r.set('hello', 'world'))}`);

// let o = [
//   "count", 0
// ]

// let r = shallowReadonly(o)

// effect(() => {
//   console.log(`r.length: ${r.length}`)
// })

// console.log('r is reactive: ', isReactive(r))
// console.log('r is readonly: ', isReadonly(r))
// console.log('r is proxy: ', isProxy(r))
// r[0] = 'helo'

// let r = reactive(o)
// effect(() => {
//   console.log(`r: ${inspect(r.includes('1'))}`);
// })
// console.log(`r is reactive: ${isReactive(r)}`);
// console.log(`r is readonly: ${isReadonly(r)}`);
// console.log(`r is proxy: ${isProxy(r)}`);
// console.log(`r.__v_raw: ${inspect(r.__v_raw)}`);
// console.log(`r.push('helo'): ${r.push('helo')}`);

let o1 = shallowReactive({
  foo: {
    bar: 0
  }
})
console.log(`o1 is reactive: ${isReactive(o1)}`);
console.log(`o1.foo is reactive: ${isReactive(o1.foo)}`);