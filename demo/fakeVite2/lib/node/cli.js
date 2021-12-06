const cac = require('cac')
const chalk = require('chalk')
const { createLogger } = require('./logger')

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
		try {
			const server = await createServer({
				root,
				mode: options.mode,
				logLevel: options.logLevel,
				clearScreen: options.clearScreen,
				configFile: options.config
			})
			if(!server.httpServer) {
				throw new Error('HTTP server not available')
			}
			await server.listen()
			const info = server.config.logger.info
			info(
				chalk.cyan(`\n  vite v${require('fakevite2/package.json').version}`) +
					chalk.green(` dev server running at:\n`),
				{
					clear: !server.config.logger.hasWarned
				}
			)
			server.printUrls()
			if (global.__vite_start_time) {
        // @ts-ignore
        const startupDuration = performance.now() - global.__vite_start_time
        info(`\n  ${chalk.cyan(`ready in ${Math.ceil(startupDuration)}ms.`)}\n`)
      }
		} catch(e) {
			createLogger(options.logLevel).error(
        chalk.red(`error when starting dev server:\n${e.stack}`),
        { error: e }
      )
      process.exit(1)
		}
	})

cli.help()
cli.version(require('../../package.json').version)
cli.parse()
