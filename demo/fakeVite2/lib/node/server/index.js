const { resolveConfig } = require('../config')

async function createServer(inlineConfig) {
	const config = await resolveConfig(inlineConfig)
	// const root = config.root
	// resolveHttpConfig
	// resolveHttpServer
	// createWebSocketServer
	// createWatcher
	// createModuleGraph
	// createPluginConatiner
	// create closeHttpServer
	// add middleware
	// activate configServer and buildServer plugin
	// rewrite http server listen
	// last return server
}

module.exports = {
	createServer
}