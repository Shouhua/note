## vue再减少包体积方面做的努力
**terser词汇，function name mangling函数名称是否需要改变，比如css modules的class就是经过mangling**
1. 尽量tree shaking, 使用terser的能力
比如以下函数：
```js
// makeMap.ts
export function makeMap(
  str: string,
  expectsLowerCase?: boolean
): (key: string) => boolean {
  const map: Record<string, boolean> = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val]
}
```
这个函数是没有副作用(side effect)，即在函数内部是没有修改全局变量、增加全局变量的属性(getter, setter等)，但是如果我们直接应用她，即使没有使用，也是会保留的
```js
const isBuiltInTag = makeMap('slot,component')
```
如上所示，如果isBuiltInTag没有被使用，makeMap函数是会打包进bundle的，尽管删除了isBuiltInTag定义的这行代码。
但是如果我们再定义这行添加上特殊的annotation，就可以告诉terser这个是无副作用函数，没有使用可以删除
```js
const isBuiltInTag = /*#__PURE__*/ makeMap('slot,component')
```
可以使用terser的[repl](https://try.terser.org/)测试
2. 在closure function中减少使用inline function，增加代码复用
```js
function renderer() {
 const a = () => {
   console.log(a)
 }
function b() {
   console.log(b)
}
 const c = () => {
   /*#__INLINE__*/ a()
   /*#__INLINE__*/ b()
   console.log(c)
 }
 return {
   c
 }
}

renderer().c()
```
```js
function renderer() {
 const a = function() {
   console.log('a')
 }
function b() {
   console.log('b')
}
const foo = (i)=>{ console.log('foo'); return i;}
 const c = () => {
   a()
   b()
   foo(1)
   return true
 }
 const d = () => {b();foo(0)}
 return {
  d, 
   c
 }
}

const render = renderer()
render.c()
render.d()
```
renderer.ts中的baseCreateRenderer函数，返回render对象，在函数体内有多个实际渲染操作内部函数，比如patch，mountComponent等，这些函数有多处使用，如果使用普通的函数声明形式，terser在处理的时候会默认inline，增加了代码量，所以在源代码中有提示尽量使用箭头函数，测试了下，使用```const patch = function(){...}```也是没有问题的，可以使用```/*#__INLINE__*/```来现示的inline代码，但是array function是不受这个影响的，所以使用array function肯定不会inline。