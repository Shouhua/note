## vue style
用法上来说：
vue使用```<style module>, <style>, <style scoped>```3类，暂不考虑lang="scss"等情况
```js
<template>
	<p class="test" :class="$style.helo">helo, style module</p>
	<p :class="style1.normal">helo, normal module</p>
	<p class="yellow">hello, import style</p>
	<button @click="handleClick">change font size</button>
</template>
<script>
import { ref } from 'vue'
import style1 from './style.module.css'
import style2 from './style.css'

console.log(style1, style2)

export default {
	setup() {
		const fontSize = ref('20px')
		return {
			fontSize,
			style1,
			handleClick() {
				fontSize.value = fontSize.value === '14px' ? '20px' : '14px'
			}
		}
	}
}
</script>
<style module>
.helo {
	color: red;
}
</style>
<style>
.test {
	font-size: v-bind(fontSize);
}
</style>
<style lang="scss">
.foo {
	color: lightblue
}
</style>
```
```css
// style.css
.yellow {
	color: blueviolet;
}
```
```css
// style.module.css
.normal {
	color: green
}
```
上述代码在vue-loader编译后如下：
```js
import { render } from "./App.vue?vue&type=template&id=7ba5bd90&scoped=true"
import script from "./App.vue?vue&type=script&lang=js"
export * from "./App.vue?vue&type=script&lang=js"

const cssModules = {}
import style0 from "./App.vue?vue&type=style&index=0&id=7ba5bd90&module=true&lang=css"
cssModules["$style"] = style0
if (module.hot) {
  module.hot.accept("./App.vue?vue&type=style&index=0&id=7ba5bd90&module=true&lang=css", () => {
    cssModules["$style"] = style0
    __VUE_HMR_RUNTIME__.rerender("7ba5bd90")
  })
}
import "./App.vue?vue&type=style&index=1&id=7ba5bd90&lang=css"
import "./App.vue?vue&type=style&index=2&id=7ba5bd90&lang=scss"
import "./App.vue?vue&type=style&index=3&id=7ba5bd90&scoped=true&lang=scss"

import exportComponent from "/Users/pengshouhua/demo/vue-loader/dist/exportHelper.js"
const __exports__ = /*#__PURE__*/exportComponent(script, [['render',render],['__cssModules',cssModules],['__scopeId',"data-v-7ba5bd90"],['__file',"src/App.vue"]])
/* hot reload */
if (module.hot) {
  __exports__.__hmrId = "7ba5bd90"
  const api = __VUE_HMR_RUNTIME__
  module.hot.accept()
  if (!api.createRecord('7ba5bd90', __exports__)) {
    console.log('reload')
    api.reload('7ba5bd90', __exports__)
  }
  
  module.hot.accept("./App.vue?vue&type=template&id=7ba5bd90&scoped=true", () => {
    console.log('re-render')
    api.rerender('7ba5bd90', render)
  })

}
export default __exports__
```
## webpack中样式配置
```js
const path = require('path');
const VueLoader = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack')

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[hash:8].js'
  },
  devtool: 'cheap-module-source-map',
  // stats: 'errors-only',
  devServer: {
    devMiddleware: {
      // stats: 'errors-only',
    },
    // contentBase: path.resolve(__dirname, 'dist'),
    static: {
      directory: path.resolve(__dirname, 'dist')
    },
    port: 8000
  },
  resolve: {
    extensions: ['.vue', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        exclude: /node_modules/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        oneOf: [
          {
            resourceQuery: /module/, 
            use: ['vue-style-loader', {
              loader: 'css-loader',
              options: {
                // 开启 CSS Modules
                modules: {
                  // 自定义生成的类名
                  localIdentName: '[local]_[hash:base64:8]'
                },
              }
            }, 'postcss-loader']
          },
          {
            resourceQuery: /\?vue/,
            use: ['vue-style-loader', 'css-loader', 'postcss-loader']
          },
          {
            test: /\.module\.\w+$/,
            use: ['vue-style-loader',
              /* config.module.rule('css').oneOf('normal-modules').use('vue-style-loader') */
              /* config.module.rule('css').oneOf('normal-modules').use('css-loader') */
              {
                loader: 'css-loader',
                options: {
                  // sourceMap: false,
                  // importLoaders: 2,
                  modules: {
                    localIdentName: '[name]_[local]_[hash:base64:5]'
                  }
                }
              },
              /* config.module.rule('css').oneOf('normal-modules').use('postcss-loader') */
              'postcss-loader'
            ]
          },
          {
            use: ['vue-style-loader', 'css-loader', 'postcss-loader']
          }
        ]
      },
      {
        test: /\.scss$/,
        oneOf: [
          {
            resourceQuery: /module/, 
            use: ['vue-style-loader', {
              loader: 'css-loader',
              options: {
                // 开启 CSS Modules
                modules: {
                  // 自定义生成的类名
                  localIdentName: '[local]_[hash:base64:8]'
                },
              }
            }, 'postcss-loader', 'sass-loader']
          },
          {
            resourceQuery: /\?vue/,
            use: ['vue-style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
          },
          {
            test: /\.module\.\w+$/,
            use: ['vue-style-loader',
              /* config.module.rule('css').oneOf('normal-modules').use('vue-style-loader') */
              /* config.module.rule('css').oneOf('normal-modules').use('css-loader') */
              {
                loader: 'css-loader',
                options: {
                  // sourceMap: false,
                  // importLoaders: 2,
                  modules: {
                    localIdentName: '[name]_[local]_[hash:base64:5]'
                  }
                }
              },
              /* config.module.rule('css').oneOf('normal-modules').use('postcss-loader') */
              'postcss-loader', 'sass-loader'
            ]
          },
          {
            use: ['vue-style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
          }
        ]
      }
    ]
  },
  plugins: [
    new VueLoader.VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false
    }),
    new DefinePlugin(
      {
        'process.env': {
          NODE_ENV: '"development"',
          BASE_URL: '"/"'
        }
      }
    ),
  ]
}
```
## rollup-plugin-vue与vue-loader
1. webpck中使用vue-loader
实际上，使用webpack编译sfc是通过vue-loader干的，vue-loader提供了loader和plugin，loader主要是做sfc的compile生成descriptor，然后根据descriptor生成如上所示的编译后js文件。descriptor包括template、script、style、custom blocks:

