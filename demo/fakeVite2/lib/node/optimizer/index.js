const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { createHash } = require('crypto')
const { build } = require('esbuild')
const {
  createDebugger,
  emptyDir,
  lookupFile,
  normalizePath,
  writeFile,
  flattenId,
  normalizeId
} = require('../utils')
const { esbuildDepPlugin } = require('./esbuildDepPlugin')
const { init, parse } = require('es-module-lexer')
const { scanImports } = require('./scan')
const { transformWithEsbuild } = require('../plugins/esbuild')
const { performance } = require('perf_hooks')

const debug = createDebugger('vite:deps')

async function optimizeDeps(
  config,
  force = config.server.force,
  asCommand = false,
  newDeps, // missing imports encountered after server has started
  ssr
) {
  config = {
    ...config,
    command: 'build'
  }

  const { root, logger, cacheDir } = config
  const log = asCommand ? logger.info : debug

  if (!cacheDir) {
    log(`No cache directory. Skipping.`)
    return null
  }

  const dataPath = path.join(cacheDir, '_metadata.json')
  const mainHash = getDepHash(root, config)
  const data = {
    hash: mainHash,
    browserHash: mainHash,
    optimized: {}
  }

  if (!force) {
    let prevData
    try {
      prevData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    } catch (e) {}
    // hash is consistent, no need to re-bundle
    if (prevData && prevData.hash === data.hash) {
      log('Hash is consistent. Skipping. Use --force to override.')
      return prevData
    }
  }

  if (fs.existsSync(cacheDir)) {
    emptyDir(cacheDir)
  } else {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  // a hint for Node.js
  // all files in the cache directory should be recognized as ES modules
  writeFile(
    path.resolve(cacheDir, 'package.json'),
    JSON.stringify({ type: 'module' })
  )

  let deps, missing
  if (!newDeps) {
    ;({ deps, missing } = await scanImports(config))
  } else {
    deps = newDeps
    missing = {}
  }

  // update browser hash
  data.browserHash = createHash('sha256')
    .update(data.hash + JSON.stringify(deps))
    .digest('hex')
    .substring(0, 8)

  const missingIds = Object.keys(missing)
  if (missingIds.length) {
    throw new Error(
      `The following dependencies are imported but could not be resolved:\n\n  ${missingIds
        .map(
          (id) =>
            `${chalk.cyan(id)} ${chalk.white.dim(
              `(imported by ${missing[id]})`
            )}`
        )
        .join(`\n  `)}\n\nAre they installed?`
    )
  }

  const include = config.optimizeDeps && config.optimizeDeps.include
  if (include) {
    const resolve = config.createResolver({ asSrc: false })
    for (const id of include) {
      // normalize 'foo   >bar` as 'foo > bar' to prevent same id being added
      // and for pretty printing
      const normalizedId = normalizeId(id)
      if (!deps[normalizedId]) {
        const entry = await resolve(id)
        if (entry) {
          deps[normalizedId] = entry
        } else {
          throw new Error(
            `Failed to resolve force included dependency: ${chalk.cyan(id)}`
          )
        }
      }
    }
  }

  const qualifiedIds = Object.keys(deps)

  if (!qualifiedIds.length) {
    writeFile(dataPath, JSON.stringify(data, null, 2))
    log(`No dependencies to bundle. Skipping.\n\n\n`)
    return data
  }

  const total = qualifiedIds.length
  const maxListed = 5
  const listed = Math.min(total, maxListed)
  const extra = Math.max(0, total - maxListed)
  const depsString = chalk.yellow(
    qualifiedIds.slice(0, listed).join(`\n  `) +
      (extra > 0 ? `\n  (...and ${extra} more)` : ``)
  )
  if (!asCommand) {
    if (!newDeps) {
      // This is auto run on server start - let the user know that we are
      // pre-optimizing deps
      logger.info(
        chalk.greenBright(`Pre-bundling dependencies:\n  ${depsString}`)
      )
      logger.info(
        `(this will be run only when your dependencies or config have changed)`
      )
    }
  } else {
    logger.info(chalk.greenBright(`Optimizing dependencies:\n  ${depsString}`))
  }

  // esbuild generates nested directory output with lowest common ancestor base
  // this is unpredictable and makes it difficult to analyze entry / output
  // mapping. So what we do here is:
  // 1. flatten all ids to eliminate slash
  // 2. in the plugin, read the entry ourselves as virtual files to retain the
  //    path.
  const flatIdDeps = {}
  const idToExports = {}
	const flatIdToExports = {}

  const { plugins = [], ...esbuildOptions } =
    (config.optimizeDeps && config.optimizeDeps.esbuildOptions) ?? {}

  await init
  for (const id in deps) {
    // pkgPath  => "my-lib > foo"
    // id.replace(/(\s*>\s*)/g, '__').replace(/[\/\.]/g, '_')
    const flatId = flattenId(id)
    const filePath = (flatIdDeps[flatId] = deps[id])
    const entryContent = fs.readFileSync(filePath, 'utf-8')
    let exportsData
    try {
      exportsData = parse(entryContent)
    } catch {
      debug(
        `Unable to parse dependency: ${id}. Trying again with a JSX transform.`
      )
      const transformed = await transformWithEsbuild(entryContent, filePath, {
        loader: 'jsx'
      })
      // Ensure that optimization won't fail by defaulting '.js' to the JSX parser.
      // This is useful for packages such as Gatsby.
      esbuildOptions.loader = {
        '.js': 'jsx',
        ...esbuildOptions.loader
      }
      exportsData = parse(transformed.code)
    }
    // 处理里面的imports
    for (const { ss, se } of exportsData[0]) {
      const exp = entryContent.slice(ss, se)
      // export * from 
      if (/export\s+\*\s+from/.test(exp)) {
        exportsData.hasReExports = true
      }
    }
    idToExports[id] = exportsData
    flatIdToExports[flatId] = exportsData
  }

  const define = {
    'process.env.NODE_ENV': JSON.stringify(config.mode)
  }
  for (const key in config.define) {
    const value = config.define[key]
    define[key] = typeof value === 'string' ? value : JSON.stringify(value)
  }

  const start = performance.now()

  // 打包成单一文件，避免一个包多个请求
  const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: Object.keys(flatIdDeps),
    bundle: true,
    format: 'esm',
    target: config.build.target || undefined,
    external: config.optimizeDeps && config.optimizeDeps.exclude,
    logLevel: 'error',
    splitting: true,
    sourcemap: true,
    outdir: cacheDir, // NOTICE 生成到cacheDir
    ignoreAnnotations: true,
    metafile: true,
    define,
    plugins: [
      ...plugins,
      esbuildDepPlugin(flatIdDeps, flatIdToExports, config, ssr)
    ],
    ...esbuildOptions
  })

  const meta = result && result.metafile

  // the paths in `meta.outputs` are relative to `process.cwd()`
  const cacheDirOutputPath = path.relative(process.cwd(), cacheDir)

  for (const id in deps) {
    const entry = deps[id]
    data.optimized[id] = {
      file: normalizePath(path.resolve(cacheDir, flattenId(id) + '.js')),
      src: entry,
      needsInterop: needsInterop(
        id,
        idToExports[id],
        meta.outputs,
        cacheDirOutputPath
      )
    }
  }

  writeFile(dataPath, JSON.stringify(data, null, 2))

  debug(`deps bundled in ${(performance.now() - start).toFixed(2)}ms`)
  return data
}

