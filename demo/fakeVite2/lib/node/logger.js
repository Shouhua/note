const readline = require('readline')
const chalk = require('chalk')
const { resolveHostname } = require('./utils')

function clearScreen() {
	const repeatCount = process.stdout.rows - 2
	const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : ''
	console.log(blank)
	readline.cursorTo(process.stdout, 0, 0)
	readline.clearScreenDown(process.stdout)
}
const LogLevels = {
	silent: 0,
	error: 1,
	warn: 2,
	info: 3
}
let lastType
let lastMsg
let sameCount = 0
function createLogger(
	level = 'info',
	options = {}
) {
	if(options.customLogger) {
		return options.customLogger
	}
	const loggedErrors = new WeakSet()
	const { prefix = '[fakeVite]', allowClearScreen = true } = options
	const thresh = LogLevels[level]
	const canClearScreen = allowClearScreen && process.stdout.isTTY && !process.env.CI
	const clear = canClearScreen ? clearScreen : () => {}

	function output(type, msg, options = {}) {
    if (thresh >= LogLevels[type]) {
      const method = type === 'info' ? 'log' : type
      const format = () => {
        if (options.timestamp) {
          const tag =
            type === 'info'
              ? chalk.cyan.bold(prefix)
              : type === 'warn'
              ? chalk.yellow.bold(prefix)
              : chalk.red.bold(prefix)
          return `${chalk.dim(new Date().toLocaleTimeString())} ${tag} ${msg}`
        } else {
          return msg
        }
      }
      if (options.error) {
        loggedErrors.add(options.error)
      }
      if (canClearScreen) {
        if (type === lastType && msg === lastMsg) {
          sameCount++
          clear()
          console[method](format(), chalk.yellow(`(x${sameCount + 1})`))
        } else {
          sameCount = 0
          lastMsg = msg
          lastType = type
          if (options.clear) {
            clear()
          }
          console[method](format())
        }
      } else {
        console[method](format())
      }
    }
  }

	const warnedMessages = new Set()

  const logger = {
    hasWarned: false,
    info(msg, opts) {
      output('info', msg, opts)
    },
    warn(msg, opts) {
      logger.hasWarned = true
      output('warn', msg, opts)
    },
    warnOnce(msg, opts) {
      if (warnedMessages.has(msg)) return
      logger.hasWarned = true
      output('warn', msg, opts)
      warnedMessages.add(msg)
    },
    error(msg, opts) {
      logger.hasWarned = true
      output('error', msg, opts)
    },
    clearScreen(type) {
      if (thresh >= LogLevels[type]) {
        clear()
      }
    },
    hasErrorLogged(error) {
      return loggedErrors.has(error)
    }
  }
	return logger
}

function printServerUrls(
  hostname,
  protocol,
  port,
  base,
  info
) {
  if (hostname.host === '127.0.0.1') {
    const url = `${protocol}://${hostname.name}:${chalk.bold(port)}${base}`
    info(`  > Local: ${chalk.cyan(url)}`)
    if (hostname.name !== '127.0.0.1') {
      info(`  > Network: ${chalk.dim('use `--host` to expose')}`)
    }
  } else {
    Object.values(os.networkInterfaces())
      .flatMap((nInterface) => nInterface ?? [])
      .filter((detail) => detail && detail.address && detail.family === 'IPv4')
      .map((detail) => {
        const type = detail.address.includes('127.0.0.1')
          ? 'Local:   '
          : 'Network: '
        const host = detail.address.replace('127.0.0.1', hostname.name)
        const url = `${protocol}://${host}:${chalk.bold(port)}${base}`
        return `  > ${type} ${chalk.cyan(url)}`
      })
      .forEach((msg) => info(msg))
  }
}

function printCommonServerUrls(
  server,
  options,
  config
) {
  const address = server.address()
  const isAddressInfo = (x) => (x || {}).address
  if (isAddressInfo(address)) {
    const hostname = resolveHostname(options.host)
    const protocol = options.https ? 'https' : 'http'
    printServerUrls(
      hostname,
      protocol,
      address.port,
      config.base,
      config.logger.info
    )
  }
}

module.exports = {
	createLogger,
  printCommonServerUrls
}