const { registerAssetToChunk, checkPublicFile, fileToUrl, getAssetFilename } = require('./asset')
const postcssrc = require('postcss-load-config')
const { dataToEsm } = require('@rollup/pluginutils')
const path = require('path')
const { transform, formatMessages } = require('esbuild')
const { CLIENT_PUBLIC_PATH } = require('../constants')
const MagicString = require('magic-string')
const { isExternalUrl, isDataUrl, asyncReplace, isObject, createDebugger } = require('../utils')
const glob = require('fast-glob')

const debug = createDebugger('fakeVite:css')

const directRequestRE = /(\?|&)direct\b/
const commonjsProxyRE = /\?commonjs-proxy/
const inlineRE = /(\?|&)inline\b/
const usedRE = /(\?|&)used\b/
const cssUrlRE =
  /(?<=^|[^\w\-\u0080-\uffff])url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
const cssImageSetRE = /image-set\(([^)]+)\)/

const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)
const cssModuleRE = new RegExp(`\\.module${cssLangs}`)

const isCSSRequest = (request) =>
  cssLangRE.test(request)

const isDirectCSSRequest = (request) =>
  cssLangRE.test(request) && directRequestRE.test(request)

const isDirectRequest = (request) =>
  directRequestRE.test(request)

const cssModulesCache = new WeakMap()
const removedPureCssFilesCache = new WeakMap()
const postcssConfigCache = new WeakMap()

/**
 * css plugin transform：
 * 1. compile css
 * 2. update module info(include deps)
 */
