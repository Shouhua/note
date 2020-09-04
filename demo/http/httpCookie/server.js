/**
 * node demo/httpCookie/server.js
 * live server启动index.html
 * cookie设置了httpOnly为true后，不能使用document.cookie获取当前cookie的值
 * sameSite设置后，不能跨域发送
 */
const Koa = require('koa')
const path = require('path')
const fs = require('fs-extra')
const cors = require('@koa/cors')

const app = new Koa()
app.use(cors({
  // origin: function(ctx) {
  //   if(ctx.get('X-Custom')) {
  //     return false
  //   }
  //   return '*';
  // }
  // allowHeaders: 'X-Custom'
  allowHeaders: ['x-custom']
}))
app.use((ctx, next) => {
  if(/.*data\.json.*/.test(ctx.path)) {
    // if(ctx.cookies.get('cid')) {
    //   console.log('cookie: ', `cid = ${ctx.cookies.get('cid')}`)
    // }
    ctx.type = 'application/json'
    ctx.body = JSON.stringify({
      name: 'hello'
    })
    return next()
  }
  if ( ctx.url === '/index.js' ) {
    ctx.cookies.set(
      'cid', 
      'hello world',
      {
        domain: 'localhost',  // 写cookie所在的域名
        path: '/index',       // 写cookie所在的路径
        maxAge: 10 * 60 * 1000, // cookie有效时长
        expires: new Date('2020-7-15'),  // cookie失效时间
        httpOnly: false,  // 是否只用于http请求中获取
        overwrite: false,  // 是否允许重写
        sameSite: true,
        // secure: true
      }
    )
    ctx.body = fs.readFileSync(path.resolve(__dirname, './index.js'), 'utf8')
    ctx.type = 'application/javascript'
    return next()
  }
  if(ctx.path === '/') {
    ctx.cookies.set(
      'cid', 
      'index.html',
      {
        domain: 'localhost',  // 写cookie所在的域名
        path: '/',       // 写cookie所在的路径
        maxAge: 10 * 60 * 1000, // cookie有效时长
        expires: new Date('2020-7-15'),  // cookie失效时间
        httpOnly: true,  // 是否只用于http请求中获取
        overwrite: false,  // 是否允许重写
        sameSite: true,
        // secure: true
      }
    )
    ctx.body = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8')
    ctx.type = 'text/html' 
    return next()
  }
  return next()
})

app.listen(3000, () => {
  console.log('server is listening on 3000')
})