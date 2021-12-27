const fs = require('fs')
const path = require('path')
const { createFilter } = require('@rollup/pluginutils')
const { createDebugger, resolveFrom } = require('./utils')

const isDebug = process.env.DEBUG
const debug = createDebugger('vite:resolve-details', {
  onlyWhenFocused: true
})

function invalidatePackageData(packageCache, pkgPath) {
  packageCache.delete(pkgPath)
  const pkgDir = path.dirname(pkgPath)
  packageCache.forEach((pkg, cacheKey) => {
    if (pkg.dir === pkgDir) {
      packageCache.delete(cacheKey)
    }
  })
}

function resolvePackageData(id, basedir, preserveSymlinks = false, packageCache) {
  let pkg
  let cacheKey
  if (packageCache) {
    cacheKey = `${id}&${basedir}&${preserveSymlinks}`
    if ((pkg = packageCache.get(cacheKey))) {
      return pkg
    }
  }
  let pkgPath
  try {
    pkgPath = resolveFrom(`${id}/package.json`, basedir, preserveSymlinks)
    pkg = loadPackageData(pkgPath, true, packageCache)
    if (packageCache) {
      packageCache.set(cacheKey, pkg)
    }
    return pkg
  } catch (e) {
    if (e instanceof SyntaxError) {
      isDebug && debug(`Parsing failed: ${pkgPath}`)
    }
    // Ignore error for missing package.json
    else if (e.code !== 'MODULE_NOT_FOUND') {
      throw e
    }
  }
  return null
}

function loadPackageData(pkgPath, preserveSymlinks, packageCache) {
  if (!preserveSymlinks) {
    pkgPath = fs.realpathSync.native(pkgPath)
  }

  let cached
  if (packageCache && (cached = packageCache.get(pkgPath))) {
    return cached
  }

  const data = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const pkgDir = path.dirname(pkgPath)
  const { sideEffects } = data
  let hasSideEffects
  if (typeof sideEffects === 'boolean') {
    hasSideEffects = () => sideEffects
  } else if (Array.isArray(sideEffects)) {
    hasSideEffects = createFilter(sideEffects, null, { resolve: pkgDir })
  } else {
    hasSideEffects = () => true
  }

  const pkg = {
    dir: pkgDir,
    data,
    hasSideEffects,
    webResolvedImports: {},
    nodeResolvedImports: {},
    setResolvedCache(key, entry, targetWeb) {
      if (targetWeb) {
        pkg.webResolvedImports[key] = entry
      } else {
        pkg.nodeResolvedImports[key] = entry
      }
    },
    getResolvedCache(key, targetWeb) {
      if (targetWeb) {
        return pkg.webResolvedImports[key]
      } else {
        return pkg.nodeResolvedImports[key]
      }
    }
  }

  packageCache && packageCache.set(pkgPath, pkg)
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
    if (id.endsWith('.json')) {
      watchFile(id)
    }
    return setPackageData(id, pkg)
  }

  return {
    name: 'vite:watch-package-data',
    buildStart() {
      watchFile = this.addWatchFile
      watchQueue.forEach(watchFile)
      watchQueue.clear()
    },
    buildEnd() {
      watchFile = (id) => watchQueue.add(id)
    },
    watchChange(id) {
      if (id.endsWith('/package.json')) {
        invalidatePackageData(packageCache, id)
      }
    }
  }
}

module.exports = {
  resolvePackageData,
	invalidatePackageData,
	loadPackageData,
	watchPackageDataPlugin
}
