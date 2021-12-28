const cac = require('cac')
const chalk = require('chalk')
const { createLogger } = require('./logger')
const { build } = require('./build')

const cli = cac('fakeVite')

cli
	.option('-c, --config <file>', `[string] use specified config file`)
	.option('--clearScreen', `[boolean] allow/disable clear screen when logging`)
	.option('-d, --debug [feat]', `[string | boolean] show debug logs`)
	.option('-f, --filter <filter>', `[string] filter debug logs`)
	.option('-l, --logLevel <level>', `[string] info | warn | error | silent`)
	.option('-m, --mode <mode>', `[string] set env mode`)

/**
 * removing global flags before passing as command specific sub-configs
 */
function cleanOptions(options) {
  const ret = { ...options }
  delete ret['--']
  delete ret.c
  delete ret.config
  delete ret.base
  delete ret.l
  delete ret.logLevel
  delete ret.clearScreen
  delete ret.d
  delete ret.debug
  delete ret.f
  delete ret.filter
  delete ret.m
  delete ret.mode
  return ret
}

cli
	.command('[root]')
	.alias('serve')
	.alias('dev')
  .option('--host [host]', `[string] specify hostname`)
  .option('--port <port>', `[number] specify port`)
  .option('--https', `[boolean] use TLS + HTTP/2`)
  .option('--open [path]', `[boolean | string] open browser on startup`)
  .option('--cors', `[boolean] enable CORS`)
  .option('--strictPort', `[boolean] exit if specified port is already in use`)
  .option(
    '--force',
    `[boolean] force the optimizer to ignore the cache and re-bundle`
  )
	.action(async (root, options) => {
		const { createServer } = require('./server')
		try {
			const server = await createServer({
				root,
				mode: options.mode,
				logLevel: options.logLevel,
				clearScreen: options.clearScreen,
				configFile: options.config,
				server: cleanOptions(options)
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

	// build
cli
.command('build [root]')
.option('--target <target>', `[string] transpile target (default: 'modules')`)
.option('--outDir <dir>', `[string] output directory (default: dist)`)
.option(
	'--assetsDir <dir>',
	`[string] directory under outDir to place assets in (default: _assets)`
)
.option(
	'--assetsInlineLimit <number>',
	`[number] static asset base64 inline threshold in bytes (default: 4096)`
)
.option(
	'--ssr [entry]',
	`[string] build specified entry for server-side rendering`
)
.option(
	'--sourcemap',
	`[boolean] output source maps for build (default: false)`
)
.option(
	'--minify [minifier]',
	`[boolean | "terser" | "esbuild"] enable/disable minification, ` +
		`or specify minifier to use (default: esbuild)`
)
.option('--manifest', `[boolean] emit build manifest json`)
.option('--ssrManifest', `[boolean] emit ssr manifest json`)
.option(
	'--emptyOutDir',
	`[boolean] force empty outDir when it's outside of root`
)
.option('-w, --watch', `[boolean] rebuilds when modules have changed on disk`)
.action(async (root, options) => {
	const buildOptions = cleanOptions(options)

	try {
		await build({
			root,
			base: options.base,
			mode: options.mode,
			configFile: options.config,
			logLevel: options.logLevel,
			clearScreen: options.clearScreen,
			build: buildOptions
		})
	} catch (e) {
		createLogger(options.logLevel).error(
			chalk.red(`error during build:\n${e.stack}`),
			{ error: e }
		)
		process.exit(1)
	}
})

cli.help()
cli.version(require('../../package.json').version)
cli.parse()
