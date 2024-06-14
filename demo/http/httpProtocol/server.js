const http = require('node:http')
const fs = require('node:fs')
const Koa = require('koa')

const app = new Koa()
app.use(async (ctx, next) => {
	if(ctx.path === '/') {
		const index = fs.readFileSync(process.cwd() + '/test.html')
		ctx.response.status = 200
		ctx.set({'Content-Type': 'text/html'})
		ctx.body = index
		return 
	}
	if(ctx.path === '/img') {
		const image = fs.readFileSync('/home/michael/Downloads/images.jpeg')
		ctx.response.status = 200
		ctx.set({'Content-Type': 'image/jpeg'})
		ctx.body = image
		return
	}
})
const server = http.createServer(app.callback())

// const server = http.createServer((req, res) => {
// 	if(req.url === '/img') {
// 		const image = fs.readFileSync('/home/michael/Downloads/images.jpeg')
// 		res.writeHeader(200, {'Content-Type': 'image/jpeg'})
// 		res.write(image)
// 		res.end()
// 	}
// 	res.write('helloworld')
// 	res.end()
// })

server.listen(8000, () => {
	console.log('Server is listening on 8000')
})