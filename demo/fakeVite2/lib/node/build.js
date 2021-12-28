const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const { resolveConfig } = require('./config')
const { emptyDir, copyDir, normalizePath, lookupFile } = require('./utils')
const { resolveBuildPlugins } = require('./buildConfig')
const { isCSSRequest } = require('./plugins/css')

let parallelCallCounts = 0
const parallelBuilds = []

async function build(inlineConfig = {}) {
  parallelCallCounts++
  try {
    return await doBuild(inlineConfig)
  } finally {
    parallelCallCounts--
    if(parallelCallCounts <= 0) {
      await Promise.all(parallelBuilds.map(build => build.close()))
      parallelBuilds.length = 0
    }
  }
}

async function doBuild(inlineConfig) {
  const config = await resolveConfig(inlineConfig, 'build', 'production')
  const options = config.build
  const input = options.rollupOptions.input
  const outDir = options.outDir
  const ssr = !!options.ssr
  const libOptions = options.lib
  config.logger.info(
    chalk.cyan(
      `fakeVite2 v${require('fakevite2/package.json').version} ${chalk.green(
        `building ${ssr ? `SSR bundle ` : ``}for ${config.mode}...`
      )}`
    )
  )

  // inject ssr arg to plugin load/transform hooks
  // const plugins = (
  //   ssr ? config.plugins.map((p) => injectSsrFlagToHooks(p)) : config.plugins
  // ) as Plugin[]
  const plugins = config.plugins
  const userExternal = options.rollupOptions && options.rollupOptions.external
  let external = userExternal
  // if (ssr) {
  //   // see if we have cached deps data available
  //   let knownImports: string[] | undefined
  //   if (config.cacheDir) {
  //     const dataPath = path.join(config.cacheDir, '_metadata.json')
  //     try {
  //       const data = JSON.parse(
  //         fs.readFileSync(dataPath, 'utf-8')
  //       ) as DepOptimizationMetadata
  //       knownImports = Object.keys(data.optimized)
  //     } catch (e) {}
  //   }
  //   if (!knownImports) {
  //     // no dev deps optimization data, do a fresh scan
  //     knownImports = Object.keys((await scanImports(config)).deps)
  //   }
  //   external = resolveExternal(
  //     resolveSSRExternal(config, knownImports),
  //     userExternal
  //   )
  // }

  const rollup = require('rollup')
  const rollupOptions = {
    context: 'globalThis',
    preserveEntrySignatures: ssr
      ? 'allow-extension'
      : libOptions
      ? 'strict'
      : false,
    ...options.rollupOptions,
    plugins,
    external,
    onwarn(warning, warn) {
      onRollupWarning(warning, warn, config)
    }
  }
  const outputBuildError = (e) => {
    let msg = chalk.red((e.plugin ? `[${e.plugin}] ` : '') + e.message)
    if (e.id) {
      msg += `\nfile: ${chalk.cyan(
        e.id + (e.loc ? `:${e.loc.line}:${e.loc.column}` : '')
      )}`
    }
    if (e.frame) {
      msg += `\n` + chalk.yellow(e.frame)
    }
    config.logger.error(msg, { error: e })
  }
  try {
    const buildOutputOptions = (output = {}) => {
      if (output.output) {
        config.logger.warn(
          `You've set "rollupOptions.output.output" in your config. ` +
            `This is deprecated and will override all Vite.js default output options. ` +
            `Please use "rollupOptions.output" instead.`
        )
      }

      return {
        dir: outDir,
        format: ssr ? 'cjs' : 'es',
        exports: ssr ? 'named' : 'auto',
        sourcemap: options.sourcemap,
        name: libOptions ? libOptions.name : undefined,
        entryFileNames: ssr
          ? `[name].js`
          : libOptions
          ? resolveLibFilename(libOptions, output.format || 'es', config.root)
          : path.posix.join(options.assetsDir, `[name].[hash].js`),
        chunkFileNames: libOptions
          ? `[name].js`
          : path.posix.join(options.assetsDir, `[name].[hash].js`),
        assetFileNames: libOptions
          ? `[name].[ext]`
          : path.posix.join(options.assetsDir, `[name].[hash].[ext]`),
        // #764 add `Symbol.toStringTag` when build es module into cjs chunk
        // #1048 add `Symbol.toStringTag` for module default export
        namespaceToStringTag: true,
        inlineDynamicImports: ssr && typeof input === 'string',
        manualChunks:
          !ssr &&
          !libOptions &&
          output && output.format !== 'umd' &&
          output.format !== 'iife'
            ? createMoveToVendorChunkFn(config)
            : undefined,
        ...output
      }
    }

    // resolve lib mode outputs
    const outputs = resolveBuildOutputs(
      options.rollupOptions && options.rollupOptions.output,
      libOptions,
      config.logger
    )

    // watch file changes with rollup
    if (config.build.watch) {
      config.logger.info(chalk.cyanBright(`\nwatching for file changes...`))

      const output = []
      if (Array.isArray(outputs)) {
        for (const resolvedOutput of outputs) {
          output.push(buildOutputOptions(resolvedOutput))
        }
      } else {
        output.push(buildOutputOptions(outputs))
      }

      const watcherOptions = config.build.watch
      const watcher = rollup.watch({
        ...rollupOptions,
        output,
        watch: {
          ...watcherOptions,
          chokidar: {
            ignored: [
              '**/node_modules/**',
              '**/.git/**',
              ...(watcherOptions?.chokidar?.ignored || [])
            ],
            ignoreInitial: true,
            ignorePermissionErrors: true,
            ...watcherOptions.chokidar
          }
        }
      })

      watcher.on('event', (event) => {
        if (event.code === 'BUNDLE_START') {
          config.logger.info(chalk.cyanBright(`\nbuild started...`))
          if (options.write) {
            prepareOutDir(outDir, options.emptyOutDir, config)
          }
        } else if (event.code === 'BUNDLE_END') {
          event.result.close()
          config.logger.info(chalk.cyanBright(`built in ${event.duration}ms.`))
        } else if (event.code === 'ERROR') {
          outputBuildError(event.error)
        }
      })

      // stop watching
      watcher.close()

      return watcher
    }

    console.log(rollupOptions.plugins.map(item => item.name).join(', '));
    // write or generate files with rollup
    const bundle = await rollup.rollup(rollupOptions)
    parallelBuilds.push(bundle)

    const generate = (output = {}) => {
      return bundle[options.write ? 'write' : 'generate'](
        buildOutputOptions(output)
      )
    }

    if (options.write) {
      prepareOutDir(outDir, options.emptyOutDir, config)
    }

    if (Array.isArray(outputs)) {
      const res = []
      for (const output of outputs) {
        res.push(await generate(output))
      }
      return res
    } else {
      return await generate(outputs)
    }
  } catch (e) {
    outputBuildError(e)
    throw e
  }

}

