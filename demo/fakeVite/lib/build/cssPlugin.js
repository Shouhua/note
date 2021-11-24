const { dataToEsm } = require('@rollup/pluginutils')
const hash = require('hash-sum')
const path = require('path')
const fs = require('fs-extra')
const { compileCss } = require('../utils/cssUtils')
const { resolveAsset } = require('./assetPlugin')

const debug = require('debug')('fakeVite:build:css')
const cssPlaceHolder = '__VITE_CSS__();'

function cssPlugin({
	root,
	cssCodeSplit = true
}) {
	const styles = new Map()
	let staticCss = ''

	return {
		name: 'fakeVite:css',
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
				
				let modules
				if(typeof result === 'string') {
					css = result
				} else {
					css = result.code
					modules = result.modules
				}
				// rewrite css url
				const urlRE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
				if (urlRE.test(css)) {
					// 只是rewrite了第一处
					const fileDir = path.dirname(id)
					let match
					let remaining = css
					let rewritten = ''
					while((match = urlRE.exec(remaining))) {
						rewritten += remaining.slice(0, match.index)
						let [matched, rawUrl] = match
						let urlPath = rawUrl.slice(1, -1)
						const file = path.posix.isAbsolute(urlPath)
						? path.join(root, urlPath)
						: path.join(fileDir, urlPath)
						let { fileName, content } = await resolveAsset(file)
						let	url =
								'import.meta.ROLLUP_FILE_URL_' +
								this.emitFile({
									name: fileName,
									type: 'asset',
									source: content
								})
						rewritten += `url('${url}')`
						remaining = remaining.slice(match.index + match[0].length)
					}
					rewritten += remaining
					css = rewritten
        }
				styles.set(id, css)
				return {
          code: modules
            ? dataToEsm(modules, { namedExports: true })
            : `${cssPlaceHolder}\n` + `export default ${JSON.stringify(css)}`,
					          // code: modules
          //   ? dataToEsm(modules, { namedExports: true })
          //   : (cssCodeSplit
          //       ? // If code-splitting CSS, inject a fake marker to avoid the module
          //         // from being tree-shaken. This preserves the .css file as a
          //         // module in the chunk's metadata so that we can retrieve them in
          //         // renderChunk.
          //         `${cssPlaceHolder}\n`
          //       : ``) + `export default ${JSON.stringify(css)}`,
          map: null,
          // #795 css always has side effect
          moduleSideEffects: true
        }
			}
		},
		async renderChunk(code, chunk) {
			let chunkCss = ''
			for(const id in chunk.modules) {
				if(styles.has(id)) {
					chunkCss += styles.get(id) + '\n'
				}
			}

			let match
			const injectAssetRe = /import.meta.ROLLUP_FILE_URL_(\w+)/
      while ((match = injectAssetRe.exec(chunkCss))) {
        const outputFilepath = '/' + this.getFileName(match[1])
        chunkCss = chunkCss.replace(match[0], outputFilepath)
      }

			if(cssCodeSplit) {
				code = code.replace(`${cssPlaceHolder}`, `
if(!document.getElementById('fakeviite-${hash(chunk.name)}')) {
	let $$style = document.createElement('style')
	$$style.id = 'fakevite-${hash(chunk.name)}'
	$$style.textContent = \`${chunkCss}\`
	document.getElementsByTagName('head')[0].appendChild($$style)	
}
			`)
			code = code.replace(/__VITE_CSS__\(\);/g, '')

				// return {
				// 	code,
				// 	map: null
				// }
			} else {
				code = code.replace(/__VITE_CSS__\(\);/g, '')
				staticCss += chunkCss
				// return null
			}
			return {
				code,
				map: null
			}
		},
		async generateBundle(_options, bundle) {
			if(!cssCodeSplit && staticCss) {
				this.emitFile({
					name: 'style.css',
					type: 'asset',
					source: staticCss
				})
			}
		}
	}
}

module.exports = {
	cssPlugin
}