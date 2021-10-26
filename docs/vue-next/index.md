---
# sidebar: auto
prevLink: true
nextLink: true
title: 'Vue Next Notes'
---

# Vue Next Notes

## 使用
```js
<script src="https://unpkg.com/vue@next"></script>
<script>
const { createApp } = Vue
createApp(App).mount('#app')
</script>
```

## 笔记
1. 在vue3.0中可以显式的去定义用户认为需要响应式的对象变量，而在vue2.x时代，是在data中去定义数据对象，然后vue去黑盒处理, 所以vue2.x时代，可以在created生命周期中定义非响应式的变量
2. https://zhuanlan.zhihu.com/p/266597806 template ref的妙用，设置ref为string，然后在setupState设置相同的string，就可以变相的设置
3. dynamicChildren是在_createVNode阶段生成的vnode属性字段，在compiler阶段没有，compiler阶段只有dynamicProps字段

## 响应式系统
1. 手动编写最小模型
2. 调研Proxy的trap handler，Collective type(Array, Set, Map, WeakSet, WeakMap)

## 编译时
编译时主要涉及compiler-dom，compiler-core2个工程

## 运行时

### 整个运行过程
1. 首先产生vnode，不管是通过编译时产生的render函数，还是通过h构建
2. 然后mount或者patch，通过vnode生成对应的componnet instance
3. 生成对应的instance.update job, 当发生更新的时候再次执行scheduler(queueJob(instance.update)), 完成整个循环
### performace监控
使用window.performace监控component渲染性能
```js
const performance = window.performance
const startTag = 'vue-component-1'
const endTag = 'vue-component-1:end'
performace.mark(startTag)
performance.mark(endTag)
performance.measure('<component> hello', startTag, endTag)
performance.clearMark(startTag)
performance.clearMark(endTag)
```
window.memory可以查看浏览器的内存使用情况(only chrome)
### 支持HMR，devtools
### jsx或者render函数会遇到的问题原因：  
1. ::v-slotted样式的处理问题, 就是说在scoped style环境中使用render函数和template得到的data-v-*注入结果不一致，原因是使用render函数时丢失了scope id的信息，只能自己手动获取scope id然后使用提供的withId和withScopeId包裹render函数
2.  instance.vnode.scopeId这个不是component自己的scope id，而是component所在component中的scope id，获取component自己的scope id，可以使用instance.type.__scopeId, 但是这个__scopeId是@internal的。
3. 只有stateful component才有vnode.appcontext, 因为在createComponentInstance里面才有appContext的设置
4. 同样的，functional component是有执行createComponentInstance的，shapeFlags.FUNCTIONAL_COMPONENT导致没有执行setupStatefulComponent后面的流程了, 所以functional component的instance.proxy没有设置

### 理解
1. custom directive最终的想法是为用户提供访问原生dom的能力
2. falloutthrough的处理有2个地方:
  - componentProps.ts->initProps里面，会根据props生成attrs，props里面的reservedProps，emitOptions中的不会传递
  - componentRenderUtils.ts->renderComponentRoot, 会将v-model相关的事件排除掉
3. custom directive会在vnode.dirs中，这个在instance.update中的获取subTree的时候会做一次传递给component的根元素，如果是Fragment则不能正确的执行，会有warning，但是vnode的lifecycle不会传递，会在instance.update准确的点去执行, 如下代码所示，v-focus会传递给Fragment的vnode.dirs, 但是vnodeMounted会作为Fragment的props.onVnodeMounted
```html
<fragment-directive v-focus @vnodeMounted="handleVnodeMounted" />

<template>
  <input type="text">
  <input type="text">
</template>
```
4. 对于比较细粒度控制dom渲染，传统的template方式就吃力了，但是这种情况比较少见，一般在一些封装库中出现，所以在一些UI库中会有使用render函数，甚至有的使用jsx，都是处于这个原因，但是不建议所有的组件都使用。以下情况下传统的template就有点吃力
```html
<Stack size=4>
  <div>hello</div>
  <Stack size=4>
    <div>hello</div>
    <div>hello</div>
  </Stack>
</Stack>
```
to
```html
<div class="stack">
  <div class="mt-4">
    <div>hello</div>
  </div>
  <div class="mt-4">
    <div class="stack">
      <div class="mt-4">
        <div>hello</div>
      </div>
      <div class="mt-4">
        <div>hello</div>
      </div>
    </div>
  </div>
</div>
```
使用render函数如下:
```js
export default {
  name: 'Stack',
  setup(props, {slots}) {
    const slot = slots.default ? slots.default() : []
    return () => h('div', {class: 'stack'}, slot.map(child) => h('div', {class: `mt-${props.size}`}, child))
  }
}
```
5. async setup问题。解决方法可以参考https://antfu.me/posts/async-with-composition-api。主要是由于setup方法里面使用了异步方法后会可能丢失instance，对于依赖instance的
lifecycle api等不会执行，另外computed、watch在组件销毁的时候不能跟着销毁因为没有注册到instance的effects中。在3.2版本中引入了effectScope，相当于将runtime实现的收集effect，放在了底层reactivity(响应式系统)中，也可以认为是应用实现放到了语言层面。
6. slot整条线。首先slot必须存在于component的children中。
  - compiler阶段会编译生成类型为Object的对象
  - runtime时生成vnode，createVNode -> normalizeChildren -> set shapeFlag(slot_array)和patch flag
  - runtime时根据vnode生成component instance时，setupComponent->initSlots，会将children转化为instance.slots = {...}
  - setup运行的时候上下文context中的slots就是上述的slots对象
  - **renderSlot在组件使用slot tag时候调用，slot默认渲染是不使用优化的，但是在renderSlot是只给编译器调用，可以增加优化，添加openBlock, 详细可见renderSlot.ts** 
  - **compiler中有使用withCtx的helper表示这个slot在编译阶段已经编译过了，3.2改版后在componentRenderContext.ts文件中，这个里面有说，因为用户自己使用slots去写render函数，所以统一默认不使用优化block；有个情况例外，就是使用renderSlot时候表示一定是编译器结果代码在使用，所以在rendeSlot里面有强制添加开启优化block, 整个过程就是在renderSlot时，调用slot，此时slot为withCtx((args)=>fn)，会触发里面的_c和_d的判断**
  - **slots对象中_是编译器传递出来的slotFlag，而_c, _d, _n, _ns等是运行时变量**