const warningIgnoreList = [`CIRCULAR_DEPENDENCY`, `THIS_IS_UNDEFINED`]
const dynamicImportWarningIgnoreList = [
  `Unsupported expression`,
  `statically analyzed`
]
function onRollupWarning(warning, warn, config) {
  if (warning.code === 'UNRESOLVED_IMPORT') {
    const id = warning.source
    const importer = warning.importer
    // throw unless it's commonjs external...
    if (!importer || !/\?commonjs-external$/.test(importer)) {
      throw new Error(
        `[fakeVite]: Rollup failed to resolve import "${id}" from "${importer}".\n` +
          `This is most likely unintended because it can break your application at runtime.\n` +
          `If you do want to externalize this module explicitly add it to\n` +
          `\`build.rollupOptions.external\``
      )
    }
  }

  if (
    warning.plugin === 'rollup-plugin-dynamic-import-variables' &&
    dynamicImportWarningIgnoreList.some((msg) => warning.message.includes(msg))
  ) {
    return
  }

  if (!warningIgnoreList.includes(warning.code)) {
    const userOnWarn = config.build.rollupOptions && config.build.rollupOptions.onwarn
    if (userOnWarn) {
      userOnWarn(warning, warn)
    } else if (warning.code === 'PLUGIN_WARNING') {
      config.logger.warn(
        `${chalk.bold.yellow(`[plugin:${warning.plugin}]`)} ${chalk.yellow(
          warning.message
        )}`
      )
    } else {
      warn(warning)
    }
  }
}

