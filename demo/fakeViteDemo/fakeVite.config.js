const path = require('path')

module.exports = {
	// https: true,
	httpsOptions: {
    cert: path.resolve(__dirname, 'cert/server-cert.pem'),
    key: path.resolve(__dirname, 'cert/server-key.pem')
	},
	optimizeDeps: {
		exclude: ['vue', 'fakeVite']
	}
}