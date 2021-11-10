import resolve from 'resolve-from'
import { getContent, setCache } from '../utils/utils'
import path from 'path'

export default function moduleMiddleware(ctx, next) {
	const debug = require('debug')('fakeVite:module')
	if(ctx.path.startsWith('/@module')) {
		let id = ctx.path.slice(9)
		let modulePath = resolve(ctx.cwd, `${id}/package.json`)
		if (id === 'vue') {
      modulePath = path.join(
        path.dirname(modulePath),
        'dist/vue.runtime.esm-browser.js'
      )
    } else {
			// module resolved, try to locate its "module" entry
			const pkg = require(modulePath)
			debug(`module pkg: ${pkg}`)
			modulePath = path.join(path.dirname(modulePath), pkg.module || pkg.main)
		}
		ctx.body = getContent(modulePath)
		ctx.response.type = 'application/javascript'
	}
	return next()
}