const { ensureWatchedFile, isObject, timeFrom, cleanUrl, prettifyUrl, createDebugger, removeTimestampQuery } = require('../utils')
const { isFileServingAllowed } = require('./middleware/static')
const { promises: fs } = require('fs')
const convertSourceMap = require('convert-source-map')
const { checkPublicFile } = require('../plugins/asset')
const chalk = require('chalk')
const { injectSourcesContent } = require('./sourcemap')
const getEtag = require('etag')
const path = require('path')

const debugLoad = createDebugger('fakeVite:load')
const debugTransform = createDebugger('fakeVite:transform')
const debugCache = createDebugger('fakeVite:cache')
const isDebug = !!process.env.DEBUG

function transformRequest(url, server, options) {
	const cacheKey = (options.ssr ? 'ssr:' : options.html ? 'html:' : '') + url	
	let request = server._pendingRequests.get(cacheKey)
	console.log(chalk.red(`transformRequest cache key: ${cacheKey}, ${request}`));
	if(request) {
		console.log(chalk.red(`server._pendingRequests.get(${cacheKey}) is not null`));
	}
	if(!request) {
		request = doTransform(url, server, options)
		server._pendingRequests.set(cacheKey, request)
		const done = () => server._pendingRequests.delete(cacheKey)
		request.then(done, done)
	}
	return request
}

async function doTransform(url, server, options) {
	url = removeTimestampQuery(url)	
  const { config, pluginContainer, moduleGraph, watcher } = server
  const { root, logger } = config
  const prettyUrl = isDebug ? prettifyUrl(url, root) : ''
  const ssr = !!options.ssr

  const module = await server.moduleGraph.getModuleByUrl(url)
	  // check if we have a fresh cache
	const cached = module && (ssr ? module.ssrTransformResult : module.transformResult)
	console.log(chalk.red(`cached: ${cached}`));
  if (cached) {
    // TODO: check if the module is "partially invalidated" - i.e. an import
    // down the chain has been fully invalidated, but this current module's
    // content has not changed.
    // in this case, we can reuse its previous cached result and only update
    // its import timestamps.

    isDebug && debugCache(`[memory] ${prettyUrl}`)
    return cached
  }

	console.log(`transformRequest->doTransform [before resolveId]: ${url}`);
  // resolve
	const resolveResult = await pluginContainer.resolveId(url)
  const id = (resolveResult && resolveResult.id) || url
  const file = cleanUrl(id)

  let code
  let map
	// load
	const loadStart = isDebug ? performance.now() : 0
	console.log(`transformRequest->doTransform [before load]: ${id}`);
	const loadResult = await pluginContainer.load(id, { ssr })
	if (loadResult == null) {
		// if this is an html request and there is no load result, skip ahead to
		// SPA fallback.
		if (options.html && !id.endsWith('.html')) {
			return null
		}
		// try fallback loading it from fs as string
		// if the file is a binary, there should be a plugin that already loaded it
		// as string
		// only try the fallback if access is allowed, skip for out of root url
		// like /service-worker.js or /api/users
		if (options.ssr || isFileServingAllowed(file, server)) {
			try {
				code = await fs.readFile(file, 'utf-8')
				isDebug && debugLoad(`${timeFrom(loadStart)} [fs] ${prettyUrl}`)
			} catch (e) {
				if (e.code !== 'ENOENT') {
					throw e
				}
			}
		}
		if (code) {
			try {
				const mapObject = convertSourceMap.fromSource(code) || convertSourceMap.fromMapFileSource(code, path.dirname(file));
				if(mapObject) {
					map = mapObject.toObject()
				}
			} catch (e) {
				logger.warn(`Failed to load source map for ${url}.`, {
					timestamp: true
				})
			}
		}
	} else {
		isDebug && debugLoad(`${timeFrom(loadStart)} [plugin] ${prettyUrl}`)
		if (isObject(loadResult)) {
			code = loadResult.code
			map = loadResult.map
		} else {
			code = loadResult
		}
	}
	if (code == null) {
		if (checkPublicFile(url, config)) {
			throw new Error(
				`Failed to load url ${url} (resolved id: ${id}). ` +
					`This file is in /public and will be copied as-is during build without ` +
					`going through the plugin transforms, and therefore should not be ` +
					`imported from source code. It can only be referenced via HTML tags.`
			)
		} else {
			return null
		}
	}

	// ensure module in graph after successful load
	const mod = await moduleGraph.ensureEntryFromUrl(url)
	ensureWatchedFile(watcher, mod.file, root)
	// transform
	const transformStart = isDebug ? performance.now() : 0
	console.log(`transformRequest->doTransform [before transform]: ${id}`);	
	const transformResult = await pluginContainer.transform(code, id, {
		inMap: map,
		ssr
	})
	if (
		transformResult == null ||
		(isObject(transformResult) && transformResult.code == null)
	) {
		// no transform applied, keep code as-is
		isDebug &&
			debugTransform(
				timeFrom(transformStart) + chalk.dim(` [skipped] ${prettyUrl}`)
			)
	} else {
		isDebug && debugTransform(`${timeFrom(transformStart)} ${prettyUrl}`)
		code = transformResult.code
		map = transformResult.map
	}

	if (map && mod.file) {
		map = typeof map === 'string' ? JSON.parse(map) : map
		if (map.mappings && !map.sourcesContent) {
			await injectSourcesContent(map, mod.file, logger)
		}
	}

	if (ssr) {
		return null
		// TODO
		// return (mod.ssrTransformResult = await ssrTransform(
		// 	code,
		// 	map as SourceMap,
		// 	url
		// ))
	} else {
		return (mod.transformResult = {
			code,
			map,
			etag: getEtag(code, { weak: true })
		})
	}
}

module.exports = {
	transformRequest
}