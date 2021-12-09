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
		pluginTest()
	]
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