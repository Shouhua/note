const path = require('path')
const chalk = require('chalk')
const { transform } = require('esbuild')
const { combineSourcemaps, cleanUrl, createDebugger, ensureWatchedFile, generateCodeFrame, toUpperCaseDriveLetter } = require('../utils')
const { createFilter } = require('@rollup/pluginutils')

const debug = createDebugger('fakeVite:esbuild')

let server

async function transformWithEsbuild(code, filename, options, inMap) {
	let loader = options && options.loader
	// TODO
	const resolvedOptions = {
    sourcemap: true,
    // ensure source file name contains full query
    sourcefile: filename,
    ...options,
    loader,
  }
	try {
		const result = await transform(code, resolvedOptions)
		debug(`esbuild map::::::::::::::::;;${result.map}`)
		return {
			...result,
			map: JSON.parse(result.map)
		}
	} catch(e) {
		debug(`esbuild error with options used: `, resolvedOptions)
    // patch error information
    if (e.errors) {
      e.frame = ''
      e.errors.forEach((m) => {
        e.frame += `\n` + prettifyMessage(m, code)
      })
      e.loc = e.errors[0].location
    }
    throw e
	}
}

function esbuildPlugin(options = {}) {
	// const filter = createFilter(
	// 	options.include || /\.(tsx?|jsx)$/,
	// 	options.exclude || /\.js$/
	// )
	const filter = createFilter(/main\.js$/)

	return {
		name: 'fakeVite:esbuild',
		configureServer(_server) {
			server = _server
		},
		async transform(code, id) {
			if(filter(id) || filter(cleanUrl(id))) {
				const result = await transformWithEsbuild(code, id, options)
				if(result.warnings.length) {
					result.warnings.forEach((m) => {
						this.warn(prettifyMessage(m, code))
					})
				}
				if(options.jsxInject && /\.(?:j|t)sx\b/.test(id)) {
					result.code = options.jsxInject + ';' + result.code
				}
				return {
					code: result.code,
					map: result.map
				}
			}
		}
	}
}

function prettifyMessage(m, code) {
  let res = chalk.yellow(m.text)
  if (m.location) {
    const lines = code.split(/\r?\n/g)
    const line = Number(m.location.line)
    const column = Number(m.location.column)
    const offset =
      lines
        .slice(0, line - 1)
        .map((l) => l.length)
        .reduce((total, l) => total + l + 1, 0) + column
    res += `\n` + generateCodeFrame(code, offset, offset + 1)
  }
  return res + `\n`
}

module.exports = {
	esbuildPlugin
}