// const{ init, parse } = require('es-module-lexer')
const { parse } = require('@babel/parser')
const MagicString = require('magic-string')
const { requestToFile } = require('../resolver')
const { cacheRead, readBody } = require('../utils')
const { HMR_PATH } = require('./hmr')

const debug = require('debug')('fakeVite:rewrite')

function rewrite(source, asSFCScript) {
  const ast = parse(source, {
    sourceType: 'module'
  }).program.body
  const s = new MagicString(source)
  ast.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
      if (/^[^\.\/]/.test(node.source.value)) {
        s.overwrite( node.source.start, node.source.end, `"/@module/${node.source.value}"`
        )
      } else {
        if(/^\./.test(node.source.value)) {
          s.overwrite(node.source.start, node.source.end, `"${node.source.value}?import"`)
        }
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

function rewritePlugin({ app, root }) {
  app.use(async (ctx, next) => {
    await next()
    debug(`after: ${ctx.url}`)
    if(ctx.path.endsWith('.js') ||
      (ctx.path.endsWith('.vue') && ctx.query.type && ctx.query.type !== 'style')
    ) {
      const filePath = requestToFile(ctx.path, root)
      let content
      if(ctx.query.vue != null) {
        content = await readBody(ctx.body)
      } else {
        content = await cacheRead(ctx, filePath)
      }
      ctx.body = rewrite(content)
    } else {
      debug(`(skip) ${ctx.url}`)
    }
  })
}

module.exports = {
  rewrite,
  rewritePlugin
}
