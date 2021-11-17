const path = require('path')
const { requestToFile } = require('../resolver')
const { HMR_PATH } = require('./hmr')
const { cacheRead } = require('../utils')

const devInjectionCode = `
<script type="module">
	import '${HMR_PATH}'
	window.process = {
		env: {
			NODE_ENV: 'development'
		}
	}
</script>
`

const injectReplaceRE = [/<head>/, /<!doctype html>/i]

function injectScriptToHtml(html, script) {
	for (const re of injectReplaceRE) {
		if (re.test(html)) {
			return html.replace(re, `$&${script}`)
		}
	}
	return script + html
}

function htmlPlugin({app, root}) {
	app.use(async (ctx, next) => {
    if(ctx.path === '/') {
      return ctx.redirect('index.html')
    }
    if(ctx.path === '/index.html') {
      const filePath = requestToFile(ctx.path, root)
      let htmlContent = await cacheRead(ctx, filePath)
      htmlContent = injectScriptToHtml(htmlContent, devInjectionCode) 
      ctx.body = htmlContent
			return
    }
    return next()
  })
}
module.exports = {
	htmlPlugin
}