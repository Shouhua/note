/**
 * 1. watcher(() => reactiveObj, (count, preCount) => {})
 * 2. watcher(refObj, (obj, preObj) => {})
 * 3. watcher([reactiveObj1, reactiveObj2], ([obj1, obj2], [preObj1, preObj2]) => {})
 * 4. effect不支持async异步函数，watch是支持async异步函数的
 * 5. effectStack用于防止ReactiveEffect出现递归调用的情况
 * 6. watchOptions {
 *  flush: 'pre', 'sync', 'post',
 *  immediate: true, // watchEffect没有这个参数
 *  deep: true, // watchEffect没有这个参数
 *  onTrack: () => {},
 *  onTrigger: () => {}
 * }
 */
import { reactive, watch, ref} from 'vue'
import { onErrorCaptured, onRenderTracked, onRenderTriggered } from 'vue'
(async () => {
const state = reactive({count: 0})

/**
 * Error: Maximum recursive updates exceeded
 * 源码中的[scheduler.ts]checkRecursiveUpdates函数在dev环境下专门校验这个
 */
// watch(() => state.count, (count, preCount) => {
//   state.count++
//   console.log(count)
// })

// let foo = ref(1)
let foo = reactive({
  count: 0
})
// watch(foo, (newVal, oldVal) => {
//   console.log(`newVal: ${newVal}, oldVal: ${oldVal}`)
// })
// foo.value++
let stop = watch(foo, (n, o) => {
  // console.log(`newVal: ${n.count}, oldVal: ${o.count}`)
  // console.log(`newVal: ${n}, oldVal: ${o}`)
  console.log(n, o)
}
// , {
//   flush: 'pre'
// }
)

foo.count++
// foo.value++
console.log('before test')
stop() // 测试stop的时候，同步模式才能看到效果，否则需要在nextTick后才能有效果
const timeout = (n=0) => new Promise(r => setTimeout(r, n))
await timeout()
console.log('after test')
foo.value++
})()