function cssPlugin(config) {
  let server
  let moduleCache
  const resolveUrl = config.createResolver({
    preferRelative: true,
    tryIndex: false,
    extension: []
  })
  const atImportResolvers = createCSSResolvers(config)
  return {
    name: 'fakeVite:css',
    configureServer(_server) {
      server = _server
    },
    buildServer() {
      moduleCache = new Map()
      cssModulesCache.set(config, moduleCache)
      removedPureCssFilesCache.set(config, new Map())
    },
    async transform(raw, id) {
      if(!isCSSRequest(id) || commonjsProxyRE.test(id)) {
        return
      }
      const urlReplacer = async (url, importer) => {
        if(checkPublicFile(url, config)) {
          return config.base + url.slice(1)
        }
        const resolved = await resolveUrl(url, importer)
        if(resolved) {
          return fileToUrl(resolved, config, this)
        }
        return url
      }
      const {
        code: css,
        modules,
        deps
      } = await compileCSS(id, raw, config, urlReplacer, atImportResolvers, server)
      if (modules) {
        moduleCache.set(id, modules)
      }

      // track deps for build watch mode
      if (config.command === 'build' && config.build.watch && deps) {
        for (const file of deps) {
          this.addWatchFile(file)
        }
      }

      // dev
      if (server) {
        // server only logic for handling CSS @import dependency hmr
        const { moduleGraph } = server
        const thisModule = moduleGraph.getModuleById(id)
        if (thisModule) {
          // CSS modules cannot self-accept since it exports values
          const isSelfAccepting = !modules && !inlineRE.test(id)
          if (deps) {
            // record deps in the module graph so edits to @import css can trigger
            // main import to hot update
            const depModules = new Set()
            for (const file of deps) {
              depModules.add(
                isCSSRequest(file)
                  ? moduleGraph.createFileOnlyEntry(file)
                  : await moduleGraph.ensureEntryFromUrl(
                      (
                        await fileToUrl(file, config, this)
                      ).replace(
                        (config.server?.origin ?? '') + config.base,
                        '/'
                      )
                    )
              )
            }
            moduleGraph.updateModuleInfo(
              thisModule,
              depModules,
              // The root CSS proxy module is self-accepting and should not
              // have an explicit accept list
              new Set(),
              isSelfAccepting
            )
            for (const file of deps) {
              this.addWatchFile(file)
            }
          } else {
            thisModule.isSelfAccepting = isSelfAccepting
          }
        }
      }

      return {
        code: css,
        // TODO CSS source map
        map: { mappings: '' }
      }
    }
  }
}
/**
 * Plugin applied after user plugins
 */
 function cssPostPlugin(config) {
  // styles initialization in buildStart causes a styling loss in watch
  const styles = new Map()
  let pureCssChunks

  // when there are multiple rollup outputs and extracting CSS, only emit once,
  // since output formats have no effect on the generated CSS.
  let outputToExtractedCSSMap
  let hasEmitted = false

  return {
    name: 'fakeVite:css-post',

    buildStart() {
      // Ensure new caches for every build (i.e. rebuilding in watch mode)
      pureCssChunks = new Set()
      outputToExtractedCSSMap = new Map()
      hasEmitted = false
    },

    async transform(css, id, options) {
      if (!isCSSRequest(id) || commonjsProxyRE.test(id)) {
        return
      }

      const inlined = inlineRE.test(id)
      const modules = (cssModulesCache.get(config) || new WeakMap()).get(id)
      const modulesCode =
        modules && dataToEsm(modules, { namedExports: true, preferConst: true })

      if (config.command === 'serve') {
        if (isDirectCSSRequest(id)) {
          return css
        } else {
          // server only
          if (options.ssr) {
            return modulesCode || `export default ${JSON.stringify(css)}`
          }
          if (inlined) {
            return `export default ${JSON.stringify(css)}`
          }
          return [
            `import { updateStyle, removeStyle } from ${JSON.stringify(
              path.posix.join(config.base, CLIENT_PUBLIC_PATH)
            )}`,
            `const id = ${JSON.stringify(id)}`,
            `const css = ${JSON.stringify(css)}`,
            `updateStyle(id, css)`,
            // css modules exports change on edit so it can't self accept
            `${modulesCode || `import.meta.hot.accept()\nexport default css`}`,
            `import.meta.hot.prune(() => removeStyle(id))`
          ].join('\n')
        }
      }

      // build CSS handling ----------------------------------------------------

      // record css
      if (!inlined) {
        styles.set(id, css)
      }

      return {
        code:
          modulesCode ||
          (usedRE.test(id)
            ? `export default ${JSON.stringify(
                inlined ? await minifyCSS(css, config) : css
              )}`
            : `export default ''`),
        map: { mappings: '' },
        // avoid the css module from being tree-shaken so that we can retrieve
        // it in renderChunk()
        moduleSideEffects: inlined ? false : 'no-treeshake'
      }
    },

    async renderChunk(code, chunk, opts) {
      let chunkCSS = ''
      let isPureCssChunk = true
      const ids = Object.keys(chunk.modules)
      for (const id of ids) {
        if (
          !isCSSRequest(id) ||
          cssModuleRE.test(id) ||
          commonjsProxyRE.test(id)
        ) {
          isPureCssChunk = false
        }
        if (styles.has(id)) {
          chunkCSS += styles.get(id)
        }
      }

      if (!chunkCSS) {
        return null
      }

      // resolve asset URL placeholders to their built file URLs and perform
      // minification if necessary
      const processChunkCSS = async (
        css,
        {
          inlined,
          minify
        }
      ) => {
        // replace asset url references with resolved url.
        const isRelativeBase = config.base === '' || config.base.startsWith('.')
        css = css.replace(assetUrlRE, (_, fileHash, postfix = '') => {
          const filename = getAssetFilename(fileHash, config) + postfix
          registerAssetToChunk(chunk, filename)
          if (!isRelativeBase || inlined) {
            // absolute base or relative base but inlined (injected as style tag into
            // index.html) use the base as-is
            return config.base + filename
          } else {
            // relative base + extracted CSS - asset file will be in the same dir
            return `./${path.posix.basename(filename)}`
          }
        })
        // only external @imports should exist at this point - and they need to
        // be hoisted to the top of the CSS chunk per spec (#1845)
        if (css.includes('@import')) {
          css = await hoistAtImports(css)
        }
        if (minify && config.build.minify) {
          css = await minifyCSS(css, config)
        }
        return css
      }

      if (config.build.cssCodeSplit) {
        if (isPureCssChunk) {
          // this is a shared CSS-only chunk that is empty.
          pureCssChunks.add(chunk.fileName)
        }
        if (opts.format === 'es' || opts.format === 'cjs') {
          chunkCSS = await processChunkCSS(chunkCSS, {
            inlined: false,
            minify: true
          })
          // emit corresponding css file
          const fileHandle = this.emitFile({
            name: chunk.name + '.css',
            type: 'asset',
            source: chunkCSS
          })
          chunkToEmittedCssFileMap.set(
            chunk,
            new Set([this.getFileName(fileHandle)])
          )
        } else if (!config.build.ssr) {
          // legacy build, inline css
          chunkCSS = await processChunkCSS(chunkCSS, {
            inlined: true,
            minify: true
          })
          const style = `__vite_style__`
          const injectCode =
            `var ${style} = document.createElement('style');` +
            `${style}.innerHTML = ${JSON.stringify(chunkCSS)};` +
            `document.head.appendChild(${style});`
          if (config.build.sourcemap) {
            const s = new MagicString(code)
            s.prepend(injectCode)
            return {
              code: s.toString(),
              map: s.generateMap({ hires: true })
            }
          } else {
            return { code: injectCode + code }
          }
        }
      } else {
        // non-split extracted CSS will be minified together
        chunkCSS = await processChunkCSS(chunkCSS, {
          inlined: false,
          minify: false
        })
        outputToExtractedCSSMap.set(
          opts,
          (outputToExtractedCSSMap.get(opts) || '') + chunkCSS
        )
      }
      return null
    },

    async generateBundle(opts, bundle) {
      // remove empty css chunks and their imports
      if (pureCssChunks.size) {
        const emptyChunkFiles = [...pureCssChunks]
          .map((file) => path.basename(file))
          .join('|')
          .replace(/\./g, '\\.')
        const emptyChunkRE = new RegExp(
          opts.format === 'es'
            ? `\\bimport\\s*"[^"]*(?:${emptyChunkFiles})";\n?`
            : `\\brequire\\(\\s*"[^"]*(?:${emptyChunkFiles})"\\);\n?`,
          'g'
        )
        for (const file in bundle) {
          const chunk = bundle[file]
          if (chunk.type === 'chunk') {
            // remove pure css chunk from other chunk's imports,
            // and also register the emitted CSS files under the importer
            // chunks instead.
            chunk.imports = chunk.imports.filter((file) => {
              if (pureCssChunks.has(file)) {
                const css = chunkToEmittedCssFileMap.get(bundle[file])
                if (css) {
                  let existing = chunkToEmittedCssFileMap.get(chunk)
                  if (!existing) {
                    existing = new Set()
                  }
                  css.forEach((file) => existing && existing.add(file))
                  chunkToEmittedCssFileMap.set(chunk, existing)
                }
                return false
              }
              return true
            })
            chunk.code = chunk.code.replace(
              emptyChunkRE,
              // remove css import while preserving source map location
              (m) => `/* empty css ${''.padEnd(m.length - 15)}*/`
            )
          }
        }
        const removedPureCssFiles = removedPureCssFilesCache.get(config)
        pureCssChunks.forEach((fileName) => {
          removedPureCssFiles && removedPureCssFiles.set(fileName, bundle[fileName])
          delete bundle[fileName]
        })
      }

      let extractedCss = outputToExtractedCSSMap.get(opts)
      if (extractedCss && !hasEmitted) {
        hasEmitted = true
        // minify css
        if (config.build.minify) {
          extractedCss = await minifyCSS(extractedCss, config)
        }
        this.emitFile({
          name: 'style.css',
          type: 'asset',
          source: extractedCss
        })
      }
    }
  }
}
async function compileCSS(id, code, config, urlReplacer, atImportResolvers, server) {
  const { modules: modulesOptions, preprocessorOptions } = config.css || {}
  const isModule = modulesOptions !== false && cssModuleRE.test(id)
  const needInlineImport = code.includes('@import')
  const hasUrl = cssUrlRE.test(code) || cssImageSetRE.test(code)
  const postcssConfig = await resolvePostcssConfig(config)
  const lang = id.match(cssLangRE)[1]
  // 1. plain css that needs no processing
  if (
    lang === 'css' &&
    !postcssConfig &&
    !isModule &&
    !needInlineImport &&
    !hasUrl
  ) {
    return { code }
  }

  let map
  let modules
  const deps = new Set()

  const postcssOptions = (postcssConfig && postcssConfig.options) || {}
  const postcssPlugins =
    postcssConfig && postcssConfig.plugins ? postcssConfig.plugins.slice() : []

  postcssPlugins.push(
    UrlRewritePostcssPlugin({
      replacer: urlReplacer
    })
  )

  if (!postcssPlugins.length) {
    return {
      code,
      map
    }
  }

  // postcss is an unbundled dep and should be lazy imported
  const postcssResult = await (await import('postcss'))
    .default(postcssPlugins)
    .process(code, {
      ...postcssOptions,
      to: id,
      from: id,
      map: {
        inline: false,
        annotation: false,
        prev: map
      }
    })
  // record CSS dependencies from @imports
  for (const message of postcssResult.messages) {
    if (message.type === 'dependency') {
      deps.add(message.file)
    } else if (message.type === 'dir-dependency') {
      // https://github.com/postcss/postcss/blob/main/docs/guidelines/plugin.md#3-dependencies
      const { dir, glob: globPattern = '**' } = message
      const pattern =
        normalizePath(path.resolve(path.dirname(id), dir)) + `/` + globPattern
      const files = glob.sync(pattern, {
        ignore: ['**/node_modules/**']
      })
      for (let i = 0; i < files.length; i++) {
        deps.add(files[i])
      }
      if (server) {
        // register glob importers so we can trigger updates on file add/remove
        if (!(id in server._globImporters)) {
          server._globImporters[id] = {
            module: server.moduleGraph.getModuleById(id),
            importGlobs: []
          }
        }
        server._globImporters[id].importGlobs.push({
          base: config.root,
          pattern
        })
      }
    } else if (message.type === 'warning') {
      let msg = `[vite:css] ${message.text}`
      if (message.line && message.column) {
        msg += `\n${generateCodeFrame(code, {
          line: message.line,
          column: message.column
        })}`
      }
      config.logger.warn(chalk.yellow(msg))
    }
  }

  return {
    ast: postcssResult,
    code: postcssResult.css,
    map: postcssResult.map,
    modules,
    deps
  }
}

