const path = require('path')
const chalk = require('chalk')
const fs = require('fs')
const MagicString = require('magic-string')
const { DEP_VERSION_RE, NULL_BYTE_PLACEHOLDER, VALID_ID_PREFIX, FS_PREFIX, CLIENT_PUBLIC_PATH, CLIENT_DIR } = require('../constants')
const { unwrapId, removeImportQuery, timeFrom, generateCodeFrame, isExternalUrl, isDataUrl, moduleListContains, prettifyUrl, createDebugger, normalizePath, isJSRequest, cleanUrl, injectQuery } = require('../utils')
const { isDirectCSSRequest, isCSSRequest } = require('./css')
const { init, parse } = require('es-module-lexer')
const { checkPublicFile } = require('./asset')
const { parse: parseJs } = require('acorn')
const { handlePrunedModules, lexAcceptedHmrDeps } = require('../server/hmr')
const { transformImportGlob } = require('../importGlob')
const { transformRequest } = require('../server/transformRequest')

const isDebug = process.env.DEBUG
const debug = createDebugger('fakeVite:import-analysis')
const clientDir = path.dirname(CLIENT_DIR)

const skipRE = /\.(map|json)$/
const canSkip = (id) => skipRE.test(id) || isDirectCSSRequest(id)
function isExplicitImportRequired(url) {
  return !isJSRequest(cleanUrl(url)) && !isCSSRequest(url)
}

function markExplicitImport(url) {
  if (isExplicitImportRequired(url)) {
    return injectQuery(url, 'import')
  }
  return url
}

