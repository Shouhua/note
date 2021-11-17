const { isImportRequest, readBody } = require('../utils')
const { dataToEsm } = require('@rollup/pluginutils')

function jsonPlugin({app, root}) {
	app.use(async (ctx, next) => {
		await next()
		if(ctx.path.endsWith('.json') && ctx.body && isImportRequest(ctx)) {
			ctx.type = 'js'
			ctx.body = dataToEsm(JSON.parse((await readBody(ctx.body))), {
        namedExports: true,
        preferConst: true
      })
		}
	})
}

module.exports = {
	jsonPlugin
}