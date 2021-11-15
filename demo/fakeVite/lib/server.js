const { vuePlugin } = require('./middleware/vue')
const { rewritePlugin } = require('./middleware/rewrite')
const { modulePlugin } = require('./middleware/module')
const { htmlPlugin } = require('./middleware/html')
const { hmrPlugin } = require('./middleware/hmr')
const http = require('http')
const Koa = require('koa')
const chokidar = require('chokidar')

const debug = require('debug')('fakeVite:server')

function createServer(
  root = process.cwd()
) {
  const watcher = chokidar.watch(root, {
    ignored: [/\bnode_modules\b/, /\b\.git\b/, /\b__tests__\b/]
  })

  const app = new Koa()

  const context = {
    app,
    watcher,
    root
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