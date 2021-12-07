const { performance } = require('perf_hooks')
const { createDebugger, prettifyUrl, timeFrom } = require('../../utils')

const logTime = createDebugger('fakeVite:time')

function timeMiddleware(root) {
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function fakeViteTimeMiddleware(req, res, next) {
    const start = performance.now()
    const end = res.end
    res.end = (...args) => {
      logTime(`${timeFrom(start)} ${prettifyUrl(req.url, root)}`)
      return end.call(res, ...args)
    }
    next()
  }
}

module.exports = {
  timeMiddleware
}