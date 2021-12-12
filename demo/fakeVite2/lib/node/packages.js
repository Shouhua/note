const fs = require('fs')
const path = require('path')
const createFilter = require('@rollup/pluginutils')
const { createDebugger, resolveFrom } = require('./utils')

const isDebug = process.env.DEBUG
const debug = createDebugger('fakeVite:resolve-details', {
	onlyWhenFocused: true
})

function invalidatePackageData(packageCache, pkgPath) {
	packageCache.delete(pkgPath)
	const pkgDir = path.dirname(pkgPath)
	packageCache.forEach((pkg, cacheKey) => {
		if(pkg.dir === pkgDir) {
			packageCache.delete(cacheKey)
		}
	})
}

function resolvePackageData(id, basedir, preserveSymlinks=false, packageCache) {
	let pkg, cacheKey
	if(packageCache) {
		cacheKey = `${id}&${basedir}&${preserveSymlinks}`
		if((pkg = packageCache.get(cacheKey))) {
			return pkg
		}
	}
	let pkgPath
	try {
		pkgPath = resolveFrom(id, basedir, preserveSymlinks)
		pkg = loadPackageData(pkgPath, true, packageCache)
		if(packageCache) {
			packageCache.set(cacheKey, pkg)
		}
		return pkg
	} catch(e) {
		if(e instanceof SyntaxError) {
			isDebug && debug(`Parsing failed: ${pkgPath}`)
		} else if (e.code !== 'MODULE_NOT_FOUND') {
			throw e
		}
	}
	return null
}

function loadPackageData(pkgPath, preserveSymlinks, packageCache) {
	if(!preserveSymlinks) {
		pkgPath = fs.realpathSync.native(pkgPath)
	}
	let cached
	if((cached = packageCache.get(pkgPath))) {
		return cache
	}
	const data = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
	const pkgDir = path.dirname(pkgPath)
	let hasSideEffect
	if(typeof sideEffect === 'boolean') {
		hasSideEffect = () => sideEffect
	} else if(Array.isArray(sideEffect)) {
		hasSideEffect = createFilter(sideEffect, null, {resolve: pkgDir})
	} else {
		hasSideEffect = () => true
	}

	const pkg = {
		dir: pkgDir,
		data,
		hasSideEffect,
		webResolvedImports: {},
		nodeResolvedImports: {},
		setResolvedCache(key, entry, targetWeb) {
			if(targetWeb) {
				pkg.webResolvedImports[key] = entry
			} else {
				pkg.nodeResolvedImports[key] = entry
			}
		},
		getResolvedCache(key, targetWeb) {
			if(targetWeb) {
				return pkg.webResolvedImports[key]
			} else {
				return pkg.nodeResolvedImports[key]
			}
		}
	}
	packageCache.set(pkgPath, pkg)
	return pkg
}

function watchPackageDataPlugin(config) {
	const watchQueue = new Set()
	let watchFile = (id) => {
		watchQueue.add(id)
	}
	const { packageCache } = config
	const setPackageData = packageCache.set.bind(packageCache)
	packageCache.set = (id, pkg) => {
		if(id.endsWith('.json')) {
			watchFile(id)
		}
		return setPackageData(id, pkg)
	}

	return {
		name: 'fakeVite:watch-package-data',
		buildStart() {
			watchFile = this.addWatchFile
			watchQueue.forEach(watchFile)
			watchFile.clear()
		},
		buildEnd() {
			watchFile = (id) => watchQueue.add(id)
		},
		watchChange(id) {
			if(id.endsWith('/package.json')) {
				invalidatePackageData(packageCache, id)
			}
		}
	}
}

module.exports = {
	invalidatePackageData,
	watchPackageDataPlugin,
	loadPackageData,
	resolvePackageData
}

module.exports = {
	invalidatePackageData
}