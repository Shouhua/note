- 获取第三方cookie，典型的跨域场景，需要配置跨域
```javascript
Access-Control-Allow-Origin: '127.0.0.1:8080'
Access-Control-Allow-Credential: True
```
- 不能通过document.cookie 读取第三方cookie内容
- 第一个接口返回第三方cookie，下次再访问时，也能一起携带,，但是有前提条件。chrome现在版本100已经不能这么使用了，firefox100目前可以通过配置实现：
```javascript
// 设置fetch的init属性(https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch)
credentials：‘include’

// cookie属性设置
SameSite：‘None
```
远程服务端简单代码，比如ip：10.122.48.111
```javascript
// index.js
const Koa = require('koa')
const { createServer } = require('http')
const cors = require('@koa/cors')
const { readFile } = require('fs/promises')
const path = require('path')

const app = new Koa()
app.use(cors({
	'origin': 'http://127.0.0.1:8080',
	'credentials': true
}))

app.use(async (ctx, next) => {
	if(ctx.path === '/index.html') {
		ctx.type = 'text/html'	
		const content = await readFile(path.resolve(__dirname, 'index.html'), {
			encoding: 'utf-8'
		}) 
		ctx.body = content
		return
	}
	if(ctx.path === '/login') {
		ctx.cookies.set('amp-token', Buffer.from('hello, xuanwu').toString('base64'), {
			// 'path': '/getSth',
			'httpOnly': false,
			'sameSite': 'None',
			// 'secure': false,
			'maxAge': 60*60*60*24*365,
			// 'expires': +new Date(new Date().getTime()+86409000).toUTCString()
		})
		ctx.type = 'application/json'
		ctx.body = JSON.stringify({
			code: 0,
			data: {},
			msg: 'success'
		});
		return
	}
	if(ctx.path === '/getSth') {
		const token = ctx.cookies.get('amp-token')
		console.log(`token: ${token}`)
		ctx.type = 'application/json'
		ctx.body = JSON.stringify({
			code: 0,
			data: { 
				count: 10
			},
			msg: 'success'
		});
		return
	}
})

const server = createServer(app.callback())
server.listen(3000, () => {
	console.log('Server now listening on 3000...');
})
```
以下代码可以本地部署一份，然后使用前端http-server起服务，访问http://127.0.0.1:8080，注意：host对应服务端CORS设置
```html
// index.html
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Document</title>
</head>
<body>
	<h1>CORS Cookie Testing</h1>	
	<script type="module">
		const login = await fetch('http://10.122.48.111:3000/login', {
			credentials: "include"
		})
		const loginData = await login.json()

		console.log(loginData);
		const sth = await fetch('http://10.122.48.111:3000/getSth', {
			credentials: "include"
		})
		const sthData = await sth.json()

		console.log(sthData);
	</script>
</body>
</html>
```
可以调整服务端的cookie设置代码，在chrome和firefox中查看getSth是否携带了token。  
如果是你正常的正在逛着天猫，天猫会把你的信息写入一些 Cookie 到 .tmall.com 这个域下，然而打开控制台你会看到，并不是所有 Cookie 都是 .tmall.com 这个域下的，里面还有很多其他域下的 Cookie ，这些所有非当前域下的 Cookie 都属于第三方 Cookie，虽然你可能从来没访问过这些域，但是他们已经悄悄的通过这些第三方 Cookie来标识你的信息，然后把你的个人信息发送过去了。主要用于广告，精准营销，具体可以参考文章：https://zhuanlan.zhihu.com/p/131256002
