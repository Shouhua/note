# debounce和throttle
防抖的场景是比如在按钮的点击，input框的输入检索，滚动条滚动事件处理等，短时间内大量事件被触发会产生大量的请求和操作，影响用户体验，所以需要防抖。每次请求都会延迟触发，如果在延迟期间又被触发，则取消上次的触发处理，继续将本次操作延迟。    

节流跟防抖相似，但是有细微的差异，防抖在比如resize事件一直变化的时候，触发事件每次都会刷新延迟函数，导致一直不会执行，除非停下后会执行一次。针对这种情况节流就是保证在每隔一小段时间都会执行至少一次。
```js
export function debounce(fn, delay = 300) {
  let prevTimer = null
  return (...args) => {
    if (prevTimer) {
      clearTimeout(prevTimer)
    }
    prevTimer = setTimeout(() => {
      fn(...args)
      prevTimer = null
    }, delay)
  }
}
export function throttle(fn, delay=300, atLeast=500) {
  let previous = null
  let timer = null
  return function(...args) {
    if(!previous) previous = Date.now()
    if((Date.now() - previous) > atLeast) {
      fn(...args)
      previous = Date.now()
    } else {
      if(timer) {
        clearTimeout(timer) 
      }
      timer = setTimeout(() => {
        fn(...args)
        timer = null
      }, delay)
    }
  }
}
```