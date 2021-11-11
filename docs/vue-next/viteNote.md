### pre-bundling
1. 可以看见在以前的版本，特别是没有prebuild版本时候，引入import { debounce } from 'lodash-es'会引入很多请求数据，因为lodash-es主文件里面export很多东西, 引入prebuild之后，使用rollup打包lodash-es所有到一个文件，并且缓冲在.vite中。
2. 另外，由于vite使用的是ESM环境，如果引用的是commonjs的包，可以在prebuild环节通过rollup转化成为esm格式
### 遇到的问题
1. commonjs or esm(ts -> cjs or esm js -> cjs(rollup))
2. cache key统一，不然change中删除不知道是多少, 增加change debug和cache set debug
3. publicPath, filePath, 比如hmr需要用到publicPath, cache需要用到filePath，还有2者之间的转化
4. hmr使用的HMR boundary
5. 加载外部包时的**跳转**，比如lodash-es, 以及她所依赖的加载，直接导致需要pre-bundling
### simple dev server for vue
- [ ] 新建简单的dev server
- [ ] 支持解析SFC
- [ ] 支持HMR, script/template/style(module, scoped)

### cli至少应该具有的功能
1. template
2. dev server
3. producation bundle