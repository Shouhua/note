const debug = require('debug')
const path = require('path')
const fs = require('fs')
const os = require('os')

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

module.exports = {
	createDebugger,
	lookupFile,
	dynamicImport,
	isObject,
	normalizePath
}