const fs = require('fs-extra')
const path = require('path')

const debug = require('debug')('fakeVite:build:asset')

const imageRE = /\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/
const mediaRE = /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/
const fontsRE = /\.(woff2?|eot|ttf|otf)(\?.*)?$/i

/**
 * Check if a file is a static asset that vite can process.
 */
const isStaticAsset = (file) => {
  return imageRE.test(file) || mediaRE.test(file) || fontsRE.test(file)
}

const assetResolveCache = new Map()
const resolveAsset = (
	id
) => {
	const cached = assetResolveCache.get(id)
  if (cached) {
    return cached
  }

	let resolved
	let url
	let content = fs.readFileSync(id)
	resolved = {
		content,
		fileName: path.basename(id),
		url
	}
	assetResolveCache.set(id, resolved)
  return resolved
}
const registerAssets = (assets, bundle) => {
  for (const [fileName, source] of assets) {
    bundle[fileName] = {
      name: fileName,
      isAsset: true,
      type: 'asset',
      fileName,
      source
    }
  }
}

const createBuildAssetPlugin = (
  root
) => {
  const handleToIdMap = new Map()

  return {
    name: 'vite:asset',
    async load(id) {
      if(isStaticAsset(id)) {
        let { fileName, content, url } = await resolveAsset(id)
        if (!url && fileName && content) {
          const fileHandle = this.emitFile({
            name: fileName,
            type: 'asset',
            source: content
          })
          url = 'import.meta.ROLLUP_FILE_URL_' + fileHandle
          handleToIdMap.set(fileHandle, id)
        } else if (url && url.startsWith(`data:`)) {
          debug(`${id} -> base64 inlined`)
        }
        return `export default ${JSON.stringify(url)}`
      }
    },

    async renderChunk(code) {
      let match
      const injectAssetRe = /import.meta.ROLLUP_FILE_URL_(\w+)/
      while ((match = injectAssetRe.exec(code))) {
        const fileHandle = match[1]
        const outputFilepath = this.getFileName(fileHandle)
        code = code.replace(match[0], outputFilepath)
        const originalId = handleToIdMap.get(fileHandle)
        if (originalId) {
          debug(`${originalId} -> ${outputFilepath}`)
        }
      }
      return { code, map: null }
    }
  }
}


module.exports = {
	resolveAsset,
	registerAssets,
  createBuildAssetPlugin
}