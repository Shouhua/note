const debug = require('debug')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { URL, pathToFileURL } = require('url')
const remapping = require('@ampproject/remapping')
const chalk = require('chalk')
const { DEFAULT_EXTENSIONS, FS_PREFIX, CLIENT_PUBLIC_PATH, ENV_PUBLIC_PATH, VALID_ID_PREFIX } = require('./constant')
const resolve = require('resolve')

const queryRE = /\?.*$/s
const hashRE = /#.*$/s

const cleanUrl = (url) =>
  url.replace(hashRE, '').replace(queryRE, '')

const externalRE = /^(https?:)?\/\//
const isExternalUrl = (url) => externalRE.test(url)

const CLIENT_ENTRY = require.resolve('../client/client.js')
const ENV_ENTRY = require.resolve('../client/env.js')
const CLIENT_DIR = path.dirname(CLIENT_ENTRY)

const filter = process.env.VITE_DEBUG_FILTER
const DEBUG = process.env.DEBUG

function createDebugger(
	namespace,
	options = {}
) {
	const log = debug(namespace)
	const { onlyWhenFocused } = options
	const focus = 
		typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace
	return (msg, ...args) => {
		if(filter && !msg.includes(filter)) {
			return 
		}
		if(onlyWhenFocused && !DEBUG.includes(focus)) {
			return 
		}
		log(msg, ...args)
	}
}

function isObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]'
}

function lookupFile(
	dir,
	formats,
	pathOnly = false
) {
	for(const format of formats) {
		const fullPath = path.join(dir, format)
		if(fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
			return pathOnly ? fullPath : fs.readFileSync(fullPath, 'utf-8')
		}
	}
	const parentDir = path.dirname(dir)
	if(parentDir !== dir) {
		return lookupFile(parentDir, formats, pathOnly)
	}
}

const usingDynamicImport = typeof jest === 'undefined'
/**
 * Dynamically import files. It will make sure it's not being compiled away by TS/Rollup.
 *
 * As a temporary workaround for Jest's lack of stable ESM support, we fallback to require
 * if we're in a Jest environment.
 * See https://github.com/vitejs/vite/pull/5197#issuecomment-938054077
 *
 * @param file File path to import.
 */
const dynamicImport = usingDynamicImport
  ? new Function('file', 'return import(file)')
  : require

function slash(p) {
	return p.replace(/\\/g, '/')
}
const isWindows = os.platform() === 'win32'
function normalizePath(id) {
	return path.posix.normalize(isWindows ? slash(id) : id)
}
function arraify(target) {
  return Array.isArray(target) ? target : [target]
}

function ensureWatchedFile(
  watcher,
  file,
  root
) {
  if (
    file &&
    // only need to watch if out of root
    !file.startsWith(root + '/') &&
    // some rollup plugins use null bytes for private resolved Ids
    !file.includes('\0') &&
    fs.existsSync(file)
  ) {
    // resolve file to normalized system path
    watcher.add(path.resolve(file))
  }
}

const splitRE = /\r?\n/

const range = 2

function pad(source, n = 2) {
  const lines = source.split(splitRE)
  return lines.map((l) => ` `.repeat(n) + l).join(`\n`)
}

function posToNumber(
  source,
  pos
) {
  if (typeof pos === 'number') return pos
  const lines = source.split(splitRE)
  const { line, column } = pos
  let start = 0
  for (let i = 0; i < line - 1; i++) {
    start += lines[i].length + 1
  }
  return start + column
}

function numberToPos(
  source,
  offset
) {
  if (typeof offset !== 'number') return offset
  if (offset > source.length) {
    throw new Error(
      `offset is longer than source length! offset ${offset} > length ${source.length}`
    )
  }
  const lines = source.split(splitRE)
  let counted = 0
  let line = 0
  let column = 0
  for (; line < lines.length; line++) {
    const lineLength = lines[line].length + 1
    if (counted + lineLength >= offset) {
      column = offset - counted + 1
      break
    }
    counted += lineLength
  }
  return { line: line + 1, column }
}

