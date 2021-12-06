1. esModuleInterop
支持使用import d from 'cjs'的方式引入commonjs包
https://toyobayashi.github.io/2020/06/29/ESModule/
现实中，cjs包是能引入esm，ES的默认导出可以对应 CommonJS 模块导出对象的default属性
但是反之就没法对应上了，esModuleInterop是为了解决esmodule中引入cjs默认导出方案(即require.exports=foo), __esModule 是用来兼容 ES 模块导入 CommonJS 模块默认导出方案, 个人推荐向标准看齐， 在以后写 CommonJS 模块的时候尽量不要用 module.exports 导出单对象，而是导出具体的属性名 exports.foo = bar,在 ES 模块中也尽量不要用 export default