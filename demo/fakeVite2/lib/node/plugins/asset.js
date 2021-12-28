const fs = require('fs')
const { promises: fsp } = require('fs')
const { createDebugger, cleanUrl, normalizePath } = require('../utils')
const path = require('path')
const mime = require('mime')
const { createHash } = require('crypto')
const { parse: parseUrl } = require('url')
const MagicString = require('magic-string')

const debug = createDebugger('fakeVite:asset')

// config->(id->url(built下可能是带base64, 也可能是__VITE_ASSET__${contentHash}__${postfix ? `$_${postfix}__` : ``}`))
const assetCache = new WeakMap()
const assetHashToFilenameMap = new WeakMap()
const emittedHashMap = new WeakMap()
const chunkToEmittedAssetsMap = new WeakMap()

const assetUrlRE = /__VITE_ASSET__([a-z\d]{8})__(?:\$_(.*?)__)?/g

const rawRE = /(\?|&)raw(?:&|$)/
const urlRE = /(\?|&)url(?:&|$)/

function assetPlugin(config) {
  assetHashToFilenameMap.set(config, new Map())
  return {
    name: 'fakeVite:asset',
    buildStart() {
      assetCache.set(config, new Map())
      emittedHashMap.set(config, new Set())
    },
    resolveId(id) {
      if(!config.assetsInclude(cleanUrl(id))) {
        return 
      }
      const publicFile = checkPublicFile(id, config)
      if(publicFile) {
        return id
      }
    },
    async load(id) {
      if(id.startsWith('\0')) {
        return 
      }
      if(rawRE.test(id)) {
        const file = checkPublicFile(id, config) || cleanUrl(id)
        return `export default ${JSON.stringify(await fsp.readFile(file, 'utf-8'))}`
      }
      if(!config.assetsInclude(cleanUrl(id)) && !urlRE.test(id)) {
        return 
      }
      id = id.replace(urlRE, '$1').replace(/[\?&]$/, '')
      const url = await fileToUrl(id, config, this)
      return `export default ${JSON.stringify(url)}`
    },
    renderChunk(code, chunk) {
      let match
      let s
      while((match = assetUrlRE.exec(code))) {
        s = s || (s = new MagicString(code))
        const [full, hash, postfix = ''] = match
        const file = getAssetFilename(hash, config) || this.getFileName(hash)
        registerAssetToChunk(chunk, file)
        const outputFilepath = config.base + file + postfix
        s.overwrite(match.index, match.index + full.length, outputFilepath)
      }
      if(s) {
        return {
          code: s.toString(),
          map: config.build.sourcemap ? s.generateMap({hires: true}) : null
        }
      } else {
        return null
      }
    },
    generateBundle(_, bundle) {
      if(config.command === 'build' && config.build.ssr) {
        for(const file in bundle) {
          if(budnle[file].type === 'asset' && !file.includes('ssr-manifest.json')) {
            delete bundle[file]
          }
        }
      }
    }
  }
}

function checkPublicFile(
  url,
  { publicDir }
) {
  // note if the file is in /public, the resolver would have returned it
  // as-is so it's not going to be a fully resolved path.
  if (!publicDir || !url.startsWith('/')) {
    return
  }
  const publicFile = path.join(publicDir, cleanUrl(url))
  if (fs.existsSync(publicFile)) {
    return publicFile
  } else {
    return
  }
}

function fileToUrl(id, config, ctx) {
  if (config.command === 'serve') {
    return fileToDevUrl(id, config)
  } else {
    return fileToBuiltUrl(id, config, ctx)
  }
}

/**
 * dev状态下主要是得到映射的url
 */
