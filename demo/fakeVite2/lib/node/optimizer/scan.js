const fs = require('fs')
const path = require('path')
const glob = require('fast-glob')
const { build, transform } = require('esbuild')
const {
  KNOWN_ASSET_TYPES,
  JS_TYPES_RE,
  SPECIAL_QUERY_RE,
  OPTIMIZABLE_ENTRY_RE
} = require('../constants')
const { createPluginContainer } = require('../server/pluginContainer')
const { init, parse } = require('es-module-lexer')
const MagicString = require('magic-string')
const { transformImportGlob } = require('../importGlob')
const { performance } = require('perf_hooks')
const chalk = require('chalk')
const {
  createDebugger,
  normalizePath,
  isObject,
  cleanUrl,
  moduleListContains,
  externalRE,
  dataUrlRE,
  multilineCommentsRE,
  singlelineCommentsRE,
  virtualModuleRE,
  virtualModulePrefix
} = require('../utils')

const debug = createDebugger('vite:deps')

const htmlTypesRE = /\.(html|vue|svelte|astro)$/

const setupRE = /<script\s+setup/

// A simple regex to detect import sources. This is only used on
// <script lang="ts"> blocks in vue (setup only) or svelte files, since
// seemingly unused imports are dropped by esbuild when transpiling TS which
// prevents it from crawling further.
// We can't use es-module-lexer because it can't handle TS, and don't want to
// use Acorn because it's slow. Luckily this doesn't have to be bullet proof
// since even missed imports can be caught at runtime, and false positives will
// simply be ignored.
const importsRE =
  /(?<!\/\/.*)(?<=^|;|\*\/)\s*import(?!\s+type)(?:[\w*{}\n\r\t, ]+from\s*)?\s*("[^"]+"|'[^']+')\s*(?=$|;|\/\/|\/\*)/gm

async function scanImports(config) {
  const start = performance.now()

  let entries = []

  const explicitEntryPatterns = config.optimizeDeps.entries
  const buildInput = config.build.rollupOptions && config.build.rollupOptions.input
  /**
   * 依赖扫描入口优先级：
   * 1. config.optimizeDemps.entries 
   * 2. config.build.rolllupOptions.input 
   * 3. root下所有html文件
   * */ 
  if (explicitEntryPatterns) {
    entries = await globEntries(explicitEntryPatterns, config)
  } else if (buildInput) {
    const resolvePath = (p) => path.resolve(config.root, p)
    if (typeof buildInput === 'string') {
      entries = [resolvePath(buildInput)]
    } else if (Array.isArray(buildInput)) {
      entries = buildInput.map(resolvePath)
    } else if (isObject(buildInput)) {
      entries = Object.values(buildInput).map(resolvePath)
    } else {
      throw new Error('invalid rollupOptions.input value.')
    }
  } else {
    entries = await globEntries('**/*.html', config)
  }

  // Non-supported entry file types and virtual files should not be scanned for
  // dependencies.
  entries = entries.filter(
    (entry) =>
      (JS_TYPES_RE.test(entry) || htmlTypesRE.test(entry)) &&
      fs.existsSync(entry)
  )

  if (!entries.length) {
    if (!explicitEntryPatterns && !config.optimizeDeps.include) {
      config.logger.warn(
        chalk.yellow(
          '(!) Could not auto-determine entry point from rollupOptions or html files ' +
            'and there are no explicit optimizeDeps.include patterns. ' +
            'Skipping dependency pre-bundling.'
        )
      )
    }
    return { deps: {}, missing: {} }
  } else {
    debug(`Crawling dependencies using entries:\n  ${entries.join('\n  ')}`)
  }

  const deps = {}
  const missing = {}
  const container = await createPluginContainer(config)
  const plugin = esbuildScanPlugin(config, container, deps, missing, entries)

  const { plugins = [], ...esbuildOptions } =
    (config.optimizeDeps && config.optimizeDeps.esbuildOptions) ?? {}

  await Promise.all(
    entries.map((entry) =>
      build({
        absWorkingDir: process.cwd(),
        write: false,
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        logLevel: 'error',
        plugins: [...plugins, plugin],
        ...esbuildOptions
      })
    )
  )

  debug(`Scan completed in ${(performance.now() - start).toFixed(2)}ms:`, deps)

  return {
    deps,
    missing
  }
}

function globEntries(pattern, config) {
  return glob(pattern, {
    cwd: config.root,
    ignore: [
      '**/node_modules/**',
      `**/${config.build.outDir}/**`,
      `**/__tests__/**`
    ],
    absolute: true
  })
}

const scriptModuleRE =
  /(<script\b[^>]*type\s*=\s*(?:"module"|'module')[^>]*>)(.*?)<\/script>/gims
const scriptRE = /(<script\b(?:\s[^>]*>|>))(.*?)<\/script>/gims
const commentRE = /<!--(.|[\r\n])*?-->/
const srcRE = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/im
const typeRE = /\btype\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/im
const langRE = /\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/im
const contextRE = /\bcontext\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s'">]+))/im

