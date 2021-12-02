const path = require('path')
const fs = require('fs')
const { build } = require('esbuild')
const { performance } = require('perf_hooks')
const { createLogger } = require('./logger')
const chalk = require('chalk')
const {
	createDebugger,
	lookupFile,
	dynamicImport,
	normalizePath,
	isObject
} = require('./utils')

const debug = createDebugger('fakeVite:config')

function mergeAlias(a, b) {
	return [...normalizeAlias(a), ...normalizeAlias(b)]
}
function normalizeAlias(o) {
	return Array.isArray(o)
		? o.map(normalizeSingleAlias)
		: Object.keys(o).map((find) => {
			normalizeSingleAlias({
				find,
				replacement: o['find']
			})
		})
}
function normalizeSingleAlias({find, replacement}) {
	if(typeof find === 'string' &&
		find.endsWith('/') && 
		replacement.endsWith('/')
	) {
		find = find.slice(0, find.length -1)
		replacement = replacement.slice(0, replacement.length -1)
	}
	return { find, replacement }
}

function mergeConfigRecursively(a, b, rootPath) {
	const merged = { ...a }
	for(const key in b) {
		const value = b[key]
		if(value == null) {
			continue
		}
		const existing = merged[key]
		if(Array.isArray(existing) && Array.isArray(value)) {
			merged[key] = [...existing, ...value]
			continue
		}
		if(isObject(existing) && isObject(value)) {
			merged[key] = mergeConfigRecursively(existing, value, rootPath ? `${rootPath}.${key}` : key)
			continue
		}
		if(existing != null) {
			if(key === 'alias' && (rootPath === 'resolve' || rootPath === '')) {
				merged[key] = mergeAlias(existing, value)
				continue
			} else if(key === 'assetsInclude' && rootPath === '') {
				merged[key] = [].concat(existing, value)
				continue
			} else if(key === 'noExternal' && existing === true) {
				continue
			}
		}

		merged[key] = value
	}
	return merged
}

function mergeConfig(a, b, isRoot = true) {
	return mergeConfigRecursively(a, b, isRoot ? '' : '.')
}

async function resolveConfig(
	inlineConfig,
	command = 'serve',
	defaultMode = 'development'
	) {
		let config = inlineConfig
		let configFileDependencies = []
		let mode = inlineConfig.mode || defaultMode

		if(mode === 'production') {
			process.env.NODE_ENV = 'production'
		}

		const configEnv = {
			mode,
			command
		}

		let { configFile } = config
		if(configFile !== false) {
			const loadResult = await loadConfigFromFile(
				configEnv,
				configFile,
				config.root,
				config.logLevel
			)
			if(loadResult) {
				config = mergeConfig(loadResult.config, config)
				configFile = loadResult.path
				configFileDependencies = loadResult.dependencies
			}
		}
}

