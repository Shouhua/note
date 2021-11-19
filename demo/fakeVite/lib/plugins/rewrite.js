// const{ init, parse } = require('es-module-lexer')
const { parse } = require('@babel/parser')
const MagicString = require('magic-string')
const { cacheRead, readBody } = require('../utils')
const { HMR_PATH } = require('./client')
const path = require('path')

const debug = require('debug')('fakeVite:rewrite')

function rewrite(source, asSFCScript, resolver, importer) {
  const ast = parse(source, {
    sourceType: 'module'
  }).program.body
  const s = new MagicString(source)
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
        publicPath += publicPath.includes('?') ? '&import' : '?import'
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
    } 
  })
  return s.toString()
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
  rewritePlugin
}
