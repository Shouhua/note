const argv = require('minimist')(process.argv.slice(2))
process.env.DEBUG = `fakeVite:` + (argv.debug === true ? '*' : argv.debug)

const chalk = require('chalk')
const path = require('path')

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
	argv.optimizeDeps = {
    include: [],
    exclude: ['vue', 'fakevite'],
    link: []
  }
  argv.https = true
  argv.httpsOptions = {
    // ca: path.join(__dirname, 'cert/ca-cert.pem'),
    cert: path.resolve(__dirname, '../cert/server-cert.pem'),
    key: path.resolve(__dirname, '../cert/server-key.pem')
  }
	return argv
}

;(async () => {
	const { help, h, mode, m, version, v } = argv

  if (help || h) {
    logHelp()
    return
  } else if (version || v) {
    // noop, already logged
    return
  }
	const options = resolveOptions()
	if(!options.command || options.command === 'serve') {
		require('./server').createServer(options)
	}
})()