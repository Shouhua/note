---
# sidebar: auto
prevLink: true
nextLink: true
title: 'Compiler'
---
# 调试
1. 编译vue-next工程
```shell
yarn build --sourcemap --environment=development compiler-core shared
```
2. 分别进入vue-next工程中的compiler-core和shared, 运行如下命令
```shell
yarn link
```
3. 进入调试工程中，运行如下命令
```shell
yarn link @vue/compiler-core
yarn link @vue/shared
```
4. 在调试工程中使用
```javascript
const compiler = require('@vue/compiler-core')
const result = compiler.baseParse(`<div></div>`)
```