|type|import url|
|----|-----------|
|template|import { render } from "./App.vue?vue&type=template&id=7ba5bd90"|
|script|./App.vue?vue&type=script&lang=js|
|style|./App.vue?vue&type=style&index=1&id=7ba5bd90&lang=css|
|style(scss)|./App.vue?vue&type=style&index=1&id=7ba5bd90&lang=scss|
|style(module)|./App.vue?vue&type=style&index=0&id=7ba5bd90&module=true&lang=css|
|style(scoped)|./App.vue?vue&type=style&index=0&id=7ba5bd90&scoped=true&lang=css|

当webpack收到vue-loader首次解析sfc文件的代码后，继续分析依赖，继续import，这个时候会使用到不同的loader，分析resourceQuery，比如正常style的import url的resourceQuery中包含vue、type=style、index=0、id=7ba5bd90、lang=css、module=true、scoped=true以及这里没有包含的src=path，根据不同的resourceQuery加载不同的loader，而这些事情都是vue-loader提供的plugin来做。vue-loader提供的plugin主要是根据用户提供的loader来重新组织根据不同的webpack中的module.rules规则，主要是利用resourceQuery来做判断，loader就是用户配置的loader重新组织，具体可以看[vue-loader的源码](https://github.com/vuejs/vue-loader/tree/next)

2. [rollup-plugin-vue](https://github.com/vuejs/rollup-plugin-vue)
rollup-plugin-vue本身就比较单纯点
```vue
<script>
export default {
  name: 'App',
}
</script>

<template>
  <div :class="$style.red">
    Hello <span class="green">World</span>!
  </div>
</template>

<style module>
.red {
  color: red;
}
</style>

<style scoped>
.green {
  color: green;
}
</style>
```
```js
import VuePlugin from 'rollup-plugin-vue'
import PostCSS from 'rollup-plugin-postcss'
import NodeResolve from '@rollup/plugin-node-resolve'

/** @type {import('rollup').RollupOptions[]} */
const config = [
  {
    input: 'src/App.vue',
    output: {
      file: 'dist/app.js',
      format: 'esm',
      sourcemap: 'inline',
    },
    plugins: [
      // Resolve packages from `node_modules` e.g. `style-inject` module
      // used by `rollup-plugin-postcss` to inline CSS.
      NodeResolve(),
      VuePlugin({
        // PostCSS-modules options for <style module> compilation
        cssModulesOptions: {
          generateScopedName: '[local]___[hash:base64:5]',
        },
      }),
      PostCSS(),
    ],
    external(id) {
      return /^(vue)$/.test(id)
    },
  },
]
export default config
```
```js
import { pushScopeId, popScopeId, openBlock, createBlock, withScopeId, createTextVNode, createVNode } from 'vue';

var script = {
  name: 'App',
};

const _withId = /*#__PURE__*/withScopeId("data-v-7ba5bd90");

pushScopeId("data-v-7ba5bd90");
const _hoisted_1 = /*#__PURE__*/createTextVNode(" Hello ");
const _hoisted_2 = /*#__PURE__*/createVNode("span", { class: "green" }, "World", -1 /* HOISTED */);
const _hoisted_3 = /*#__PURE__*/createTextVNode("! ");
popScopeId();

const render = /*#__PURE__*/_withId((_ctx, _cache, $props, $setup, $data, $options) => {
  return (openBlock(), createBlock("div", {
    class: _ctx.$style.red
  }, [
    _hoisted_1,
    _hoisted_2,
    _hoisted_3
  ], 2 /* CLASS */))
});

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css_248z = "\n.red___DWJpy {\n  color: red;\n}\n";
styleInject(css_248z);

var style0 = {"red":"red___DWJpy"};

var css_248z$1 = "\n.green[data-v-7ba5bd90] {\n  color: green;\n}\n";
styleInject(css_248z$1);

const cssModules = script.__cssModules = {};
cssModules["$style"] = style0;

script.render = render;
script.__scopeId = "data-v-7ba5bd90";
script.__file = "src/App.vue";

export default script;
```
可以在源代码中调试，里面有example文件夹
3. 不同点
二者的相同点不想记录了，都是编译sfc文件，但是rollup-plugin-vue可能更加倾向于production环境的编译，更加简练。
**css module的支持导致看了很多资料和文档，这里要重点记录。首先跳跃的说下，所有的编译包都是利用[@vue/compiler-sfc](https://github.com/vuejs/vue-next/tree/master/packages/compiler-sfc)提供的编译能力，额外说明的是vue3.2+后，vue包开始暴露compiler-sfc，所以使用只需要引入vue/compiler-sfc。他提供的parse功能解析出descriptor，其中style部分就包括style.scope, style.module, style.lang等attribute, 根据这些属性设置不同的import url**
支持css mdoule的能力最底层都是通过包[postcss-modules](https://github.com/madyankin/postcss-modules)提供的，但是提供给终端有些不同，首先@vue/compiler-sfc中提供的compileStyle或者compileStyleAsync接口有提供是否是css module的传参:
```js
export function compileStyleAsync(
  options: SFCAsyncStyleCompileOptions
): Promise<SFCStyleCompileResults> {
  return doCompileStyle({
    ...options,
    isAsync: true
  }) as Promise<SFCStyleCompileResults>
}

export function doCompileStyle(
  options: SFCAsyncStyleCompileOptions
): SFCStyleCompileResults | Promise<SFCStyleCompileResults> {
  const {
    filename,
    id,
    scoped = false,
    trim = true,
    isProd = false,
    modules = false,
    modulesOptions = {},
    preprocessLang,
    postcssOptions,
    postcssPlugins
  } = options
  const preprocessor = preprocessLang && processors[preprocessLang]
  const preProcessedSource = preprocessor && preprocess(options, preprocessor)
  const map = preProcessedSource
    ? preProcessedSource.map
    : options.inMap || options.map
  const source = preProcessedSource ? preProcessedSource.code : options.source

  const shortId = id.replace(/^data-v-/, '')
  const longId = `data-v-${shortId}`

  const plugins = (postcssPlugins || []).slice()
  plugins.unshift(cssVarsPlugin({ id: shortId, isProd }))
  if (trim) {
    plugins.push(trimPlugin())
  }
  if (scoped) {
    plugins.push(scopedPlugin(longId))
  }
  let cssModules: Record<string, string> | undefined
  if (modules) {
    if (__GLOBAL__ || __ESM_BROWSER__) {
      throw new Error(
        '[@vue/compiler-sfc] `modules` option is not supported in the browser build.'
      )
    }
    if (!options.isAsync) {
      throw new Error(
        '[@vue/compiler-sfc] `modules` option can only be used with compileStyleAsync().'
      )
    }
    plugins.push(
      postcssModules({
        ...modulesOptions,
        getJSON: (_cssFileName: string, json: Record<string, string>) => {
          cssModules = json
        }
      })
    )
  }
```
上面代码是节选自@vue/compiler-sfc解析style，可以看到，如果是modules，则添加postcssModules的plugin，然后得到css modules的映射json，存储到cssModules中供runtime中用户调用。
rollup-plugin-vue使用的这个套路，得到映射json后，放入到cssModules对象中，然后设置script.__cssModules，最后在加载VNode和生成component instance的对象中均会带上__cssModules变量，详情见component.ts中的ComponentInternalOptions，注意这个是标注internal的，仅供内容使用，但是用户可以通过useCssModule这个helper返回内部的__cssModules对象，详情可见useCssModule.ts文件。
以下是rollup-plugin-vue编译style时候的调用:
```js
const result = await compileStyleAsync({
    filename: query.filename,
    id: `data-v-${query.id}`,
    isProd: isProduction,
    source: code,
    scoped: block.scoped,
    modules: !!block.module,
    postcssOptions: options.postcssOptions,
    postcssPlugins: options.postcssPlugins,
    modulesOptions: options.cssModulesOptions,
    preprocessLang,
    preprocessCustomRequire: options.preprocessCustomRequire,
    preprocessOptions,
  })
```
但是webpack+vue-loader使用的不是这个套路，vue-loader里面在编译style的时候，没有使用@vue/compiler-sfc提供的css module能力：
```js
const StylePostLoader: webpack.loader.Loader = function (source, inMap) {
  const query = qs.parse(this.resourceQuery.slice(1))
  const { code, map, errors } = compiler.compileStyle({
    source: source as string,
    filename: this.resourcePath,
    id: `data-v-${query.id}`,
    map: inMap,
    scoped: !!query.scoped,
    trim: true,
    isProd: this.mode === 'production' || process.env.NODE_ENV === 'production',
  })

  if (errors.length) {
    this.callback(errors[0])
  } else {
    this.callback(null, code, map)
  }
}

export default StylePostLoader
```
里面并没有module相关的配置，处理css modules的任务留给了css-module，所以如果要打开css mdoules需要在css-loader的options中配置相关的内容，配置见最上面的webpack配置文件，不同的style需要配置不同的css-loader，所以就出现了要在用户的webpack配置中使用oneOf，根据resourceQuery区分不同的style，上面的表格有说明不同的style，比如在代码中引入样式文件：
```js
// css-loader直接处理，css-loader就是干这个事的
import style0 from './style.css' // style0是个空对象
import style1 from './style.moduel.css' // 这个是会被css-loader默认拦截的，path中就带有module，这个是css-loader默认支持的，style1就是上面提到的映射json
// 通过vue-loader的plugin调用pitch.js使用css-loader的能力干这个事
<style scoped module lang="scss"></style> // 会生成不同的query string，比如app.vue?vue&&type=style&&index=0&&module=true&&scoped=true&&id=123456
```
通过编译后：
```js
import style0 from "./App.vue?vue&type=style&index=0&id=7ba5bd90&module=true&lang=css"
cssModules["$style"] = style0
script.__cssModules = cssModules
```
还是生成类似的编译文件，后面就跟rollup-plugin-vue一个套路了
vue官方文档中关于style功能可以参见: https://v3.cn.vuejs.org/api/sfc-style.html
里面通过pseudo提供了很多功能，这些就是在vue解析style中通过postcss提供的插件实现的，其中里面的:global(class_name)应该是借鉴了css modules里面的global伪类