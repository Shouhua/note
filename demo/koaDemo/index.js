const Koa = require('koa')
const http2 = require('http2')
const createCertificate = require('./createCertificate')
const fs = require('fs')
const path = require('path')

const app = new Koa();

app.use((ctx, next) => {
  if(ctx.path === '/') {
    const content = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8')
    ctx.type = 'text/html'
    ctx.body = content
  }
})

let key;
let cert = key = createCertificate()
const server = http2.createSecureServer({
  key,
  cert,
  allowHTTP1: true
}, app.callback())

server.listen(3000)
