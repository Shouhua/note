const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const chokidar = require('chokidar')
const connect = require('connect')
const { resolveConfig } = require('../config')
const { resolveHttpsConfig, resolveHttpServer } = require('../http')
const { createWebSocketServer } = require('./ws')
const { ModuleGraph } = require('./moduleGraph')
const { createPluginContainer } = require('./pluginContainer')
const { resolveHostname } = require('../utils')
const { printCommonServerUrls } = require('../logger')
const { servePublicMiddleware, serveRawFsMiddleware, serveStaticMiddleware } = require('./middleware/static')
const { spaFallbackMiddleware } = require('./middleware/spaFallback')
const { indexHtmlMiddleware, createDevHtmlTransformFn } = require('./middleware/indexHtml')
const { timeMiddleware } = require('./middleware/time')
const { transformMiddleware } = require('./middleware/transform')
const { errorMiddleware, prepareError } = require('./middleware/error')
const { invalidatePackageData } = require('../packages')
const { normalizePath } = require('../utils')
const { handleHMRUpdate, handleFileAddUnlink } = require('./hmr')
const launchEditorMiddleware = require('launch-editor-middleware')
const openBrowser = require('./openBrowser')
const { optimizeDeps } = require('../optimizer')
const { createMissingImporterRegisterFn } = require('../optimizer/registerMissing')
const { baseMiddleware } = require('./middleware/base')
const { transformRequest } = require('./transformRequest')
const { transformWithEsbuild } = require('../plugins/esbuild')
const corsMiddleware = require('cors')

