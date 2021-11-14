const { vueMiddleware, parseMainSFC } = require('./middleware/vue')
const {rewriteMiddleware} = require('./middleware/rewrite')
const moduleMiddleware = require('./middleware/module')
const http = require('http')
const path = require('path')
const { getFromCache, setCache, getContent, deleteCache } = require('./utils/utils')
const Koa = require('koa')
const fs = require('fs-extra')
const WebSocket = require('ws')
const chokidar = require('chokidar')
const hash_sum = require('hash-sum')

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

  function isEqual(a, b) {
    if (!a && !b) return true
    if (!a || !b) return false
    if (a.content !== b.content) return false
    const keysA = Object.keys(a.attrs)
    const keysB = Object.keys(b.attrs)
    if (keysA.length !== keysB.length) {
      return false
    }
    return keysA.every((key) => a.attrs[key] === b.attrs[key])
  }

  function send(payload) {
    ws.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && payload) {
        client.send(JSON.stringify({
          ...payload
        }))
      }
    })
  }

  watcher.on('change', (file) => {
    deleteCache(file)
    debug(`delete file: ${file}`)
    let publicPath = '/' + path.relative(cwd, file)
    if (file.endsWith('.html')) {
      send({
        type: 'full-reload',
        timestamp: Date.now()
      })
    }
    if(file.endsWith('.vue')) {
      // 重新parse，然后compare descriptor，不同部分send不同的hmr command
      let needRerender = false
      let needReload = false
      let [descriptor, prev] = parseMainSFC(getContent(file), file)
      if(!prev) return
      if(!isEqual(descriptor.template, prev.template)) {
        needRerender = true
      }
      if(!isEqual(descriptor.script, prev.script)) {
        needReload = true
      }
      if(needReload) {
        send({
          type: 'reload',
          path: publicPath,
          timestamp: Date.now()
        })
      }
      if(needRerender) {
        send({
          type: 'rerender',
          path: publicPath,
          timestamp: Date.now()
        })
      }
      if(!needReload) {
        const styleId = hash_sum(publicPath)
        const prevStyles = prev.styles || []
        const nextStyles = descriptor.styles || []
        nextStyles.forEach((_, i) => {
          if (!prevStyles[i] || !isEqual(prevStyles[i], nextStyles[i])) {
            send({
              type: 'style-update',
              path: publicPath,
              index: i,
              id: `${styleId}-${i}`,
              timestamp: Date.now()
            })
          }
        })
      }
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

  const server = http.createServer(app.callback())

  const listen = server.listen.bind(server)
  server.listen = (async (port, ...args) => {
    await require('./prebundle').optimizedDeps(process.cwd(), {
      exclude: ['vue', 'fakevite']
    })
    return listen(port, ...args)
  })

  server.listen(3000, () => {
    console.log('Now listen on localhost:3000')
  })
}

module.exports = {
  createServer
}