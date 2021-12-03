function resolvePlugin(baseOptions) {
	let server
	return {
		name: 'fakeVite:resolve',
		configureServer(_server) {
			server = server
		},
		resolveId(id, importer, resolveOpts) {
			return null
		}
	}
}

module.exports = {
	resolvePlugin
}