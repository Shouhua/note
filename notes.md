## 2024-05-31
### HMR流程
编译工具如webpack, vite等都会提供`import.meta.hot`或者`import.hot`对象，这个对象包含方法`accept()`
```js
import.meta.hot.accept()
import.meta.hot.accept(dep, callback)
```
SFC通过compiler-sfc编译后，生成如下的JS代码
```js
import {render} from `App.vue?vue&type=template&id=123`
import script from `App.vue?vue&type=script&lang=js&id=123`
export * from `App.vue?vue&type=script&lang=js&id=123`

import `App.vue?vue&type=style&id=123&module=true&lang=css&index=1` // add style tag in header, 里面也带有accept和prune方法，用于HMR添加和移除

const api = __VUE_HMR_RUNTIME__
import style0 from `App.vue?vue&type=style&scoped=123&module=true&lang=css&index=0`
const cssMoudles = {}
cssModules["$style"] = style0
if(import.meta.hot) {
	script.__hmrId = 123
	import.meta.hot.accept( `App.vue?vue&type=style&scoped=123&module=true&lang=css&index=0`, () => {
		cssModules["$style"] = style0
		api.rerender('123')	
	})	
}

script.render = render
script.__cssModules = cssModules
script.__file = 'src/App.vue'
if(!api.createRecord('123', script)) {
	api.reload('123', script)
}
if(import.meta.hot) {
	script.__hmrId = 123
	import.meta.hot.accept((mod) => {
	module.hot.accept("./App.vue?vue&type=template&id=7ba5bd90", () => {
    console.log('re-render')
    api.rerender('7ba5bd90', render)
	})
  })
}
export default script
```
首次运行，通过accept注册更新回调，更新后，通过websocket协议通知client, 是需要rerender或者reload，rerender就是模块的patch, reload是将当前vnode放到hmrDirtyVnodes里面，然后强制父Vnode更新，patch时候发现当前vnode不是same vnode,就unmount,在mount当前node,达到强制更新的目的。

## fork工程更新
[github fork如何更新](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)
``` shell
git remote add upstream git@github.com:vuejs/vue-next.git
git fetch upstream
git switch master
git merge upstream/master
git push orgin master
```
## ls-lint
文件和目录名称校验

## tsd
typescript类型测试
