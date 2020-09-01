const Koa = require('koa')
const path = require('path')
// const sender = require('koa-sender')
const StaticMiddleware = require('koa-static')
const cors = require('@koa/cors')
const csp = require('koa-csp')

const app = new Koa()

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

app.use(cors({
  origin: function(ctx) {
    // return '*'
    return false
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