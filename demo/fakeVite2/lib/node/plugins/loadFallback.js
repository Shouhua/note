const { promises: fs} = require('fs')
const { cleanUrl } = require('../utils')

/**
 * A plugin to provide build load fallback for arbitrary request with queries.
 */
function loadFallbackPlugin() {
  return {
    name: 'fakeVite:load-fallback',
    async load(id) {
      try {
        // if we don't add `await` here, we couldn't catch the error in readFile
        return await fs.readFile(cleanUrl(id), 'utf-8')
      } catch (e) {
        return fs.readFile(id, 'utf-8')
      }
    }
  }
}
module.exports = {
	loadFallbackPlugin
}