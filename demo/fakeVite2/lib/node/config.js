const path = require('path')
const fs = require('fs')
const { build } = require('esbuild')
const { performance } = require('perf_hooks')
const { createLogger } = require('./logger')
const chalk = require('chalk')
const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')
const { resolveBuildOptions } = require('./build')
const aliasPlugin = require('@rollup/plugin-alias')
const { resolvePlugin } = require('./plugins/resolve')
const { DEFAULT_ASSETS_RE } = require('./constants')
const { searchForWorkspaceRoot } = require('./server/searchRoot')
const { resolvePlugins } = require('./plugins')
const {
	createDebugger,
	lookupFile,
	dynamicImport,
	normalizePath,
	isObject,
	CLIENT_ENTRY,
	ENV_ENTRY,
	arraify,
	isExternalUrl,
	ensureLeadingSlash,
	CLIENT_DIR
} = require('./utils')

const debug = createDebugger('fakeVite:config')

function mergeAlias(a = [], b = []) {
	return [...normalizeAlias(a), ...normalizeAlias(b)]
}
function normalizeAlias(o) {
	return Array.isArray(o)
		? o.map(normalizeSingleAlias)
		: Object.keys(o).map((find) => 
			normalizeSingleAlias({
				find,
				replacement: o[find]
			}))
}
function normalizeSingleAlias({find, replacement}) {
	if(typeof find === 'string' &&
		find.endsWith('/') && 
		replacement.endsWith('/')
	) {
		find = find.slice(0, find.length - 1)
		replacement = replacement.slice(0, replacement.length - 1)
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

function sortUserPlugins(plugins) {
  const prePlugins = []
  const postPlugins = []
  const normalPlugins = []
  if (plugins) {
    plugins.flat().forEach((p) => {
      if (p.enforce === 'pre') prePlugins.push(p)
      else if (p.enforce === 'post') postPlugins.push(p)
      else normalPlugins.push(p)
    })
  }
  return [prePlugins, normalPlugins, postPlugins]
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
	// Define logger
	const logger = createLogger(config.logLevel, {
		allowClearScreen: config.clearScreen,
		customLogger: config.customLogger
	})

	// user config may provide an alternative mode. But --mode has a higher priority
	mode = inlineConfig.mode || config.mode || mode
	configEnv.mode = mode

	// resolve plugins
	const rawUserPlugins = (config.plugins || []).flat().filter((p) => {
		if (!p) {
			return false
		} else if (!p.apply) {
			return true
		} else if (typeof p.apply === 'function') {
			return p.apply({ ...config, mode }, configEnv)
		} else {
			return p.apply === command
		}
	})
	const [prePlugins, normalPlugins, postPlugins] =
		sortUserPlugins(rawUserPlugins)

	// run config hooks
	const userPlugins = [...prePlugins, ...normalPlugins, ...postPlugins]
	for (const p of userPlugins) {
		if (p.config) {
			const res = await p.config(config, configEnv)
			if (res) {
				config = mergeConfig(config, res)
			}
		}
	}
	// resolve root
	const resolvedRoot = normalizePath(
		config.root ? path.resolve(config.root) : process.cwd()
	)

	const clientAlias = [
		{ find: /^[\/]?@vite\/env/, replacement: () => ENV_ENTRY },
		{ find: /^[\/]?@vite\/client/, replacement: () => CLIENT_ENTRY }
	]

	// resolve alias with internal client alias
	const resolvedAlias = mergeAlias(
		clientAlias,
		config.resolve.alias || config.alias || []
	)	

	const resolveOptions = {
		dedupe: config.dedupe,
		...config.resolve,
		alias: resolvedAlias
	}

	// load .env files
	const envDir = config.envDir
		? normalizePath(path.resolve(resolvedRoot, config.envDir))
		: resolvedRoot
  const userEnv =
    inlineConfig.envFile !== false &&
    loadEnv(mode, envDir, resolveEnvPrefix(config))

	const isProduction = (process.env.VITE_USER_NODE_ENV || mode) === 'production'
  if (isProduction) {
    process.env.NODE_ENV = 'production'
  }
	// resolve public base url
	const BASE_URL = resolveBaseUrl(config.base, command === 'build', logger)
	const resolvedBuildOptions = resolveBuildOptions(resolvedRoot, config.build)
	// resolve cache directory
	const pkgPath = lookupFile(
		resolvedRoot,
		[`package.json`],
		true /* pathOnly */
	)
	const cacheDir = config.cacheDir
		? path.resolve(resolvedRoot, config.cacheDir)
		: pkgPath && path.join(path.dirname(pkgPath), `node_modules/.vite`)

	const assetsFilter = config.assetsInclude
		? createFilter(config.assetsInclude)
		: () => false

	// create an internal resolver to be used in special scenarios, e.g.
	// optimizer & handling css @imports
	const createResolver = (options) => {
		let aliasContainer
		let resolverContainer
		return async (id, importer, aliasOnly, ssr) => {
			let container
			if (aliasOnly) {
				container =
					aliasContainer ||
					(aliasContainer = await createPluginContainer({
						...resolved,
						plugins: [aliasPlugin({ entries: resolved.resolve.alias })]
					}))
			} else {
				container =
					resolverContainer ||
					(resolverContainer = await createPluginContainer({
						...resolved,
						plugins: [
							aliasPlugin({ entries: resolved.resolve.alias }),
							resolvePlugin({
								...resolved.resolve,
								root: resolvedRoot,
								isProduction,
								isBuild: command === 'build',
								ssrConfig: resolved.ssr,
								asSrc: true,
								preferRelative: false,
								tryIndex: true,
								...options
							})
						]
					}))
			}
			return (await container.resolveId(id, importer, { ssr }))?.id
		}
	}
	const { publicDir } = config
	const resolvedPublicDir = (publicDir !== false && publicDir !== '') 
		? path.resolve(resolvedRoot, typeof publicDir === 'string' ? publicDir : 'public')
		: ''
	const server = resolveServerOptions(resolvedRoot, config.server)
	const resolved = {
		...config,
		configFile: configFile ? normalizePath(configFile) : undefined,
		configFileDependencies,
		inlineConfig,
		root: resolvedRoot,
		base: BASE_URL,
		resolve: resolveOptions,
		publicDir: resolvedPublicDir,
		cacheDir,
		command,
		mode,
		isProduction,
		plugins: userPlugins,
		server,
		// preview: resolvePreviewOptions(config.preview, server),
    env: {
      ...userEnv,
      BASE_URL,
      MODE: mode,
      DEV: !isProduction,
      PROD: isProduction
    },
    assetsInclude(file) {
      return DEFAULT_ASSETS_RE.test(file) || assetsFilter(file)
    },
    logger,
    packageCache: new Map(),
    createResolver,
    optimizeDeps: {
      ...config.optimizeDeps,
      esbuildOptions: {
        keepNames: config.optimizeDeps?.keepNames,
        preserveSymlinks: config.resolve?.preserveSymlinks,
        ...config.optimizeDeps?.esbuildOptions
      }
    }
	}

  resolved.plugins = await resolvePlugins(
    resolved,
    prePlugins,
    normalPlugins,
    postPlugins
  )

  // call configResolved hooks
  await Promise.all(userPlugins.map((p) => p.configResolved && p.configResolved(resolved)))

  if (process.env.DEBUG) {
    debug(`using resolved config: %O`, {
      ...resolved,
      plugins: resolved.plugins.map((p) => p.name)
    })
  }
	return resolved
}

function resolveBaseUrl(
  base = '/',
  isBuild,
  logger
) {
  // #1669 special treatment for empty for same dir relative base
  if (base === '' || base === './') {
    return isBuild ? base : '/'
  }
  if (base.startsWith('.')) {
    logger.warn(
      chalk.yellow.bold(
        `(!) invalid "base" option: ${base}. The value can only be an absolute ` +
          `URL, ./, or an empty string.`
      )
    )
    base = '/'
  }

  // external URL
  if (isExternalUrl(base)) {
    if (!isBuild) {
      // get base from full url during dev
      const parsed = require('url').parse(base)
      base = parsed.pathname || '/'
    }
  } else {
    // ensure leading slash
    if (!base.startsWith('/')) {
      logger.warn(
        chalk.yellow.bold(`(!) "base" option should start with a slash.`)
      )
      base = '/' + base
    }
  }

  // ensure ending slash
  if (!base.endsWith('/')) {
    logger.warn(chalk.yellow.bold(`(!) "base" option should end with a slash.`))
    base += '/'
  }

  return base
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

function loadEnv(
  mode,
  envDir,
  prefixes = 'VITE_'
) {
  if (mode === 'local') {
    throw new Error(
      `"local" cannot be used as a mode name because it conflicts with ` +
        `the .local postfix for .env files.`
    )
  }
  prefixes = arraify(prefixes)
  const env = {}
  const envFiles = [
    /** mode local file */ `.env.${mode}.local`,
    /** mode file */ `.env.${mode}`,
    /** local file */ `.env.local`,
    /** default file */ `.env`
  ]

  // check if there are actual env variables starting with VITE_*
  // these are typically provided inline and should be prioritized
  for (const key in process.env) {
    if (
      prefixes.some((prefix) => key.startsWith(prefix)) &&
      env[key] === undefined
    ) {
      env[key] = process.env[key]
    }
  }

  for (const file of envFiles) {
    const path = lookupFile(envDir, [file], true)
    if (path) {
      const parsed = dotenv.parse(fs.readFileSync(path), {
        debug: !!process.env.DEBUG || undefined
      })

      // let environment variables use each other
      dotenvExpand({
        parsed,
        // prevent process.env mutation
        ignoreProcessEnv: true
      })

      // only keys that start with prefix are exposed to client
      for (const [key, value] of Object.entries(parsed)) {
        if (
          prefixes.some((prefix) => key.startsWith(prefix)) &&
          env[key] === undefined
        ) {
          env[key] = value
        } else if (key === 'NODE_ENV') {
          // NODE_ENV override in .env file
          process.env.VITE_USER_NODE_ENV = value
        }
      }
    }
  }
  return env
}

function resolveEnvPrefix({
  envPrefix = 'VITE_'
}) {
  envPrefix = arraify(envPrefix)
  if (envPrefix.some((prefix) => prefix === '')) {
    throw new Error(
      `envPrefix option contains value '', which could lead unexpected exposure of sensitive information.`
    )
  }
  return envPrefix
}


function resolvedAllowDir(root, dir) {
  return ensureLeadingSlash(normalizePath(path.resolve(root, dir)))
}

function resolveServerOptions(root, raw) {
  const server = raw || {}
  let allowDirs = (server.fs || {}).allow
  const deny = (server.fs || {}).deny || ['.env', '.env.*', '*.{crt,pem}']

  if (!allowDirs) {
    allowDirs = [searchForWorkspaceRoot(root)]
  }

  allowDirs = allowDirs.map((i) => resolvedAllowDir(root, i))

  // only push client dir when vite itself is outside-of-root
  const resolvedClientDir = resolvedAllowDir(root, CLIENT_DIR)
  if (!allowDirs.some((i) => resolvedClientDir.startsWith(i))) {
    allowDirs.push(resolvedClientDir)
  }

  server.fs = {
    strict: (server.fs || {}).strict ?? true,
    allow: allowDirs,
    deny
  }
  return server
}

module.exports = {
	resolveConfig
}