function esbuildScanPlugin(config, container, depImports, missing, entries) {
  const seen = new Map()

  const resolve = async (id, importer) => {
    const key = id + (importer && path.dirname(importer))
    if (seen.has(key)) {
      return seen.get(key)
    }
    const resolved = await container.resolveId(
      id,
      importer && normalizePath(importer)
    )
    const res = resolved && resolved.id
    seen.set(key, res)
    return res
  }

  const include = config.optimizeDeps && config.optimizeDeps.include
  const exclude = [
    ...((config.optimizeDeps && config.optimizeDeps.exclude) || []),
    '@vite/client',
    '@vite/env'
  ]

  const externalUnlessEntry = ({ path }) => ({
    path,
    external: !entries.includes(path)
  })

  return {
    name: 'vite:dep-scan',
    setup(build) {
      const localScripts = {}

      // external urls
      build.onResolve({ filter: externalRE }, ({ path }) => ({
        path,
        external: true
      }))

      // data urls
      build.onResolve({ filter: dataUrlRE }, ({ path }) => ({
        path,
        external: true
      }))

      // local scripts (`<script>` in Svelte and `<script setup>` in Vue)
      build.onResolve({ filter: virtualModuleRE }, ({ path }) => {
        return {
          // strip prefix to get valid filesystem path so esbuild can resolve imports in the file
          path: path.replace(virtualModulePrefix, ''),
          namespace: 'local-script'
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'local-script' }, ({ path }) => {
        return localScripts[path]
      })

      // html types: extract script contents -----------------------------------
      build.onResolve({ filter: htmlTypesRE }, async ({ path, importer }) => {
        return {
          path: await resolve(path, importer),
          namespace: 'html'
        }
      })

      // extract scripts inside HTML-like files and treat it as a js module
      build.onLoad(
        { filter: htmlTypesRE, namespace: 'html' },
        async ({ path }) => {
          let raw = fs.readFileSync(path, 'utf-8')
          // Avoid matching the content of the comment
          raw = raw.replace(commentRE, '<!---->')
          const isHtml = path.endsWith('.html')
          const regex = isHtml ? scriptModuleRE : scriptRE
          regex.lastIndex = 0
          let js = ''
          let loader = 'js'
          let match
          while ((match = regex.exec(raw))) {
            const [, openTag, content] = match
            const typeMatch = openTag.match(typeRE)
            const type =
              typeMatch && (typeMatch[1] || typeMatch[2] || typeMatch[3])
            const langMatch = openTag.match(langRE)
            const lang =
              langMatch && (langMatch[1] || langMatch[2] || langMatch[3])
            // skip type="application/ld+json" and other non-JS types
            if (
              type &&
              !(
                type.includes('javascript') ||
                type.includes('ecmascript') ||
                type === 'module'
              )
            ) {
              continue
            }
            if (lang === 'ts' || lang === 'tsx' || lang === 'jsx') {
              loader = lang
            }
            const srcMatch = openTag.match(srcRE)
            if (srcMatch) {
              const src = srcMatch[1] || srcMatch[2] || srcMatch[3]
              js += `import ${JSON.stringify(src)}\n`
            } else if (content.trim()) {
              // There can be module scripts (`<script context="module">` in Svelte and `<script>` in Vue)
              // or local scripts (`<script>` in Svelte and `<script setup>` in Vue)
              // We need to handle these separately in case variable names are reused between them
              const contextMatch = openTag.match(contextRE)
              const context =
                contextMatch &&
                (contextMatch[1] || contextMatch[2] || contextMatch[3])
              if (
                (path.endsWith('.vue') && setupRE.test(openTag)) ||
                (path.endsWith('.svelte') && context !== 'module')
              ) {
                // append imports in TS to prevent esbuild from removing them
                // since they may be used in the template
                const localContent =
                  content +
                  (loader.startsWith('ts') ? extractImportPaths(content) : '')
                localScripts[path] = {
                  loader,
                  contents: localContent
                }
                js += `import '${virtualModulePrefix}${path}';\n`
              } else {
                js += content + '\n'
              }
            }
          }

          // `<script>` in Svelte has imports that can be used in the template
          // so we handle them here too
          if (loader.startsWith('ts') && path.endsWith('.svelte')) {
            js += extractImportPaths(js)
          }

          // This will trigger incorrectly if `export default` is contained
          // anywhere in a string. Svelte and Astro files can't have
          // `export default` as code so we know if it's encountered it's a
          // false positive (e.g. contained in a string)
          if (!path.endsWith('.vue') || !js.includes('export default')) {
            js += '\nexport default {}'
          }

          if (js.includes('import.meta.glob')) {
            return {
              // transformGlob already transforms to js
              loader: 'js',
              contents: await transformGlob(js, path, config.root, loader)
            }
          }

          return {
            loader,
            contents: js
          }
        }
      )

      // bare imports: record and externalize ----------------------------------
      build.onResolve(
        {
          // avoid matching windows volume
          filter: /^[\w@][^:]/
        },
        async ({ path: id, importer }) => {
          if (moduleListContains(exclude, id)) {
            return externalUnlessEntry({ path: id })
          }
          if (depImports[id]) {
            return externalUnlessEntry({ path: id })
          }
          const resolved = await resolve(id, importer)
          if (resolved) {
            if (shouldExternalizeDep(resolved, id)) {
              return externalUnlessEntry({ path: id })
            }
            if (resolved.includes('node_modules') || include && include.includes(id)) {
              // dependency or forced included, externalize and stop crawling
              if (OPTIMIZABLE_ENTRY_RE.test(resolved)) {
                depImports[id] = resolved
              }
              return externalUnlessEntry({ path: id })
            } else {
              const namespace = htmlTypesRE.test(resolved) ? 'html' : undefined
              // linked package, keep crawling
              return {
                path: path.resolve(resolved),
                namespace
              }
            }
          } else {
            missing[id] = normalizePath(importer)
          }
        }
      )

      // Externalized file types -----------------------------------------------
      // these are done on raw ids using esbuild's native regex filter so it
      // should be faster than doing it in the catch-all via js
      // they are done after the bare import resolve because a package name
      // may end with these extensions

      // css & json
      build.onResolve(
        {
          filter: /\.(css|less|sass|scss|styl|stylus|pcss|postcss|json)$/
        },
        externalUnlessEntry
      )

      // known asset types
      build.onResolve(
        {
          filter: new RegExp(`\\.(${KNOWN_ASSET_TYPES.join('|')})$`)
        },
        externalUnlessEntry
      )

      // known vite query types: ?worker, ?raw
      build.onResolve({ filter: SPECIAL_QUERY_RE }, ({ path }) => ({
        path,
        external: true
      }))

      // catch all -------------------------------------------------------------

      build.onResolve(
        {
          filter: /.*/
        },
        async ({ path: id, importer }) => {
          // use vite resolver to support urls and omitted extensions
          const resolved = await resolve(id, importer)
          if (resolved) {
            if (shouldExternalizeDep(resolved, id)) {
              return externalUnlessEntry({ path: id })
            }

            const namespace = htmlTypesRE.test(resolved) ? 'html' : undefined

            return {
              path: path.resolve(cleanUrl(resolved)),
              namespace
            }
          } else {
            // resolve failed... probably unsupported type
            return externalUnlessEntry({ path: id })
          }
        }
      )

      // for jsx/tsx, we need to access the content and check for
      // presence of import.meta.glob, since it results in import relationships
      // but isn't crawled by esbuild.
      build.onLoad({ filter: JS_TYPES_RE }, ({ path: id }) => {
        let ext = path.extname(id).slice(1)
        if (ext === 'mjs') ext = 'js'

        let contents = fs.readFileSync(id, 'utf-8')
        if (ext.endsWith('x') && config.esbuild && config.esbuild.jsxInject) {
          contents = config.esbuild.jsxInject + `\n` + contents
        }

        if (contents.includes('import.meta.glob')) {
          return transformGlob(contents, id, config.root, ext).then(
            (contents) => ({
              loader: ext,
              contents
            })
          )
        }
        return {
          loader: ext,
          contents
        }
      })
    }
  }
}

async function transformGlob(source, importer, root, loader) {
  // transform the content first since es-module-lexer can't handle non-js
  if (loader !== 'js') {
    source = (await transform(source, { loader })).code
  }

  await init
  const imports = parse(source)[0]
  const s = new MagicString(source)
  for (let index = 0; index < imports.length; index++) {
    const { s: start, e: end, ss: expStart } = imports[index]
    const url = source.slice(start, end)
    if (url !== 'import.meta') continue
    if (source.slice(end, end + 5) !== '.glob') continue
    const { importsString, exp, endIndex } = await transformImportGlob(
      source,
      start,
      normalizePath(importer),
      index,
      root
    )
    s.prepend(importsString)
    s.overwrite(expStart, endIndex, exp)
  }
  return s.toString()
}

/**
 * when using TS + (Vue + `<script setup>`) or Svelte, imports may seem
 * unused to esbuild and dropped in the build output, which prevents
 * esbuild from crawling further.
 * the solution is to add `import 'x'` for every source to force
 * esbuild to keep crawling due to potential side effects.
 */
function extractImportPaths(code) {
  // empty singleline & multiline comments to avoid matching comments
  code = code
    .replace(multilineCommentsRE, '/* */')
    .replace(singlelineCommentsRE, '')

  let js = ''
  let m
  while ((m = importsRE.exec(code)) != null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === importsRE.lastIndex) {
      importsRE.lastIndex++
    }
    js += `\nimport ${m[1]}`
  }
  return js
}

function shouldExternalizeDep(resolvedId, rawId) {
  // not a valid file path
  if (!path.isAbsolute(resolvedId)) {
    return true
  }
  // virtual id
  if (resolvedId === rawId || resolvedId.includes('\0')) {
    return true
  }
  // resolved is not a scannable type
  if (!JS_TYPES_RE.test(resolvedId) && !htmlTypesRE.test(resolvedId)) {
    return true
  }
  return false
}

module.exports = {
  importsRE,
  scanImports,
  shouldExternalizeDep
}