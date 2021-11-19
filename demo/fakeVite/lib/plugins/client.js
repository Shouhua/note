const path = require('path')
const fs = require('fs-extra')

const HMR_PATH = '/fakeVite/client'
const clientFilePath = path.resolve(__dirname, '../client.js')

function clientPlugin({app, root, port, config}) {
	const clientCode = fs.readFileSync(clientFilePath, 'utf-8')
	app.use(async (ctx, next) => {
		if(ctx.path === HMR_PATH) {
			let socketPort = port
			if(config.hmr && typeof config.hmr === 'object') {
				socketPort = options.hmr.port || port
			}
			ctx.body = clientCode.replace('__HMR_PORT__', socketPort)
			ctx.type = 'js'
			ctx.code = 200
			return
		}
		return next()
	})
}

module.exports = {
	clientPlugin,
	HMR_PATH
}