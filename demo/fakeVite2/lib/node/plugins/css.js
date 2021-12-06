const directRequestRE = /(\?|&)direct\b/
const commonjsProxyRE = /\?commonjs-proxy/
const inlineRE = /(\?|&)inline\b/
const usedRE = /(\?|&)used\b/

const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)
const cssModuleRE = new RegExp(`\\.module${cssLangs}`)

const isCSSRequest = (request) =>
  cssLangRE.test(request)

const isDirectCSSRequest = (request) =>
  cssLangRE.test(request) && directRequestRE.test(request)

const isDirectRequest = (request) =>
  directRequestRE.test(request)

module.exports = {
	isDirectCSSRequest,
	isDirectRequest
}