function generateCodeFrame(
  source,
  start,
  end
) {
  start = posToNumber(source, start)
  end = end || start
  const lines = source.split(splitRE)
  let count = 0
  const res = []
  for (let i = 0; i < lines.length; i++) {
    count += lines[i].length + 1
    if (count >= start) {
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        const line = j + 1
        res.push(
          `${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${
            lines[j]
          }`
        )
        const lineLength = lines[j].length
        if (j === i) {
          // push underline
          const pad = start - (count - lineLength) + 1
          const length = Math.max(
            1,
            end > count ? lineLength - pad : end - start
          )
          res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length))
        } else if (j > i) {
          if (end > count) {
            const length = Math.max(Math.min(end - count, lineLength), 1)
            res.push(`   |  ` + '^'.repeat(length))
          }
          count += lineLength + 1
        }
      }
      break
    }
  }
  return res.join('\n')
}

const nullSourceMap = {
  names: [],
  sources: [],
  mappings: '',
  version: 3
}
function combineSourcemaps(
  filename,
  sourcemapList
) {
  if (
    sourcemapList.length === 0 ||
    sourcemapList.every((m) => m.sources.length === 0)
  ) {
    return { ...nullSourceMap }
  }

  // We don't declare type here so we can convert/fake/map as RawSourceMap
  let map //: SourceMap
  let mapIndex = 1
  const useArrayInterface =
    sourcemapList.slice(0, -1).find((m) => m.sources.length !== 1) === undefined
  if (useArrayInterface) {
    map = remapping(sourcemapList, () => null, true)
  } else {
    map = remapping(
      sourcemapList[0],
      function loader(sourcefile) {
        if (sourcefile === filename && sourcemapList[mapIndex]) {
          return sourcemapList[mapIndex++]
        } else {
          return { ...nullSourceMap }
        }
      },
      true
    )
  }
  if (!map.file) {
    delete map.file
  }

  return map
}

function timeFrom(start, subtract = 0) {
  const time = performance.now() - start - subtract
  const timeString = (time.toFixed(2) + `ms`).padEnd(5, ' ')
  if (time < 10) {
    return chalk.green(timeString)
  } else if (time < 50) {
    return chalk.yellow(timeString)
  } else {
    return chalk.red(timeString)
  }
}

const importQueryRE = /(\?|&)import=?(?:&|$)/
const internalPrefixes = [
  FS_PREFIX,
  VALID_ID_PREFIX,
  CLIENT_PUBLIC_PATH,
  ENV_PUBLIC_PATH
]
const InternalPrefixRE = new RegExp(`^(?:${internalPrefixes.join('|')})`)
const isImportRequest = (url) => importQueryRE.test(url)
const isInternalRequest = (url) =>
  InternalPrefixRE.test(url)

function removeImportQuery(url) {
  return url.replace(importQueryRE, '$1').replace(trailingSeparatorRE, '')
}

const timestampRE = /\bt=\d{13}&?\b/
const trailingSeparatorRE = /[\?&]$/
function removeTimestampQuery(url) {
  return url.replace(timestampRE, '').replace(trailingSeparatorRE, '')
}

const VOLUME_RE = /^[A-Z]:/i
function fsPathFromId(id) {
  const fsPath = normalizePath(id.slice(FS_PREFIX.length))
  return fsPath.startsWith('/') || fsPath.match(VOLUME_RE)
    ? fsPath
    : `/${fsPath}`
}

/**
 * pretty url for logging.
 */
function prettifyUrl(url, root) {
  url = removeTimestampQuery(url)
  const isAbsoluteFile = url.startsWith(root)
  if (isAbsoluteFile || url.startsWith(FS_PREFIX)) {
    let file = path.relative(root, isAbsoluteFile ? url : fsPathFromId(url))
    const seg = file.split('/')
    const npmIndex = seg.indexOf(`node_modules`)
    const isSourceMap = file.endsWith('.map')
    if (npmIndex > 0) {
      file = seg[npmIndex + 1]
      if (file.startsWith('@')) {
        file = `${file}/${seg[npmIndex + 2]}`
      }
      file = `npm: ${chalk.dim(file)}${isSourceMap ? ` (source map)` : ``}`
    }
    return chalk.dim(file)
  } else {
    return chalk.dim(url)
  }
}

/**
 * Use instead of fs.existsSync(filename)
 * #2051 if we don't have read permission on a directory, existsSync() still
 * works and will result in massively slow subsequent checks (which are
 * unnecessary in the first place)
 */
