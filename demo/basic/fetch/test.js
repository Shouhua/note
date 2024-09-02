const Koa = require('koa')
const path = require('node:path')
const fs = require('node:fs')
const http = require('node:http')

const app = new Koa()

app.use((ctx, next) => {
	if(ctx.path === '/') {
		const filePath = path.resolve(__dirname, 'test.html')
		const content = fs.readFileSync(filePath)		
		ctx.set('Content-Type', 'text/html')
		ctx.body = content
		return
	}
	next()
})

app.use((ctx,next) => {
	if(ctx.path === '/get') {
		ctx.set('Content-Type', 'application/json')
		ctx.body = JSON.stringify({"name": "James"})
		return
	}
	next()
})

const server = http.createServer(app.callback())
server.listen(9000, () => {
	console.log('server is listening on 9000')
})