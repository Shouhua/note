function genSourceMapString(map) {
	if(typeof map !== 'string') {
		map = JSON.stringify(map)
	}
	return `\n//# sourceMapUrl=data:application/json;base64,${Buffer.from(
		map
	).toString('base64')}`
}

function sourceMapPlugin({app, root}) {
	app.use(async (ctx, next) => {
		await next()
		if (typeof ctx.body === 'string' && ctx.map) {
			ctx.body += genSourceMapString(ctx.map)
		}
	})
}

module.exports = {
	sourceMapPlugin
}