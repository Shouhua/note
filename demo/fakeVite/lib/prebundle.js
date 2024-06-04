const path = require('path')
const fs = require('fs-extra')
const resolve = require('resolve')
const { init, parse } = require('es-module-lexer')
const chalk = require('chalk')
const { createHash } = require('crypto')

const OPTIMIZE_CACHE_DIR = `node_modules/.vite_opt_cache`
const supportedExts = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
const mainFields = ['module', 'jsnext', 'jsnext:main', 'browser', 'main']

const debug = require('debug')('fakeVite:prebundle')

function lookupFile(
  dir,
  formats,
  pathOnly = false
){
  for (const format of formats) {
    const fullPath = path.join(dir, format)
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return pathOnly ? fullPath : fs.readFileSync(fullPath, 'utf-8')
    }
  }
  const parentDir = path.dirname(dir)
  if (parentDir !== dir) {
    return lookupFile(parentDir, formats, pathOnly)
  }
}

const lockfileFormats = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']

let cachedHash

function getDepHash(
  root,
  configPath
) {
  if (cachedHash) {
    return cachedHash
  }
  let content = lookupFile(root, lockfileFormats) || ''
  const pkg = JSON.parse(lookupFile(root, [`package.json`]) || '{}')
  content += JSON.stringify(pkg.dependencies)
  // also take config into account
  if (configPath) {
    content += fs.readFileSync(configPath, 'utf-8')
  }
  return createHash('sha1').update(content).digest('base64')
}

const isFile = (file) => {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}

const queryRE = /\?.*$/
const hashRE = /#.*$/

const cleanUrl = (url) =>
  url.replace(hashRE, '').replace(queryRE, '')

const resolveFilePathPostfix = (filePath) => {
  const cleanPath = cleanUrl(filePath)
  if (!isFile(cleanPath)) {
    let postfix = ''
    for (const ext of supportedExts) {
      if (isFile(cleanPath + ext)) {
        postfix = ext
        break
      }
      if (isFile(path.join(cleanPath, '/index' + ext))) {
        postfix = '/index' + ext
        break
      }
    }
    const queryMatch = filePath.match(/\?.*$/)
    const query = queryMatch ? queryMatch[0] : ''
    const resolved = cleanPath + postfix + query
    if (resolved !== filePath) {
      debug(`(postfix) ${filePath} -> ${resolved}`)
      return postfix
    }
  }
}

const nodeModulesInfoMap = new Map()
const nodeModulesFileMap = new Map()
const resolveFrom = (root, id) =>
  resolve.sync(id, {
    basedir: root,
    extensions: supportedExts,
    preserveSymlinks: false
  })
function resolveNodeModule(
  root,
  id,
  resolver
) {
  const cacheKey = `${root}#${id}`
  const cached = nodeModulesInfoMap.get(cacheKey)
  if (cached) {
    return cached
  }
  let pkgPath
  try {
    // see if the id is a valid package name
    pkgPath = resolveFrom(root, `${id}/package.json`)
  } catch (e) {
    debug(`failed to resolve package.json for ${id}`)
  }

  if (pkgPath) {
    // if yes, this is a entry import. resolve entry file
    let pkg
    try {
      pkg = fs.readJSONSync(pkgPath)
    } catch (e) {
      return
    }
    let entryPoint
    if (!entryPoint) {
      for (const field of mainFields) {
        if (typeof pkg[field] === 'string') {
          entryPoint = pkg[field]
          break
        }
      }
    }

    debug(`(node_module entry) ${id} -> ${entryPoint}`)

    // save resolved entry file path using the deep import path as key
    // e.g. foo/dist/foo.js
    // this is the path raw imports will be rewritten to, and is what will
    // be passed to resolveNodeModuleFile().
    let entryFilePath

    if (!entryFilePath && entryPoint) {
      // #284 some packages specify entry without extension...
      entryFilePath = path.join(path.dirname(pkgPath), entryPoint)
      const postfix = resolveFilePathPostfix(entryFilePath)
      if (postfix) {
        entryPoint += postfix
        entryFilePath += postfix
      }
      entryPoint = path.posix.join(id, entryPoint)
      // save the resolved file path now so we don't need to do it again in
      // resolveNodeModuleFile()
      nodeModulesFileMap.set(entryPoint, entryFilePath)
    }

    const result = {
      entry: entryPoint,
      entryFilePath,
      pkg
    }
    nodeModulesInfoMap.set(cacheKey, result)
    return result
  }
}

