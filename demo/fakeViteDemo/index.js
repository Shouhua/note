const Koa = require('koa')
const static = require('koa-static')
const path = require('path')
const app = new Koa()

let port = 3333

app.use((ctx, next) => {
	if(ctx.path === '/')
	return ctx.redirect('/index.html')
	console.log('[custome]', ctx.path);
	return next()
})
app.use(static(path.resolve(__dirname, './dist')))
app.listen(port, () => {
	console.log(`Now server listening on http://localhost:${port}`);
})