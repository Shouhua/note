function getUrlParams (url, key) {
	let regex = new RegExp(/[?&]([^=]+)=([^&]+)/, 'gm')
	const qs = {}
	let result
	while((result = regex.exec(url)) !== null) {
		qs[result[1]] = result[2]
	}
	return result[key]
}