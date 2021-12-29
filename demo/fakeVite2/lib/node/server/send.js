const getEtag = require('etag')

const isDebug = process.env.DEBUG

const alias = {
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json'
}

// 可以参考sirv的send函数
function send(req, res, content, type, etag = getEtag(content, { weak: true }), cacheControl = 'no-cache', map) {
  if (res.writableEnded) {
    return
  }

  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304
    return res.end()
  }

  res.setHeader('Content-Type', alias[type] || type)
  res.setHeader('Cache-Control', cacheControl)
  res.setHeader('Etag', etag)

  // inject source map reference
  if (map && map.mappings) {
    if (isDebug) {
      content += `\n/*${JSON.stringify(map, null, 2).replace(
        /\*\//g,
        '*\\/'
      )}*/\n`
    }
    content += genSourceMapString(map)
  }

  res.statusCode = 200
  return res.end(content)
}

function genSourceMapString(map) {
  if (typeof map !== 'string') {
    map = JSON.stringify(map)
  }
  return `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
    map
  ).toString('base64')}`
}

module.exports = {
	send
}