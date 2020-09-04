const Koa = require('./application');
const app = new Koa();

const obj = {};

app.use(async (ctx, next) => {
  obj.name = 'kongzhi';
  console.log(1111);
  await next();
  console.log('aaaaa');
});

app.use(async (ctx, next) => {
  obj.age = 30;
  console.log(2222);
  await next();
  console.log('bbbbb')
});

app.use(async (ctx, next) => {
  console.log(3333);
  console.log(obj);
  ctx.body = 'hello, world'
});

app.listen(3001, () => {
  console.log('listening on 3001');
});