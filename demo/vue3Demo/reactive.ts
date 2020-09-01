/**
 * Map.prototype.forEach((value, key, source) => {})
 * Set.prototype.forEach((value, index, source) => {})
 */

type key = symbol
type fn = Function

export const enum ReactiveFlags {
  IS_REACTIVE = '_v_isReactive',
  RAW = '_v_raw'
}

let activeEffect: ReactiveEffect
let shouldTrack = false // track里面在set的时候会先取值，所有需要区分

type Dep = Set<ReactiveEffect>
export interface ReactiveEffect<T = any> {
  (): T
  _isEffect: true
  id: number
  active: boolean
  raw: () => T
  deps: Array<Dep>
  options: ReactiveEffectOptions
}
export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: (job: ReactiveEffect) => void
  onTrack?: (event: any) => void
  onTrigger?: (event: any) => void
  onStop?: () => void
}

// target -> (key -> fn)
const targetMap = new WeakMap<object, Map<key, Dep>>()

function track<T extends object>(target: T, key: any): void
function track(target, key) {
  if(!shouldTrack || !activeEffect) return
  let depsMap = targetMap.get(target)
  if(!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if(!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  if(!deps.has(activeEffect)) {
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
  }
}

function trigger<T extends object>(target: T, key: any, newVal: any): void
function trigger(target, key, newVal)  {
  let depsMap = targetMap.get(target)
  if(!depsMap) return
  let deps = depsMap.get(key)
  const effects = new Set<ReactiveEffect>()
  deps.forEach(effect => {
    if(effect !== activeEffect) {
      effects.add(effect)
    }
  })
  effects.forEach((effect, index, source) => {
    if(effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  });
}

type keyMap = Map<any, symbol>
const targetKeyMap: WeakMap<object, keyMap> = new WeakMap()

function getSymbolByKey(target: object, key: any) {
  let keyMap = targetKeyMap.get(target)
  if(!keyMap) {
    targetKeyMap.set(target, (keyMap = new Map()))
  }
  let keySymbol = keyMap.get(key)
  if(!keySymbol) {
    keyMap.set(key, (keySymbol = Symbol(key)))
  }
  return keySymbol
}

export const isReactive = function(target) {
  return !!target[ReactiveFlags.IS_REACTIVE]
}

function baseGetter(target: object, key: any, receiver: object) {
  if(key === ReactiveFlags.IS_REACTIVE) {
    return true
  }
  if(key === ReactiveFlags.RAW) {
    return target
  }

  track(target, getSymbolByKey(target, key))
  return Reflect.get(target, key, receiver)
}

function baseSetter(target: object, key:any, newVal: any, receiver: object) {
  trigger(target, getSymbolByKey(target, key), newVal)
  return Reflect.set(target, key, newVal, receiver) 
}

const reactive = function<T extends object>(raw: T): any {
  return new Proxy(raw, {
    get: baseGetter,
    set: baseSetter
  })
}

const isRef = (source) => {
  return !!source._isRef
}
const ref = function(raw: any) {
  if(isRef(raw)) {
    return raw
  }
  const r = {
    _isRef: true,
    get value() {
      track(r, 'value')
      return raw
    },
    set value(newVal) {
      raw = newVal
      trigger(r, 'value', newVal)
    }
  }
  return r
  // return reactive({
  //   value: raw
  // })
}

// mainly track and trigger
let uid = 0
let effectStack: ReactiveEffect[] = []
const effect: any = function(callback: fn, options: any={}) {
  const runner:any = function() {
    if(!runner.active) {
      return options.scheduler ? undefined : callback()
    }

    if(!effectStack.includes(runner)) {
      cleanup(runner) // 这个会导致trigger里面的forEach无限循环，所以在trigger里面使用effects重新收集不属于当前activeEffect的对象
      try {
        activeEffect = runner
        shouldTrack = true
        effectStack.push(runner)
        return callback()
      } finally {
        effectStack.pop()
        shouldTrack = false
        activeEffect = effectStack[effectStack.length - 1]
        // activeEffect = null
      }
    }
  }

  runner.id = uid++
  runner.active = true
  runner.raw = callback
  runner.options = options
  runner.deps = []

  if(!options.lazy) {
    runner()
  }

  return runner
}

// computed(() => {return a + b})
// 1. 类似于一个取值函数，但是每次取值的时候，如果值没有改变就会从缓存取值
// 2. 依赖改变自动更新
// version 1
// const computed = function(callback: fn) {
//   const result = ref()
//   effect(() => {
//     result.value = callback()
//   })
//   return result
// }

// version 2
const computed = function(callback: fn) {
  let result: any
  let dirty = true
  let runner = effect(() => {
    result = callback()
  }, {
    lazy: true,
    scheduler: () => {
      dirty = true
    }
  })
  return {
    get value() {
      if(dirty) {
        runner()
        dirty = false
      }
      return result
    }
  }
}

const isArray = Array.isArray
// const getType = (source) => String.prototype.slice.call(source, 8, -1)
const isFunction = (source) => typeof source === 'function'
const isObject = (val) => typeof val !== null && typeof val === 'object'

// TODO
const traverse = function(source) {
  if(!isObject(source)) return source
  if(isArray(source)) {
    source.forEach(item => {
      traverse(item)
    })
  } else {
    for(let key in source) {
      traverse(source[key])
    }
  }
  return source
}

const cleanup = function(effect: ReactiveEffect) {
  const { deps } = effect
  if(deps.length) {
    for(let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

const stop = (effect: ReactiveEffect) => {
  if(effect.active) {
    cleanup(effect)
    if(effect.options.onStop) {
      effect.options.onStop()
    }
    effect.active = false
  }
}

const hasChanged = function(newVal: any, oldVal: any) {
  return newVal !== oldVal && (newVal === newVal || oldVal === oldVal)
}

// watch(ref, (oldVal, newVal) => {})
const watch = (source, cb) => {
  let getter = () => {}
  if(isArray(source)) {
    getter = () => source.map(s => {
      if(isRef(s)) {
        return s.value
      } else {
        // TODO
        s()
      }
    })
  } else if(isRef(source)) {
    getter = () => source.value
  } else if(isFunction(source)) {
    getter = () => source()
  } else if(isReactive(source)) {
    getter = () => traverse(source)
  } else {
    console.error('Only support ref, function, reactive')
    return 
  }
  let oldVal = getter()
  let newVal
  const scheduler = () => {
    if(!runner.active) {
      return
    }
    if(cb) {
      newVal = runner()
      if(hasChanged(newVal, oldVal)) {
        cb(newVal, oldVal)
        oldVal = newVal
      }
    } else {
      runner()
    }
  }
  const runner = effect(getter, {
    // lazy: true,
    scheduler
  })
  return () => {
    stop(runner)
  }
}

let r = ref(1)

let stopWatch = watch(r, (n, o) => {
  console.log(n, o)
})
r.value++
// stopWatch()
r.value++
console.log(`r.value: ${r.value}`)

export {
  reactive,
  ref,
  effect,
  computed,
  watch
}