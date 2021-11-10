import { getContent, setCache } from '../utils/utils'
import { resolve } from 'path'
import { parse } from '@babel/parser'
import MagicString from 'magic-string'

export function rewrite(source, asSFCScript) {
	const ast = parse(source, {
    sourceType: 'module',
  }).program.body

  const s = new MagicString(source)
  ast.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
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

export default function rewriteMiddleware(ctx, next) {
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
