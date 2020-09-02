"use strict";
/**
 * Map.prototype.forEach((value, key, source) => {})
 * Set.prototype.forEach((value, index, source) => {})
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.watch = exports.computed = exports.effect = exports.ref = exports.reactive = exports.isReactive = void 0;
let activeEffect;
let shouldTrack = false; // track里面在set的时候会先取值，所有需要区分
// target -> (key -> fn)
const targetMap = new WeakMap();
function track(target, key) {
    if (!shouldTrack || !activeEffect)
        return; // 表示目前在effect中
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    if (!deps.has(activeEffect)) {
        deps.add(activeEffect);
        activeEffect.deps.push(deps); // effect.deps用于后面使用stop
    }
}
function trigger(target, key, newVal) {
    let depsMap = targetMap.get(target); // 如果没有track过就跳过 
    if (!depsMap)
        return;
    let deps = depsMap.get(key);
    const effects = new Set();
    // 这一步是为了防止在watch中不断的删除自己然后添加到deps中造成的死循环
    deps.forEach(effect => {
        if (effect !== activeEffect) {
            effects.add(effect);
        }
    });
    effects.forEach((effect, index, source) => {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            effect();
        }
    });
}
const targetKeyMap = new WeakMap();
function getSymbolByKey(target, key) {
    let keyMap = targetKeyMap.get(target);
    if (!keyMap) {
        targetKeyMap.set(target, (keyMap = new Map()));
    }
    let keySymbol = keyMap.get(key);
    if (!keySymbol) {
        keyMap.set(key, (keySymbol = Symbol(key)));
    }
    return keySymbol;
}
exports.isReactive = function (target) {
    return !!target["_v_isReactive" /* IS_REACTIVE */];
};
function baseGetter(target, key, receiver) {
    if (key === "_v_isReactive" /* IS_REACTIVE */) {
        return true;
    }
    if (key === "_v_raw" /* RAW */) {
        return target;
    }
    const result = Reflect.get(target, key, receiver);
    track(target, getSymbolByKey(target, key));
    if (isObject(result)) {
        return reactive(result);
    }
    return result;
}
function baseSetter(target, key, newVal, receiver) {
    // 这个和下面trigger的先后顺序很重要，不然在trigger里面运行的effect得到的不是最新值
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    const oldVal = target[key];
    if (hasKey && !hasChanged(newVal, oldVal)) { // 不是新添加key，而且值没有变更，不用执行
        return true;
    }
    const result = Reflect.set(target, key, newVal, receiver);
    trigger(target, getSymbolByKey(target, key), newVal);
    return result;
}
const baseHanlders = {
    get: baseGetter,
    set: baseSetter
};
function get(target, key) {
    // target是proxy
    // console.log(`get, key: ${key}`)
    target = target["_v_raw" /* RAW */];
    const { get } = Reflect.getPrototypeOf(target);
    track(target, key);
    return get.call(target, key);
}
function has(key) {
    // console.log(`has, key: ${key}`)
    const target = this["_v_raw" /* RAW */];
    const { has } = Reflect.getPrototypeOf(target);
    track(target, key);
    return has.call(target, key);
}
function set(key, val) {
    // console.log(`set, key: ${key}; value: ${val}`)
    const target = this["_v_raw" /* RAW */];
    const { set } = Reflect.getPrototypeOf(target);
    const result = set.call(target, key, val);
    trigger(target, key, val);
    return result;
}
function add(key, val) {
    // console.log(`add, key: ${key}; value: ${val}`)
    const target = this["_v_raw" /* RAW */];
    const { add } = Reflect.getPrototypeOf(target);
    const result = add.call(target, key, val);
    trigger(target, key, val);
    return result;
}
function deleteEntry(key) {
    const target = this["_v_raw" /* RAW */];
    // const { delete } = Reflect.getPrototypeOf(target) as {delete}
    // const result = delete.call(target, key)
    const result = target.delete(key);
    trigger(target, key, undefined);
    return result;
}
const instrumentations = {
    get(key) {
        return get(this, key);
    },
    set,
    has,
    add,
    delete: deleteEntry
};
function createInstrumentationGetter(instrumentations) {
    return function (target, key, receiver) {
        Object.defineProperty(target, "_v_raw" /* RAW */, {
            configurable: true,
            value: target
        });
        target =
            instrumentations.hasOwnProperty(key) && key in target
                ? instrumentations
                : target;
        return Reflect.get(target, key, receiver);
    };
}
const collectionHandlers = {
    get: createInstrumentationGetter(instrumentations)
};
function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return 1 /* COMMON */;
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return 2 /* COLLECTION */;
        default:
            return 0 /* INVALID */;
    }
}
function getTargetType(value) {
    return targetTypeMap(getRawType(value));
}
const reactive = function (raw) {
    const targetType = getTargetType(raw);
    if (targetType === 0 /* INVALID */) {
        return raw;
    }
    return new Proxy(raw, targetType === 1 /* COMMON */ ? baseHanlders : collectionHandlers);
};
exports.reactive = reactive;
const isRef = (source) => {
    return !!source._isRef;
};
const ref = function (raw) {
    if (isRef(raw)) {
        return raw;
    }
    const r = {
        _isRef: true,
        get value() {
            track(r, 'value');
            return raw;
        },
        set value(newVal) {
            raw = newVal;
            trigger(r, 'value', newVal);
        }
    };
    return r;
};
exports.ref = ref;
// mainly track and trigger
let uid = 0;
let effectStack = [];
const effect = function (callback, options = {}) {
    const runner = function () {
        if (!runner.active) {
            return options.scheduler ? undefined : callback();
        }
        if (!effectStack.includes(runner)) {
            cleanup(runner); // 这个会导致trigger里面的forEach无限循环，所以在trigger里面使用effects重新收集不属于当前activeEffect的对象
            try {
                activeEffect = runner;
                shouldTrack = true;
                effectStack.push(runner);
                return callback();
            }
            finally {
                effectStack.pop();
                shouldTrack = false;
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    runner.id = uid++;
    runner.active = true;
    runner.raw = callback;
    runner.options = options;
    runner.deps = [];
    if (!options.lazy) {
        runner();
    }
    return runner;
};
exports.effect = effect;
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
const computed = function (callback) {
    let result;
    let dirty = true;
    let runner = effect(() => {
        result = callback();
    }, {
        lazy: true,
        scheduler: () => {
            dirty = true;
        }
    });
    return {
        get value() {
            if (dirty) {
                runner();
                dirty = false;
            }
            return result;
        }
    };
};
exports.computed = computed;
const isArray = Array.isArray;
const getRawType = (source) => String.prototype.slice.call(source, 8, -1);
const isFunction = (source) => typeof source === 'function';
const isObject = (val) => typeof val !== null && typeof val === 'object';
// TODO
const traverse = function (source) {
    if (!isObject(source))
        return source;
    if (isArray(source)) {
        source.forEach(item => {
            traverse(item);
        });
    }
    else {
        for (let key in source) {
            traverse(source[key]);
        }
    }
    return source;
};
const cleanup = function (effect) {
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
};
const stop = (effect) => {
    if (effect.active) {
        cleanup(effect);
        if (effect.options.onStop) {
            effect.options.onStop();
        }
        effect.active = false;
    }
};
const hasChanged = function (newVal, oldVal) {
    return newVal !== oldVal && (newVal === newVal || oldVal === oldVal);
};
// watch(ref, (oldVal, newVal) => {})
const watch = (source, cb) => {
    let getter = () => { };
    if (isArray(source)) {
        getter = () => source.map(s => {
            if (isRef(s)) {
                return s.value;
            }
            else {
                // TODO
                s();
            }
        });
    }
    else if (isRef(source)) {
        getter = () => source.value;
    }
    else if (isFunction(source)) {
        getter = () => source();
    }
    else if (exports.isReactive(source)) {
        getter = () => traverse(source);
    }
    else {
        console.error('Only support ref, function, reactive');
        return;
    }
    let oldVal = getter();
    let newVal;
    const scheduler = () => {
        if (!runner.active) {
            return;
        }
        if (cb) {
            newVal = runner();
            if (hasChanged(newVal, oldVal)) {
                cb(newVal, oldVal);
                oldVal = newVal;
            }
        }
        else {
            runner();
        }
    };
    const runner = effect(getter, {
        // lazy: true,
        scheduler
    });
    return () => {
        stop(runner);
    };
};
exports.watch = watch;
//# sourceMappingURL=reactive.js.map