function resolveQualifiedDeps(
  root,
  options,
  resolver
){
  const { 
    include = [], 
    exclude = [], 
    link = [] } = options
  const pkgContent = lookupFile(root, ['package.json'])
  if (!pkgContent) {
    return {
      qualified: {},
      external: []
    }
  }

  const pkg = JSON.parse(pkgContent)
  const deps = Object.keys(pkg.dependencies || {})
  const qualifiedDeps = deps.filter((id) => {
    if (include && include.includes(id)) {
      // already force included
      return false
    }
    if (exclude && exclude.includes(id)) {
      debug(`skipping ${id} (excluded)`)
      return false
    }
    if (link && link.includes(id)) {
      debug(`skipping ${id} (link)`)
      return false
    }
    const pkgInfo = resolveNodeModule(root, id, resolver)
    if (!pkgInfo || !pkgInfo.entryFilePath) {
      debug(`skipping ${id} (cannot resolve entry)`)
      console.log(root, id)
      console.error(
        chalk.yellow(
          `[vite] cannot resolve entry for dependency ${chalk.cyan(id)}.`
        )
      )
      return false
    }
    const { entryFilePath } = pkgInfo
    if (!supportedExts.includes(path.extname(entryFilePath))) {
      debug(`skipping ${id} (entry is not js)`)
      return false
    }
    if (!fs.existsSync(entryFilePath)) {
      debug(`skipping ${id} (entry file does not exist)`)
      console.error(
        chalk.yellow(
          `[vite] dependency ${id} declares non-existent entry file ${entryFilePath}.`
        )
      )
      return false
    }
    const content = fs.readFileSync(entryFilePath, 'utf-8')
    const [imports, exports] = parse(content)
    if (!exports.length && !/export\s+\*\s+from/.test(content)) {
      debug(`optimizing ${id} (no exports, likely commonjs)`)
      return true
    }
    for (const { s, e } of imports) {
      let i = content.slice(s, e).trim()
      // i = resolver.alias(i) || i
      if (i.startsWith('.')) {
        debug(`optimizing ${id} (contains relative imports)`)
        return true
      }
      if (!deps.includes(i)) {
        debug(`optimizing ${id} (imports sub dependencies)`)
        return true
      }
    }
    debug(`skipping ${id} (single esm file, doesn't need optimization)`)
  })


  const qualified = {}
  qualifiedDeps.forEach((id) => {
    qualified[id] = resolveNodeModule(root, id, resolver).entryFilePath
  })

  // mark non-optimized deps as external
  const external = deps
    .filter((id) => !qualifiedDeps.includes(id))

  return {
    qualified,
    external
  }
}

const warningIgnoreList = [`CIRCULAR_DEPENDENCY`, `THIS_IS_UNDEFINED`]
const dynamicImportWarningIgnoreList = [
  `Unsupported expression`,
  `statically analyzed`
]

const isBuiltin = require('isbuiltin')

