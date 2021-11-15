const fs = require('fs-extra')
const debug = require('debug')('fakeVite:cache')
const mime = require('mime-types')
const path = require('path')
const getETag = require('etag')
const LRUCache = require('lru-cache')

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

function isEqual(a, b) {
	if (!a && !b) return true
	if (!a || !b) return false
	if (a.content !== b.content) return false
	const keysA = Object.keys(a.attrs)
	const keysB = Object.keys(b.attrs)
	if (keysA.length !== keysB.length) {
		return false
	}
	return keysA.every((key) => a.attrs[key] === b.attrs[key])
}

const moduleReadCache = new LRUCache({
  max: 10000
})
async function cacheRead(ctx, file) {
	const lastModified = fs.statSync(file).mtimeMs
	const cached = moduleReadCache.get(file)
	if(ctx) {
		ctx.set('Cache-Control', 'no-cache')
		ctx.type = mime.lookup(path.extname(file)) || 'js'
	}
	if(cached && cached.lastModified === lastModified) {
		if(ctx) {
			ctx.etag = cached.etag
			ctx.lastModified = new Date(cached.lastModified)
			if(ctx.get('If-None-Match') === ctx.etag) {
				ctx.status = 304
			}
			ctx.body = cached.content
		}
		return cached.content
	}
	const content = await fs.readFileSync(file, 'utf-8')
	const etag = getETag(content)
	moduleReadCache.set(file, {
		content,
		etag,
		lastModified
	})
	if(ctx) {
		ctx.etag = etag
		ctx.lastModified = new Date(lastModified)
		ctx.body = content
		ctx.status = 200
	}
	return content
}

module.exports = {
	getFromCache,
	setCache,
	deleteCache,
	getContent,
	isEqual,
	cacheRead
}