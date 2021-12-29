const fs = require('fs')
const history = require('connect-history-api-fallback')
const path = require('path')
const { createDebugger } = require('../../utils')

// 根据规则rewrite request url
function spaFallbackMiddleware(root) {
  const historySpaFallbackMiddleware = history({
    logger: createDebugger('fakeVite:spa-fallback'),
    // support /dir/ without explicit index.html
    rewrites: [
      {
        from: /\/$/,
        to({ parsedUrl }) {
          const rewritten =
            decodeURIComponent(parsedUrl.pathname) + 'index.html'

          if (fs.existsSync(path.join(root, rewritten))) {
            return rewritten
          } else {
            return `/index.html`
          }
        }
      }
    ]
  })

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function viteSpaFallbackMiddleware(req, res, next) {
    return historySpaFallbackMiddleware(req, res, next)
  }
}
module.exports = {
	spaFallbackMiddleware
}