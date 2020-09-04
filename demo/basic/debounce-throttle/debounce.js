/**
 * https://keelii.com/2016/06/11/javascript-throttle/
https://levelup.gitconnected.com/debounce-in-javascript-improve-your-applications-performance-5b01855e086
debounce只关心动作的结果，比如希望用户在输入停止后一小段时间再去发送请求
throttle(截流)关心动作的每一个阶段，只不过每一个阶段之间会有一小段时间，比如，用户resize屏幕的时候，滚动条
滚动的时候，肯定不是等用户停下来在去处理，可以每隔一小段时间处理事件
*/
export function debounce(fn, delay = 300) {
  let prevTimer = null
  return (...args) => {
    // 每次重新刷新定时器
    if (prevTimer) {
      clearTimeout(prevTimer)
    }
    prevTimer = setTimeout(() => {
      fn(...args)
      prevTimer = null
    }, delay)
  }
}
//debounce场景不一样，如果上面的debounce函数用于resize，如果一直resize，那callback一直不会执行
// throttle场景要保证一小段时间内至少会执行一次
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