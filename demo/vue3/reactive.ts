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

function track<T extends object>(target: T, key: any): void {
  if(!shouldTrack || !activeEffect) return // 表示目前在effect中
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
    activeEffect.deps.push(deps) // effect.deps用于后面使用stop
  }
}

function trigger<T extends object>(target: T, key: any, newVal: any): void {
  let depsMap = targetMap.get(target) // 如果没有track过就跳过 
  if(!depsMap) return
  let deps = depsMap.get(key)
  const effects = new Set<ReactiveEffect>()
  // 这一步是为了防止在watch中不断的删除自己然后添加到deps中造成的死循环
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

  const result = Reflect.get(target, key, receiver)

  track(target, getSymbolByKey(target, key))

  if(isObject(result)) {
    return reactive(result)
  }

  return result
}

function baseSetter(target: object, key:any, newVal: any, receiver: object) {
  // 这个和下面trigger的先后顺序很重要，不然在trigger里面运行的effect得到的不是最新值
  const hasKey = Object.prototype.hasOwnProperty.call(target, key)
  const oldVal = target[key]
  if(hasKey && !hasChanged(newVal, oldVal)) { // 不是新添加key，而且值没有变更，不用执行
    return true
  }
  const result = Reflect.set(target, key, newVal, receiver) 
  trigger(target, getSymbolByKey(target, key), newVal)
  return result
}

const baseHanlders = {
  get: baseGetter,
  set: baseSetter
}

function get(target: any, key: any) {
  // target是proxy
  // console.log(`get, key: ${key}`)
  target = target[ReactiveFlags.RAW]
  const { get } = Reflect.getPrototypeOf(target) as {get}
  track(target, key)
  return get.call(target, key)
}

function has(key) {
  // console.log(`has, key: ${key}`)
  const target = this[ReactiveFlags.RAW]
  const { has } = Reflect.getPrototypeOf(target) as {has}
  track(target, key)
  return has.call(target, key)
}

function set(key, val) {
  // console.log(`set, key: ${key}; value: ${val}`)
  const target = this[ReactiveFlags.RAW]
  const { set } = Reflect.getPrototypeOf(target) as {set}
  const result = set.call(target, key, val);
  trigger(target, key, val)
  return result
}

function add(key, val) {
  // console.log(`add, key: ${key}; value: ${val}`)
  const target = this[ReactiveFlags.RAW]
  const { add } = Reflect.getPrototypeOf(target) as {add}
  const result = add.call(target, key, val)
  trigger(target, key, val)
  return result
}

function deleteEntry(key) {
  const target = this[ReactiveFlags.RAW]
  // const { delete } = Reflect.getPrototypeOf(target) as {delete}
  // const result = delete.call(target, key)
  const result = target.delete(key)
  trigger(target, key, undefined)
  return result
}

const instrumentations = {
  get(key) {
    return get(this, key)
  },
  set,
  has,
  add,
  delete: deleteEntry
}

function createInstrumentationGetter(instrumentations: any) {
  return function(target, key, receiver) {
    Object.defineProperty(target, ReactiveFlags.RAW, {
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

const collectionHandlers = {
  get: createInstrumentationGetter(instrumentations)
}

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

function getTargetType(value: any) {
  return targetTypeMap(getRawType(value))
}

const reactive = function<T extends object>(raw: T): any {
  const targetType = getTargetType(raw)
  if (targetType === TargetType.INVALID) {
    return raw
  }
  return new Proxy(raw, targetType === TargetType.COMMON ? baseHanlders : collectionHandlers)
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
const getRawType = (source: any) => String.prototype.slice.call(source, 8, -1)
const isFunction = (source: any) => typeof source === 'function'
const isObject = (val: any) => typeof val !== null && typeof val === 'object'

const traverse = function(source: any, seen: Set<any> = new Set<any>()) {
  if(!isObject(source) || seen.has(source)) return source
  seen.add(source)
  if(isArray(source)) {
    source.forEach(item => {
      traverse(item, seen)
    })
  } else {
    for(let key in source) {
      traverse(source[key], seen)
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

interface WatchOptionsBase {
  flush?: 'pre' | 'sync' | 'post',
  onTrack?: Function,
  onTrigger?: Function
}
interface WatchOptions extends WatchOptionsBase {
  immediate?: boolean,
  deep?: boolean
}
const EMPTY_OBJ : {readonly[key: string]: any} = {}
const warnLabel = 'Only support ref, reactive, function type'
const watch = (source, cb, { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ) => {
  let getter = () => {}
  const isRefSource = isRef(source)
  if(isRef(source)) {
    getter = () => source.value
  } else if(isReactive(source)) {
    getter = () => traverse(source)
    deep = true
  } else if(isArray(source)) {
    getter = () => source.map(s => {
      if(isRef(s)) {
        return s.value
      } else if(isReactive(s)){
        return traverse(s)
      } else if(isFunction(s)) {
        return s()
      } else {
        console.warn(warnLabel)
      }
    })
  } else if(isFunction(source)) {
    getter = () => source()
  }  else {
    console.error('Only support ref, function, reactive')
    return 
  }
  let oldVal, newVal
  const scheduler = () => {
    if(!runner.active) {
      return
    }
    if(cb) {
      newVal = runner()
      if(deep || isRefSource || hasChanged(newVal, oldVal)) {
        cb(newVal, oldVal)
        oldVal = newVal
      }
    } else {
      runner()
    }
  }
  const runner = effect(getter, {
    lazy: true,
    scheduler
  })

  if(cb) {
    if(immediate) {
      scheduler()
    } else {
      oldVal = runner()
    }
  }

  return () => {
    stop(runner)
  }
}

export {
  reactive,
  ref,
  effect,
  computed,
  watch
}