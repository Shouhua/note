#! /usr/bin/env node
const { createServer } = require('../lib/server')
const { optimizedDeps } = require('../lib/prebundle')
// const argv = require('minimist')(process.argv.slice(2))

// if (argv._.length) {
//   argv.cwd = require('path').resolve(process.cwd(), argv._[0])
// }

createServer()