async function loadConfigFromFile(
	configEnv,
	configFile,
	configRoot = process.cwd(),
	logLevel
) {
	const start = performance.now()
	const getTime = () => `${(performance.now() - start).toFixed(2)}ms`

	let resolvedPath
	let isTs = false
	let isESM = false
	let dependencies = []

	try {
		const pkg = lookupFile(configRoot, ['package.json'])
		if(pkg && JSON.parse(pkg).type === 'module') {
			isESM = true
		}
	} catch(e) {}

	if(configFile) {
		resolvedPath = path.resolve(configFile)
		isTs = configFile.endsWith('.ts')

		if(configFile.endsWith('.mjs')) {
			isESM = true
		}
	} else {
		const jsConfigFile = path.resolve(configRoot, 'fakeVite.config.js')
		if(fs.existsSync(jsConfigFile)) {
			resolvedPath = jsConfigFile
		}
		if(!resolvedPath) {
			const mjsConfigFile = path.resolve(configRoot, 'fakeVite.config.mjs')
			if(fs.existsSync(mjsConfigFile)) {
				resolvedPath = mjsConfigFile
				isESM = true
			}
		}
		if(!resolvedPath) {
			const tsConfigFile = path.resolve(configRoot, 'fakeVite.config.ts')
			if(fs.existsSync(tsConfigFile)) {
				resolvedPath = tsConfigFile
				isTs = true
			}
		}
	}
	if(!resolvedPath) {
		debug('no config file found.')
		return null
	}

	try {
		let userConfig
		if(isESM) {
			const fileUrl = require('url').pathToFileURL(resolvedPath)
			const bundled = await bundleConfigFile(resolvedPath, true)
			dependencies = bundled.dependencies
			if(isTs) {
				fs.writeFileSync(resolvedPath + '.js', bundled.code)
				userConfig = (await dynamicImport(`${fileUrl}.js?t=${Date.now()}`)).default
				fs.unlinkSync(resolvedPath + '.js')
				debug(`TS + native esm config load in ${getTime()}`, fileUrl)
			} else {
				userConfig = (await dynamicImport(`${fileUrl}.js?t=${Date.now()}`)).default
				debug(`native esm config loaded in ${getTime()}`, fileUrl)
			}
		}
		if(!userConfig) {
			const bundled = await bundleConfigFile(resolvedPath)
			dependencies = bundled.dependencies
      userConfig = await loadConfigFromBundledFile(resolvedPath, bundled.code)
      debug(`bundled config file loaded in ${getTime()}`)
		}
		const config = await (typeof userConfig === 'function'
			? userConfig(configEnv)
			: userConfig)
		if(!isObject(config)) {
			throw new Error(`config must export or return an object.`)
		}
		debug(config)
		return {
			path: normalizePath(resolvedPath),
			config,
			dependencies
		}
	} catch(e) {
		createLogger(logLevel).error(
			chalk.red(`failed to load config from ${resolvedPath}`),
			{ error: e }
		)
		throw e
	}
}

async function loadConfigFromBundledFile(
  fileName,
  bundledCode
) {
  const extension = path.extname(fileName)
  const defaultLoader = require.extensions[extension]
  require.extensions[extension] = (module, filename) => {
    if (filename === fileName) {
      module._compile(bundledCode, filename)
    } else {
      defaultLoader(module, filename)
    }
  }
  // clear cache in case of server restart
  delete require.cache[require.resolve(fileName)]
  const raw = require(fileName)
  const config = raw.__esModule ? raw.default : raw
  require.extensions[extension] = defaultLoader
  return config
}

async function bundleConfigFile(
	fileName,
	isESM = false
) {
	const result = await build({
		absWorkingDir: process.cwd(),
		entryPoints: [fileName],
		outfile: 'out.js',
		write: false,
		platform: 'node',
		bundle: true,
		format: isESM ? 'esm' : 'cjs',
		sourcemap: 'inline',
		metafile: true,
		plugins: [
			{
				name: 'externalize-deps',
				setup(build) {
				build.onResolve({ filter: /.*/ }, (args) => {
					const id = args.path
					if(id[0] !== '.' && !path.isAbsolute(id)) {
						return {
							external: true
						}
					}
				})
				}
			},
			{
				name: 'replace-import-meta',
				setup(build) {
					build.onLoad({ filter: /\.[jt]s$/ }, async (args) => {
						const contents = await fs.promises.readFile(args.path, 'utf8')
						return {
							loader: args.path.endsWith('.ts') ? 'ts' : 'js',
							contents: contents
								.replace(
									/\bimport\.meta\.url\b/g,
									JSON.stringify(`file://${args.path}`)
								)
								.replace(
									/\b__dirname\b/,
									JSON.stringify(path.dirname(args.path))
								)
								.replace(/\b__filename\b/g, JSON.stringify(args.path))
						}
					})
				}
			}
		]
	})
	const { text } = result.outputFiles[0]
	return {
		code: text,
		dependencies: result.metafile ? Object.keys(result.metafile.inputs) : []
	}
}

module.exports = {
	resolveConfig
}