const UrlRewritePostcssPlugin = (opts) => {
  if (!opts) {
    throw new Error('base or replace is required')
  }

  return {
    postcssPlugin: 'fakeVite-url-rewrite',
    Once(root) {
      const promises = []
      root.walkDecls((declaration) => {
        const isCssUrl = cssUrlRE.test(declaration.value)
        const isCssImageSet = cssImageSetRE.test(declaration.value)
        if (isCssUrl || isCssImageSet) {
          const replacerForDeclaration = (rawUrl) => {
            const importer = declaration.source.input.file
            return opts.replacer(rawUrl, importer)
          }
          const rewriterToUse = isCssUrl ? rewriteCssUrls : rewriteCssImageSet
          promises.push(
            rewriterToUse(declaration.value, replacerForDeclaration).then(
              (url) => {
                declaration.value = url
              }
            )
          )
        }
      })
      if (promises.length) {
        return Promise.all(promises)
      }
    }
  }
}
UrlRewritePostcssPlugin.postcss = true

function rewriteCssUrls(css, replacer) {
  return asyncReplace(css, cssUrlRE, async (match) => {
    const [matched, rawUrl] = match
    return await doUrlReplace(rawUrl, matched, replacer)
  })
}

function rewriteCssImageSet(css, replacer) {
  return asyncReplace(css, cssImageSetRE, async (match) => {
    const [matched, rawUrl] = match
    const url = await processSrcSet(rawUrl, ({ url }) =>
      doUrlReplace(url, matched, replacer)
    )
    return `image-set(${url})`
  })
}
async function doUrlReplace(rawUrl, matched, replacer) {
  let wrap = ''
  const first = rawUrl[0]
  if (first === `"` || first === `'`) {
    wrap = first
    rawUrl = rawUrl.slice(1, -1)
  }
  if (isExternalUrl(rawUrl) || isDataUrl(rawUrl) || rawUrl.startsWith('#')) {
    return matched
  }

  return `url(${wrap}${await replacer(rawUrl)}${wrap})`
}

