/**
 * this file is mainly to collect http cache 
 * 首先服务器侧给出缓存的策略，有3个header表示强缓存策略，协商缓存包括4个header
 * 强缓存：
 * 优先级: Progma：no-cache (http1.0) > Cache-Control: no-cache(http1.1) > Expires: new Date(Date.now() + 2 * 60 * 1000).toString() (http1.1)
 * Cache-Control reponse: no-cache/no-store/must-revalidate/public/private(默认值)/max-age
 * Cache-Control: no-cache, max-age=0, must-revalidate 
 * max-age是相对于请求时间来说的(单位为秒), expires服务器端的当前时间plus过期时间, 缺点：
 * 1. 时间格式容易出错
 * 2. 相对于服务器的时间，客户端容易由于时区，时钟不匹配等因素影响

 * 协商缓存：
 * request header: If-Modified-Since, If-None-Match
 * response header: Last-Modified, ETag 
 * Last-Modified和If-Modified-Since是http1.0就出现的header，Etag和If-None-Match是http1.1增补的，If-None-Match的优先级高于If-Modified-SincIf-Modified-Sincee
 * 为什么有了时间比较还需要etag？
 * 1. 时间比较只能精确到seconds, 不能校验秒内的变化
 * 2. 多次修改，内容不一定会变，这样会浪费请求资源
 * 所有同时包含2中方式时，会忽略If-Modified-Since
 * (cache展开讲)[https://juejin.im/post/6844903747357769742]
 * 
 * **前端的脚本缓存策略可以使用添加querystring的方式，比如http://abc.com?r=212321
 * 在动态加载的脚本时，可以分为development和production，开发版本的时候，直接添加时间戳，
 * 当为线上版本的时候，可以通过webpack注入的方式注入版本变量**
 */

const Koa = require('koa')
const Router = require('@koa/router')
const mime = require('mime')
const path = require('path')
const fs = require('fs-extra')
const etag = require('etag')
// const serve = require('koa-static')

const app = new Koa();
const router = new Router();

router.get(/(^\/index(.html)?$)|(^\/$)/, async (ctx, next) => {
  console.log(`[request]: request index.html`)
  const content = fs.readFileSync(path.resolve(__dirname, 'index.html'))
  ctx.body = content
  ctx.type = mime.getType('index.html')
  await next()
})

router.get(/\.(png|css|js|)$/, async(ctx, next) => {
  const filePath = path.join(__dirname, 'static', ctx.path)
  console.log(`[require]: ${ctx.path}`)
  const content = fs.readFileSync(filePath)
  ctx.body = content
  ctx.type = mime.getType(ctx.path)
  ctx.response.set('Cache-Control', `max-age=${86400}`)
  await next()
})

// router.get(/\S*\.(png|jpe?g)/, async (ctx, next) => {
//   const { path: requestImgPath, response, request } = ctx;
//   ctx.type = mime.getType(requestImgPath);

//   response.set('Cache-Control', 'no-cache')
//   // response.set('Progma', 'no-cache')
//   // response.set('Cache-Control', `max-age=${1*60}`)
//   // response.set('Expires', new Date(Date.now() + 2 * 60 * 1000).toString());

//   const imgPath = path.resolve(__dirname, `.${requestImgPath}`)

//   // 1. 使用If-Modified-Since
//   // const ifModifiedSince = request.get('If-Modified-Since')
//   // const stat = fs.statSync(imgPath)
//   // const lastModified = stat.mtime.toUTCString()
//   // if(ifModifiedSince === lastModified) {
//   //   response.status = 304
//   //   return next()
//   // } else {
//   //   response.lastModified = lastModified
//       // response.set('Content-Type', mime.getType(imgPath))
//       // const imageBuffer = fs.readFileSync(path.resolve(__dirname, `.${requestImgPath}`));
//       // ctx.body = imageBuffer
//   // }

//   const imageBuffer = fs.readFileSync(path.resolve(__dirname, `.${requestImgPath}`));

//   // 2. 使用Etag的方式
//   const ifNoneMatch = request.get('If-None-Match')
//   const imgEtag = etag(imageBuffer)
//   if(ifNoneMatch === imgEtag) {
//     response.status = 304
//     return next()
//   } else {
//     response.etag = imgEtag
//     ctx.body = imageBuffer;
//   }

//   response.set('Content-Type', mime.getType(imgPath))
//   await next();
// })
// let strategy = 'max-age=86400'
// app.use(serve(path.join(__dirname, './static'), {
//   // maxage: 1000*60*60
//   setHeaders(res, path, stats) {
//     console.log(`[request]: ${path}`)
//     res.setHeader('Cache-Control', strategy)
//   }
// }))

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000, () => {
  console.log('server now is listening on port 3000')
})