async function createServer(inlineConfig) {
	const config = await resolveConfig(inlineConfig, 'serve', 'development')
	const root = config.root
	const serverConfig = config.server
	const httpsOptions = await resolveHttpsConfig(config.server.https)
	let { middlewareMode } = serverConfig
	if(middlewareMode === true) {
		middlewareMode = 'ssr'
	}
	const middlewares = connect()
	const httpServer = middlewareMode
		? null
		: await resolveHttpServer(serverConfig, middlewares, httpsOptions)

	const ws = createWebSocketServer(httpServer, config, httpsOptions)
	const { ignored = [], ...watchOptions } = serverConfig.watch || {}
  const watcher = chokidar.watch(path.resolve(root), {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      ...(Array.isArray(ignored) ? ignored : [ignored])
    ],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    disableGlobbing: true,
    ...watchOptions
  })

  const moduleGraph = new ModuleGraph((url) =>
    container.resolveId(url)
  )

  const container = await createPluginContainer(config, moduleGraph, watcher)
  const closeHttpServer = createServerCloseFn(httpServer)

  // eslint-disable-next-line prefer-const
  let exitProcess

	const server = {
    config,
    middlewares,
    get app() {
      config.logger.warn(
        `ViteDevServer.app is deprecated. Use ViteDevServer.middlewares instead.`
      )
      return middlewares
    },
    httpServer,
    watcher,
    pluginContainer: container,
    ws,
    moduleGraph,
    transformWithEsbuild,
    transformRequest(url, options) {
      return transformRequest(url, server, options)
    },
    transformIndexHtml: null, // to be immediately set
    // ssrLoadModule(url) {
    //   server._ssrExternals ||= resolveSSRExternal(
    //     config,
    //     server._optimizeDepsMetadata
    //       ? Object.keys(server._optimizeDepsMetadata.optimized)
    //       : []
    //   )
    //   return ssrLoadModule(url, server)
    // },
    // ssrFixStacktrace(e) {
    //   if (e.stack) {
    //     const stacktrace = ssrRewriteStacktrace(e.stack, moduleGraph)
    //     rebindErrorStacktrace(e, stacktrace)
    //   }
    // },
    listen(port, isRestart) {
      return startServer(server, port, isRestart)
    },
    async close() {
      process.off('SIGTERM', exitProcess)

      if (!middlewareMode && process.env.CI !== 'true') {
        process.stdin.off('end', exitProcess)
      }

      await Promise.all([
        watcher.close(),
        ws.close(),
        container.close(),
        closeHttpServer()
      ])
    },
    printUrls() {
      if (httpServer) {
        printCommonServerUrls(httpServer, config.server, config)
      } else {
        throw new Error('cannot print server URLs in middleware mode.')
      }
    },
    async restart(forceOptimize) {
      if (!server._restartPromise) {
        server._forceOptimizeOnRestart = !!forceOptimize
        server._restartPromise = restartServer(server).finally(() => {
          server._restartPromise = null
          server._forceOptimizeOnRestart = false
        })
      }
      return server._restartPromise
    },

    _optimizeDepsMetadata: null,
    _ssrExternals: null,
    _globImporters: Object.create(null),
    _restartPromise: null,
    _forceOptimizeOnRestart: false,
    _isRunningOptimizer: false,
    _registerMissingImport: null,
    _pendingReload: null,
    _pendingRequests: new Map()
  }

	server.transformIndexHtml = createDevHtmlTransformFn(server)

	exitProcess = async () => {
    try {
      await server.close()
    } finally {
      process.exit(0)
    }
  }

  process.once('SIGTERM', exitProcess)

  if (!middlewareMode && process.env.CI !== 'true') {
    process.stdin.on('end', exitProcess)
  }

  const { packageCache } = config
  const setPackageData = packageCache.set.bind(packageCache)
  packageCache.set = (id, pkg) => {
    if (id.endsWith('.json')) {
      watcher.add(id)
    }
    return setPackageData(id, pkg)
  }

  watcher.on('change', async (file) => {
    file = normalizePath(file)
    if (file.endsWith('/package.json')) {
      return invalidatePackageData(packageCache, file)
    }
    // invalidate module graph cache on file change
    moduleGraph.onFileChange(file)
    if (serverConfig.hmr !== false) {
      try {
        await handleHMRUpdate(file, server)
      } catch (err) {
        ws.send({
          type: 'error',
          err: prepareError(err)
        })
      }
    }
  })

  // hmr for glob import
  // 添加文件
  watcher.on('add', (file) => {
    handleFileAddUnlink(normalizePath(file), server)
  })

  // hmr for glob import
  // 删除文件
  watcher.on('unlink', (file) => {
    handleFileAddUnlink(normalizePath(file), server, true)
  })

  if (!middlewareMode && httpServer) {
    httpServer.once('listening', () => {
      // update actual port since this may be different from initial value
      serverConfig.port = httpServer.address().port
    })
  }

  // apply server configuration hooks from plugins
  const postHooks = []
  for (const plugin of config.plugins) {
    if (plugin.configureServer) {
      postHooks.push(await plugin.configureServer(server))
    }
  }

  // Internal middlewares ------------------------------------------------------

  // request timer
  if (process.env.DEBUG) {
    middlewares.use(timeMiddleware(root))
  }

  // cors (enabled by default)
  const { cors } = serverConfig
  if (cors !== false) {
    middlewares.use(corsMiddleware(typeof cors === 'boolean' ? {} : cors))
  }

  // proxy
  // const { proxy } = serverConfig
  // if (proxy) {
  //   middlewares.use(proxyMiddleware(httpServer, config))
  // }

  // base
  if (config.base !== '/') {
    middlewares.use(baseMiddleware(server))
  }

  // open in editor support
  middlewares.use('/__open-in-editor', launchEditorMiddleware())

  // hmr reconnect ping
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  middlewares.use('/__fakeVite_ping', function viteHMRPingMiddleware(_, res) {
    res.end('pong')
  })

  // serve static files under /public
  // this applies before the transform middleware so that these files are served
  // as-is without transforms.
  // sirv和connect history的用法，可以参见sirv-demo
  if (config.publicDir) {
    middlewares.use(servePublicMiddleware(config.publicDir)) // 处理'/public'
  }

  // main transform middleware
  middlewares.use(transformMiddleware(server)) // 使用plugins处理各种文件

  // serve static files
  middlewares.use(serveRawFsMiddleware(server)) // 处理'/@fs/'
  middlewares.use(serveStaticMiddleware(root, server)) // 处理其他静态文件

  // spa fallback
  if (!middlewareMode || middlewareMode === 'html') {
    // rewrite request url to '*/index.html' when ends with '/'
    middlewares.use(spaFallbackMiddleware(root)) 
  }

  // run post config hooks
  // This is applied before the html middleware so that user middleware can
  // serve custom content instead of index.html.
  postHooks.forEach((fn) => fn && fn()) // 执行configureServer返回函数组成的posthooks

  if (!middlewareMode || middlewareMode === 'html') {
    // transform index.html
    middlewares.use(indexHtmlMiddleware(server))
    // handle 404s
    // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
    middlewares.use(function vite404Middleware(_, res) {
      res.statusCode = 404
      res.end()
    })
  }

  // error handler
  middlewares.use(errorMiddleware(server, !!middlewareMode))

  const runOptimize = async () => {
    if (config.cacheDir) {
      server._isRunningOptimizer = true
      try {
        server._optimizeDepsMetadata = await optimizeDeps(
          config,
          config.server.force || server._forceOptimizeOnRestart
        )
      } finally {
        server._isRunningOptimizer = false
      }
      server._registerMissingImport = createMissingImporterRegisterFn(server)
    }
  }

  if (!middlewareMode && httpServer) {
    let isOptimized = false
    // overwrite listen to run optimizer before server start
    const listen = httpServer.listen.bind(httpServer)
    httpServer.listen = (async (port, ...args) => {
      if (!isOptimized) {
        try {
          await container.buildStart({})
          await runOptimize()
          isOptimized = true
        } catch (e) {
          httpServer.emit('error', e)
          return
        }
      }
      return listen(port, ...args)
    })
  } else {
    await container.buildStart({})
    await runOptimize()
  }

	return server
}

