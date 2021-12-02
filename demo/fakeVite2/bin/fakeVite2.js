#!/usr/bin/env node

const debugIndex = process.argv.findIndex((arg) => /^(?:-d|--debug)$/.test(arg))
const filterIndex = process.argv.findIndex((arg) => /^(?:-f|--filter)$/.test(arg))

if(debugIndex > 0) {
	let value = process.argv[debugIndex + 1]
	if(!value || value.startsWith('-')) {
		value = 'fakeVite:*'
	} else {
		value = value
			.split(',')
			.map((v) => `fakeVite:${v}`)
			.join(',')
	}
	process.env.DEBUG = value
	if(filterIndex > 0) {
		const filter = process.argv[filterIndex + 1]
		if(filter && !filter.startsWith('-')) {
			process.env.VITE_DEBUG_FILTER = filter
		}
	}
}

function start() {
	require('../lib/node/cli')
}

start()