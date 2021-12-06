const { extname } = require('path')
const { isDirectCSSRequest } = require('../plugins/css')
const { cleanUrl, normalizePath, removeImportQuery, removeTimestampQuery } = require('../utils')
const { FS_PREFIX } = require('../constant')

class ModuleNode {
  /**
   * Public served url path, starts with /
   */
  url
  /**
   * Resolved file system path + query
   */
  id = null
  file = null
  type // 'js' | 'css'
  info
  meta
  importers = new Set()
  importedModules = new Set()
  acceptedHmrDeps = new Set()
  isSelfAccepting = false
  transformResult = null
  ssrTransformResult = null
  ssrModule = null
  lastHMRTimestamp = 0

  constructor(url) {
    this.url = url
    this.type = isDirectCSSRequest(url) ? 'css' : 'js'
  }
}

function invalidateSSRModule(mod, seen) {
  if (seen.has(mod)) {
    return
  }
  seen.add(mod)
  mod.ssrModule = null
  mod.importers.forEach((importer) => invalidateSSRModule(importer, seen))
}

class ModuleGraph {
  urlToModuleMap = new Map()
  idToModuleMap = new Map()
  // a single file may corresponds to multiple modules with different queries
  fileToModulesMap = new Map()
  safeModulesPath = new Set()
	resolveId

  constructor(
    resolveId
  ) {
		this.resolveId = resolveId
	}

  async getModuleByUrl(rawUrl) {
    const [ url ] = await this.resolveUrl(rawUrl)
    return this.urlToModuleMap.get(url)
  }

  getModuleById(id) {
    return this.idToModuleMap.get(removeTimestampQuery(id))
  }

  getModulesByFile(file) {
    return this.fileToModulesMap.get(file)
  }

  onFileChange(file) {
    const mods = this.getModulesByFile(file)
    if (mods) {
      const seen = new Set()
      mods.forEach((mod) => {
        this.invalidateModule(mod, seen)
      })
    }
  }

  invalidateModule(mod, seen = new Set()) {
    mod.info = undefined
    mod.transformResult = null
    mod.ssrTransformResult = null
    invalidateSSRModule(mod, seen)
  }

  invalidateAll() {
    const seen = new Set()
    this.idToModuleMap.forEach((mod) => {
      this.invalidateModule(mod, seen)
    })
  }

  /**
   * Update the module graph based on a module's updated imports information
   * If there are dependencies that no longer have any importers, they are
   * returned as a Set.
   */
  async updateModuleInfo(
    mod,
    importedModules,
    acceptedModules,
    isSelfAccepting
  ) {
    mod.isSelfAccepting = isSelfAccepting
    const prevImports = mod.importedModules
    const nextImports = (mod.importedModules = new Set())
    let noLongerImported
    // update import graph
    for (const imported of importedModules) {
      const dep =
        typeof imported === 'string'
          ? await this.ensureEntryFromUrl(imported)
          : imported
      dep.importers.add(mod)
      nextImports.add(dep)
    }
    // remove the importer from deps that were imported but no longer are.
    prevImports.forEach((dep) => {
      if (!nextImports.has(dep)) {
        dep.importers.delete(mod)
        if (!dep.importers.size) {
          // dependency no longer imported
          ;(noLongerImported || (noLongerImported = new Set())).add(dep)
        }
      }
    })
    // update accepted hmr deps
    const deps = (mod.acceptedHmrDeps = new Set())
    for (const accepted of acceptedModules) {
      const dep =
        typeof accepted === 'string'
          ? await this.ensureEntryFromUrl(accepted)
          : accepted
      deps.add(dep)
    }
    return noLongerImported
  }

  async ensureEntryFromUrl(rawUrl) {
    const [url, resolvedId, meta] = await this.resolveUrl(rawUrl)
    let mod = this.urlToModuleMap.get(url)
    if (!mod) {
      mod = new ModuleNode(url)
      if (meta) mod.meta = meta
      this.urlToModuleMap.set(url, mod)
      mod.id = resolvedId
      this.idToModuleMap.set(resolvedId, mod)
      const file = (mod.file = cleanUrl(resolvedId))
      let fileMappedModules = this.fileToModulesMap.get(file)
      if (!fileMappedModules) {
        fileMappedModules = new Set()
        this.fileToModulesMap.set(file, fileMappedModules)
      }
      fileMappedModules.add(mod)
    }
    return mod
  }

  // some deps, like a css file referenced via @import, don't have its own
  // url because they are inlined into the main css import. But they still
  // need to be represented in the module graph so that they can trigger
  // hmr in the importing css file.
  createFileOnlyEntry(file) {
    file = normalizePath(file)
    let fileMappedModules = this.fileToModulesMap.get(file)
    if (!fileMappedModules) {
      fileMappedModules = new Set()
      this.fileToModulesMap.set(file, fileMappedModules)
    }

    const url = `${FS_PREFIX}${file}`
    for (const m of fileMappedModules) {
      if (m.url === url || m.id === file) {
        return m
      }
    }

    const mod = new ModuleNode(url)
    mod.file = file
    fileMappedModules.add(mod)
    return mod
  }

  // for incoming urls, it is important to:
  // 1. remove the HMR timestamp query (?t=xxxx)
  // 2. resolve its extension so that urls with or without extension all map to
  // the same module
  async resolveUrl(url) {
    url = removeImportQuery(removeTimestampQuery(url))
    const resolved = await this.resolveId(url)
    const resolvedId = (resolved || {}).id || url
    const ext = extname(cleanUrl(resolvedId))
    const { pathname, search, hash } = require('url').parse(url)
    if (ext && !pathname.endsWith(ext)) {
      url = pathname + ext + (search || '') + (hash || '')
    }
    return [url, resolvedId, (resolved || {}).meta]
  }
}

module.exports = {
	ModuleNode,
	ModuleGraph
}