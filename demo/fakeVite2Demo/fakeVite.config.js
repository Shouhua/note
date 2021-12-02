module.exports = function(configEnv) {
	if(configEnv.mode === 'development') {
		return {
			input: './index.js',
			output: 'out.js'
		}
	} else {
		return {
			input: './index.js',
			mode: 'production'
		}
	}
}