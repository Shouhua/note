/**
 * Array.from(arrayLike, mapFn, thisArg)
 * arrayLike: 想要转换成数组的类数组对象或者可迭代对象
 * 类数组对象：拥有一个length和若干索引属性的任意对象
 */
const range = (start, end, step = 1) => Array.from({length: (end - start) / step + 1}, (_, i) => start + i * step)
/**
const range = {
  start: 1,
  end: 5,
  [Symbol.iterator]() {
    this.current = this.start;
    return this;
  },
  next() {
    if (this.current >= 1 && this.current <= 5) {
      return { done: false, value: this.current++ };
    }

    return { done: true };
  },
};
 */

for (let num of range) {
  console.log(num);
}

console.log(range(1, 10, 2)) // [1, 3, 5, 7, 9]

//Array.flat
// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
// [1, [2, [3, 4, 5], 6], [7, 8], 9] => [1, 2, 3, 4, 5, 6, 7, 8, 9]
// 方法1
let source = [1, [2, [3, 4, 5], 6], [7, 8], 9]
let flatDeep = function(source) {
  let result = []
  if(!Array.isArray(source)) return result
  function flat(arr) {
    arr.forEach(item => {
      if(Array.isArray(item)) {
        flat(item)
      } else {
        result.concat(item)
      }
    })
  }
  flat(source)
  return result
}
console.log(flatDeep(source))

// 方法2
source.reduce()