function isFileReadable(filename) {
  try {
    fs.accessSync(filename, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

function ensureLeadingSlash(path) {
  return !path.startsWith('/') ? '/' + path : path
}

const bareImportRE = /^[\w@](?!.*:\/\/)/
const deepImportRE = /^([^@][^/]*)\/|^(@[^/]+\/[^/]+)\//

function resolveHostname(
  optionsHost
) {
  let host
  if (
    optionsHost === undefined ||
    optionsHost === false ||
    optionsHost === 'localhost'
  ) {
    // Use a secure default
    host = '127.0.0.1'
  } else if (optionsHost === true) {
    // If passed --host in the CLI without arguments
    host = undefined // undefined typically means 0.0.0.0 or :: (listen on all IPs)
  } else {
    host = optionsHost
  }

  // Set host name to localhost when possible, unless the user explicitly asked for '127.0.0.1'
  const name =
    (optionsHost !== '127.0.0.1' && host === '127.0.0.1') ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === undefined
      ? 'localhost'
      : host

  return { host, name }
}

function fsPathFromId(id) {
  const fsPath = normalizePath(id.slice(FS_PREFIX.length))
  return fsPath.startsWith('/') || fsPath.match(VOLUME_RE)
    ? fsPath
    : `/${fsPath}`
}

function injectQuery(url, queryToInject) {
  // encode percents for consistent behavior with pathToFileURL
  // see #2614 for details
  let resolvedUrl = new URL(url.replace(/%/g, '%25'), 'relative:///')
  if (resolvedUrl.protocol !== 'relative:') {
    resolvedUrl = pathToFileURL(url)
  }
  let { protocol, pathname, search, hash } = resolvedUrl
  if (protocol === 'file:') {
    pathname = pathname.slice(1)
  }
  pathname = decodeURIComponent(pathname)
  return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${
    hash || ''
  }`
}

const knownJsSrcRE = /\.((j|t)sx?|mjs|vue|marko|svelte|astro)($|\?)/
const isJSRequest = (url) => {
  url = cleanUrl(url)
  if (knownJsSrcRE.test(url)) {
    return true
  }
  if (!path.extname(url) && !url.endsWith('/')) {
    return true
  }
  return false
}

const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)
const cssModuleRE = new RegExp(`\\.module${cssLangs}`)
const directRequestRE = /(\?|&)direct\b/
const commonjsProxyRE = /\?commonjs-proxy/
const inlineRE = /(\?|&)inline\b/
const usedRE = /(\?|&)used\b/

const isCSSRequest = (request) =>
  cssLangRE.test(request)

function unwrapId(id) {
  return id.startsWith(VALID_ID_PREFIX) ? id.slice(VALID_ID_PREFIX.length) : id
}

function ensureWatchedFile(watcher, file, root) {
  if (
    file &&
    // only need to watch if out of root
    !file.startsWith(root + '/') &&
    // some rollup plugins use null bytes for private resolved Ids
    !file.includes('\0') &&
    fs.existsSync(file)
  ) {
    // resolve file to normalized system path
    watcher.add(path.resolve(file))
  }
}

const ssrExtensions = ['.js', '.cjs', '.json', '.node']

function resolveFrom(id, basedir, preserveSymlinks=false, ssr=fale) {
  return resolve.sync(id, {
    basedir,
    extensions: ssr ? ssrExtensions : DEFAULT_EXTENSTIONS,
    preserveSymlinks: preserveSymlinks || false
  })
}

module.exports = {
	createDebugger,
	lookupFile,
	dynamicImport,
	isObject,
	normalizePath,
	CLIENT_DIR,
	CLIENT_ENTRY,
	ENV_ENTRY,
	arraify,
	isExternalUrl,
	ensureWatchedFile,
	posToNumber,
	numberToPos,
	generateCodeFrame,
	combineSourcemaps,
	timeFrom,
	prettifyUrl,
	isFileReadable,
  ensureLeadingSlash,
  bareImportRE,
  deepImportRE,
  cleanUrl,
  removeTimestampQuery,
  removeImportQuery,
  resolveHostname,
  isImportRequest,
  isInternalRequest,
  fsPathFromId,
  injectQuery,
  isJSRequest,
  isCSSRequest,
  unwrapId,
  ensureWatchedFile,
  pad,
  resolveFrom
}