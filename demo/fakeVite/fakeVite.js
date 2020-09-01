const Koa = require('koa')
const http = require('http')
const path = require('path')
const fs = require('fs-extra')
const WebSocket = require('ws')
const chokidar = require('chokidar')

let root = process.cwd()
root = path.resolve(root, '..')
const watcher = chokidar.watch(root, {
  ignored: [/\bnode_modules\b/, /\b\.git\b/, /\bsrc\b/, /\b__tests__\b/]
})

const app = new Koa()
const logTag = 'X-Response-Time'
const cacheMap = new Map()
const hmrPath = '/fakeVite/hmr'
const wsPort = 3030;

app.use(async (ctx, next) => {
  Object.assign(ctx, {watcher})
  return next()
})

app.use(async (ctx, next) => {
  await next()
  const rt = ctx.response.get(logTag)
  console.log(`${ctx.method} - ${ctx.path} - ${rt}`)
})

app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.response.set(logTag, `${ms}ms`)
})


const devInjectionCode = `
<script type="module">
  import '${hmrPath}'
  window.process = {
    env: {
      NODE_ENV: 'development'
    }
  }
</script>
`

const injectReplaceRE = [/<head>/, /<!doctype html>/i]

function injectScriptToHtml(html, script) {
  for (const re of injectReplaceRE) {
    if (re.test(html)) {
      return html.replace(re, `$&${script}`)
    }
  }
  return script + html
}

// init websocket
const ws = new WebSocket.Server({
  port: wsPort
});
ws.on('connection', (socket, request) => {
  console.log('websocket connected')
  socket.send(JSON.stringify({ type: 'connected' }))
})

watcher.on('change', (file) => {
  if (file.endsWith('.html')) {
    console.log(`modify ${file}`)
    if(cacheMap.has(file)) {
      cacheMap.delete(file)
    }

    ws.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'full-reload',
          path: file
        }))
      }
    })
  }
})

app.use(async (ctx, next) => {
  if(ctx.path === '/') {
    ctx.redirect('index.html')
    return
  }
  if(ctx.path === '/index.html') {
    const filePath = path.resolve(__dirname, '..', ctx.path.slice(1))
    console.log(`request file: `, filePath)
    if(!cacheMap.has(filePath)) {
      const content = fs.readFileSync(filePath, {
        encoding: 'utf8'
      })
      cacheMap.set(filePath, content)
    }
    let html = cacheMap.get(filePath)
    html = injectScriptToHtml(html, devInjectionCode) 
    ctx.response.type = 'text/html'
    ctx.body = html
  }
  if(ctx.path === hmrPath) {
    const clientContent = fs.readFileSync(path.resolve(__dirname, 'client.js'), {
      encoding: 'utf8'
    })
    ctx.response.type = 'application/javascript'
    ctx.body = clientContent
  }
})


http.createServer(app.callback()).listen(3000)

/**
 * 1. watch, 挂靠在ctx下面
 * 2. ws的send方法挂在watch对象，变动直接send
 */