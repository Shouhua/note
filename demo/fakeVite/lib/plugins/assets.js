const debug = require('debug')('fakeVite:assets')
const { isImportRequest } = require('../utils')

const imageRE = /\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/
const mediaRE = /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/
const fontsRE = /\.(woff2?|eot|ttf|otf)(\?.*)?$/i

/**
 * Check if a file is a static asset that vite can process.
 */
const isStaticAsset = (file) => {
  return imageRE.test(file) || mediaRE.test(file) || fontsRE.test(file)
}

const assetsPlugin = ({app, root}) => {
	app.use(async (ctx, next) => {
		if(isStaticAsset(ctx.path) && isImportRequest(ctx)) {
			const s = ctx.assetsStamp = Date.now()
			debug(`ctx.path`, s)
			ctx.type = 'js'
			ctx.body = `export default ${JSON.stringify(ctx.path)}`
			return
		}
		return next()
	})
}
module.exports = {
	assetsPlugin
}