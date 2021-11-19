const { vuePlugin } = require('./plugins/vue')
const { rewritePlugin } = require('./plugins/rewrite')
const { modulePlugin } = require('./plugins/module')
const { htmlPlugin } = require('./plugins/html')
const { hmrPlugin } = require('./plugins/hmr')
const { staticPlugin } = require('./plugins/static')
const { cssPlugin } = require('./plugins/css')
const { assetsPlugin } = require('./plugins/assets')
const { sourceMapPlugin } = require('./plugins/sourceMap')
const { jsonPlugin } = require('./plugins/json')
const { clientPlugin } = require('./plugins/client')

const { createResolver } = require('./resolver')

const http = require('http')
const Koa = require('koa')
const chokidar = require('chokidar')
const fs = require('fs-extra')
const path = require('path')

const debug = require('debug')('fakeVite:server')

function readFileIfExists(value) {
  if (value && !Buffer.isBuffer(value)) {
    try {
      return fs.readFileSync(path.resolve(value))
    } catch (e) {
      return value
    }
  }
  return value
}

function resolveHttpsConfig(httpsOption) {
  const { ca, cert, key, pfx } = httpsOption
  Object.assign(httpsOption, {
    ca: readFileIfExists(ca),
    cert: readFileIfExists(cert),
    key: readFileIfExists(key),
    pfx: readFileIfExists(pfx)
  })
  // if (!httpsOption.key || !httpsOption.cert) {
  //   httpsOption.cert = httpsOption.key = createCertificate()
  // }
  return httpsOption
}

function resolveServer(
  { https = false, httpsOptions = {}},
  reqeustListeners) {
  if(https) {
    return require('http2').createSecureServer(
      {
        ...resolveHttpsConfig(httpsOptions),
        allowHTTP1: true
      },
      reqeustListeners)
  } else {
    return require('http').createServer(reqeustListeners)
  }
}

function createServer(
  config
) {
  const { 
    root = process.cwd(),
    resolve
  } = config
  const watcher = chokidar.watch(root, {
    ignored: [/\bnode_modules\b/, /\b\.git\b/, /\b__tests__\b/]
  })

  const app = new Koa()
  const server = resolveServer(config, app.callback())

  const resolver = createResolver(root, resolve)

  const context = {
    app,
    watcher,
    root,
    server,
    config,
    resolver,
    port: config.port || 3000
  }

  ;[ 
    sourceMapPlugin,
    rewritePlugin,
    htmlPlugin,
    clientPlugin,
    hmrPlugin,
    modulePlugin,
    vuePlugin,
    cssPlugin,
    jsonPlugin,
    assetsPlugin,
    staticPlugin
  ].forEach(m => m(context))

  const listen = server.listen.bind(server)
  server.listen = (async (port, ...args) => {
    if(config.optimizeDeps.auto !== false) {
      await require('./prebundle').optimizeDeps(config)
    }
    return listen(port, ...args)
  })
  server.once('listening', () => {
    context.port = server.address().port
  })
  return server
}

module.exports = {
  createServer
}