function resolveLibFilename(libOptions, format, root) {
  if (typeof libOptions.fileName === 'function') {
    return libOptions.fileName(format)
  }

  const name = libOptions.fileName || getPkgName(root)

  if (!name)
    throw new Error(
      'Name in package.json is required if option "build.lib.fileName" is not provided.'
    )

  return `${name}.${format}.js`
}
function getPkgName(root) {
  const { name } = JSON.parse(lookupFile(root, ['package.json']) || `{}`)

  return name && name.startsWith('@') ? name.split('/')[1] : name
}

function createMoveToVendorChunkFn(config) {
  const cache = new Map()
  return (id, { getModuleInfo }) => {
    if (
      id.includes('node_modules') &&
      !isCSSRequest(id) &&
      staticImportedByEntry(id, getModuleInfo, cache)
    ) {
      return 'vendor'
    }
  }
}

function staticImportedByEntry(
  id,
  getModuleInfo,
  cache,
  importStack = []
) {
  if (cache.has(id)) {
    return cache.get(id)
  }
  if (importStack.includes(id)) {
    // circular deps!
    cache.set(id, false)
    return false
  }
  const mod = getModuleInfo(id)
  if (!mod) {
    cache.set(id, false)
    return false
  }

  if (mod.isEntry) {
    cache.set(id, true)
    return true
  }
  const someImporterIs = mod.importers.some((importer) =>
    staticImportedByEntry(
      importer,
      getModuleInfo,
      cache,
      importStack.concat(id)
    )
  )
  cache.set(id, someImporterIs)
  return someImporterIs
}

function resolveBuildOutputs(outputs, libOptions, logger) {
  if (libOptions) {
    const formats = libOptions.formats || ['es', 'umd']
    if (
      (formats.includes('umd') || formats.includes('iife')) &&
      !libOptions.name
    ) {
      throw new Error(
        `Option "build.lib.name" is required when output formats ` +
          `include "umd" or "iife".`
      )
    }
    if (!outputs) {
      return formats.map((format) => ({ format }))
    } else if (!Array.isArray(outputs)) {
      return formats.map((format) => ({ ...outputs, format }))
    } else if (libOptions.formats) {
      // user explicitly specifying own output array
      logger.warn(
        chalk.yellow(
          `"build.lib.formats" will be ignored because ` +
            `"build.rollupOptions.output" is already an array format`
        )
      )
    }
  }
  return outputs
}

function prepareOutDir(outDir, emptyOutDir, config) {
  if (fs.existsSync(outDir)) {
    if (
      emptyOutDir == null &&
      !normalizePath(outDir).startsWith(config.root + '/')
    ) {
      // warn if outDir is outside of root
      config.logger.warn(
        chalk.yellow(
          `\n${chalk.bold(`(!)`)} outDir ${chalk.white.dim(
            outDir
          )} is not inside project root and will not be emptied.\n` +
            `Use --emptyOutDir to override.\n`
        )
      )
    } else if (emptyOutDir !== false) {
      emptyDir(outDir, ['.git'])
    }
  }
  if (config.publicDir && fs.existsSync(config.publicDir)) {
    copyDir(config.publicDir, outDir)
  }
}

module.exports = {
  build
}