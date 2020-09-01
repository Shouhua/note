# Jsonp
由于有浏览器同源策略的限制，常常会出现跨域的限制，这个跨域是浏览器的限制。使用jsonp是避免限制的一种方式，使用script标签的src属性可以避免跨域，至于如下例中的callback是一种模式。
:::tip
跨域的概念：这里的域指的是schema://host:port里面的3个元素schema，host，port
:::
jsonp的方式只能使用GET的方式，对POST无能为力，而且还要受到CSP的限制
webpack中split chunk加载的时候就使用了这种方式，微前端加载模块也可以使用这种方式。以下是一个简单的例子，比如localhost:5000里面的脚本访问localhost:3000的脚本：  
```html
<script>
  function showJson(msg) {
    alert(msg)
  }
</script>
<script src="http://localhost:3000/script.js?callback=showJson"></script>
```
请求的脚本文件内容
```js
console.log('hello, world!')
showJson('hello')
```
服务端代码
```js
const Koa = require('koa')
const path = require('path')
// const sender = require('koa-sender')
const StaticMiddleware = require('koa-static')
const cors = require('@koa/cors')

const app = new Koa()

// 配置CSP
app.use(csp({
  enableWarn: true,
  policy: {
    'default-src': ['self'],
    'script-src': [
      'self',
      // "'nonce-123'" // 注意这里的引号，nonce和hash必须放在单引号中，不然会报错
    ]
  }
}))

// 配置CORS
app.use(cors({
  origin: function(ctx) {
    return false
    // return '*'
    // if (ctx.url === '/script.js') {
    //   return false;
    // }
    // return '*';
  }
}))

let root = process.cwd()
root = path.resolve(root, 'demo/jsonp')
console.log('root: ', root)

app.use(StaticMiddleware(root))

app.listen(3000)
```