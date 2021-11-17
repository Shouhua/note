const path = require('path')

const debug = require('debug')('fakeVite:static')
const seenUrls = new Set()

const staticPlugin = ({app, root}) => {
	app.use(async (ctx, next) => {
		debug(`static path: ${ctx.path}`)
		// short circuit requests that have already been explicitly handled
		if (ctx.body || ctx.status !== 404) {
			return
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