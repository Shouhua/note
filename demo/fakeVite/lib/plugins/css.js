const hash_sum = require('hash-sum')
const { HMR_PATH } = require('./client')
const { dataToEsm } = require('@rollup/pluginutils')
const { readBody } = require('../utils')
const path = require('path')
const { compileStyleAsync } = require('@vue/compiler-sfc')
const { compileCss } = require('../utils/cssUtils')

const urlRE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
const cssPreprocessLangRE = /\.(less|sass|scss|styl|stylus|postcss)$/
const cssModuleRE = /\.module\.(less|sass|scss|styl|stylus|postcss|css)$/
const externalRE = /^(https?:)?\/\//
const isExternalUrl = (url) => externalRE.test(url)
const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)
const directRequestRE = /(\?|&)direct\b/
const isDirectCSSRequest = (request) =>
  cssLangRE.test(request) && directRequestRE.test(request)

const debug = require('debug')('fakeVite:css')

function codegenCss(
  id,
  css, 
	modules = false
) {
  let code =
    `import { updateStyle } from "${HMR_PATH}"\n` +
    `const css = ${JSON.stringify(css)}\n` +
    `updateStyle(${JSON.stringify(id)}, css)\n`
  if (modules) {
    code += dataToEsm(modules, { namedExports: true })
  } else {
    code += `export default css`
  }
  return code
}

const isCSSRequest = (file) =>
  file.endsWith('.css') || cssPreprocessLangRE.test(file)

function rewriteCssUrls(css, base) {
	return (css = css.replace(urlRE, (matched, rawUrl) => {
		if(matched && rawUrl) {
			let wrap = ''
			const first = rawUrl[0]
			if (first === `"` || first === `'`) {
				wrap = first
				rawUrl = rawUrl.slice(1, -1)
			}
			if (
				isExternalUrl(rawUrl) ||
				rawUrl.startsWith('data:') ||
				rawUrl.startsWith('#')
			) {
				return matched
			}
			return `url(${wrap}${path.resolve(path.dirname(base), rawUrl)}${wrap})`
		}
	}))
}

const processedCSS = new Map()
async function processCss(root, ctx) {
	let css = await readBody(ctx.body)
	// const result = await compileStyleAsync({
	// 	id: '',
	// 	source: css,
	// 	modules: ctx.path.includes('.module'),
	// 	scoped: false
	// })
	const result = await compileCss(ctx.path, {
		id: '',
		source: css,
		modules: ctx.path.includes('.module'),
		scoped: false
	})
	if(typeof result === 'string') {
		return {
			css: rewriteCssUrls(css, ctx.path)
		}
	}
	if (result.errors.length) {
		console.error(`[fakeVite] error applying css transforms: `)
		result.errors.forEach(console.error)
	}
	const res = {
		css: rewriteCssUrls(result.code, ctx.path),
		modules: result.modules
	}
	processedCSS.set(ctx.path, res)
	return res
}

const cssPlugin = ({ app, root }) => {
	app.use(async (ctx, next) => {
		await next()
		if(ctx.body && isCSSRequest(ctx.path)) {
			const id = hash_sum(ctx.path)
			if(ctx.query.import != null) {  // 自己写的css文件
				const res = await processCss(root, ctx)
				ctx.type = 'js'
				ctx.body = codegenCss(id, res.css, res.modules)
			}
		}
	})
}

module.exports = {
	cssPlugin,
	rewriteCssUrls,
	codegenCss,
	isDirectCSSRequest,
	isCSSRequest
}