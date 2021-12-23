const chalk = require('chalk')
const { pad } = require('../../utils')

function prepareError(err) {
  // only copy the information we need and avoid serializing unnecessary
  // properties, since some errors may attach full objects (e.g. PostCSS)
  return {
    message: err.message,
    stack: cleanStack(err.stack || ''),
    id: err.id,
    frame: err.frame || '',
    plugin: err.plugin,
    pluginCode: err.pluginCode,
    loc: err.loc
  }
}

function buildErrorMessage(err, args = [], includeStack = true) {
  if (err.plugin) args.push(`  Plugin: ${chalk.magenta(err.plugin)}`)
  if (err.id) args.push(`  File: ${chalk.cyan(err.id)}`)
  if (err.frame) args.push(chalk.yellow(pad(err.frame)))
  if (includeStack && err.stack) args.push(pad(cleanStack(err.stack)))
  return args.join('\n')
}

function cleanStack(stack) {
  return stack
    .split(/\n/g)
    .filter((l) => /^\s*at/.test(l))
    .join('\n')
}

function logError(server, err) {
  const msg = buildErrorMessage(err, [
    chalk.red(`Internal server error: ${err.message}`)
  ])

  server.config.logger.error(msg, {
    clear: true,
    timestamp: true,
    error: err
  })

  server.ws.send({
    type: 'error',
    err: prepareError(err)
  })
}

function errorMiddleware(server, allowNext = false
) {
  // note the 4 args must be kept for connect to treat this as error middleware
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function fakeViteErrorMiddleware(err, _req, res, next) {
    logError(server, err)

    if (allowNext) {
      next()
    } else {
      res.statusCode = 500
      res.end()
    }
  }
}

module.exports = {
	errorMiddleware,
  prepareError
}