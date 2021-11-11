const resolve = require('resolve-from')
const { getContent, setCache } = require('../utils/utils')
const path = require('path')

const idToFileMap = new Map()
const idToEntry = new Map()

module.exports = function moduleMiddleware(ctx, next) {
	const debug = require('debug')('fakeVite:module')
	if(ctx.path.startsWith('/@module')) {
		let id = ctx.path.slice(9)
		if (id === 'vue') {
			let vuePath
			if(idToFileMap.has(id)) {
				vuePath = idToFileMap.get(id)
			} else {
				let modulePath = resolve(ctx.cwd, `${id}/package.json`)
				vuePath = path.join(
					path.dirname(modulePath),
					'dist/vue.runtime.esm-browser.js'
				)
			}
			ctx.body = getContent(vuePath)
			ctx.response.type = 'application/javascript'
			return next()
    }

		if(idToEntry.has(id)) {
			return ctx.redirect(idToEntry.get(id))
		}

		if(idToFileMap.has(id)) {
			return getContent(idToFileMap.get(id))
		}

		let deepIndex = id.indexOf('/')
		let moduleName = id
		if(deepIndex > -1) {
			moduleName = id.slice(0, deepIndex)
		}
		let pkgPath = resolve(ctx.cwd, `${moduleName}/package.json`)
		if(pkgPath) {
			// TODO rollp bundle module
			pkg = require(pkgPath)
			const moduleRelativePath = deepIndex > -1 
				? id.slice(deepIndex + 1) 
				: pkg.module || pkg.main || 'index.js'
			const modulePath = path.join(path.dirname(pkgPath), moduleRelativePath)
			if(deepIndex > -1) {
				idToFileMap.set(id, modulePath)
				ctx.body = getContent(modulePath)
				ctx.response.type = 'application/javascript'
				return 
			} else {
				idToEntry.set(id, path.join(ctx.path, moduleRelativePath))
				return ctx.redirect(path.join(ctx.path, moduleRelativePath))
			}
		}
	}
	return next()
}