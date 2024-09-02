// 特别注意类似于对象的对象，比如arguments，HTMLCollection()等，他们有length，有Symbol.iterator(可以使用for...of...)，但是没有其他属性
// 这里可以使用Array.prototype.slice.call(arguments, 1)将他们转化成数组
// 最后使用apply执行函数
Function.prototype.bind = function() {
  var concat = Array.prototype.concat;
  var slice = Array.prototype.slice;
  var fn = this
  var firstArg = arguments[0]
  if(typeof fn !== 'function') {
    throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable')
  }
  var args = slice.call(arguments, 1)
  return function() {
    var funcArgs = args.concat(slice.call(arguments))
    return fn.apply(firstArg, funcArgs)
  }
}

console.log(Array.prototype.slice.bind([1, 3, 2])(0))

Function.prototype.call = function(context, ...args) {
  const fn = this
  context = context || window
  context._tempFn = fn
  const result = context[_tempFn](...args)
  delete context._temp
  return result 
}

function getUrlParams(url,key) { // https://www.example.org?name=james&age=39
  let queryMap = new Map()
  const queryStr = url.split('?')[1]
  if(queryStr === undefined) return ''
  const queryArr = queryStr.split('&')
  for(let i = 0; i < queryArr.length; i++) {
    const [key, value] = queryArr[i].split('=')
    queryMap.set(key, value)
  }
  return queryMap.get(key)
}