const fs = require('fs-extra')
const debug = require('debug')('fakeVite:cache')

const cacheMap = new Map()
function getFromCache(key) {
	if(cacheMap.has(key)) {
		return cacheMap.get(key)
	}
	return false
}

function setCache(key, content) {
	cacheMap.set(key, content)
	return content
}

function deleteCache(key) {
	if(cacheMap.has(key)) {
		cacheMap.delete(key)
	}
}

function getContent(file) {
	if(!getFromCache(file)) {
		let content = fs.readFileSync(file, 'utf-8')
		cacheMap.set(file, content)
	}
	return getFromCache(file)
}

module.exports = {
	getFromCache,
	setCache,
	deleteCache,
	getContent
}