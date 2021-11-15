const fs = require('fs-extra')
const path = require('path')
const { cacheRead } = require('../utils/utils')

const HMR_PATH = '/fakeVite/hmr'
function hmrPlugin({app, root}) {
	app.use(async (ctx, next) => {
		if(ctx.path === HMR_PATH) {
			const filePath = path.resolve(__dirname, '../client.js')
			await cacheRead(ctx, filePath)
			return
		}
		return next()
	})
}

module.exports = {
	HMR_PATH,
	hmrPlugin
}