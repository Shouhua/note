const { getContent, setCache } = require('../utils/utils')
const { resolve } = require('path')
const { parse } = require('@babel/parser')
const MagicString = require('magic-string')

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

function rewriteMiddleware(ctx, next) {
	const debug = require('debug')('fakeVite:rewrite')
	debug(`rewrite: ${ctx.path}`)
	if(ctx.path.endsWith('.js')) {
		const file = resolve(ctx.cwd, ctx.path.slice(1))
		debug(`file path: ${file}`)
		ctx.body = setCache(file, rewrite(getContent(file)))
		ctx.response.type = 'application/javascript'
	}
	return next()
}

module.exports = {
  rewrite,
  rewriteMiddleware
}
