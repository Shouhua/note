const path = require('path')

const debug = require('debug')('fakeVite:static')
const seenUrls = new Set()
const fs = require('fs-extra')
const { cacheRead } = require('../utils')

const staticPlugin = ({app, root, resolver}) => {
	app.use(async (ctx, next) => {
		// short circuit requests that have already been explicitly handled
		if (ctx.body || ctx.status !== 404) {
			return
		}

		const expectsHtml = ctx.headers.accept && ctx.headers.accept.includes('text/html')
		if (!expectsHtml) {
			const filePath = resolver.requestToFile(ctx.path, root)
			debug(filePath)
			if (
				filePath !== ctx.path &&
				fs.existsSync(filePath) &&
				fs.statSync(filePath).isFile()
			) {
				await cacheRead(ctx, filePath)
			}
		}

		await next()
		// the first request to the server should never 304
		if (seenUrls.has(ctx.url) && ctx.fresh) {
			ctx.status = 304
		}
		seenUrls.add(ctx.url)
	})
	app.use(require('koa-static')(root))
	app.use(require('koa-static')(path.join(root, 'public')))
}

module.exports = {
	staticPlugin,
	seenUrls
}