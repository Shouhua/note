const http = require('http')
const connect = require('connect')
const sirv = require('sirv')
const { promises: fsp } = require('fs')
const path = require('path')
const history = require('connect-history-api-fallback')

const middlewares = connect()
const server = http.createServer(middlewares)

const sirvOptions = {
	dev: true,
	etag: true,
	extension: [],
	setHeaders(res, pathname) {
		if(/\.[tj]sx?$/.test(pathname)) {
			res.setHeader('Content-Type', 'application/javascript')
		}
	}
}

middlewares.use(function srcMiddleware(req, res, next) {
	const cwd = process.cwd()
	const serve = sirv('src', sirvOptions)
	serve(req, res, next)
})

middlewares.use(history({
	from: /\/$/,
	to({parsedUrl}) {
		console.log(`parsedUrl: ${parsedUrl}`);
		return '/index.html'
	}
}))

middlewares.use(async function indexMiddleware(req, res, next) {
	// const serve = sirv('.', sirvOptions)
	if(req.url === '/index.html') {
		req.url = '/index.html'
		// serve(req, res, next)	
		const content = await fsp.readFile(path.resolve('index.html'))
		res.statusCode = 200
		res.setHeader('Content-Type', 'text/html')
		return res.end(content)
	}
	console.log(`index middleware`)
})

server.listen(3000, () => {
	console.log(`server now listen on 3000, test for sirv...`);
})