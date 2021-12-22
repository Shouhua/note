const fs = require('fs')
const path = require('path')
const MagicString = require('magic-string')
const { CLIENT_PUBLIC_PATH, FS_PREFIX } = require('../../constants')
const { injectQuery, cleanUrl, fsPathFromId, normalizePath } = require('../../utils') 
const { send } = require('../send')
const { assetAttrsConfig, resolveHtmlTransforms, applyHtmlTransforms, traverseHtml, getScriptInfo, addToHTMLProxyCache } = require('../../plugins/html')
const { NodeTypes } = require('@vue/compiler-dom')

function createDevHtmlTransformFn(server) {
  const [preHooks, postHooks] = resolveHtmlTransforms(server.config.plugins)

  return (url, html, originalUrl) => {
    return applyHtmlTransforms(html, [...preHooks, devHtmlHook, ...postHooks], {
      path: url,
      filename: getHtmlFilename(url, server),
      server,
      originalUrl
    })
  }
}

function getHtmlFilename(url, server) {
  if (url.startsWith(FS_PREFIX)) {
    return decodeURIComponent(fsPathFromId(url))
  } else {
    return decodeURIComponent(path.join(server.config.root, url.slice(1)))
  }
}

const startsWithSingleSlashRE = /^\/(?!\/)/
const processNodeUrl = (
  node,
  s,
  config,
  htmlPath,
  originalUrl,
  moduleGraph
) => {
  let url = (node.value || {}).content || ''

  if (moduleGraph) {
    const mod = moduleGraph.urlToModuleMap.get(url)
    if (mod && mod.lastHMRTimestamp > 0) {
      url = injectQuery(url, `t=${mod.lastHMRTimestamp}`)
    }
  }
  if (startsWithSingleSlashRE.test(url)) {
    // prefix with base
    s.overwrite(
      node.value.loc.start.offset,
      node.value.loc.end.offset,
      `"${config.base + url.slice(1)}"`
    )
  } else if (
    url.startsWith('.') &&
    originalUrl &&
    originalUrl !== '/' &&
    htmlPath === '/index.html'
  ) {
    // #3230 if some request url (localhost:3000/a/b) return to fallback html, the relative assets
    // path will add `/a/` prefix, it will caused 404.
    // rewrite before `./index.js` -> `localhost:3000/a/index.js`.
    // rewrite after `../index.js` -> `localhost:3000/index.js`.
    s.overwrite(
      node.value.loc.start.offset,
      node.value.loc.end.offset,
      `"${path.posix.join(
        path.posix.relative(originalUrl, '/'),
        url.slice(1)
      )}"`
    )
  }
}
const devHtmlHook = (html, { path: htmlPath, server, originalUrl }) => {
  const { config, moduleGraph } = server
  const base = config.base || '/'

  const s = new MagicString(html)
  let scriptModuleIndex = -1
  const filePath = cleanUrl(htmlPath)

  traverseHtml(html, htmlPath, (node) => {
    if (node.type !== 1/*NodeTypes.ELEMENT*/) {
      return
    }

    // script tags
    if (node.tag === 'script') {
      const { src, isModule } = getScriptInfo(node)
      if (isModule) {
        scriptModuleIndex++
      }

      if (src) {
        processNodeUrl(src, s, config, htmlPath, originalUrl, moduleGraph)
      } else if (isModule) {
        const url = filePath.replace(normalizePath(config.root), '')

        const contents = node.children
          .map((child) => child.content || '')
          .join('')

        // add HTML Proxy to Map
        addToHTMLProxyCache(config, url, scriptModuleIndex, contents)

        // inline js module. convert to src="proxy"
        s.overwrite(
          node.loc.start.offset,
          node.loc.end.offset,
          `<script type="module" src="${
            config.base + url.slice(1)
          }?html-proxy&index=${scriptModuleIndex}.js"></script>`
        )
      }
    }

    // elements with [href/src] attrs
    const assetAttrs = assetAttrsConfig[node.tag]
    if (assetAttrs) {
      for (const p of node.props) {
        if (
          p.type === 6 /*NodeTypes.ATTRIBUTE*/ &&
          p.value &&
          assetAttrs.includes(p.name)
        ) {
          processNodeUrl(p, s, config, htmlPath, originalUrl)
        }
      }
    }
  })

  html = s.toString()

  return {
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          type: 'module',
          src: path.posix.join(base, CLIENT_PUBLIC_PATH)
        },
        injectTo: 'head-prepend'
      }
    ]
  }
}

function indexHtmlMiddleware(server) {
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return async function viteIndexHtmlMiddleware(req, res, next) {
    if (res.writableEnded) {
      return next()
    }

    const url = req.url && cleanUrl(req.url)
    // spa-fallback always redirects to /index.html
    if (url.endsWith('.html') && req.headers['sec-fetch-dest'] !== 'script') {
      const filename = getHtmlFilename(url, server)
      if (fs.existsSync(filename)) {
        try {
          let html = fs.readFileSync(filename, 'utf-8')
          html = await server.transformIndexHtml(url, html, req.originalUrl)
          return send(req, res, html, 'html')
        } catch (e) {
          return next(e)
        }
      }
    }
    next()
  }
}

module.exports = {
	indexHtmlMiddleware,
  createDevHtmlTransformFn
}