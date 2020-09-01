// 特别注意类似于对象的对象，比如arguments，dom对象等，他们有length，有Symbol.iterator，但是没有其他属性
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