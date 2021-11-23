const path = require('path')
const fs = require('fs-extra')
const MagicString = require('magic-string')
const { NodeTypes } = require('@vue/compiler-dom')
const { registerAsset, resolveAsset } = require('./assetPlugin')

const createHtmlPlugin = ({
	root,
	indexPath
}) => {
	if(!fs.existsSync(indexPath)) {
		return 
	}
	const rawHtml = fs.readFileSync(indexPath, 'utf-8')
	const assets = new Map()
	let { html, js } = await compileHtml(
		rawHtml,
		assets
	)
	const htmlPlugin = {
		name: 'fakeVite:html',
		async load(id) {
			if(id === indexPath) {
				return js
			}
		},
		generateBundle(_options, bundle) {
			registerAsset(assets, bundle)
		}
	}
}

const compileHtml = async (html, assets) => {
	const { parse, transform } = require('@vue/compiler-dom')
	html = html.replace(/<!doctype\s/i, '<!DOCTYPE ')
	const ast = parse(html)
	let js = ''
	const s = new MagicString(html)
	const assetUrls = []
	const htmlTransform = (node) => {
		if(node.type === NodeTypes.Element) {
			if(node.tag === 'script') {
				let shouldRemove = false
				const srcAttr = node.props.find(
					(p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'src'
				)
				const typeAttr = node.props.find(
					(p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'type'
				)
				const isJsModule = typeAttr && typeAttr.value && typeAttr.value.content === 'module'
				if(isJsModule) {
					if(srcAttr && srcAttr.value) {
						if(!isExternalUrl(srcAttr.value.content)) {
							js += `\nimport ${JSON.stringify(srcAttr.value.content)}`
							shouldRemove = true
						}
					} else if(node.children.length) {
						js += `\n` + node.children[0].content.trim() + '\n'
						shouldRemove = true
					}
				}
				if(shouldRemove) {
					s.remove(node.loc.start.offset, node.loc.end.offset)
				}
			}
			// this extends the config in @vue/compiler-sfc with <link href>
			const assetAttrsConfig = {
				link: ['href'],
				video: ['src', 'poster'],
				source: ['src'],
				img: ['src'],
				image: ['xlink:href', 'href'],
				use: ['xlink:href', 'href']
			}
			const assetAttrs = assetAttrsConfig[node.tag]
			if(assetAttrs) {
				for(const p of node.props) {
					if(p.type === NodeTypes.ATTRIBUTE &&
						p.value &&
						assetAttrs.includes(p.name) &&
						!isExternalUrl(p.value.content) &&
						!isDataUrl(p.value.content)		
					) {
						assetUrls.push(p)
					}
				}
			}
		}
	}
	transform(ast, {
		nodeTransforms: [htmlTransform]
	})

	for(const attr of assetUrls) {
		const value = attr.value
		const filePath = path.resolve(root, value.content)
		const { fileName, content, url } = await resolveAsset(
			filePath,
			0
		)
    s.overwrite(value.loc.start.offset, value.loc.end.offset, `"${url}"`)
    if (fileName && content) {
      assets.set(fileName, content)
    }
	}
	return {
		html: s.toString(),
		js
	}
}

const externalRE = /^(https?:)?\/\//
const isExternalUrl = (url) => externalRE.test(url)
const dataUrlRE = /^\s*data:/i
const isDataUrl = (url) => dataUrlRE.test(url)

module.exports = createHtmlPlugin