function createServerCloseFn(server) {
  if (!server) {
    return () => {}
  }

  let hasListened = false
  const openSockets = new Set()

  server.on('connection', (socket) => {
    openSockets.add(socket)
    socket.on('close', () => {
      openSockets.delete(socket)
    })
  })

  server.once('listening', () => {
    hasListened = true
  })

  return () =>
    new Promise((resolve, reject) => {
      openSockets.forEach((s) => s.destroy())
      if (hasListened) {
        server.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
}

async function httpServerStart(
  httpServer,
  serverOptions
) {
  return new Promise((resolve, reject) => {
    let { port, strictPort, host, logger } = serverOptions

    const onError = (e) => {
      if (e.code === 'EADDRINUSE') {
        if (strictPort) {
          httpServer.removeListener('error', onError)
          reject(new Error(`Port ${port} is already in use`))
        } else {
          logger.info(`Port ${port} is in use, trying another one...`)
          httpServer.listen(++port, host)
        }
      } else {
        httpServer.removeListener('error', onError)
        reject(e)
      }
    }

    httpServer.on('error', onError)

    httpServer.listen(port, host, () => {
      httpServer.removeListener('error', onError)
      resolve(port)
    })
  })
}

async function startServer(
  server,
  inlinePort,
  isRestart = false
) {
  const httpServer = server.httpServer
  if (!httpServer) {
    throw new Error('Cannot call server.listen in middleware mode.')
  }

  const options = server.config.server
  const port = inlinePort || options.port || 3000
  const hostname = resolveHostname(options.host)

  const protocol = options.https ? 'https' : 'http'
  const info = server.config.logger.info
  const base = server.config.base

  const serverPort = await httpServerStart(httpServer, {
    port,
    strictPort: options.strictPort,
    host: hostname.host,
    logger: server.config.logger
  })

  const profileSession = global.__vite_profile_session
  if (profileSession) {
    profileSession.post('Profiler.stop', (err, { profile }) => {
      // Write profile to disk, upload, etc.
      if (!err) {
        const outPath = path.resolve('./fakeVite-profile.cpuprofile')
        fs.writeFileSync(outPath, JSON.stringify(profile))
        info(
          chalk.yellow(`  CPU profile written to ${chalk.white.dim(outPath)}\n`)
        )
      } else {
        throw err
      }
    })
  }

  if (options.open && !isRestart) {
    const path = typeof options.open === 'string' ? options.open : base
    openBrowser(
      path.startsWith('http')
        ? path
        : `${protocol}://${hostname.name}:${serverPort}${path}`
    )
  }

  return server
}

async function restartServer(server) {
  global.__vite_start_time = performance.now()
  const { port } = server.config.server

  await server.close()

  let newServer = null
  try {
    newServer = await createServer(server.config.inlineConfig)
  } catch (err) {
    server.config.logger.error(err.message, {
      timestamp: true
    })
    return
  }

  for (const key in newServer) {
    if (key !== 'app') {
      server[key] = newServer[key]
    }
  }
  if (!server.config.server.middlewareMode) {
    await server.listen(port, true)
  } else {
    server.config.logger.info('server restarted.', { timestamp: true })
  }
}

module.exports = {
	createServer
}