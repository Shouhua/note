import path from 'path'

export default {
	input: './index.js',
	output: 'out.js',
	resolve: {
		alias: {
			'@/': '/src/'
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
			// deny: []
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
		{
			name: 'fakeVite-plugin-test',
			options(opts) {
				// console.log('[options]');
				// console.log(opts);
				console.log(this.meta);
			}
		}
	]
}