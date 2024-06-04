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
    sourceMapPlugin, // 最后检查返回是否是ctx.map, 如果有内容，返回sourcempa格式内容
    rewritePlugin, // 最后检查返回的js文件，收集依赖，建立依赖关系，rewrite导入的文件的路径等
    htmlPlugin, // redirect根目录到index.html, 返回index.html
    clientPlugin, // 返回client.js文件，修改文件里面的socket请求端口等内容，因为这时候websocket server已经就绪
    hmrPlugin, // websocket server; chokidar watch开启, 并且在change中寻找依赖关系，发送ws message
    modulePlugin, // 处理node_modules模块请求 /@module/
    vuePlugin, // 处理.vue文件请求，分两步走，首先给出包含请求3部分的js内容，然后在分别给出分开内容解析
    cssPlugin, // 处理各种css转化等
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