7. update component操作。updateComponent中有2中情况：
  - parent component update，这种情况会生成新的component vnode，所以next(vnode) is not null，同时由于parent component更新有可能更新了传递进来的props和依赖自己组件scope的slots，所以会调用updateProps和updateSlots
  - 自身变化，这个时候不会生成新的vnode，即next is null，这个时候只会运行instance.update，外部依赖没有变化，**slot在parent component中，虽然变量作用域来自于自身component，但是影响slot结构的变量还是来自于parent component的，所以自身变化的时候不需要更新slots**
8. rollup-plugin-vue可以了解整个编译过程，特别是可以讲编译器串联起来，比如传入options.id = scopeId，还有理解slot scope id

### vue 3相关的基础库
(element-plus)[https://github.com/element-plus/element-plus]  
(jsx-next)[https://github.com/vuejs/jsx-next]  

## Jest
### Matchers
1. Common Matchers
- toBe: 使用Object.is(value1, value2)进行比较, 比如expect(i)[.not].toBe(3)
- toEqual: 比较对象和数组，比如：expect(o).isEqual({a: 1, b: 2}) 
2. Truthiness
- toBeNull
- toBeUndefined
- toBeDefined
- toBeTruchy
- toBeFalsy
3. Numbers
- toBeGreaterThan
- toBeGreaterThanOrEqual
- toBe
- toEqual
4. Strings
- toMatch(regex)
5. Array and iterables
- toContain
6. Exceptions
- toThrow(Error | string | regex)
### Mock functions
1. .mock property
const myMock = jest.fn()
myMock.mock.calls.length
myMock.mock.calls[0][0].toBe('first arg')
myMock.mock.results[0].value.toBe('return value')
myMock.mock.instances.length.toBe(2)
myMock.mock.instances[0].name.toEual('test')
2. Mock return value
const myMock = jest.fn()
myMock() // undefined
myMock.mockReturnValueOnce(10).mockReturnValueOnce('x').mockReturnValue(true)
console.log(myMock(), myMock(), myMock(), myMock()) // 10, x, true, true
3. custom matchers
expect(mockFunc).toHaveBeenCalled()
expect(mockFunc).toHaveBeeanCalledWith(arg1, arg2)
expect(mockFunc).toMatchSnapshot()

## vue3 scheduler内部job执行
instance.update是effect，使用scheduler，scheduler将添加job到queue(not pre and not post)
setRef会将set ref的操作放在post job中，但是优先级是最高的，设置了id=-1
watch也会如果设置了flush也会flush job，flush=pre会使用queuePreFlushCb, flush=post会使用queuePostFlushCb,这个会在setRef之后执行(https://github.com/vuejs/vue-next/issues/1852)

### tailwindcss:
1. font-size使用rem，border使用px，其他使用em
2. rem是相对于根元素html的font-size而言, 伪元素:root代表html, font-size默认是16px

### [webpack5升级注意点](https://segmentfault.com/a/1190000040846550)
1. devServer里面的stats没有了，使用root对象相面的stats或者devServer.devMiddleware.stats代替
2. devServer.contentBase使用devServer.static.directory代替
3. 启动dev server，使用webpack-cli里面的webpack serve，不使用原来的webpack-dev-server

