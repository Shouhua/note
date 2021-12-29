const fs = require('fs')
const path = require('path')
const MagicString = require('magic-string')
const { CLIENT_PUBLIC_PATH, FS_PREFIX } = require('../../constants')
const { injectQuery, cleanUrl, fsPathFromId, normalizePath } = require('../../utils') 
const { send } = require('../send')
const { assetAttrsConfig, resolveHtmlTransforms, applyHtmlTransforms, traverseHtml, getScriptInfo, addToHTMLProxyCache } = require('../../plugins/html')

function createDevHtmlTransformFn(server) {
  // 提取用户plugin中的transformIndexHtml部分, pre和post的分界是核心plugin执行前后
  const [preHooks, postHooks] = resolveHtmlTransforms(server.config.plugins)

  return (url, html, originalUrl) => {
    // 这里主要是执行devHtmlHook
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
// 改写src中的url，添加相应的前缀
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

// 主要处理script和asset标签，如果是src，改写；如果是content，添加htmlProxyMap
const devHtmlHook = (html, { path: htmlPath, server, originalUrl }) => {
  const { config, moduleGraph } = server
  const base = config.base || '/'

  const s = new MagicString(html)
  let scriptModuleIndex = -1 // 用于后面使用的http-proxy，cache后根据index随时取出来
  const filePath = cleanUrl(htmlPath)

  traverseHtml(html, htmlPath, (node) => {
    if (node.type !== 1/*NodeTypes.ELEMENT*/) {
      return
    }

    // script tags
    if (node.tag === 'script') {
      const { src, isModule } = getScriptInfo(node)
      if (isModule) { // 只适用于module
        scriptModuleIndex++
      }

      if (src) {
        processNodeUrl(src, s, config, htmlPath, originalUrl, moduleGraph)
      } else if (isModule) { // inline script
        const url = filePath.replace(normalizePath(config.root), '')

        const contents = node.children
          .map((child) => child.content || '')
          .join('')

        // add HTML Proxy to Map
        addToHTMLProxyCache(config, url, scriptModuleIndex, contents)

        // inline js module. convert to src="proxy"
        // 比如: <script type="module" src="/index.html?html-proxy&index=0.js"</script>
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
      { // NOTICE 注入'/@fakeVite/client'
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