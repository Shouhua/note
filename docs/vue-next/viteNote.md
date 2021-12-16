### pre-bundling
1. 可以看见在以前的版本，特别是没有prebuild版本时候，引入import { debounce } from 'lodash-es'会引入很多请求数据，因为lodash-es主文件里面export很多东西, 引入prebuild之后，使用rollup打包lodash-es所有到一个文件，并且缓冲在.vite中。
2. 另外，由于vite使用的是ESM环境，如果引用的是commonjs的包，可以在prebuild环节通过rollup转化成为esm格式
### 遇到的问题
1. commonjs or esm(ts -> cjs or esm js -> cjs(rollup))
2. cache key统一，不然change中删除不知道是多少, 增加change debug和cache set debug
3. publicPath, filePath, 比如hmr需要用到publicPath, cache需要用到filePath，还有2者之间的转化
4. hmr使用的HMR boundary
5. 加载外部包时的**跳转**，比如lodash-es, 以及她所依赖的加载，直接导致需要pre-bundling
6. 调整代码结构，middleware->plugin
7. 添加配置文件, 将相关的上下文变量如何添加到各个plugin
8. 如何处理常规打包工具比如webpack中各种loader，比如，file-loader对assets文件的处理, 自己实现了其中的处理，包括css，assets，json等
9. config和option命名规范，在传递配置时候叫做options，在配置server的时候叫做config, 用于prebundle时候又叫做options
10. compiler-sfc中处理template的函数transformSrcset中如果给了配置项transformSrcset.base，会直接join base和img的src，并且src不会被hoist，这样就不会被生成新的import assets请求, **其中compiler-sfc中添加node transfer体现了vue-next compiler的可扩展性，可以重点关注下**
11. 支持css, 如果是import css, 解析出来的css通过updateStyle添加到style tag，module则export default出来
12. module style change后会更新class name, 怎么办？解决办法是vue-reload，因为module style更新会影响template和script, 这个就需要在vuePlugin中添加timestamp参数，用于reload时候重新请求render和style
13. @vue/compiler-sfc中解析样式使用compileStyle和compileStyleAsync,如果引入css module则必须使用compileStyleAsync, 由于引入了postcss-modules
14.build
- vendor. use config function ```mannualChunks``` provided by rollup output options 
- css rewrite url(), 使用this.emitFile({...})生成的referenceId生成```import.meta.ROLLUP_FILE_URL_[referenceId]```替换，然后rollup在output阶段resolveFileUrl会自动填充这个内部标识符，详见cssPlugin和rollup文档解释
- css plugin
- asset plugin
- manifest plugin
- json plugin. @rollup/plugin-json
- sourcemap. output.sourcemap=true
- build. **支持mannual code split，sourcemap，特别注意debug这样的package，package.json里面提供的是main和browser，但是nodeResolve默认的解析是[module, main], 找到的是cjs版本, 即使后面通过commonjs转化，但是找不到cjs版本中的比如tty等包，打包出来的代码直接使用import 'tty'是有问题的**
15. css build. 目前遇到的问题是，vitejs1.0.0-rc.9版本中有个配置cssCodeSplit，用于拆分css文件，如果为true，则把所有的style打包成单独的一个包，会在代码中动态添加__VITE_CSS__()的js函数占位符，然后在renderChunk中如果是isDynamicEntry会添加这个函数的函数体，其他就找不到这个函数了；如果这个值为false，因为打包出来的main.js的依赖里面(renderChunk中的chunk.modules里面)没有rollup-plugin-vue打包App.vue的引入css：
```js
import 'App.vue?vue&type=style&index=0&language.css'
import 'App.vue?vue&type=style&index=0&module&language.css'
```
这些引入会直接讲以上两个依赖项tree shaking掉，所以如果添加css占位符就不会；源码中根据这个问题增加了```export default JSON.stringify(css)```这个也貌似没有作用???，在fakeVite中全部添加css占位，然后renderChunk中手动去掉，但是这样就没有css的tree shaking了，只要是引用就加入到style文件了，先做笔记，后续看最新vite2
### simple dev server for vue
- [-] 新建简单的dev server
- [-] 支持解析SFC
- [-] 支持HMR, script/template/style(module, scoped)
- [-] 支持css(module)，assets，json

### vite解析和编译css
serve时候，遇到import css，生成code中使用updateStyle加载返回的静态css内容
build时候，使用

### cli至少应该具有的功能
1. template
2. dev server
3. producation bundle

### shell执行相关
https://unix.stackexchange.com/questions/458521/bash-script-commands-seperated-by-space
https://stackoverflow.com/questions/10938483/why-cant-i-specify-an-environment-variable-and-echo-it-in-the-same-command-line/10939280#10939280
```shell
debug=123 echo $debug # empty
debug=123; echo $debug # 123
debug=123 && echo $debug # 123
debug=123 eval echo $debug # 123

# run.sh
#!/usr/bin/env bash
echo $debug
echo $$ # current PID

debug=123 ./run.sh # 123
debug=123; ./run.sh # empty
debug=123 && ./run.sh # empty
```
可以使用```set -x;debug=123;echo $debug;set +x```查看调试输出命令
总结就是：
1. ```debug=123 echo $debug``` 在echo执行的时候就已经argument expand by the shell，但是这时debug的assignment处于同一个expand时间，debug还没有形成变量，接下俩条所以可以，```;```表示语句的结束，变量已经生成；```&&```表示前一条语句必须执行结果为true，后面才接着执行
2. 如果换成脚本，个人理解是第一条相当于本地的变量生成，第二三条**极有可能**是由于script使用的环境child shell，但是环境变量没有debug export，所以没有。(```debug=123;echo $$;./run.sh```)
3. 可以使用```env -i ./run.sh```来清除继承自parent shell的env

## vite 2.x
1. virtual module
@my-virtual-module -> (custome plugin resolve id)\0@my-virtual-module -> (builtin transform)@id/__x00__@my-virtual-module
2. [source-map-support](https://github.com/evanw/node-source-map-support)
node开发中根据compiled code去定位发生错误的原始位置, 示例代码已经很能说明用途
3. prebundling dep optimization: Support adding some-lib > nested-lib to optimizeDeps.include. Allowing nested-lib to be optimized if we exclude some-lib from optimization. For example:
// Dependency tree:
some-lib (excluded)
├─ nested-lib (will be included and optimized)
4. optimizeDeps
vite中使用包只能是esm，optimizeDeps的作用之一就是将cjs转化为esm，但是有些cjs包有named export转化不了，导致在esm使用named import会报错。
https://github.com/vitejs/vite/pull/825
比如faskclick这样的库，转化后还是只有module.export的导出(https://github.com/vitejs/vite/issues/815).
正对这个问题，@rollup/plugin-commonjs也做了点调整(https://github.com/rollup/plugins/pull/604/files), 在this.getModuleInfo或moduleParsed阶段暴露isCommonJS的判断
vitejs正对以上问题，在importAnalysis阶段做了tranformCjsImport函数去处理这些cjs依赖，这个讨论社区总共有2个方案，详情见讨论的issue，最终的方案是在转化的code中做了对named export添加了一些代码，可以让用户无感知的的使用named export，比如上面提到的fastclick，在包转化方面没有什么其他的变化。在业务代码转化中添加了：
```js
// biz source code
import { FastClick } from 'fastclick'
// transformed code by import Analysis
import __vite__cjsImport0_fastclick from "/node_modules/.vite/fastclick.js?v=e8a488f6";
const FastClick = __vite__cjsImport0_fastclick["FastClick"]
```
总体来说，vite还是在推进包转向使用esm标准规范