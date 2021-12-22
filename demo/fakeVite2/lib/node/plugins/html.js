const { isExternalUrl, generateCodeFrame } = require('../utils')
const htmlProxyRE = /\?html-proxy&index=(\d+)\.js$/
const isHTMLProxy = (id) => htmlProxyRE.test(id)
const { parse, transform } = require('@vue/compiler-dom')

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

const htmlProxyMap = new Map()

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
    name: 'vite:html-inline-script-proxy',

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

module.exports = {
	isHTMLProxy,
	resolveHtmlTransforms,
	applyHtmlTransforms,
  traverseHtml,
  getScriptInfo,
  addToHTMLProxyCache,
  assetAttrsConfig,
  htmlInlineScriptProxyPlugin
}