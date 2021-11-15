const{ parse } = require('@babel/parser')
const MagicString = require('magic-string')
const { requestToFile } = require('../resolver')
const { cacheRead } = require('../utils/utils')

const debug = require('debug')('fakeVite:rewrite')

function rewrite(source, asSFCScript) {
	const ast = parse(source, {
    sourceType: 'module',
  }).program.body

  const s = new MagicString(source)
  ast.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
      debug(`rewrite debug: ${node.source.value}`)
      if (/^[^\.\/]/.test(node.source.value)) {
        s.overwrite( node.source.start, node.source.end, `"/@module/${node.source.value}"`
        )
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
    if(ctx.path.endsWith('.js')) {
      const filePath = requestToFile(ctx.path, root)
      let content = await cacheRead(ctx, filePath)
      ctx.body = rewrite(content)
      return 
    }
    return next()
  })
}

module.exports = {
  rewrite,
  rewritePlugin
}
