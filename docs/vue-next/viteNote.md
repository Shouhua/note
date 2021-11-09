### prebuild
1. 可以看见在以前的版本，特别是没有prebuild版本时候，引入import { debounce } from 'lodash-es'会引入很多请求数据，因为lodash-es主文件里面export很多东西, 引入prebuild之后，使用rollup打包lodash-es所有到一个文件，并且缓冲在.vite中。
2. 另外，由于vite使用的是ESM环境，如果引用的是commonjs的包，可以在prebuild环节通过rollup转化成为esm格式
### simple dev server for vue
- [ ] 新建简单的dev server
- [ ] 支持解析SFC
- [ ] 支持HMR, script/template/style(module, scoped)