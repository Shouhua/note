# [Regex](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
regular expression, javascript中的flag一般有multiple(m), global(g), ignorecase(i), stricy(y), unicode(u)  
```js
var regex = /^hello/gi
```
其中定义了一个RegExp对象，这个对象
```js
RegExp.prototype.global
RegExp.prototype.sticky
RegExp.prototype.multiline
RegExp.prototype.ignoreCase
RegExp.prototype.flags
RegExp.prototype.source
RegExp.prototype.lastIndex
RegExp.prototype.test
RegExp.prototype.exec
String.prototype.match()
String.prototype.matchAll()
String.prototype.replace()
```
其中RegExp.prototype.exec会更新regex.lastIndex，循环匹配后会重制regex.lastIndex
```js
var s = 'hello'
 var regex = /l/g
 var sticky = /l/y

 regex.exec(s)
 regex.lastIndex // 3

regex.exec(s)
regex.lastIndex // 4

regex.exec(s) // null 当返回结果为null时候，重制regex.lastIndex = 0
 regex.lastIndex // 0

sticky.exec(s) // null // 因为sticky只会检查lastIndex的位置的l，所以永远找不到
regex.lastIndex // 0
```
以下是给数字添加逗号分隔符:
```js
/ 1234567 => 1,234,567
let num = '1234567'
let numRegex = /\d(?=(\d{3})+(?!\d))/g //递归每一个字符，查找后面完全匹配的
// $& full matched
// $1, $2, ... 代表匹配的group
// $` 匹配的左边
// $' 匹配的右边
num.replace(numRegex, '$&,')
```
while语句可以先尝试上面的例子后理解lastIndex, 另外需要注意string的取值赋值操作
abc123hello-> Abc123-Hello
```js
var str = 'abc123hello.i123jk' // Abc123-Hello
var regex = /^([a-z])|(?<=[^[a-z])([a-z])/g
let array
let result = str.slice(0)
while ((array = regex.exec(str)) !== null) {
  console.log(array)
  if(array.index === 0) {
    result = result[0].toUpperCase() + result.slice(1)
  }
  if(array.index > 0) {
    result = result.slice(0, array.index - 1) + '-' + result[array.index].toUpperCase() + result.slice(array.index + 1)
  }
  console.log(`Found ${array[0]}. Next starts at ${regex.lastIndex}.`);
}
console.log(result)
```