function importAnalysisPlugin(config) {
	const { root, base } = config
	const clientPublicPath = path.posix.join(base, CLIENT_PUBLIC_PATH)
	let server
	return {
		name: 'fakeVite:import-analysis',
		configureServer(_server) {
			server = _server
		},
		async transform(source, importer, options = {}) {
			const ssr = options.ssr === true
			const prettyImporter = prettifyUrl(importer, root)
			if(canSkip(importer)) {
				isDebug && debug(chalk.dim(`[skipped] ${prettyImporter}`))
			}
			const start = performance.now()
			await init
			let imports = []
			if(source.charCodeAt(0) === 0xfeff) {
				source = source.slice(1)
			}
			try {
				imports = parse(source)[0]
			} catch(e) {
				const isVue = importer.endsWith('.vue')
				const maybeJSX = !isVue && isJSRequest(importer)

        const msg = isVue
          ? `Install @vitejs/plugin-vue to handle .vue files.`
          : maybeJSX
          ? `If you are using JSX, make sure to name the file with the .jsx or .tsx extension.`
          : `You may need to install appropriate plugins to handle the ${path.extname(
              importer
            )} file format.`

        this.error(
          `Failed to parse source for import analysis because the content ` +
            `contains invalid JS syntax. ` +
            msg,
          e.idx
        )
			}
			if(!imports.length) {
        isDebug &&
          debug(
            `${timeFrom(start)} ${chalk.dim(`[no imports] ${prettyImporter}`)}`
          )
        return source
			}
			let hasHMR = false
			let isSelfAccepting = false
			let hasEnv = false
			let needQueryInjectHelper = false
			let s
			const str = () => s || (s = new MagicString(source))
			const { moduleGraph } = server
			const importerModule = moduleGraph.getModuleById(importer)
			const importedUrls = new Set()
			const staticImportedUrls = new Set()
			const acceptedUrls = new Set()
			const toAbsoluteUrl = (url) => path.posix.resolve(path.posix.dirname(importerModule.url), url)
			const normalizeUrl = async (url, pos) => {
				if(base !== '/' && url.startsWith(base)) {
					url = url.replace(base, '/')
				}
				let importerFile = importer
				if(moduleListContains((config.optimizeDeps || {}).exclude, url) && server._optimizeDepsMetadata) {
          // if the dependency encountered in the optimized file was excluded from the optimization
          // the dependency needs to be resolved starting from the original source location of the optimized file
          // because starting from node_modules/.vite will not find the dependency if it was not hoisted
          // (that is, if it is under node_modules directory in the package source of the optimized file)
          for (const optimizedModule of Object.values(
            server._optimizeDepsMetadata.optimized
          )) {
            if (optimizedModule.file === importerModule.file) {
              importerFile = optimizedModule.src
            }
          }
				}
				const resolved = await this.resolve(url, importerFile)
        if (!resolved) {
          this.error(
            `Failed to resolve import "${url}" from "${path.relative(
              process.cwd(),
              importerFile
            )}". Does the file exist?`,
            pos
          )
        }
				const isRelative = url.startsWith('.')
				const isSelfImport = !isRelative && cleanUrl(url) === cleanUrl(importer)
				if(resolved.id.startsWith(root+'/')) {
					url = resolved.id.slice(root.length)
				} else if(fs.existsSync(cleanUrl(resolved.id))) {
					url = path.posix.join(FS_PREFIX + resolved.id)
				} else {
					url = resolved.id
				}
				if(isExternalUrl(url)) {
					return [url, url]
				}
				if(!url.startsWith('.') && !url.startsWith('/')) {
					url = VALID_ID_PREFIX + resolved.id.replace('\0', NULL_BYTE_PLACEHOLDER)
				}
				if(!ssr) {
					url = markExplicitImport(url)
					if((isRelative || isSelfImport) && !/[\?&]import=?\b/.test(url)) {
						const versionMatch = importer.match(DEP_VERSION_RE)
						if(versionMatch) {
							url = injectQuery(url, versionMatch[1])
						}
					}
					try {
            const depModule = await moduleGraph.ensureEntryFromUrl(url)
            if (depModule.lastHMRTimestamp > 0) {
              url = injectQuery(url, `t=${depModule.lastHMRTimestamp}`)
            }
          } catch (e) {
            e.pos = pos
            throw e
          }
          url = base + url.replace(/^\//, '')
        }

        return [url, resolved.id]
			}
			for(let index = 0; index < imports.length; index++) {
        const {
          s: start,
          e: end,
          ss: expStart,
          se: expEnd,
          d: dynamicIndex,
          // #2083 User may use escape path,
          // so use imports[index].n to get the unescaped string
          // @ts-ignore
          n: specifier
        } = imports[index]
				const rawUrl = source.slice(start, end)
        if (rawUrl === 'import.meta') {
          const prop = source.slice(end, end + 4)
          if (prop === '.hot') {
            hasHMR = true
            if (source.slice(end + 4, end + 11) === '.accept') {
              // further analyze accepted modules
              if (
                lexAcceptedHmrDeps(
                  source,
                  source.indexOf('(', end + 11) + 1,
                  acceptedUrls
                )
              ) {
                isSelfAccepting = true
              }
            }
          } else if (prop === '.env') {
            hasEnv = true
          } else if (prop === '.glo' && source[end + 4] === 'b') {
            // transform import.meta.glob()
            // e.g. `import.meta.glob('glob:./dir/*.js')`
            const {
              imports,
              importsString,
              exp,
              endIndex,
              base,
              pattern,
              isEager
            } = await transformImportGlob(
              source,
              start,
              importer,
              index,
              root,
              normalizeUrl
            )
            str().prepend(importsString)
            str().overwrite(expStart, endIndex, exp)
            imports.forEach((url) => {
              url = url.replace(base, '/')
              importedUrls.add(url)
              if (isEager) staticImportedUrls.add(url)
            })
            if (!(importerModule.file in server._globImporters)) {
              server._globImporters[importerModule.file] = {
                module: importerModule,
                importGlobs: []
              }
            }
            server._globImporters[importerModule.file].importGlobs.push({
              base,
              pattern
            })
          }
          continue
        }
				const isDynamicImport = dynamicIndex >= 0
				if(specifier) {
					if(isExternalUrl(specifier) || isDataUrl(specifier)) {
						continue
					}
					// TODO skip ssr external
					if(specifier === clientPublicPath) {
						continue
					}
					if (
            specifier.startsWith('/') &&
            !config.assetsInclude(cleanUrl(specifier)) &&
            !specifier.endsWith('.json') &&
            checkPublicFile(specifier, config)
          ) {
            throw new Error(
              `Cannot import non-asset file ${specifier} which is inside /public.` +
                `JS/CSS files inside /public are copied as-is on build and ` +
                `can only be referenced via <script src> or <link href> in html.`
            )
          }
					const [normalizedUrl, resolvedId] = await normalizeUrl(
            specifier,
            start
          )
          let url = normalizedUrl

          // record as safe modules
          server.moduleGraph.safeModulesPath.add(
            cleanUrl(url).slice(4 /* '/@fs'.length */)
          )
					// rewrite
					if (url !== specifier) {
						// for optimized cjs deps, support named imports by rewriting named
						// imports to const assignments.
						if (resolvedId.endsWith(`&es-interop`)) {
							url = url.slice(0, -11)
							if (isDynamicImport) {
								// rewrite `import('package')` to expose the default directly
								str().overwrite(
									dynamicIndex,
									end + 1,
									`import('${url}').then(m => m.default && m.default.__esModule ? m.default : ({ ...m.default, default: m.default }))`
								)
							} else {
								const exp = source.slice(expStart, expEnd)
								const rewritten = transformCjsImport(exp, url, rawUrl, index)
								if (rewritten) {
									str().overwrite(expStart, expEnd, rewritten)
								} else {
									// #1439 export * from '...'
									str().overwrite(start, end, url)
								}
							}
						} else {
							str().overwrite(start, end, isDynamicImport ? `'${url}'` : url)
						}
					}
					// record for HMR import chain analysis
					// make sure to normalize away base
					const urlWithoutBase = url.replace(base, '/')
					importedUrls.add(urlWithoutBase)
					if (!isDynamicImport) {
            // for pre-transforming
            staticImportedUrls.add(urlWithoutBase)
          }
        } else if (!importer.startsWith(clientDir) && !ssr) {
          // check @vite-ignore which suppresses dynamic import warning
          const hasViteIgnore = /\/\*\s*@vite-ignore\s*\*\//.test(rawUrl)

          const url = rawUrl
            .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '')
            .trim()
          if (!hasViteIgnore && !isSupportedDynamicImport(url)) {
            this.warn(
              `\n` +
                chalk.cyan(importerModule.file) +
                `\n` +
                generateCodeFrame(source, start) +
                `\nThe above dynamic import cannot be analyzed by vite.\n` +
                `See ${chalk.blue(
                  `https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations`
                )} ` +
                `for supported dynamic import formats. ` +
                `If this is intended to be left as-is, you can use the ` +
                `/* @vite-ignore */ comment inside the import() call to suppress this warning.\n`
            )
          }
          if (
            !/^('.*'|".*"|`.*`)$/.test(url) ||
            isExplicitImportRequired(url.slice(1, -1))
          ) {
            needQueryInjectHelper = true
            str().overwrite(start, end, `__vite__injectQuery(${url}, 'import')`)
          }
        }
			}
			if (hasEnv) {
        // inject import.meta.env
        let env = `import.meta.env = ${JSON.stringify({
          ...config.env,
          SSR: !!ssr
        })};`
        // account for user env defines
        for (const key in config.define) {
          if (key.startsWith(`import.meta.env.`)) {
            const val = config.define[key]
            env += `${key} = ${
              typeof val === 'string' ? val : JSON.stringify(val)
            };`
          }
        }
        str().prepend(env)
      }
			if (hasHMR && !ssr) {
        debugHmr(
          `${
            isSelfAccepting
              ? `[self-accepts]`
              : acceptedUrls.size
              ? `[accepts-deps]`
              : `[detected api usage]`
          } ${prettyImporter}`
        )
        // inject hot context
        str().prepend(
          `import { createHotContext as __vite__createHotContext } from "${clientPublicPath}";` +
            `import.meta.hot = __vite__createHotContext(${JSON.stringify(
              importerModule.url
            )});`
        )
      }
			if (needQueryInjectHelper) {
        str().prepend(
          `import { injectQuery as __vite__injectQuery } from "${clientPublicPath}";`
        )
      }
			// normalize and rewrite accepted urls
			const normalizedAcceptedUrls = new Set()
			for (const { url, start, end } of acceptedUrls) {
				const [normalized] = await moduleGraph.resolveUrl(
					toAbsoluteUrl(markExplicitImport(url))
				)
				normalizedAcceptedUrls.add(normalized)
				str().overwrite(start, end, JSON.stringify(normalized))
			}

			// update the module graph for HMR analysis.
			// node CSS imports does its own graph update in the css plugin so we
			// only handle js graph updates here.
			if (!isCSSRequest(importer)) {
				// attached by pluginContainer.addWatchFile
				const pluginImports = this._addedImports
        console.log(`import analysis: ${pluginImports}`)
				if (pluginImports) {
					;(
						await Promise.all(
							[...pluginImports].map((id) => normalizeUrl(id, 0))
						)
					).forEach(([url]) => importedUrls.add(url))
				}
				// HMR transforms are no-ops in SSR, so an `accept` call will
				// never be injected. Avoid updating the `isSelfAccepting`
				// property for our module node in that case.
				if (ssr && importerModule.isSelfAccepting) {
					isSelfAccepting = true
				}
				const prunedImports = await moduleGraph.updateModuleInfo(
					importerModule,
					importedUrls,
					normalizedAcceptedUrls,
					isSelfAccepting
				)
				if (hasHMR && prunedImports) {
					handlePrunedModules(prunedImports, server)
				}
			}

			isDebug &&
				debug(
					`${timeFrom(start)} ${chalk.dim(
						`[${importedUrls.size} imports rewritten] ${prettyImporter}`
					)}`
				)

			// pre-transform known direct imports
			if (staticImportedUrls.size) {
        console.log(chalk.red(`import analysis static imported urls: ${Array.from(staticImportedUrls||[]).join(', ')}`));
				staticImportedUrls.forEach((url) => {
					transformRequest(unwrapId(removeImportQuery(url)), server, { ssr })
				})
			}

			if (s) {
				return s.toString()
			} else {
				return source
			}
		}
	}
}

