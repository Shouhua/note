export const reactive = (o) => {
  const keyMap = new Map();
  const getSymbolByKey = (key) => {
    if(!keyMap.has(key)) {
      keyMap.set(key, Symbol(key));
    }
    return keyMap.get(key);
  }
  return new Proxy(o, {
    get(target, key, receiver) {
      const symbolKey = getSymbolByKey(key);
      dependencies.add(symbolKey);
      return Reflect.get(target, key, receiver)
    },
    set(target, key, val, receiver) {
      const result = Reflect.set(target, key, val, receiver)
      runCallbackByDependency(getSymbolByKey(key));
      return result
    }
  })
}

export const effect = (callback) => {
  return getDependenciesByCallback(callback)
}

export const ref = (raw) => reactive({value: raw})

export const computed = (callback) => {
  const result = ref()
  effect(() => {
    result.value = callback()
  })
  return result
}

const runCallbackByDependency = (key) => {
  callbackDependency.filter(item => item.dependencies.has(key))
    .forEach(element => {
      element.cb();
  });
}

let dependencies = new Set();
let callbackDependency = [];

const getDependenciesByCallback = (cb) => {
  dependencies.clear();
  const result = cb();
  callbackDependency.push({
    cb,
    dependencies: new Set(dependencies)
  })
  dependencies.clear();
  return result;
}