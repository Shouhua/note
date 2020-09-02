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