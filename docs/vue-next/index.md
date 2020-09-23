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