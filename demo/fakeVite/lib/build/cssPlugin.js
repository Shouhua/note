const { dataToEsm } = require('@rollup/pluginutils')
const hash = require('hash-sum')
const path = require('path')
const fs = require('fs-extra')

function cssPlugin({
	root,
	cssCodeSplit = true
}) {
	const styles = new Map()
	let staticCss = ''

	return {
		name: 'fakeVite:css',
		async resolveId(id) {
			if(id === 'vue') {
				return id
			}
			return null
		},
		async load(id) {
			console.log(id);
			if(id === 'vue') {
				const vueRequest = path.resolve(root, 'node_modules/vue/dist/vue.esm-browser.js')
				const content = fs.readFileSync(vueRequest)
				return content.toString('utf-8')
			}
			return null
		},
		async transform(css, id) {
			if(id.endsWith('.css')) {
				const isVueStyle = /\?vue&type=style/.test(id)
				const result = isVueStyle
					? css
					: await compileCss('', {
						id: '',
						filename: id,
						scoped: false,
						modules: /\.module\.css/.test(id),
						source: css
					})
				
				// let modules
				if(typeof result === 'string') {
					css = result
				} else {
					css = result.code
					// modules = result.modules
				}
				styles.set(id, css)
				return {
					code: cssCodeSplit
						? `__VITE_CSS__();\n`
						: ``
						+ `export default ${JSON.stringify(css)}`, // only export will be removed on source code!!!
					map: null
				} 
			}
		},
		async renderChunk(code, chunk) {
			let chunkCss = ''
			let printed = false
			// TODO why twice???
			console.log(`[fakeVite] ${chunk.name}, ${chunk.isDynamicEntry}, ${chunk.isEntry}`)
			// console.log(`[fakeVite] ${JSON.stringify(chunk)}`)
			for(const id in chunk.modules) {
				if(styles.has(id)) {
					chunkCss += styles.get(id)
				}
			}
			if(cssCodeSplit) {
				code = code.replace('__VITE_CSS__()', `
				if(!document.getElementById('fakeviite-${hash(chunk.name)}')) {
					let $$style = document.createElement('style')
					$$style.id = 'fakevite-${hash(chunk.name)}'
					$$style.textContent = \`${staticCss}\`
					document.getElementsByTagName('head')[0].appendChild($$style)	
				}
			`)
				staticCss += chunkCss
				return null
				// return {
				// 	code,
				// 	map: null
				// }
			} else {
				staticCss += chunkCss
				return null
			}
		},
		async generateBundle(_options, bundle) {
			// if(staticCss) {
			// 	this.emitFile({
			// 		name: 'style.css',
			// 		type: 'asset',
			// 		source: staticCss
			// 	})
			// }
		}
	}
}

module.exports = {
	cssPlugin
}