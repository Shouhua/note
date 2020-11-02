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
3. 以下情况下传统的template就有点吃力
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

tailwindcss:
1. font-size使用rem，border使用px，其他使用em
2. rem是相对于根元素html的font-size而言, 伪元素:root代表html, font-size默认是16px


### vue 3相关的基础库
(element-plus)[https://github.com/element-plus/element-plus]  
(jsx-next)[https://github.com/vuejs/jsx-next]  