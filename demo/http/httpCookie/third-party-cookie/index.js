const Koa = require('koa')
const { createServer } = require('http')
const cors = require('@koa/cors')
const { readFile } = require('fs/promises')
const path = require('path')

const app = new Koa()
app.use(cors({
  'origin': 'http://127.0.0.1:5500',
  'credentials': true
}))

app.use(async (ctx, next) => {
  if(ctx.path === '/index.html') {
    ctx.type = 'text/html'
    const content = await readFile(path.resolve(__dirname, 'index.html'), {
      encoding: 'utf-8'
    })
    ctx.body = content
    return
  }
  if(ctx.path === '/login') {
    ctx.cookies.set('amp-token', Buffer.from('hello, xuanwu').toString('base64'), {
      // 'path': '/getSth',
      'httpOnly': false,
      'sameSite': 'None',
      // 'secure': false,
      'maxAge': 60*60*60*24*365,
      // 'expires': +new Date(new Date().getTime()+86409000).toUTCString()
    })
    ctx.type = 'application/json'
    ctx.body = JSON.stringify({
      code: 0,
      data: {},
      msg: 'success'
    });
    return
  }
})

const server = createServer(app.callback())
server.listen(3000, () => {
  console.log('Server now listening on 3000...');
})
