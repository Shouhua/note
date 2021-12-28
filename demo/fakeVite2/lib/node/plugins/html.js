const { isDataUrl, isExternalUrl, generateCodeFrame, slash, processSrcSet } = require('../utils')
const { assetUrlRE, getAssetFilename, checkPublicFile, urlToBuiltUrl } = require('../plugins/asset')
const { parse, transform } = require('@vue/compiler-dom')
const path = require('path')
const MagicString = require('magic-string')
const { chunkToEmittedCssFileMap, isCSSRequest } = require('../plugins/css')
const { modulePreloadPolyfillId } = require('./modulePreloadPolyfill')

const htmlProxyRE = /\?html-proxy&index=(\d+)\.js$/
const isHTMLProxy = (id) => htmlProxyRE.test(id)

function resolveHtmlTransforms(plugins) {
  const preHooks = []
  const postHooks = []

  for (const plugin of plugins) {
    const hook = plugin.transformIndexHtml
    if (hook) {
      if (typeof hook === 'function') {
        postHooks.push(hook)
      } else if (hook.enforce === 'pre') {
        preHooks.push(hook.transform)
      } else {
        postHooks.push(hook.transform)
      }
    }
  }

  return [preHooks, postHooks]
}

async function applyHtmlTransforms(html, hooks, ctx) {
  const headTags = []
  const headPrependTags = []
  const bodyTags = []
  const bodyPrependTags = []

  for (const hook of hooks) {
    const res = await hook(html, ctx)
    if (!res) {
      continue
    }
    if (typeof res === 'string') {
      html = res
    } else {
      let tags
      if (Array.isArray(res)) {
        tags = res
      } else {
        html = res.html || html
        tags = res.tags
      }
      for (const tag of tags) {
        if (tag.injectTo === 'body') {
          bodyTags.push(tag)
        } else if (tag.injectTo === 'body-prepend') {
          bodyPrependTags.push(tag)
        } else if (tag.injectTo === 'head') {
          headTags.push(tag)
        } else {
          headPrependTags.push(tag)
        }
      }
    }
  }

  // inject tags
  if (headPrependTags.length) {
    html = injectToHead(html, headPrependTags, true)
  }
  if (headTags.length) {
    html = injectToHead(html, headTags)
  }
  if (bodyPrependTags.length) {
    html = injectToBody(html, bodyPrependTags, true)
  }
  if (bodyTags.length) {
    html = injectToBody(html, bodyTags)
  }

  return html
}

// import 'foo'
const importRE = /\bimport\s*("[^"]*[^\\]"|'[^']*[^\\]');*/g
const commentRE = /\/\*[\s\S]*?\*\/|\/\/.*$/gm
function isEntirelyImport(code) {
  // only consider "side-effect" imports, which match <script type=module> semantics exactly
  // the regexes will remove too little in some exotic cases, but false-negatives are alright
  return !code.replace(importRE, '').replace(commentRE, '').trim().length
}

function toPublicPath(filename, config) {
  return isExternalUrl(filename) ? filename : config.base + filename
}

const headInjectRE = /([ \t]*)<\/head>/i
const headPrependInjectRE = /([ \t]*)<head[^>]*>/i

const htmlInjectRE = /<\/html>/i
const htmlPrependInjectRE = /([ \t]*)<html[^>]*>/i

const bodyInjectRE = /([ \t]*)<\/body>/i
const bodyPrependInjectRE = /([ \t]*)<body[^>]*>/i

const doctypePrependInjectRE = /<!doctype html>/i

function injectToHead(html, tags, prepend = false) {
  if (prepend) {
    // inject as the first element of head
    if (headPrependInjectRE.test(html)) {
      return html.replace(
        headPrependInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`
      )
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      // respect indentation of head tag
      return html.replace(
        headInjectRE,
        (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`
      )
    }
    // try to inject before the body tag
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(
        bodyPrependInjectRE,
        (match, p1) => `${serializeTags(tags, p1)}\n${match}`
      )
    }
  }
  // if no head tag is present, we prepend the tag for both prepend and append
  return prependInjectFallback(html, tags)
}

