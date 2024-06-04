## 2024-06-02
### Webpack VS Vite
JS生态圈模块化演进趋势，web开发开始统一使用ESM, 可以放弃很多以前的包袱，比如cjs等，浏览器原生支持module。 Vite就是这种趋势的产物之一。

Webpack历史悠久，需要承担以前包袱，兼容各种格式，但是生态丰富稳定
Vite直接使用ESM, 无需做兼容性处理。代码单一，好理解
prebundling提前分析依赖包，将他们做成映射，加快开发时请求调用: 
1. 生成dependencies的hash, 判断是否需要重新生成映射
2. 有哪些包(qualifiedDependencies)会被做成cache
	- cjs， 转化成 esm
	- esm有很多自己包内本地依赖(这些会在请求包时发送跟多请求)
	- esm包依赖外部包等
esm会将所有依赖打包成一个直接使用的包, 具体使用rollup的打包机制。

### pre-bundling
1. 可以看见在以前的版本，特别是没有prebuild版本时候，引入import { debounce } from 'lodash-es'会引入很多请求数据，因为lodash-es主文件里面export很多东西, 引入prebuild之后，使用rollup打包lodash-es所有到一个文件，并且缓冲在.vite中。
2. 另外，由于vite使用的是ESM环境，如果引用的是commonjs的包，可以在prebuild环节通过rollup转化成为esm格式
### 遇到的问题
1. commonjs or esm(ts -> cjs or esm js -> cjs(rollup))
2. cache key统一，不然change中删除不知道是多少, 增加change debug和cache set debug
3. publicPath, filePath, 比如hmr需要用到publicPath, cache需要用到filePath，还有2者之间的转化
4. hmr使用的HMR boundary
5. 加载外部包时的**跳转**，比如lodash-es, 以及她所依赖的加载，直接导致需要pre-bundling
6. 调整代码结构，middleware->plugin, plugin里面增加了注册函数和middleware函数
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
# file:///home/shouhua/Downloads/bash.html#Simple-Command-Expansion
# 当然为空，当$debug expansion的时候，debug=123还没有生效
debug=123 echo $debug # empty
debug=123; echo $debug # 123
# file:///home/shouhua/Downloads/bash.html#Simple-Commands
# && 属于 control operate, 所以 && 前后属于两条命令，前面在全局新建了变量，后面命令调用，合理
debug=123 && echo $debug # 123 # && 是
# eval也是一样的流程，只不过eval后面的组成执行命令，在执行的时候再执行一遍各种expansion
(set -x; a=debug; debug=123 eval echo \$$a) # $$表示当前pid
debug=123 eval echo $debug # empty
debug=123 bash -c 'echo $debug'

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
**NOTICE: file:///home/shouhua/Downloads/bash.html#Command-Execution-Environment
文档明确说了variabl assignment是加入到执行环境的，只不过除了builtin和function外，其他都在单独的执行进程中执行**
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
5. [pendingRequest](https://github.com/vitejs/vite/pull/5037)
默认情况下，请求进来后，先经过pipeline，pipeline里面有个主要的流程是transform(transform->transformRequest->doTransform)，其中会跳用多个plugin流程(resolveId->load->transform)，其中比较重要的是default transform的importAnalysis，里面会有多个操作，比如import嵌套分析(见importAnalysis.ts中的pre-transform known direct imports部分)，随着模块越多，类似的循环分析越多，导致服务器请求利用率不高，所以这里没有使用同步的分支，使用await transformRequest，而是直接在transformRequest中的doTransform就直接返回了，将request handler保存，待下次进入的时候直接重复利用
6. NULL_BYTE_PLACEHOLDER and '\0'
'\0'是rollup内部惯例，一般用于virtual module上，添加这个前缀防止其他插件(比如node resolution)处理，还可以在sourcemaps中区分virtual module和常规文件
'\0'不是合法的import url字符，因此importAnalysis中rewrite带有这种字符的import url，使用NULL_BYTE_PLACEHOLDER替换，并且使用'/@id/'前缀；在transform middleware中，进入plugin system前，将转化的含有NULL_BYTE_PLACEHOLDER还原，比如'/@id/__NULL_BYTE_PLACEHOLDER__@virtual-module' -> '\0virtual-module'
7. [launch-editor-middleware](https://github.com/yyx990803/launch-editor)
主要是用于服务器catch到的error，通过websocket传到client，使用overlay显示后，用户点击错误文件激活editor定位到文件的定位行
8. sourcemap支持
transformRequest中使用convert-source-map扫描文件中是否有sourcemap链接，如果有使用injectSourcesContent注入到请求文件中，比如main.js文件中使用
```js
//# sourceMappingURL=main.js.map
```
请求时会将main.js.map内容注入到main.js内存中返回到浏览器
另外如果使用esbuild产生sourcemap也是会注入到原文件中的
9. define plugin and env
client中的env.js只是将config.define中定义对象挂在在browser的全局(比如window)变量下
define plugin用于将业务代码中的以下数据替换：
- processNodeEnv: process.env.NODE_ENV etc
- userDefine: config.define
- importMetaKeys: 主要用于build环境中，dev环境由importAnalysis处理; 包括import.meta.env(来自.env -> config.env), import.meta.hot
- processEnv: 主要用于webworker中，比如process.env./global.process.env./globalThis.process.env.
10. 类似的库
- https://github.com/Krutsch/html-bundle
- https://github.com/remorses/bundless
11. data uri 支持
https://github.com/vitejs/vite/issues/1428#issuecomment-757033808
浏览器支持例如import batman from "data:text/javascript;, export default 'hi, batmannnn'"，但是build会有问题
12. prebundling处理debug时出现问题
跟package bundling没有关系，是packageCache没有判断的问题
13. commonjs与import的区别之一是cjs顺序执行，如果有互相引用，但是函数还没有加载，会提示没有函数
14. build时候，配置文件中使用了define时，引用lodash，commonjs plugin会报unexpected token问题  
这个是因为define中的配置会做替换，定义了```count: 0```，_shortOut.js文件中有个```var count = 0```，那这个在cjs plugin中会报错
https://cn.vitejs.dev/config/#define，如官方文档写的"建议只对CONSTANTS使用define"，比如版本号等
issues也有提出类似问题: https://github.com/vitejs/vite/issues/2700
15. sirv包
sirv会根据req.url去匹配文件夹中的文件，如果没有匹配有next会执行next(), 如果没有会执行isNotFound(), 源码很好理解
```js
sirv('src', options) // /index.html会执行扫描/src/index.html，有没有这个文件
```
16. 总共2处generateBundle:
fakeVite:build-html plugin在fakeVite:css后面，generateBundle是async, sequential，先执行css的generateBundle，最后执行html的generateBundle
17. 假设现在框架完事了，需要添加支持某个特性的plugin，比如assetImportMetaUrl的功能，业务功能(https://cn.vitejs.dev/guide/assets.html#new-url-url-import-meta-url)

### vue2+webpack迁移vite技术栈遇到的问题
1. 首先对于大的工程首次加载似乎增益不大，编译是很快，但是打开页面后需要加载很多文件，导致网络阻塞，时间不能接受，这个看能不能优化（h2可能会好点，但是api使用的是h1.1）
2. 修改vite的入口为public/index.html，或者在根目录新建index.html并且添加main.js的引用，注意添加```type="module"```属性
3. 添加vite-plugin-vue2和vite包：```npm i -D vite-plugin-vue2 vite```，添加vite.config.js文件
4. webpack配置中对应切换：
- alias  
```js
resolve: {
	alias: {
		'@': path.resolve(__dirname, './src'),
		'vue': 'vue/dist/vue.esm.js'
	},
}
```
- extensions
```js
resolve: {
	extensions: ['.vue', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.svg'],
}
```
- DefinePlugin
```js
import { defineConfig } from 'vite'
import pkg from './package.json'
import pkgLock from './package-lock.json'
export default defineConfig({
	define: {
		projectName: JSON.stringify(pkg.name),
		pkgInfo: {
			'vue': JSON.stringify(pkgLock.dependencies['vue'].version),
			'vue-router': JSON.stringify(pkgLock.dependencies['vue-router'].version),
		}
	}
})
```
- ProvidePlugin提供全局引入变量的功能，不需要在每个页面都引入。比如:
```js    
new webpack.ProvidePlugin({
	'$': 'jquery/dist/jquery.min.js',
})
```  
在vite环境中目前还没有相应的全局引入方式，在每个需要的页面引入，这样可以更好的实现tree-shaking
- jsx
```js
plugins: [
	createVuePlugin({
		jsx: true
	})
]
```
需要注意的是，vue中的script需要使用属性```lang="jsx"```, 如果是js文件则需要更改扩展名为jsx
- webpack-virtual-modules/require.context
```js
const modules = import.meta.glob('../modules/**/export.js');
Object.keys(modules).forEach((key) => {
	const moduleNames = key.match(/^\.\.\/modules\/(.+)\/export\.js/);
	if (moduleNames) {
		existModulesContextMap[moduleNames[1]] = modules[key];
	}
});
```
5. 使用require引用或者输出模块场景不能使用，使用esm方式引入或者导出
6. 图片引入
```html
<div :style="{backgroundImage: `url('${backgroundImage}')`}"></div>
```
```js
// before
computed: {
	backgroundUrl() {
		return require('@/assets/images/login/background.png');
	} 
}
// after
computed: {
	backgroundUrl() {
		return new URL('../../../assets/images/login/background.png', import.meta.url).href;
	} 
}
```
