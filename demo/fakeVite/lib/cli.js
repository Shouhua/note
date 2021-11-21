const start = Date.now()
const argv = require('minimist')(process.argv.slice(2))
process.env.DEBUG = `fakeVite:` + (argv.debug === true ? '*' : argv.debug)
console.log(process.env.DEBUG);

const chalk = require('chalk')
const path = require('path')
const os = require('os')

console.log(chalk.cyan(`fakeVite v${require('../package.json').version}`))

const logHelp = `
Usage: fakeVite [command] [args] [--options]

Commands:
  vite                       Start server in current directory.
  vite serve [root=cwd]      Start server in target directory.
  vite build [root=cwd]      Build target directory.

Options:
  --help, -h                 [boolean] show help
  --version, -v              [boolean] show version
  --config, -c               [string]  use specified config file
  --port                     [number]  port to use for serve
  --open                     [boolean] open browser on server start
  --entry                    [string]  entry file for build (default: index.html)
  --base                     [string]  public base path for build (default: /)
  --outDir                   [string]  output directory for build (default: dist)
  --assetsDir                [string]  directory under outDir to place assets in (default: assets)
  --assetsInlineLimit        [number]  static asset base64 inline threshold in bytes (default: 4096)
  --sourcemap                [boolean] output source maps for build (default: false)
  --minify                   [boolean | 'terser' | 'esbuild'] enable/disable minification, or specify
                                       minifier to use. (default: 'terser')
  --mode, -m                 [string]  specify env mode (default: 'development' for dev, 'production' for build)
  --ssr                      [boolean] build for server-side rendering
  --jsx                      ['vue' | 'preact' | 'react']  choose jsx preset (default: 'vue')
  --jsx-factory              [string]  (default: React.createElement)
  --jsx-fragment             [string]  (default: React.Fragment)
  --force                    [boolean] force the optimizer to ignore the cache and re-bundle
`


;(async () => {
	const { help, h, mode, m, version, v } = argv
  if (help || h) {
    logHelp()
    return
  } else if (version || v) {
    return
  }
	const options = resolveOptions()
	if(!options.command || options.command === 'serve') {
    runServe(options)
	}
  if(options.command === 'build') {
    await runBuild(options)
  }
})()

function runServe(options) {
  const server = require('./server').createServer(options)
  let port = options.port || 3000
  let hostname = options.name || 'localhost'
  let protocol = options.https ? 'https' : 'http'
  server.on('error', (e) => {
    if(e.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, try another one...`);
      setTimeout(() => {
        server.close()
        server.listen(++port)
      }, 100)
    } else {
      console.error(chalk.red(`[fakeVite] server error: `))
      console.error(e)
    }
  })
  server.listen(port, () => {
    console.log()
    console.log(`  Dev server running at:`)
    const interfaces = os.networkInterfaces()
    Object.keys(interfaces).forEach((key) => {
      ;(interfaces[key] || [])
        .filter((details) => details.family === 'IPv4')
        .map((detail) => {
          return {
            type: detail.address.includes('127.0.0.1')
              ? 'Local:   '
              : 'Network: ',
            host: detail.address.replace('127.0.0.1', hostname)
          }
        })
        .forEach(({ type, host }) => {
          const url = `${protocol}://${host}:${chalk.bold(port)}/`
          console.log(`  > ${type} ${chalk.cyan(url)}`)
        })
    })
    console.log()
    console.log(chalk.green(`server ready in ${Date.now() - start}ms.`))

    if (options.open) {
      require('./utils/openBrowser')(
        `${protocol}://${hostname}:${port}`
      )
    }
  })
}

function resolveOptions() {
	Object.keys(argv).forEach(key => {
		if(argv[key] === 'false') {
			argv[key] = false
		}
		if(argv[key] === 'true') {
			argv[key] = true
		}
	})
	if(argv._[0]) {
		argv.command = argv._[0]
	}
	if(!argv.root && argv._[1]) {
		argv.root = argv._[1]
	}
  const userConfig = resolveConfig()
  if (userConfig) {
    return {
      ...userConfig,
      ...argv // cli options take higher priority
    }
  }
	return argv
}

function resolveConfig() {
  const configPath = path.resolve(process.cwd(), 'fakeVite.config.js')
  const userConfig = require(configPath)
  return userConfig
}

async function runBuild(options) {
  await require('./build').build()
}