/**
 * https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
 * This is probably less accurate but is much cheaper than a full AST parse.
 */
 function isSupportedDynamicImport(url) {
  url = url.trim().slice(1, -1)
  // must be relative
  if (!url.startsWith('./') && !url.startsWith('../')) {
    return false
  }
  // must have extension
  if (!path.extname(url)) {
    return false
  }
  // must be more specific if importing from same dir
  if (url.startsWith('./${') && url.indexOf('/') === url.lastIndexOf('/')) {
    return false
  }
  return true
}

/**
 * Detect import statements to a known optimized CJS dependency and provide
 * ES named imports interop. We do this by rewriting named imports to a variable
 * assignment to the corresponding property on the `module.exports` of the cjs
 * module. Note this doesn't support dynamic re-assignments from within the cjs
 * module.
 *
 * Note that es-module-lexer treats `export * from '...'` as an import as well,
 * so, we may encounter ExportAllDeclaration here, in which case `undefined`
 * will be returned.
 *
 * Credits \@csr632 via #837
 */
function transformCjsImport(importExp, url, rawUrl, importIndex) {
  const node = (
    parseJS(importExp, {
      ecmaVersion: 'latest',
      sourceType: 'module'
    })
  ).body[0]

  if (
    node.type === 'ImportDeclaration' ||
    node.type === 'ExportNamedDeclaration'
  ) {
    if (!node.specifiers.length) {
      return `import "${url}"`
    }

    const importNames = []
    const exportNames = []
    let defaultExports = ''
    for (const spec of node.specifiers) {
      if (
        spec.type === 'ImportSpecifier' &&
        spec.imported.type === 'Identifier'
      ) {
        const importedName = spec.imported.name
        const localName = spec.local.name
        importNames.push({ importedName, localName })
      } else if (spec.type === 'ImportDefaultSpecifier') {
        importNames.push({
          importedName: 'default',
          localName: spec.local.name
        })
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        importNames.push({ importedName: '*', localName: spec.local.name })
      } else if (
        spec.type === 'ExportSpecifier' &&
        spec.exported.type === 'Identifier'
      ) {
        // for ExportSpecifier, local name is same as imported name
        const importedName = spec.local.name
        // we want to specify exported name as variable and re-export it
        const exportedName = spec.exported.name
        if (exportedName === 'default') {
          defaultExports = makeLegalIdentifier(
            `__vite__cjsExportDefault_${importIndex}`
          )
          importNames.push({ importedName, localName: defaultExports })
        } else {
          importNames.push({ importedName, localName: exportedName })
          exportNames.push(exportedName)
        }
      }
    }

    // If there is multiple import for same id in one file,
    // importIndex will prevent the cjsModuleName to be duplicate
    const cjsModuleName = makeLegalIdentifier(
      `__vite__cjsImport${importIndex}_${rawUrl}`
    )
    const lines = [`import ${cjsModuleName} from "${url}"`]
    importNames.forEach(({ importedName, localName }) => {
      if (importedName === '*') {
        lines.push(`const ${localName} = ${cjsModuleName}`)
      } else if (importedName === 'default') {
        lines.push(
          `const ${localName} = ${cjsModuleName}.__esModule ? ${cjsModuleName}.default : ${cjsModuleName}`
        )
      } else {
        lines.push(`const ${localName} = ${cjsModuleName}["${importedName}"]`)
      }
    })
    if (defaultExports) {
      lines.push(`export default ${defaultExports}`)
    }
    if (exportNames.length) {
      lines.push(`export { ${exportNames.join(', ')} }`)
    }

    return lines.join('; ')
  }
}

module.exports = {
	importAnalysisPlugin
}