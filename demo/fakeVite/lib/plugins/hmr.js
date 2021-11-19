const fs = require('fs-extra')
const path = require('path')
const WebSocket = require('ws')
const hash_sum = require('hash-sum')
const { getContent, deleteCache, isEqual, cacheRead } = require('../utils')
const { parseSFC } = require('../utils/vueUtils')
const chalk = require('chalk')

const debug = require('debug')('fakeVite:hmr')

function hmrPlugin({ app, root, server, watcher }) {
  const wss = new WebSocket.Server({
    noServer: true
  });
  server.on('upgrade', (req, socket, head) => {
    if(req.headers['sec-websocket-protocol'] === 'fake-vite-hmr') {
      debug('socket upgrade')
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    }
  })
  wss.on('error', (e) => {
    if (e.code !== 'EADDRINUSE') {
      console.error(chalk.red(`[fakeVite] WebSocket server error:`))
      console.error(e)
    }
  })
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }))
  })
	const send = watcher.send = (payload) => {
		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN && payload) {
				client.send(JSON.stringify({
					...payload
				}))
			}
		})
	}
  watcher.on('change', (file) => {
    deleteCache(file)
    let publicPath = '/' + path.relative(root, file)
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
      let [descriptor, prev] = parseSFC(getContent(file), file)
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
      if(
        prev.styles.some(s => s.module != null) ||
        descriptor.styles.some(s => s.module != null) 
      ) {
        return send({
          type: 'reload',
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
            debug(`[fakeVite:hmr] ${path.relative(root, file)} style${i} changed`)
            const isModule = nextStyles[i].module != null
            const isScoped = nextStyles[i].scoped != null
            send({
              type: 'style-update',
              path: (`${publicPath}?vue&type=style&index=${i}` + (isModule ? '&module' : '') + (isScoped ? '&scoped' : '')),
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
		return next()
	})
}

module.exports = {
	hmrPlugin
}