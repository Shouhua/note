// const repeat = function(console.log, 4, 3000)
// repeat(str) 每隔3s打印str，打印4次停止

'use strict'
// let repeat = function(fn, count, interval) {
//   return function(str) {
//     let c = 0
//     let id = 0
//     const newFn = (s) => {
//       fn(s)
//       c++
//       if(c === count) {
//         clearInterval(id)
//       }
//     }
//     id = setInterval(newFn, interval, str)
//   } 
// }
let repeat = function(fn, count, interval) {
  return function(str) {
    // let的使用，使程序拥有了块级作用域
    for(let i = 1; i < count + 1; i++) {
      setTimeout(fn, i * interval * 1000, str)
    }
    // for(var i = 1; i < count + 1; i++) {
    //   (function() {
    //     setTimeout(fn, i * interval * 1000, str)
    //   })(i)
    // }
  }
}
// 使用Promise解决
let repeatP = function(str, count, interval)
{
  let id;
  new Promise((resolve) => {
    id = setInterval(()=> {console.log(str); if(--count === 0) resolve()}, interval*1000)
  }).then(()=>{if(id) clearInterval(id)})
}
const repeatFn = repeat(console.log, 4, 1)
repeatFn('hello, world!')