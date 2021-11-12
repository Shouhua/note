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
