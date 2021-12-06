const { bareImportRE } = require('../utils')
/**
 * A plugin to avoid an aliased AND optimized dep from being aliased in src
 */
function preAliasPlugin() {
  let server
  return {
    name: 'fakeVite:pre-alias',
    configureServer(_server) {
      server = _server
    },
    resolveId(id, importer, options) {
      if (!options.ssr && bareImportRE.test(id)) {
        // return tryOptimizedResolve(id, server, importer)
				// TODO
				return null
      }
    }
  }
}
module.exports = {
  preAliasPlugin
}