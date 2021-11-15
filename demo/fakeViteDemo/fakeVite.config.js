module.exports = function(mode) {
	if(mode === 'development') {
		return {
			optimizeDeps: {
				exclude: ['vue', 'fakeVite']
			}
		}
	}
}