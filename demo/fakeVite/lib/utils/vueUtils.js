const { compileScript, compileStyle, compileTemplate, parse } = require('@vue/compiler-sfc')
const { getContent, setCache } = require('../utils')

const cache = new Map()
function parseSFC(content, filename) {
	const prev = cache.get(filename)
  const descriptor = parse(content, {
    filename,
    sourceMap: true
  }).descriptor
	cache.set(filename, descriptor)
  return [descriptor, prev]
}

function parseScript() {

}

function parseTemplate() {

}

function parseStyle() {

}

module.exports = {
  parseSFC,
  parseScript,
  parseTemplate,
  parseStyle
}