function fileToDevUrl(id, config) {
  let rtn
  if (checkPublicFile(id, config)) {
    // in public dir, keep the url as-is
    rtn = id
  } else if (id.startsWith(config.root)) {
    // in project root, infer short public path
    rtn = '/' + path.posix.relative(config.root, id)
  } else {
    // outside of project root, use absolute fs path
    // (this is special handled by the serve static middleware
    rtn = path.posix.join(FS_PREFIX + id)
  }
  const origin = config.server.origin ?? ''
  return origin + config.base + rtn.replace(/^\//, '')
}

/**
 * build状态下，主要是根据用户的配置得到是将数据转化为base64，还是使用外部链接的方式
 */
async function fileToBuiltUrl(id, config, pluginContext, skipPublicCheck = false) {
  if (!skipPublicCheck && checkPublicFile(id, config)) {
    return config.base + id.slice(1)
  }

  const cache = assetCache.get(config)
  const cached = cache.get(id)
  if (cached) {
    return cached
  }

  const file = cleanUrl(id)
  const content = await fsp.readFile(file)

  let url
  if (
    config.build.lib ||
    (!file.endsWith('.svg') &&
      content.length < Number(config.build.assetsInlineLimit))
  ) {
    // base64 inlined as a string
    url = `data:${mime.getType(file)};base64,${content.toString('base64')}`
  } else {
    // emit as asset
    // rollup supports `import.meta.ROLLUP_FILE_URL_*`, but it generates code
    // that uses runtime url sniffing and it can be verbose when targeting
    // non-module format. It also fails to cascade the asset content change
    // into the chunk's hash, so we have to do our own content hashing here.
    // https://bundlers.tooling.report/hashing/asset-cascade/
    // https://github.com/rollup/rollup/issues/3415
    const map = assetHashToFilenameMap.get(config)
    const contentHash = getAssetHash(content)
    const { search, hash } = parseUrl(id)
    const postfix = (search || '') + (hash || '')
    const output = config.build.rollupOptions.output
    const assetFileNames =
      (output && !Array.isArray(output) ? output.assetFileNames : undefined) ??
      // defaults to '<assetsDir>/[name].[hash][extname]'
      // slightly different from rollup's one ('assets/[name]-[hash][extname]')
      path.posix.join(config.build.assetsDir, '[name].[hash][extname]')
    // 替换url里面的placeholders
    const fileName = assetFileNamesToFileName(
      assetFileNames,
      file,
      contentHash,
      content
    )
    if (!map.has(contentHash)) {
      map.set(contentHash, fileName)
    }
    const emittedSet = emittedHashMap.get(config)
    if (!emittedSet || !emittedSet.has(contentHash)) {
      const name = normalizePath(path.relative(config.root, file))
      pluginContext.emitFile({
        name,
        fileName,
        type: 'asset',
        source: content
      })
      emittedSet.add(contentHash)
    }

    url = `__VITE_ASSET__${contentHash}__${postfix ? `$_${postfix}__` : ``}`
  }

  cache.set(id, url)
  return url
}

function getAssetHash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}


/**
 * converts the source filepath of the asset to the output filename based on the assetFileNames option. \
 * this function imitates the behavior of rollup.js. \
 * https://rollupjs.org/guide/en/#outputassetfilenames
 *
 * @example
 * ```ts
 * const content = Buffer.from('text');
 * const fileName = assetFileNamesToFileName(
 *   'assets/[name].[hash][extname]',
 *   '/path/to/file.txt',
 *   getAssetHash(content),
 *   content
 * )
 * // fileName: 'assets/file.982d9e3e.txt'
 * ```
 *
 * @param assetFileNames filename pattern. e.g. `'assets/[name].[hash][extname]'`
 * @param file filepath of the asset
 * @param contentHash hash of the asset. used for `'[hash]'` placeholder
 * @param content content of the asset. passed to `assetFileNames` if `assetFileNames` is a function
 * @returns output filename
 */
// 简单点就是将asset url中的placeholders, 比如hash等换成真实的
function assetFileNamesToFileName(assetFileNames, file, contentHash, content) {
  const basename = path.basename(file)

  // placeholders for `assetFileNames`
  // `hash` is slightly different from the rollup's one
  const extname = path.extname(basename)
  const ext = extname.substring(1)
  const name = basename.slice(0, -extname.length)
  const hash = contentHash

  if (typeof assetFileNames === 'function') {
    assetFileNames = assetFileNames({
      name: file,
      source: content,
      type: 'asset'
    })
    if (typeof assetFileNames !== 'string') {
      throw new TypeError('assetFileNames must return a string')
    }
  } else if (typeof assetFileNames !== 'string') {
    throw new TypeError('assetFileNames must be a string or a function')
  }

  const fileName = assetFileNames.replace(
    /\[\w+\]/g,
    (placeholder) => {
      switch (placeholder) {
        case '[ext]':
          return ext

        case '[extname]':
          return extname

        case '[hash]':
          return hash

        case '[name]':
          return name
      }
      throw new Error(
        `invalid placeholder ${placeholder} in assetFileNames "${assetFileNames}"`
      )
    }
  )

  return fileName
}

function getAssetFilename(hash, config) {
  return (assetHashToFilenameMap.get(config) || {}).get(hash)
}

function registerAssetToChunk(chunk, file) {
  let emitted = chunkToEmittedAssetsMap.get(chunk)
  if (!emitted) {
    emitted = new Set()
    chunkToEmittedAssetsMap.set(chunk, emitted)
  }
  emitted.add(cleanUrl(file))
}

async function urlToBuiltUrl(url, importer, config, pluginContext) {
  if (checkPublicFile(url, config)) {
    return config.base + url.slice(1)
  }
  const file = url.startsWith('/')
    ? path.join(config.root, url)
    : path.join(path.dirname(importer), url)
  return fileToBuiltUrl(
    file,
    config,
    pluginContext,
    // skip public check since we just did it above
    true
  )
}

module.exports = {
	checkPublicFile,
  getAssetHash,
  fileToUrl,
  getAssetFilename,
  registerAssetToChunk,
  assetPlugin,
  assetUrlRE,
  urlToBuiltUrl
}