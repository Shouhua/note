import path from 'path'

export default {
	input: './index.js',
	output: 'out.js',
	resolve: {
		alias: {
			'/@/': '/src/'
		}
	},
	server: {
		https: {
			cert: path.resolve(__dirname, 'cert/server-cert.pem'),
			key: path.resolve(__dirname, 'cert/server-key.pem')
		},
		hmr: true,
		fs: {
			// allow: [],
			// deny: ['main.js']
			// strict: false
		}
	},
	build: {
		rollupOptions: {
		}
	},
	optimizeDeps: {

	},
	publicDir: './public',
	plugins: [
		pluginTest(),
		pluginVirtualModule()
	]
}

function pluginVirtualModule() {
	const msgId = '@my-virtual-module' 
	const resolvedMsgId = '\0' + msgId
	const fooId = '@foo'
	const resolvedFooId = '\0' + fooId
	return {
		name: 'fakeVite-plugin-virtualModule',
		resolveId(id, importer) {
			if(id === msgId) {
				return resolvedMsgId
			}
			if(id === fooId) {
				return resolvedFooId
			}
			return null
		},
		load(id) {
			if(id === resolvedMsgId) {
				return `export const msg = "from virtual module"`
			}
			if(id === resolvedFooId) {
				return `export default function() {console.log('foo from virtual module')}`
			}
			return null
		}
	}
}

function pluginTest() {
	let server
	let config
	return {
		name: 'fakeVite-plugin-test',
		options(opts) {
			// console.log('[options]');
			// console.log(opts);
			console.log(this.meta);
		},
		configResolved(_config) {
			config = _config
		},
		configureServer(_server) {
			server = _server
			server.httpServer.once('listening', () => {
				const port = config.server.port
				const protocol = config.server.https ? 'https' : 'http'
				console.log(`Now listen on ${protocol}://localhost:${port}`);
			})
			return function() {
				console.log(`[fakeVite-plugin-test]: configureServer post hook function executed`);
			}
		}
	}
}