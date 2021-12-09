const path = require('path')
const { injectQuery, createDebugger, prettifyUrl, unwrapId, normalizePath, removeTimestampQuery, cleanUrl, isCSSRequest, isImportRequest, isJSRequest, removeImportQuery } = require('../../utils')
const { CLIENT_PUBLIC_PATH, NULL_BYTE_PLACEHOLDER, DEP_VERSION_RE } = require('../../constant')
const { send } = require('../send')
const chalk = require('chalk')
const { isHTMLProxy } = require('../../plugins/html')
const { isDirectRequest, isDirectCSSRequest } = require('../../plugins/css')
const { transformRequest } = require('../transformRequest')

const knownIgnoreList = new Set(['/', '/favicon.ico'])
const NEW_DEPENDENCY_BUILD_TIMEOUT = 1000
const debugCache = createDebugger('vite:cache')
const isDebug = !!process.env.DEBUG

function transformMiddleware(server) {
	const { config: { root, logger, cacheDir }, moduleGraph } = server
	let cacheDirPrefix
	if(cacheDir) {
		const cacheDirRelative = normalizePath(path.relative(root, cacheDir))
		if(cacheDirRelative.startsWith('../')) {
			cacheDirPrefix = `/@fs/${normalizePath(cacheDir).replace(/^\//, '')}`
		} else {
			cacheDirPrefix = `/${cacheDirRelative}`
		}
	}
	return async function fakeViteTransformMiddleware(req, res, next) {
		if(req.method !== 'GET' || knownIgnoreList.has(req.url)) {
			return next()
		}
		if(
			server._pendingReload &&
			!req.url.startsWith(CLIENT_PUBLIC_PATH) &&
			!req.url.includes('fakeVite/client')
		) {
			server._pendingReload.then(() => {
				setTimeout(() => {
					if(res.writableEnded) return
					res.statusCode = 408
					res.end(`<h1>[vite] Something unexpected happened while optimizing "${req.url}"<h1>` +
					`<p>The current page should have reloaded by now</p>`)
				}, NEW_DEPENDENCY_BUILD_TIMEOUT)
			})
			return
		}
		let url = decodeURI(removeTimestampQuery(req.url)).replace(
			NULL_BYTE_PLACEHOLDER,
			'\0'
		)
		const withoutQuery = cleanUrl(url)
		try {
			const isSourceMap = withoutQuery.endsWith('.map')
			if(isSourceMap) {
				let map
				const originalUrl = url.replace(/\.map($|\?)/, '$1')
				const transformResult = await moduleGraph.getModuleByUrl(originalUrl)
				if(transformResult) {
					map = transformResult.map
				}
				if(map) {
					return send(req, res, JSON.stringify(map), 'json')
				} else {
					return next()
				}
			}
			// check if public dir is inside root dir
			const publicDir = normalizePath(server.config.publicDir)
			const rootDir = normalizePath(server.config.root)
			if (publicDir.startsWith(rootDir)) {
				const publicPath = `${publicDir.slice(rootDir.length)}/`
				// warn explicit public paths
				if (url.startsWith(publicPath)) {
					logger.warn(
						chalk.yellow(
							`files in the public directory are served at the root path.\n` +
								`Instead of ${chalk.cyan(url)}, use ${chalk.cyan(
									url.replace(publicPath, '/')
								)}.`
						)
					)
				}
			}

			if (
				isJSRequest(url) ||
				isImportRequest(url) ||
				isCSSRequest(url) ||
				isHTMLProxy(url)
			) {
				// strip ?import
				url = removeImportQuery(url)
				// Strip valid id prefix. This is prepended to resolved Ids that are
				// not valid browser import specifiers by the importAnalysis plugin.
				url = unwrapId(url)

				// for CSS, we need to differentiate between normal CSS requests and
				// imports
				if (
					isCSSRequest(url) &&
					!isDirectRequest(url) &&
					req.headers.accept?.includes('text/css')
				) {
					url = injectQuery(url, 'direct')
				}

				// check if we can return 304 early
				const ifNoneMatch = req.headers['if-none-match']
				const transformResult = await moduleGraph.getModuleByUrl(url)
				let etag
				if(transformResult) {
					etag = transformResult.etag
				}
				if (
					ifNoneMatch &&
					etag === ifNoneMatch
				) {
					isDebug && debugCache(`[304] ${prettifyUrl(url, root)}`)
					res.statusCode = 304
					return res.end()
				}

				// resolve, load and transform using the plugin container
				const result = await transformRequest(url, server, {
					html: req.headers.accept?.includes('text/html')
				})
				if (result) {
					const type = isDirectCSSRequest(url) ? 'css' : 'js'
					const isDep =
						DEP_VERSION_RE.test(url) ||
						(cacheDirPrefix && url.startsWith(cacheDirPrefix))
					return send(
						req,
						res,
						result.code,
						type,
						result.etag,
						// allow browser to cache npm deps!
						isDep ? 'max-age=31536000,immutable' : 'no-cache',
						result.map
					)
				}
			}
		} catch (e) {
			return next(e)
		}
		next()
	}
}

module.exports = {
	transformMiddleware
}