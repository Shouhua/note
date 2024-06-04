/**
 * RegExp对象
 * flags: 
 * i-ignore case, 
 * g-global匹配所有匹配项，
 * m-multiply匹配多行
 * y-sticky 搜索是否具有粘性（ 仅从正则表达式的 lastIndex 属性表示的索引处搜索 ）
 * global与sticky的区别:
 * 同时制定了global和sticky，会忽略global。
 * global匹配多次，但是sticky只会匹配lastIndex之后的内容，而且仅仅匹配lastIndex
 * 
 * RegExp.test和RegExp.exec可以多次执行，如果使用了g或者y标志，会更新regex的lastIndex
 */

 // 可以在控制台尝试例子, RegExp.test和RegExp.exec效果一样，只是返回结果不一样
 var s = 'hello'
 var regex = /l/g
 var sticky = /l/y

 regex.exec(s)
 regex.lastIndex // 3

regex.exec(s)
regex.lastIndex // 4

regex.exec(s) // null 当返回结果为null时候，重置regex.lastIndex = 0
 regex.lastIndex // 0

sticky.exec(s) // null // 因为sticky只会检查lastIndex的位置的l，所以永远找不到
regex.lastIndex // 0

// while语句可以先尝试上面的例子后理解lastIndex, 另外需要注意string的取值赋值操作
// var str = 'abc123hello.i123jk' // Abc123-Hello
// var regex = /^([a-z])|(?<=[^[a-z])([a-z])/g
// let array
// let result = str.slice(0)
// while ((array = regex.exec(str)) !== null) {
//   console.log(array)
//   if(array.index === 0) {
//     result = result[0].toUpperCase() + result.slice(1)
//   }
//   if(array.index > 0) {
//     result = result.slice(0, array.index - 1) + '-' + result[array.index].toUpperCase() + result.slice(array.index + 1)
//   }
//   console.log(`Found ${array[0]}. Next starts at ${regex.lastIndex}.`);
// }
// console.log(result)

// 1234567 => 1,234,567
let num = '1234567'
let numRegex = /\d(?=(\d{3})+(?!\d))/g //递归每一个字符，查找后面完全匹配的
// $& full matched
// $1, $2, ... 代表匹配的group
// $` 匹配的左边
// $' 匹配的右边
num.replace(numRegex, '$&,')

function formatNumber(num) {
  let str = num.toString()
  let result = ''

  while(str.length > 3) {
    result = ','+str.slice(-3)+result
    str = str.slice(0, -3)
  }

  return str+result
}


// 我我....我..我.要...要...要要学学..学.编..编程.程..程
// 我要学编程
let source = '我我....我..我.要...要...要要学学..学.编..编程.程..程'
let sourceRegex = /([\u{4E00}-\u{9FFF}])(?:\1|\.)*/gui
source.replace(sourceRegex, ($0, $1, index, sourceStr) => {
  console.log($0, $1, index, sourceStr)
  return $1
})

let s1 = 'adaaasfjjjbkk'
let r1 = /(\w)(?:\1)+/gi
s1.replace(r1, ($0, $1, index, source) => {
  console.log($0, $1, index, source)
  return $1
})

let s2 = 'abc123hello'
let r2 = /((?<=[^a-z])|^)[a-z]/gm
s2.replace(r2, ($0, index, source) => {
  if(index === 0) {
    return $0.toUpperCase()
  } else {
    return $0.toUpperCase() + '-'
  }
})