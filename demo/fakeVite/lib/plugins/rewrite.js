// const{ init, parse } = require('es-module-lexer')
const { parse } = require('@babel/parser')
const MagicString = require('magic-string')
const { cacheRead, readBody } = require('../utils')
const { HMR_PATH } = require('./client')
const path = require('path')

const debug = require('debug')('fakeVite:rewrite')

// while we lex the files for imports we also build a import graph
// so that we can determine what files to hot reload
const hmrAcceptanceMap = new Map()
const hmrDeclineSet = new Set()
const importerMap = new Map()
const importeeMap = new Map()

function ensureMapEntry(map, key) {
  let entry = map.get(key)
  if (!entry) {
    entry = new Set()
    map.set(key, entry)
  }
  return entry
}

function rewrite(source, asSFCScript, resolver, importer) {
  const ast = parse(source, {
    sourceType: 'module'
  }).program.body
  const s = new MagicString(source)
  const hasHMR = source.includes('import.meta.hot')
  ast.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
      // if (/^[^\.\/]/.test(node.source.value)) {
      if (/^[a-z0-9A-Z]/.test(node.source.value)) {
        s.overwrite( node.source.start, node.source.end, `"/@module/${node.source.value}"`
        )
      } else {
        let publicPath
        if(/^\./.test(node.source.value)) { // start ./ or ../
          publicPath = path.resolve(path.dirname(importer), `${node.source.value}`)
        } else { // handle alias @
          publicPath = resolver.normalizePublicPath(node.source.value)
        }
        publicPath += publicPath.includes('?') ? '&import' : '?import' // import表示是自己写的文件，不是node_modules依赖
        debug(publicPath)
        s.overwrite(node.source.start, node.source.end, `"${publicPath}"`)
      }
    } else if (asSFCScript && node.type === 'ExportDefaultDeclaration') {
      s.overwrite(
        node.start,
        node.declaration.start,
        `let __script; export default (__script = `
      )
      s.appendRight(node.end, `)`)
    } else if(node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
      collectDeps(node, importer, s)
    } else if(node.type === 'IfStatement' && node.consequent.type === 'BlockStatement' && node.consequent.body[0].type === 'ExpressionStatement') {
      collectDeps(node.consequent.body[0], importer, s)
    }
  })
  if(hasHMR) {
    s.prepend(`
import { createHotContext } from '${HMR_PATH}'
import.meta.hot = createHotContext(${JSON.stringify(importer)})
    `)
  }
  return s.toString()
}

function collectDeps(node, importer, s) {
  const registerDep = (e) => {
    // hmrAcceptanceMap:  importer->deps // importer依赖哪些deps
    // importerMap: dep -> importers 这个dep被那些importers依赖
    const deps = ensureMapEntry(hmrAcceptanceMap, importer)
    // TODO rewrite importee public path name
    const depPublicPath = path.resolve(path.dirname(importer), e.value)
    deps.add(depPublicPath)
    ensureMapEntry(importerMap, depPublicPath).add(importer)
    s.overwrite(e.start, e.end, JSON.stringify(depPublicPath))
  }
  if(node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression' &&
  node.expression.callee.type === 'MemberExpression' && isMetaHot(node.expression.callee.object)) {
    const method = node.expression.callee.property.type === 'Identifier' && node.expression.callee.property.name // only accpet
    const accepted = node.expression.arguments[0]
    if(accepted && accepted.type === 'StringLiteral') {
      registerDep(accepted)
    } 
    if(accepted && accepted.type === 'ArrayExpression') {
      accepted.elements.forEach(e => {
        registerDep(e)
      })
    }
  }
}

function isMetaHot(node) {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'MetaProperty' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'hot'
  )
}

function rewritePlugin({ app, root, resolver }) {
  app.use(async (ctx, next) => {
    await next()
    // if(ctx.path.endsWith('.js') ||
    //   (ctx.path.endsWith('.vue') && ctx.query.type && ctx.query.type !== 'style')
    // ) {
      if(
        ctx.body && 
        ctx.response.is('js') &&
        ctx.path !== HMR_PATH &&
        !ctx.path.endsWith('.map') &&
        !ctx.path.endsWith('.css') &&
        !(ctx.query.vue && ctx.query.type === 'style') &&
        !ctx.path.startsWith('/@module') &&
        !ctx.path.endsWith('.json')
      ) {
      const filePath = resolver.requestToFile(ctx.path, root)
      let content
      if(ctx.query.vue != null) {
        content = await readBody(ctx.body)
      } else {
        content = await cacheRead(ctx, filePath)
      }
      ctx.body = rewrite(content, false, resolver, ctx.path)
    } else {
      debug(`(skip) ${ctx.url}`)
    }
  })
}

module.exports = {
  rewrite,
  rewritePlugin,
  hmrAcceptanceMap,
  hmrDeclineSet,
  importerMap,
  importeeMap
}
