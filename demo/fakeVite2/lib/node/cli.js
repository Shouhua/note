const cac = require('cac')

const cli = cac('fakeVite')

cli
	.option('-c, --config <file>', `[string] use specified config file`)
	.option('--clearScreen', `[boolean] allow/disable clear screen when logging`)
	.option('-d, --debug [feat]', `[string | boolean] show debug logs`)
	.option('-f, --filter <filter>', `[string] filter debug logs`)
	.option('-l, --logLevel <level>', `[string] info | warn | error | silent`)
	.option('-m, --mode <mode>', `[string] set env mode`)

cli
	.command('[root]')
	.alias('serve')
	.alias('dev')
	.option('--force', `[boolean] force the optimizer to ignore the cache and re-bundle`)
	.action(async (root, options) => {
		const { createServer } = require('./server')
		await createServer({
			root,
			mode: options.mode,
			logLevel: options.logLevel,
			clearScreen: options.clearScreen,
			configFile: options.config
		})
	})

cli.help()
cli.version(require('../../package.json').version)
cli.parse()
