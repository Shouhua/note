import { reactive, ref, effect, computed, watch } from '../dist/reactive'

describe('reactive system', () => {
  test('reactive', () => {
    const r = reactive({
      count: 0
    })
     r.count++
     expect(r.count).toEqual(1)
  })

  test('ref', () => {
    const foo = ref('bar')
    expect(foo.value).toEqual('bar')
    foo.value = 'hello world'
    expect(foo.value).toEqual('hello world')
  })

  test('effect', () => {
    const r = reactive({
      count: 0
    })
    let counter = 0
    effect(() => {
      console.log(r.count)
      counter++
    })
    r.count++
    expect(counter).toEqual(2)
  })

  test('computed', () => {
    let foo = ref(1)
    let doubleCount = computed(() => foo.value * 2)
    expect(doubleCount.value).toEqual(2)
    expect(doubleCount.value).toEqual(2)
    foo.value++
    expect(doubleCount.value).toEqual(4)
  })
  
  test('watch', () => {
    let foo = ref(1)
    const spy = jest.fn()
    let newVal, oldVal
    watch(foo, (n, o) => {
      spy()
      newVal = n
      oldVal = o
    })
    foo.value++
    foo.value++
    // expect(spy).toHaveBeenCalledTimes(2)
    expect(newVal).toEqual(3)
    expect(oldVal).toEqual(2)
  })
})