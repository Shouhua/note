import vueMiddleware from './middleware/vue'
import rewriteMiddleware from './middleware/rewrite'
import moduleMiddleware from './middleware/module'
import http from 'http'
import path from 'path'
import { getFromCache, setCache, getContent, deleteCache } from './utils/utils'
const Koa = require('koa')
const fs = require('fs-extra')
const WebSocket = require('ws')
const chokidar = require('chokidar')

const debug = require('debug')('fakeVite:server')

function createServer(
  cwd = process.cwd()
) {
  const watcher = chokidar.watch(cwd, {
    ignored: [/\bnode_modules\b/, /\b\.git\b/, /\b__tests__\b/]
  })

  const app = new Koa()
  const logTag = 'X-Response-Time'
  const hmrPath = '/fakeVite/hmr'
  const wsPort = 3030;

  app.use(async (ctx, next) => {
    Object.assign(ctx, {watcher, cwd})
    return next()
  })

  app.use(async (ctx, next) => {
    await next()
    const rt = ctx.response.get(logTag)
    debug(`${ctx.method} - ${ctx.path} - ${rt}`)
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
    socket.send(JSON.stringify({ type: 'connected' }))
  })

  watcher.on('change', (file) => {
    deleteCache(file)
    debug(`watch on change: ${file}`)
    if (file.endsWith('.html')) {
      ws.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'full-reload',
            path: file
          }))
        }
      })
    }
    if(file.endsWith('.vue')) {

    }
  })

  app.use(async (ctx, next) => {
    if(ctx.path === '/') {
      ctx.redirect('index.html')
      return
    }
    if(ctx.path === '/index.html') {
      const filePath = path.resolve(cwd, ctx.path.slice(1))
      let html = getContent(filePath)
      html = injectScriptToHtml(html, devInjectionCode) 
      ctx.response.type = 'text/html'
      ctx.body = html
    }
    if(ctx.path === hmrPath) {
      if(!getFromCache(hmrPath)) {
        const clientContent = fs.readFileSync(path.resolve(__dirname, 'client.js'), {
          encoding: 'utf8'
        })
        setCache(hmrPath, clientContent)
      }
      ctx.response.type = 'application/javascript'
      ctx.body = getFromCache(hmrPath)
    }
    return next()
  })
  app.use(moduleMiddleware)
  app.use(rewriteMiddleware)
  app.use(vueMiddleware)

  http.createServer(app.callback()).listen(3000, () => {
    console.log('Now listen on localhost:3000')
  })
}

export {
  createServer
}