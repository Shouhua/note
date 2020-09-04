const Koa = require('koa')
const mime = require('mime')
const cors = require('@koa/cors')

const app = new Koa()

app.use(cors({
  'exposeHeaders': ['x-helo'],
  origin() {
    return 'http://127.0.0.1:5500'
  },
  // 'allowHeaders': ['Authorization', 'client-app-id']
  'allowHeaders': ['x-helo']
}))

app.use(async (ctx, next) => {
  console.log(`[request]:  ${ctx.origin} ${ctx.method} ${ctx.path}`)
  ctx.type = 'application/json'
  ctx.set('x-helo', 'world')
  const result = {
    label: 'hello, world',
    count: 10
  }
  ctx.body = result
  return
})

app.listen(3030, () => {
  console.log('Server is listening 3030')
})