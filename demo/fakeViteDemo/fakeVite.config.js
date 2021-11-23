const path = require('path')

module.exports = {
	port: 7000,
	https: true,
	httpsOptions: {
    cert: path.resolve(__dirname, 'cert/server-cert.pem'),
    key: path.resolve(__dirname, 'cert/server-key.pem')
	},
	optimizeDeps: { // lodash-es和debug是比较好的2个例子，首先lodash会有多个请求，这个是prebuild的主要动机，另外debug需要转移成es
		exclude: ['vue', 'fakeVite']
	},
	resolve: { // dev阶段暂时支持
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},
	minify: false, // build是否压缩
	emitAssets: true
}