async function resolvePostcssConfig(config) {
  let result = postcssConfigCache.get(config)
  if (result !== undefined) {
    return result
  }

  // inline postcss config via vite config
  const inlineOptions = (config.css||{}).postcss
  if (isObject(inlineOptions)) {
    const options = { ...inlineOptions }

    delete options.plugins
    result = {
      options,
      plugins: inlineOptions.plugins || []
    }
  } else {
    try {
      const searchPath =
        typeof inlineOptions === 'string' ? inlineOptions : config.root
      // @ts-ignore
      result = await postcssrc({}, searchPath)
    } catch (e) {
      if (!/No PostCSS Config found/.test(e.message)) {
        throw e
      }
      result = null
    }
  }

  postcssConfigCache.set(config, result)
  return result
}

function createCSSResolvers(config) {
  let cssResolve
  let sassResolve
  let lessResolve
  return {
    get css() {
      return (
        cssResolve ||
        (cssResolve = config.createResolver({
          extensions: ['.css'],
          mainFields: ['style'],
          tryIndex: false,
          preferRelative: true
        }))
      )
    },

    get sass() {
      return (
        sassResolve ||
        (sassResolve = config.createResolver({
          extensions: ['.scss', '.sass', '.css'],
          mainFields: ['sass', 'style'],
          tryIndex: true,
          tryPrefix: '_',
          preferRelative: true
        }))
      )
    },

    get less() {
      return (
        lessResolve ||
        (lessResolve = config.createResolver({
          extensions: ['.less', '.css'],
          mainFields: ['less', 'style'],
          tryIndex: false,
          preferRelative: true
        }))
      )
    }
  }
}
async function hoistAtImports(css) {
  const postcss = await import('postcss')
  return (await postcss.default([AtImportHoistPlugin]).process(css)).css
}
const AtImportHoistPlugin = () => {
  return {
    postcssPlugin: 'fakeVite-hoist-at-imports',
    Once(root) {
      const imports = []
      root.walkAtRules((rule) => {
        if (rule.name === 'import') {
          // record in reverse so that can simply prepend to preserve order
          imports.unshift(rule)
        }
      })
      imports.forEach((i) => root.prepend(i))
    }
  }
}
AtImportHoistPlugin.postcss = true

async function minifyCSS(css, config) {
  const { code, warnings } = await transform(css, {
    loader: 'css',
    minify: true,
    target: config.build.cssTarget || undefined
  })
  if (warnings.length) {
    const msgs = await formatMessages(warnings, { kind: 'warning' })
    config.logger.warn(
      chalk.yellow(`warnings when minifying css:\n${msgs.join('\n')}`)
    )
  }
  return code
}

module.exports = {
	isDirectCSSRequest,
	isDirectRequest,
  isCSSRequest,
  cssPlugin,
  cssPostPlugin
}