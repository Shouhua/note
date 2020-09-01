"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * TODO: cookie
 * httpOnly
 * cross site can't manipulate cookie
 */
const Koa = require("koa");
const app = new Koa();
app.use((ctx, next) => {
    if (ctx.url === '/index') {
        ctx.cookies.set('cid', 'hello world', {
            domain: 'localhost',
            path: '/index',
            maxAge: 10 * 60 * 1000,
            expires: new Date('2020-7-15'),
            httpOnly: true,
            overwrite: false,
            sameSite: true,
        });
        ctx.body = 'cookie is ok';
    }
    else {
        ctx.body = 'hello world';
    }
});
app.listen(3000, () => {
    console.log('server is listening on 3000');
});
//# sourceMappingURL=index.js.map