function injectToBody(html, tags, prepend = false) {
  if (prepend) {
    // inject after body open
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(
        bodyPrependInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`
      )
    }
    // if no there is no body tag, inject after head or fallback to prepend in html
    if (headInjectRE.test(html)) {
      return html.replace(
        headInjectRE,
        (match, p1) => `${match}\n${serializeTags(tags, p1)}`
      )
    }
    return prependInjectFallback(html, tags)
  } else {
    // inject before body close
    if (bodyInjectRE.test(html)) {
      return html.replace(
        bodyInjectRE,
        (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`
      )
    }
    // if no body tag is present, append to the html tag, or at the end of the file
    if (htmlInjectRE.test(html)) {
      return html.replace(htmlInjectRE, `${serializeTags(tags)}\n$&`)
    }
    return html + `\n` + serializeTags(tags)
  }
}

function prependInjectFallback(html, tags) {
  // prepend to the html tag, append after doctype, or the document start
  if (htmlPrependInjectRE.test(html)) {
    return html.replace(htmlPrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  if (doctypePrependInjectRE.test(html)) {
    return html.replace(doctypePrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  return serializeTags(tags) + html
}

const unaryTags = new Set(['link', 'meta', 'base'])

function serializeTag({ tag, attrs, children }, indent = '') {
  if (unaryTags.has(tag)) {
    return `<${tag}${serializeAttrs(attrs)}>`
  } else {
    return `<${tag}${serializeAttrs(attrs)}>${serializeTags(
      children,
      incrementIndent(indent)
    )}</${tag}>`
  }
}

function serializeTags(tags, indent = '') {
  if (typeof tags === 'string') {
    return tags
  } else if (tags && tags.length) {
    return tags.map((tag) => `${indent}${serializeTag(tag, indent)}\n`).join('')
  }
  return ''
}

function serializeAttrs(attrs) {
  let res = ''
  for (const key in attrs) {
    if (typeof attrs[key] === 'boolean') {
      res += attrs[key] ? ` ${key}` : ``
    } else {
      res += ` ${key}=${JSON.stringify(attrs[key])}`
    }
  }
  return res
}

function incrementIndent(indent) {
  return `${indent}${indent[0] === '\t' ? '\t' : '  '}`
}

function traverseHtml(html, filePath, visitor) {
  html = html.replace(/<!doctype\s/i, '<!DOCTYPE ')
  try {
    const ast = parse(html, { comments: true });
    transform(ast, {
      nodeTransforms: [visitor]
    })
  } catch (e) {
    const parseError = {
      loc: filePath,
      frame: '',
      ...formatParseError(e, filePath, html)
    }
    throw new Error(
      `Unable to parse ${JSON.stringify(parseError.loc)}\n${parseError.frame}`
    )
  }
}

function formatParseError(e, id, html) {
  // normalize the error to rollup format
  if (e.loc) {
    e.frame = generateCodeFrame(html, e.loc.start.offset)
    e.loc = {
      file: id,
      line: e.loc.start.line,
      column: e.loc.start.column
    }
  }
  return e
}

function getScriptInfo(node) {
  let src
  let isModule = false
  let isAsync = false
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i]
    if (p.type === 6 /*NodeTypes.ATTRIBUTE*/) {
      if (p.name === 'src') {
        src = p
      } else if (p.name === 'type' && p.value && p.value.content === 'module') {
        isModule = true
      } else if (p.name === 'async') {
        isAsync = true
      }
    }
  }
  return { src, isModule, isAsync }
}

// HTML Proxy Caches are stored by config -> filePath -> index
// export const htmlProxyMap = new WeakMap<
//   ResolvedConfig,
//   Map<string, Array<string>>
// >()
const htmlProxyMap = new WeakMap()

/** Add script to cache */
function addToHTMLProxyCache(config, filePath, index, code) {
  if (!htmlProxyMap.get(config)) {
    htmlProxyMap.set(config, new Map())
  }
  if (!((htmlProxyMap.get(config) || new Map()).get(filePath))) {
    htmlProxyMap.get(config).set(filePath, [])
  }
  htmlProxyMap.get(config).get(filePath)[index] = code
}

// this extends the config in @vue/compiler-sfc with <link href>
const assetAttrsConfig = {
  link: ['href'],
  video: ['src', 'poster'],
  source: ['src', 'srcset'],
  img: ['src', 'srcset'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href']
}

function htmlInlineScriptProxyPlugin(config) {
  return {
    name: 'fakeVite:html-inline-script-proxy',

    resolveId(id) {
      if (htmlProxyRE.test(id)) {
        return id
      }
    },

    buildStart() {
      htmlProxyMap.set(config, new Map())
    },

    load(id) {
      const proxyMatch = id.match(htmlProxyRE)
      if (proxyMatch) {
        const index = Number(proxyMatch[1])
        const file = cleanUrl(id)
        const url = file.replace(normalizePath(config.root), '')
        const result = htmlProxyMap.get(config).get(url)[index]
        if (typeof result === 'string') {
          return result
        } else {
          throw new Error(`No matching HTML proxy module found from ${id}`)
        }
      }
    }
  }
}

const isAsyncScriptMap = new WeakMap()

/**
 * Compiles index.html into an entry js module
 */
 function buildHtmlPlugin(config) {
  const [preHooks, postHooks] = resolveHtmlTransforms(config.plugins)
  const processedHtml = new Map()
  const isExcludedUrl = (url) =>
    url.startsWith('#') ||
    isExternalUrl(url) ||
    isDataUrl(url) ||
    checkPublicFile(url, config)

  return {
    name: 'fakeVite:build-html',

    buildStart() {
      isAsyncScriptMap.set(config, new Map())
    },

    async transform(html, id) {
      if (id.endsWith('.html')) {
        const publicPath = `/${slash(path.relative(config.root, id))}`
        // pre-transform
        html = await applyHtmlTransforms(html, preHooks, {
          path: publicPath,
          filename: id
        })

        let js = ''
        const s = new MagicString(html)
        const assetUrls = []
        let inlineModuleIndex = -1

        let everyScriptIsAsync = true
        let someScriptsAreAsync = false
        let someScriptsAreDefer = false

        // 1. 处理script, 有src属性和没有src属性, 生成js继续过后面的plugin
        // 2. 处理asssets包括css, css生成import表达式, 其他的放到assetUrls, 再修改assets的url比如是否使用inline base64/或者__VITE_ASSET__开头的url等
        await traverseHtml(html, id, (node) => {
          if (node.type !== 1 /*NodeTypes.ELEMENT*/) {
            return
          }

          let shouldRemove = false

          // script tags
          if (node.tag === 'script') {
            const { src, isModule, isAsync } = getScriptInfo(node)

            const url = src && src.value && src.value.content
            const isPublicFile = !!(url && checkPublicFile(url, config))
            if (isPublicFile) {
              // referencing public dir url, prefix with base
              s.overwrite(
                src.value.loc.start.offset,
                src.value.loc.end.offset,
                `"${config.base + url.slice(1)}"`
              )
            }

            // 将type=module类型的script抽出来单独成为js脚本，放在后面继续经过plugins
            if (isModule) {
              inlineModuleIndex++
              if (url && !isExcludedUrl(url)) {
                // <script type="module" src="..."/>
                // add it as an import
                js += `\nimport ${JSON.stringify(url)}`
                shouldRemove = true
              } else if (node.children.length) { 
                const contents = node.children
                  .map((child) => child.content || '')
                  .join('')
                // <script type="module">...</script>
                const filePath = id.replace(normalizePath(config.root), '')
                // 如果没有src属性，只有js文本，将内容添加进入htmlProxyMap对象中, 后面html-inline-script-proxy plugin将会处理
                addToHTMLProxyCache(
                  config,
                  filePath,
                  inlineModuleIndex,
                  contents
                )
                js += `\nimport "${id}?html-proxy&index=${inlineModuleIndex}.js"`
                shouldRemove = true
              }

              everyScriptIsAsync &&= isAsync
              someScriptsAreAsync ||= isAsync
              someScriptsAreDefer ||= !isAsync
            } else if (url && !isPublicFile) {
              config.logger.warn(
                `<script src="${url}"> in "${publicPath}" can't be bundled without type="module" attribute`
              )
            }
          }

          // For asset references in index.html, also generate an import
          // statement for each - this will be handled by the asset plugin
          const assetAttrs = assetAttrsConfig[node.tag]
          if (assetAttrs) {
            for (const p of node.props) {
              if (
                p.type === 6 /*NodeTypes.ATTRIBUTE*/ &&
                p.value &&
                assetAttrs.includes(p.name)
              ) {
                const url = p.value.content
                if (!isExcludedUrl(url)) {
                  if (node.tag === 'link' && isCSSRequest(url)) {
                    // CSS references, convert to import
                    js += `\nimport ${JSON.stringify(url)}`
                    shouldRemove = true
                  } else {
                    assetUrls.push(p)
                  }
                } else if (checkPublicFile(url, config)) {
                  s.overwrite(
                    p.value.loc.start.offset,
                    p.value.loc.end.offset,
                    `"${config.base + url.slice(1)}"`
                  )
                }
              }
            }
          }

          if (shouldRemove) {
            // remove the script tag from the html. we are going to inject new
            // ones in the end.
            s.remove(node.loc.start.offset, node.loc.end.offset)
          }
        })

        isAsyncScriptMap.get(config) && isAsyncScriptMap.get(config).set(id, everyScriptIsAsync)

        if (someScriptsAreAsync && someScriptsAreDefer) {
          config.logger.warn(
            `\nMixed async and defer script modules in ${id}, output script will fallback to defer. Every script, including inline ones, need to be marked as async for your output script to be async.`
          )
        }

        // for each encountered asset url, rewrite original html so that it
        // references the post-build location.
        for (const attr of assetUrls) {
          const value = attr.value
          // TODO 不懂， processSrcSet
          // urlToBuiltUrl函数里面的fileToBuiltUrl根据config中的配置生成是否使用base64或者__VITE_ASSET__开头的url等
          try {
            const url =
              attr.name === 'srcset'
                ? await processSrcSet(value.content, ({ url }) =>
                    urlToBuiltUrl(url, id, config, this)
                  )
                : await urlToBuiltUrl(value.content, id, config, this)

            s.overwrite(
              value.loc.start.offset,
              value.loc.end.offset,
              `"${url}"`
            )
          } catch (e) {
            // #1885 preload may be pointing to urls that do not exist
            // locally on disk
            if (e.code !== 'ENOENT') {
              throw e
            }
          }
        }

        processedHtml.set(id, s.toString())

        // inject module preload polyfill only when configured and needed
        if (
          config.build.polyfillModulePreload &&
          (someScriptsAreAsync || someScriptsAreDefer)
        ) {
          js = `import "${modulePreloadPolyfillId}";\n${js}`
        }

        return js
      }
    },

    async generateBundle(options, bundle) {
      const analyzedChunk = new Map()
      const getImportedChunks = (
        chunk,
        seen = new Set()
      ) => {
        const chunks = []
        chunk.imports.forEach((file) => {
          const importee = bundle[file] || {}
          if (importee.type === 'chunk' && !seen.has(file)) {
            seen.add(file)

            // post-order traversal
            chunks.push(...getImportedChunks(importee, seen))
            chunks.push(importee)
          }
        })
        return chunks
      }

      const toScriptTag = (
        chunk,
        isAsync
      ) => ({
        tag: 'script',
        attrs: {
          ...(isAsync ? { async: true } : {}),
          type: 'module',
          crossorigin: true,
          src: toPublicPath(chunk.fileName, config)
        }
      })

      const toPreloadTag = (chunk) => ({
        tag: 'link',
        attrs: {
          rel: 'modulepreload',
          href: toPublicPath(chunk.fileName, config)
        }
      })

      const getCssTagsForChunk = (
        chunk,
        seen = new Set()
      ) => {
        const tags = []
        if (!analyzedChunk.has(chunk)) {
          analyzedChunk.set(chunk, 1)
          chunk.imports.forEach((file) => {
            const importee = bundle[file]
            if (importee?.type === 'chunk') {
              tags.push(...getCssTagsForChunk(importee, seen))
            }
          })
        }

        const cssFiles = chunkToEmittedCssFileMap.get(chunk)
        if (cssFiles) {
          cssFiles.forEach((file) => {
            if (!seen.has(file)) {
              seen.add(file)
              tags.push({
                tag: 'link',
                attrs: {
                  rel: 'stylesheet',
                  href: toPublicPath(file, config)
                }
              })
            }
          })
        }
        return tags
      }

      for (const [id, html] of processedHtml) {
        const isAsync = (isAsyncScriptMap.get(config) || new WeakMap()).get(id)

        // resolve asset url references
        // 替换上面transfor步骤生成的asset url中的__VITE_ASSET__成为类似assets/abc.png
        // TODO 为什么要先写成__VITE_ASSET__，然后再在generateBundle中替换呢？
        let result = html.replace(assetUrlRE, (_, fileHash, postfix = '') => {
          return config.base + getAssetFilename(fileHash, config) + postfix
        })

        // find corresponding entry chunk
        const chunk = Object.values(bundle).find(
          (chunk) =>
            chunk.type === 'chunk' &&
            chunk.isEntry &&
            chunk.facadeModuleId === id
        )

        let canInlineEntry = false

        // inject chunk asset links
        if (chunk) {
          // an entry chunk can be inlined if
          //  - it's an ES module (e.g. not generated by the legacy plugin)
          //  - it contains no meaningful code other than import statements
          if (options.format === 'es' && isEntirelyImport(chunk.code)) {
            canInlineEntry = true
          }

          // when not inlined, inject <script> for entry and modulepreload its dependencies
          // when inlined, discard entry chunk and inject <script> for everything in post-order
          // 获取chunk中的imports作为依赖项，生成script标签，并且将依赖项作为moduleProload导入
          const imports = getImportedChunks(chunk)
          const assetTags = canInlineEntry
            ? imports.map((chunk) => toScriptTag(chunk, isAsync))
            : [toScriptTag(chunk, isAsync), ...imports.map(toPreloadTag)]

          // 处理assets导入
          assetTags.push(...getCssTagsForChunk(chunk))

          result = injectToHead(result, assetTags)
        }

        // inject css link when cssCodeSplit is false
        if (!config.build.cssCodeSplit) {
          const cssChunk = Object.values(bundle).find(
            (chunk) => chunk.type === 'asset' && chunk.name === 'style.css'
          )
          if (cssChunk) {
            result = injectToHead(result, [
              {
                tag: 'link',
                attrs: {
                  rel: 'stylesheet',
                  href: toPublicPath(cssChunk.fileName, config)
                }
              }
            ])
          }
        }

        const shortEmitName = path.posix.relative(config.root, id)
        // NOTICE 这个时候进行html post hooks tranform
        result = await applyHtmlTransforms(result, postHooks, {
          path: '/' + shortEmitName,
          filename: id,
          bundle,
          chunk
        })

        if (chunk && canInlineEntry) {
          // all imports from entry have been inlined to html, prevent rollup from outputting it
          delete bundle[chunk.fileName]
        }

        this.emitFile({
          type: 'asset',
          fileName: shortEmitName,
          source: result
        })
      }
    }
  }
}

module.exports = {
	isHTMLProxy,
	resolveHtmlTransforms,
	applyHtmlTransforms,
  traverseHtml,
  getScriptInfo,
  addToHTMLProxyCache,
  assetAttrsConfig,
  htmlInlineScriptProxyPlugin,
  buildHtmlPlugin
}