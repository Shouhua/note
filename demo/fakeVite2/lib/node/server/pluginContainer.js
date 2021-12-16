const { 
	createDebugger,
	ensureWatchedFile,
	normalizePath,
	numberToPos,
	generateCodeFrame,
	combineSourcemaps,
	timeFrom,
	prettifyUrl,
	isExternalUrl,
  isObject
} = require('../utils')
const { FS_PREFIX } = require('../constants')
const path = require('path')
const fs = require('fs')
const acorn = require('acorn')
const chalk = require('chalk')

async function createPluginContainer(
	{ plugins, logger, root, build: { rollupOptions } },
	moduleGraph,
	watcher
) {
	const isDebug = process.env.DEBUG
	const seenResolves = {}
	const debugResolve = createDebugger('fakeVite:resolve')
	const debugPluginResolve = createDebugger('fakeVite:plugin-resolve', {
    onlyWhenFocused: 'fakeVite:plugin'
  })
  const debugPluginTransform = createDebugger('fakeVite:plugin-transform', {
    onlyWhenFocused: 'fakeVite:plugin'
  })

	const watchFiles = new Set()
	const rollupPkgPath = path.resolve(require.resolve('rollup'), '../../package.json')
	const minimalContext = {
		meta: {
			rollupVersion: JSON.parse(fs.readFileSync(rollupPkgPath, 'utf-8'))
				.version,
			watchMode: true	
		}
	}
	function warnIncompatibleMethod(method, plugin) {
    logger.warn(
      chalk.cyan(`[plugin:${plugin}] `) +
        chalk.yellow(
          `context method ${chalk.bold(
            `${method}()`
          )} is not supported in serve mode. This plugin is likely not vite-compatible.`
        )
    )
  }
  const ModuleInfoProxy = {
    get(info, key) {
      if (key in info) {
        return info[key]
      }
      throw Error(
        `[vite] The "${key}" property of ModuleInfo is not supported.`
      )
    }
  }
	const EMPTY_OBJECT = Object.freeze({})
	function getModuleInfo(id) {
		const module = moduleGraph.getModuleById(id)
		if(!module) {
			return null
		}
		if(!module.info) {
			module.info = new Proxy({id, meta: module.meta || EMPTY_OBJECT}, ModuleInfoProxy)
		}
		return module.info
	}
	function updateModuleInfo(id, { meta }) {
		if(meta) {
			const moduleInfo = getModuleInfo(id)
			if(moduleInfo) {
				moduleInfo.meta = { ...moduleInfo.meta, ...meta }
			}
		}
	}

	class Context {
		meta = minimalContext.meta
		ssr = false
		_activePlugin = null
		_activeId = null
		_activeCode = null
		_resolveSkips = null
		_addedImports = null
		constructor(initialPlugin) {
			this._activePlugin = initialPlugin || null
		}
		parse(code, options = {}) {
			return acorn.parse(code, {
				sourceType: 'module',
				ecmaVersion: 'latest',
				locations: true,
				...options
			})
		}
		async resolve(id, importer, options={}) {
			let skip
			if(options.skipSelf && this._activePlugin) {
				skip = new Set(this._resolveSkips)
				skip.add(this._activePlugin)
			}
			let out = await container.resolveId(id, importer, { skip, ssr: this.ssr })
			if(typeof out === 'string') out = { id: out }
			return out || null
		}
		getModuleInfo(id) {
			return getModuleInfo(id)
		}
		getModuleIds() {
			return moduleGraph
				? moduleGraph.idToModuleMap.keys()
				: Array.prototype[Symbol.iterator]
		}
		addWatchFile(id) {
			watchFiles.add(id)
			;(this._addedImports || (this._addedImports = new Set()).add(id))
			if(watcher) ensureWatchedFile(watcher, id, root)
		}
		getWatchFiles() {
			return [...watchFiles]
		}
		emitFile(assetOrFile) {
      warnIncompatibleMethod(`emitFile`, this._activePlugin.name)
      return ''
    }

    setAssetSource() {
      warnIncompatibleMethod(`setAssetSource`, this._activePlugin.name)
    }

    getFileName() {
      warnIncompatibleMethod(`getFileName`, this._activePlugin.name)
      return ''
    }

    warn(
      e,
      position
    ) {
      const err = formatError(e, position, this)
      const msg = buildErrorMessage(
        err,
        [chalk.yellow(`warning: ${err.message}`)],
        false
      )
      logger.warn(msg, {
        clear: true,
        timestamp: true
      })
    }

    error(
      e,
      position
    ) {
      // error thrown here is caught by the transform middleware and passed on
      // the the error middleware.
      throw formatError(e, position, this)
    }
	}
	function formatError(
    e,
    position,
    ctx
  ) {
    const err = typeof e === 'string' ? new Error(e) : e
    if (ctx._activePlugin) err.plugin = ctx._activePlugin.name
    if (ctx._activeId && !err.id) err.id = ctx._activeId
    if (ctx._activeCode) {
      err.pluginCode = ctx._activeCode
      const pos =
        position != null
          ? position
          : err.pos != null
          ? err.pos
          : // some rollup plugins, e.g. json, sets position instead of pos
            err.position
      if (pos != null) {
        let errLocation
        try {
          errLocation = numberToPos(ctx._activeCode, pos)
        } catch (err2) {
          logger.error(
            chalk.red(
              `Error in error handler:\n${err2.stack || err2.message}\n`
            ),
            // print extra newline to separate the two errors
            { error: err2 }
          )
          throw err
        }
        err.loc = err.loc || {
          file: err.id,
          ...errLocation
        }
        err.frame = err.frame || generateCodeFrame(ctx._activeCode, pos)
      } else if (err.loc) {
        // css preprocessors may report errors in an included file
        if (!err.frame) {
          let code = ctx._activeCode
          if (err.loc.file) {
            err.id = normalizePath(err.loc.file)
            try {
              code = fs.readFileSync(err.loc.file, 'utf-8')
            } catch {}
          }
          err.frame = generateCodeFrame(code, err.loc)
        }
      } else if (err.line && err.column) {
        err.loc = {
          file: err.id,
          line: err.line,
          column: err.column
        }
        err.frame = err.frame || generateCodeFrame(ctx._activeCode, err.loc)
      }
    }
    return err
  }
	class TransformContext extends Context {
		constructor(filename, code, inMap) {
			super()
			this.filename = filename
			this.originalCode = code
			this.sourcemapChain = []
			if(inMap) {
				this.sourcemapChain.push(inMap)
			}
			this.combinedMap = null
		}
    _getCombinedSourcemap(createIfNull = false) {
      let combinedMap = this.combinedMap
      for (let m of this.sourcemapChain) {
        if (typeof m === 'string') m = JSON.parse(m)
        if (!('version' in m)) {
          // empty, nullified source map
          combinedMap = this.combinedMap = null
          this.sourcemapChain.length = 0
          break
        }
        if (!combinedMap) {
          combinedMap = m
        } else {
          combinedMap = combineSourcemaps(this.filename, [
            {
              ...m,
              sourcesContent: combinedMap.sourcesContent
            },
            combinedMap
          ])
        }
      }
      if (!combinedMap) {
        return createIfNull
          ? new MagicString(this.originalCode).generateMap({
              includeContent: true,
              hires: true,
              source: this.filename
            })
          : null
      }
      if (combinedMap !== this.combinedMap) {
        this.combinedMap = combinedMap
        this.sourcemapChain.length = 0
      }
      return this.combinedMap
    }

    getCombinedSourcemap() {
      return this._getCombinedSourcemap(true)
    }
	}
	let closed = false
	const container = {
		options: await (async () => {
			let options = rollupOptions
			for(const plugin of plugins) {
				if(!plugin.options) continue
				options = (await plugin.options.call(minimalContext, options)) || options
			}
			return {
				acorn,
				acornInjectPlugins: [],
				...options
			}
		})(),
		getModuleInfo,
		async buildStart() {
			await Promise.all(
				plugins.map((plugin) => {
					if(plugin.buildStart) {
						return plugin.buildStart.call(
							new Context(plugin),
							container.options
						)
					}
				})
			)
		},
		async resolveId(rawId, importer = path.join(root, 'index.html'), options) {
			const skip = (options || {}).skip
			const ssr = (options || {}).ssr
			const ctx = new Context()
			ctx.ssr = !!ssr
			ctx._resolveSkips = skip
			const resolveStart = isDebug ? performance.now() : 0

			let id = null
			const partial = {}
			for(const plugin of plugins) {
				if(!plugin.resolveId) continue
				if(skip && skip.has(plugin)) continue
				ctx._activePlugin = plugin
				const pluginResolveStart = isDebug ? performance.now() : 0
				const result = await plugin.resolveId.call(ctx, rawId, importer, { ssr })
				if(!result) continue
				if(typeof result === 'string') {
					id = result
				} else {
					id = result.id
					Object.assign(partial, result)
				}
        isDebug &&
          debugPluginResolve(
            timeFrom(pluginResolveStart),
            plugin.name,
            prettifyUrl(id, root)
          )

        // resolveId() is hookFirst - first non-null result is returned.
        break
			}
			if(isDebug && rawId !== id && !rawId.startsWith(FS_PREFIX)) {
				const key = rawId + id
				if(!seenResolves[key]) {
					seenResolves[key] = true
					debugResolve(
						`${timeFrom(resolveStart)} ${chalk.cyan(rawId)} -> ${chalk.dim(id)}`
					)
				}
			}

			if(id) {
				partial.id = isExternalUrl(id) ? id : normalizePath(id)
				return partial
			} else {
				return null
			}
		},
    async load(id, options) {
      const ssr = options.ssr
      const ctx = new Context()
      ctx.ssr = !!ssr
      for (const plugin of plugins) {
        if (!plugin.load) continue
        ctx._activePlugin = plugin
        const result = await plugin.load.call(ctx, id, { ssr })
        if (result != null) {
          if (isObject(result)) {
            updateModuleInfo(id, result)
          }
          return result
        }
      }
      return null
    },

    async transform(code, id, options) {
      const inMap = options.inMap
      const ssr = options.ssr
      const ctx = new TransformContext(id, code, inMap)
      ctx.ssr = !!ssr
      for (const plugin of plugins) {
        if (!plugin.transform) continue
        ctx._activePlugin = plugin
        ctx._activeId = id
        ctx._activeCode = code
        const start = isDebug ? performance.now() : 0
        let result
        try {
          result = await plugin.transform.call(ctx, code, id, { ssr })
        } catch (e) {
          ctx.error(e)
        }
        if (!result) continue
        isDebug &&
          debugPluginTransform(
            timeFrom(start),
            plugin.name,
            prettifyUrl(id, root)
          )
        if (isObject(result)) {
          if (result.code !== undefined) {
            code = result.code
            if (result.map) {
              ctx.sourcemapChain.push(result.map)
            }
          }
          updateModuleInfo(id, result)
        } else {
          code = result
        }
      }
      return {
        code,
        map: ctx._getCombinedSourcemap()
      }
    },

    async close() {
      if (closed) return
      const ctx = new Context()
      await Promise.all(
        plugins.map((p) => p.buildEnd && p.buildEnd.call(ctx))
      )
      await Promise.all(
        plugins.map((p) => p.closeBundle && p.closeBundle.call(ctx))
      )
      closed = true
    }
	}
	return container
}

module.exports = {
  createPluginContainer
}