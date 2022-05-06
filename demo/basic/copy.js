function shallowCopy(raw) {
	let result = {}
	for(let key in raw) {
		result[key] = raw[key]
	}
	return result
}

/**
 * Deep copy the given object considering circular structure.
 * This function caches all nested objects and its copies.
 * If it detects circular structure, use cached copy to avoid infinite loop.
 *
 * @param {*} obj
 * @param {Array<Object>} cache
 * @return {*}
 */
 export function deepCopy1 (obj, cache = []) {
  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // if obj is hit, it is in circular structure
  const hit = find(cache, c => c.original === obj)
  if (hit) {
    return hit.copy
  }

  const copy = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  cache.push({
    original: obj,
    copy
  })

  Object.keys(obj).forEach(key => {
    copy[key] = deepCopy(obj[key], cache)
  })

  return copy
}



function deepCopy (raw, cache = []) {
	if (raw === null || typeof raw !== 'object') {
		return raw
	}
	const hit = find(cache, c => c.original === raw)
	if(hit) {
		return hit.copy
	}
	const copy = isArray(raw) ? [] : {}
	cache.push({
		original: raw,
		copy
	})
	Object.keys(raw).forEach(key => {
		copy[key] = deepCopy(raw[key], cache)
	})
	return copy
}

function find (cache, f) {
	return cache.filter(f)[0]
}

function isArray (obj) {
	if(Array.isArray) {
		return Array.isArray(obj)
	}
	return Object.prototype.toString.call(obj) === '[object Array]'
}

function isObject(raw) {
	return typeof raw === 'object' && raw !== null
}

function isPromise (fn) {
	return fn && typeof fn.then === 'function'
}

var f = new Promise()
isPromise(f)

// 深拷贝例子
var a = new Object()
var b = new Object()
a.b = b
b.a = a
deepCopy(a)

Object.defineProperty(obj, {
	// get, set, enumerable, configurable
	// value, writable, enumerable, configurable

})