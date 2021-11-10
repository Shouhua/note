import resolve from 'resolve-from'
import { getContent } from '../utils/utils'
import path from 'path'

export default function moduleMiddleware(ctx, next) {
	const debug = require('debug')('fakeVite:module')
	if(ctx.path.startsWith('/@module')) {
		let id = ctx.path.slice(9)
		debug(`module id: ${id}`)
		let modulePath = resolve(ctx.cwd, id)
		debug(`module path: ${modulePath}`)
		if (id === 'vue') {
      modulePath = path.join(
        path.dirname(modulePath),
        'dist/vue.runtime.esm-browser.js'
      )
    }
		ctx.body = getContent(modulePath)
		ctx.response.type = 'application/javascript'
	}
	return next()
}