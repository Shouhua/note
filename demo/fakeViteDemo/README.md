## 使用
使用fakeVite工具提供的dev和build，主要是验证打包vue3工程，支持json，css，sourcemap，assets(jpeg)，hmr
```js
pnpm run dev // 开发环境，支持HMR, prebuild dev packages

pnpm run build // 支持mannual code split，sourcemap，**特别注意debug这样的package，package.json里面提供的是main和browser，但是nodeResolve默认的解析是[module, main], 找到的是cjs版本, 即使后面通过commonjs转化，但是找不到cjs版本中的比如tty等包，打包出来的代码直接使用import 'tty'是有问题的**
```