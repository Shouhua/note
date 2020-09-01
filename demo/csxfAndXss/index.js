/**
 * CSRF(cross-site request forgery), XSS(cross-site scripting)
 * https://github.com/dwqs/blog/issues/68
 * https://tech.meituan.com/2018/10/11/fe-security-csrf.html
 * https://medium.com/schaoss-blog/%E5%89%8D%E7%AB%AF%E4%B8%89%E5%8D%81-29-web-%E7%B6%B2%E7%AB%99%E5%B8%B8%E8%A6%8B%E7%9A%84%E8%B3%87%E5%AE%89%E5%95%8F%E9%A1%8C%E6%9C%89%E5%93%AA%E4%BA%9B-bc47b572d94d
 * CSP(content-security-policy) http://www.ruanyifeng.com/blog/2016/09/csp.html
 * 
 * XSS攻击可以分为3类：反射型（非持久型）、存储型（持久型）、基于DOM:
 * 反射型：服务器都是假的，CSRF服务器是真的。攻击者可以注入任意的恶意脚本进行攻击，可能注入恶作剧脚本，或者注入能获取用户隐私数据(如cookie)的脚本
 * 存储型：常见的留言板等
 * 基于DOM：基于 DOM 的 XSS 攻击是指通过恶意脚本修改页面的 DOM 结构，是纯粹发生在客户端的攻击
 * 
 * XSS攻击的防范：
 * 1. HttpOnly防止劫取Cookie
 * 2. 输入检查，不要相信用户的输入，decodingMap，编码或者过滤用户的输入
 * 3. 输出检查，sanitize-html
 * 
 * CSRF 攻击是攻击者借助受害者的 Cookie 骗取服务器的信任，可以在受害者毫不知情的情况下以受害者名义伪造请求发送给受攻击服务器，从而在并未授权的情况下执行在权限保护之下的操作。
 * CSRF攻击的防范：
 * 1. 验证码，强迫用户跟应用交互
 * 2. referer checker
 * 3. 添加验证token
 * 4. 设置Cookie的sameSite
 */
const Koa = require('koa')
const csp = require('koa-csp')
const fs = require('fs')
const path = require('path')

const app = new Koa();

app.use(csp({
  enableWarn: true,
  policy: {
    'default-src': ['self'],
    'script-src': [
      'self',
      "'nonce-123'" // 注意这里的引号，nonce和hash必须放在单引号中，不然会报错
    ]
  }
}))

app.use((ctx, next) => {
  if(ctx.path === '/') {
    const content = fs.readFileSync(path.resolve(__dirname, './index.html')) 
    ctx.type = 'text/html'
    ctx.body = content
    return next();
  }
})

app.use((ctx, next) => {
  debugger;
  return next();
})

app.listen(3001, () => {
  console.log('Server listen 3001')
})