function onRollupWarning(
  options
) {
  return (warning, warn) => {
    if (warning.code === 'UNRESOLVED_IMPORT') {
      let message
      const id = warning.source
      const importer = warning.importer
      if (isBuiltin(id)) {
        let importingDep
        if (importer) {
          const pkg = JSON.parse(lookupFile(importer, ['package.json']) || `{}`)
          if (pkg.name) {
            importingDep = pkg.name
          }
        }
        const allowList = options && options.allowNodeBuiltins
        if (importingDep && allowList && allowList.includes(importingDep)) {
          return
        }
        const dep = importingDep
          ? `Dependency ${chalk.yellow(importingDep)}`
          : `A dependency`
        message =
          `${dep} is attempting to import Node built-in module ${chalk.yellow(
            id
          )}.\n` +
          `This will not work in a browser environment.\n` +
          `Imported by: ${chalk.gray(importer)}`
      } else {
        message =
          `[vite]: Rollup failed to resolve import "${warning.source}" from "${warning.importer}".\n` +
          `This is most likely unintended because it can break your application at runtime.\n` +
          `If you do want to externalize this module explicitly add it to\n` +
          `\`rollupInputOptions.external\``
      }
      throw new Error(message)
    }
    if (
      warning.plugin === 'rollup-plugin-dynamic-import-variables' &&
      dynamicImportWarningIgnoreList.some((msg) =>
        warning.message.includes(msg)
      )
    ) {
      return
    }

    if (!warningIgnoreList.includes(warning.code)) {
      warn(warning)
    }
  }
}

async function optimizeDeps(config) {
  const { 
    force,
    root = process.cwd()
  } = config
  const options = config.optimizeDeps
	const cacheDir = path.join(root, 'node_modules/.vite_opt_cache')	
	const hashPath = path.join(cacheDir, 'hash')
	const depHash = getDepHash(root) // package.json中dependencies的hash值，判断是否有更新

	if (!force) {
    let prevhash
    try {
      prevhash = await fs.readFile(hashPath, 'utf-8')
    } catch (e) {}
    if (prevhash === depHash) {
      console.log('Hash is consistent. Skipping. Use --force to override.')
      return
    }
  }

	await fs.remove(cacheDir)
	await fs.ensureDir(cacheDir)

	// await init
	const { qualified, external } = resolveQualifiedDeps(root, options, resolver={})

	if (!Object.keys(qualified).length) {
    await fs.writeFile(hashPath, depHash)
    console.log(`No listed dependency requires optimization. Skipping.`)
    return
  }

      // This is auto run on server start - let the user know that we are
    // pre-optimizing deps
    console.log(chalk.greenBright(`[vite] Optimizable dependencies detected:`))
    console.log(Object.keys(qualified).map((id) => chalk.yellow(id)).join(`, `))

	console.log(`Pre-bundling them to speed up dev server page load...\n` +
	`(this will be run only when your dependencies have changed)`)

  const { nodeResolve } = require('@rollup/plugin-node-resolve')
  const dynamicImport = require('rollup-plugin-dynamic-import-variables')

	try {
		const rollup = require('rollup')
		const bundle = await rollup.rollup({
			input: qualified,
			external,
			onwarn: onRollupWarning(options),
			// ...config.rollupInputOptions,
			plugins: [
				require('@rollup/plugin-json')({
					preferConst: true,
					indent: '  ',
					compact: false,
					namedExports: true
				}),
				nodeResolve({
					rootDir: root,
					extensions: supportedExts,
					preferBuiltins: false,
					dedupe: [],
					mainFields
				}),
				require('@rollup/plugin-commonjs')({
					extensions: ['.js', '.cjs']
				}),
				dynamicImport({
					warnOnError: true,
					include: [/\.js$/],
					exclude: [/node_modules/]
				})
			]
		})
		const { output } = await bundle.generate({
			// ...config.rollupOutputOptions,
			format: 'es',
			exports: 'named',
			entryFileNames: '[name].js',
			chunkFileNames: 'common/[name]-[hash].js'
		})
		for (const chunk of output) {
			if (chunk.type === 'chunk') {
				const fileName = chunk.fileName
				const filePath = path.join(cacheDir, fileName)
				await fs.ensureDir(path.dirname(filePath))
				await fs.writeFile(filePath, chunk.code)
			}
		}
	
		await fs.writeFile(hashPath, depHash)
	} catch (e) {
		console.log(e)
		process.exit(1)
	}
}

module.exports = {
	optimizeDeps,
	OPTIMIZE_CACHE_DIR
}