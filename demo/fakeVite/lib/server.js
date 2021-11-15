const { vuePlugin, parseMainSFC } = require('./middleware/vue')
const { rewritePlugin } = require('./middleware/rewrite')
const { modulePlugin } = require('./middleware/module')
const { htmlPlugin } = require('./middleware/html')
const { hmrPlugin } = require('./middleware/hmr')
const http = require('http')
const path = require('path')
const { getFromCache, setCache, getContent, deleteCache, isEqual } = require('./utils/utils')
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
  const WS_PORT = 3030;
  // init websocket
  const ws = new WebSocket.Server({
    port: WS_PORT
  });
  ws.on('connection', (socket, request) => {
    socket.send(JSON.stringify({ type: 'connected' }))
  })
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

  const context = {
    app,
    ws,
    watcher,
    root: cwd
  }

  ;[ htmlPlugin,
    hmrPlugin,
    modulePlugin,
    rewritePlugin,
    vuePlugin
  ].forEach(m => m(context))

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