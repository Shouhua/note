const path = require('path')
const fs = require('fs-extra')

const debug = require('debug')('fakeVite:resolver')

const supportedExts = ['.mjs', '.js', '.vue', '.ts', '.jsx', '.tsx', '.json']
const mainFields = ['module', 'jsnext', 'jsnext:main', 'browser', 'main']

const queryRE = /\?.*$/
const hashRE = /#.*$/

const cleanUrl = (url) =>
  url.replace(hashRE, '').replace(queryRE, '')

const isFile = (file) => {
	try {
		return fs.statSync(file).isFile()
	} catch {
		return false
	}
}

const requestToFileCache = new Map()
const fileToRequestCache = new Map()

function resolveFilePathPostfix(filePath) {
	const cleanPath = cleanUrl(filePath)
	if(!isFile(cleanPath)) {
		let postfix = ''
		for(let ext of supportedExts) {
			if(isFile(cleanPath + ext)) {
				postfix = ext
				break
			}
			const defaultFilePath = `/index${ext}`
			if(isFile(path.join(cleanPath, defaultFilePath))) {
				postfix = defaultFilePath
				break
			}
		}
		debug(`(postfix) ${filePath} ${postfix}`)
		const queryMatch = filePath.match(/\?.*$/)
		const query = queryMatch ? queryMatch[0] : ''
		const resolved = cleanPath + postfix + query
		if(filePath !== resolved) {
			debug(`(postfix) ${filePath} -> ${resolved}`)
			return postfix
		}
	}
}

function createResolver(root, reoslveOptions) {
	const alias = reoslveOptions && reoslveOptions.alias
	const requestToFile = function(request) {
		request = decodeURIComponent(request)
		// TODO reslove alias
		if(requestToFileCache.has(request)) {
			return requestToFileCache.get(request)
		}
		// TODO handle @module
		// from cache; from optimized dir; from node_modules
		let resolved = path.join(root, request)
		const postfix = resolveFilePathPostfix(resolved)
		if(postfix) {
			if(postfix.startsWith('/')) {
				resolved += path.join(resolved, postfix)
			} else {
				resolved += postfix
			}
		}
		requestToFileCache.set(request, resolved)
		return resolved
	}
	const fileToRequest = function(filePath) {
		return '/' + path.relative(root, filePath)
	}
	
	const normalizePublicPath = function(publicPath) {
		if(!/^[\.\/a-zA-Z0-9]/.test(publicPath)) {
			let pathAlias = publicPath.split('/')[0]
			if(alias && alias[pathAlias]) {
				let absolutPath = alias[pathAlias] + publicPath.slice(pathAlias.length)
				publicPath = fileToRequest(absolutPath)
				debug(publicPath)
			}
		}
		return publicPath
	}
	return {
		fileToRequest,
		requestToFile,
		normalizePublicPath
	}
}


module.exports = {
	createResolver
}