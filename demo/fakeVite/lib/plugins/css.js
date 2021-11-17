const hash_sum = require('hash-sum')
const { HMR_PATH } = require('./hmr')
const { dataToEsm } = require('@rollup/pluginutils')
const { readBody } = require('../utils')
const path = require('path')

const urlRE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
const cssPreprocessLangRE = /\.(less|sass|scss|styl|stylus|postcss)$/
const cssModuleRE = /\.module\.(less|sass|scss|styl|stylus|postcss|css)$/
const externalRE = /^(https?:)?\/\//
const isExternalUrl = (url) => externalRE.test(url)

const debug = require('debug')('fakeVite:css')

function codegenCss(
  id,
  css,
  modules
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

async function processCss(root, ctx) {
	let css = await readBody(ctx.body)
	return rewriteCssUrls(css, ctx.path)
}

const cssPlugin = ({ app, root }) => {
	app.use(async (ctx, next) => {
		await next()
		if(ctx.body && isCSSRequest(ctx.path)) {
			const id = hash_sum(ctx.path)
			if(ctx.query.import != null) {
				const css = await processCss(root, ctx)
				ctx.type = 'js'
				ctx.body = codegenCss(id, css)
			}
		}
	})
}

module.exports = {
	cssPlugin,
	rewriteCssUrls
}