// https://github.com/vitejs/vite/issues/1724#issuecomment-767619642
// a list of modules that pretends to be ESM but still uses `require`.
// this causes esbuild to wrap them as CJS even when its entry appears to be ESM.
const KNOWN_INTEROP_IDS = new Set(['moment'])

function needsInterop(id, exportsData, outputs, cacheDirOutputPath) {
  if (KNOWN_INTEROP_IDS.has(id)) {
    return true
  }
  const [imports, exports] = exportsData
  // entry has no ESM syntax - likely CJS or UMD
  if (!exports.length && !imports.length) {
    return true
  }

  // if a peer dependency used require() on a ESM dependency, esbuild turns the
  // ESM dependency's entry chunk into a single default export... detect
  // such cases by checking exports mismatch, and force interop.
  const flatId = flattenId(id) + '.js'
  let generatedExports
  for (const output in outputs) {
    if (
      normalizePath(output) ===
      normalizePath(path.join(cacheDirOutputPath, flatId))
    ) {
      generatedExports = outputs[output].exports
      break
    }
  }

  if (
    !generatedExports ||
    (isSingleDefaultExport(generatedExports) && !isSingleDefaultExport(exports))
  ) {
    return true
  }
  return false
}

function isSingleDefaultExport(exports) {
  return exports.length === 1 && exports[0] === 'default'
}

const lockfileFormats = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']

function getDepHash(root, config) {
  let content = lookupFile(root, lockfileFormats) || ''
  // also take config into account
  // only a subset of config options that can affect dep optimization
  content += JSON.stringify(
    {
      mode: config.mode,
      root: config.root,
      resolve: config.resolve,
      assetsInclude: config.assetsInclude,
      plugins: config.plugins.map((p) => p.name),
      optimizeDeps: {
        include: config.optimizeDeps && config.optimizeDeps.include,
        exclude: config.optimizeDeps && config.optimizeDeps.exclude
      }
    },
    (_, value) => {
      if (typeof value === 'function' || value instanceof RegExp) {
        return value.toString()
      }
      return value
    }
  )
  return createHash('sha256').update(content).digest('hex').substring(0, 8)
}

module.exports = {
	optimizeDeps
}
