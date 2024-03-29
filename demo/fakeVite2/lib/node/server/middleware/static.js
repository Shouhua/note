const { normalizePath, isImportRequest, isInternalRequest, cleanUrl, isFileReadable, ensureLeadingSlash, fsPathFromId } = require('../../utils')
const { FS_PREFIX } = require('../../constants')
const { isMatch } = require('micromatch')
const sirv = require('sirv')
const path = require('path')

const sirvOptions = {
	dev: true,
	etag: true,
	extension: [],
	setHeaders(res, pathname) {
		if(/\.[tj]sx?$/.test(pathname)) {
			res.setHeader('Content-Type', 'application/javascript')
		}
	}
}

function servePublicMiddleware(dir) {
  const serve = sirv(dir, sirvOptions)

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function fakeViteServePublicMiddleware(req, res, next) {
    // skip import request and internal requests `/@fs/ /@vite-client` etc...
    if (isImportRequest(req.url) || isInternalRequest(req.url)) {
      return next()
    }
    serve(req, res, next)
  }
}

function serveStaticMiddleware(dir, server) {
  const serve = sirv(dir, sirvOptions)

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function fakeViteServeStaticMiddleware(req, res, next) {
    // only serve the file if it's not an html request or ends with `/`
    // so that html requests can fallthrough to our html middleware for
    // special processing
    // also skip internal requests `/@fs/ /@vite-client` etc...
    const cleanedUrl = cleanUrl(req.url)
    if (
      cleanedUrl.endsWith('/') ||
      path.extname(cleanedUrl) === '.html' ||
      isInternalRequest(req.url)
    ) {
      return next()
    }

    const url = decodeURI(req.url)

    // apply aliases to static requests as well
    let redirected
    // NOTICE 注意这里会将url使用alias处理
    for (const { find, replacement } of server.config.resolve.alias) {
      const matches =
        typeof find === 'string' ? url.startsWith(find) : find.test(url)
      if (matches) {
        redirected = url.replace(find, replacement)
        break
      }
    }
    if (redirected) {
      // dir is pre-normalized to posix style
      if (redirected.startsWith(dir)) {
        redirected = redirected.slice(dir.length)
      }
    }

    const resolvedUrl = redirected || url
    let fileUrl = path.resolve(dir, resolvedUrl.replace(/^\//, ''))
    if (resolvedUrl.endsWith('/') && !fileUrl.endsWith('/')) {
      fileUrl = fileUrl + '/'
    }
    if (!ensureServingAccess(fileUrl, server, res, next)) {
      return
    }
    if (redirected) {
      req.url = redirected
    }

    serve(req, res, next)
  }
}

function serveRawFsMiddleware(server) {
  // 此处使用电脑的根目录处理'/@fs/'，需要注意使用权限，所以在后面使用ensureServingAcess
  const serveFromRoot = sirv('/', sirvOptions)

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function fakeViteServeRawFsMiddleware(req, res, next) {
    let url = req.url
    // In some cases (e.g. linked monorepos) files outside of root will
    // reference assets that are also out of served root. In such cases
    // the paths are rewritten to `/@fs/` prefixed paths and must be served by
    // searching based from fs root.
    if (url.startsWith(FS_PREFIX)) {
      // restrict files outside of `fs.allow`
      if (
        !ensureServingAccess(
          slash(path.resolve(fsPathFromId(url))),
          server,
          res,
          next
        )
      ) {
        return
      }

      url = url.slice(FS_PREFIX.length)
      if (isWindows) url = url.replace(/^[A-Z]:/i, '')

      req.url = url // 重写req.url
      serveFromRoot(req, res, next)
    } else {
      next()
    }
  }
}

const _matchOptions = { matchBase: true }

function isFileServingAllowed(
  url,
  server
) {
  if (!server.config.server.fs.strict) return true

  const cleanedUrl = cleanUrl(url)
  const file = ensureLeadingSlash(normalizePath(cleanedUrl))

  if (server.config.server.fs.deny.some((i) => isMatch(file, i, _matchOptions)))
    return false

  if (server.moduleGraph.safeModulesPath.has(file)) return true

  if (server.config.server.fs.allow.some((i) => file.startsWith(i + '/')))
    return true

  return false
}

function ensureServingAccess(
  url,
  server,
  res,
  next
) {
  if (isFileServingAllowed(url, server)) {
    return true
  }
  if (isFileReadable(cleanUrl(url))) {
    const urlMessage = `The request url "${url}" is outside of Vite serving allow list.`
    const hintMessage = `
${server.config.server.fs.allow.map((i) => `- ${i}`).join('\n')}

Refer to docs https://vitejs.dev/config/#server-fs-allow for configurations and more details.`

    server.config.logger.error(urlMessage)
    server.config.logger.warnOnce(hintMessage + '\n')
    res.statusCode = 403
    res.write(renderRestrictedErrorHTML(urlMessage + '\n' + hintMessage))
    res.end()
  } else {
    // if the file doesn't exist, we shouldn't restrict this path as it can
    // be an API call. Middlewares would issue a 404 if the file isn't handled
    next()
  }
  return false
}

function renderRestrictedErrorHTML(msg) {
  // to have syntax highlighting and autocompletion in IDE
  const html = String.raw
  return html`
    <body>
      <h1>403 Restricted</h1>
      <p>${msg.replace(/\n/g, '<br/>')}</p>
      <style>
        body {
          padding: 1em 2em;
        }
      </style>
    </body>
  `
}

module.exports = {
  servePublicMiddleware,
  serveStaticMiddleware,
  serveRawFsMiddleware,
  isFileServingAllowed
}