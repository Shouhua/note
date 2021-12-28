const { URL } = require('url')

const dataUriRE = /^([^/]+\/[^;,]+)(;base64)?,([\s\S]*)$/
const dataUriPrefix = `/@data-uri/`

function dataURIPlugin() {
	let resolved
	return {
		name: 'fakeVite:data-uri',
		buildStart() {
			resolved = {}
		},
		resolveId(id) {
			if(!dataUriRE.test(id)){
				return null
			}
			console.log(`data uriiiiiiiiiiiiiiiiiii: ${id}`);
			const uri = new URL(id)
			if(uri.protocol !== 'data:') {
				return null
			}
			const match = uri.pathname.match(dataUriRE)
			if(!match) {
				return null
			}
			const [, mime, format, data] = match
			if(mime !== 'text/javascript') {
				throw new Error(
          `data URI with non-JavaScript mime type is not supported.`
				)
			}
			const base64 = format && /base64/i.test(format.substring(1))
			const content = base64
				? Buffer.from(data, 'base64').toString('utf-8')
				: data
			resolved[id] = content
			return dataUriPrefix + id
		},
		load(id) {
			if(id.startsWith(dataUriPrefix)) {
				id = id.slice(dataUriPrefix.length)
				return resolved[id] || null
			}
		}
	}
}

module.exports = {
	dataURIPlugin
}