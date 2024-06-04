/**
function t1() {
  console.log(1)
  t2()
  console.log(5)
}

function t2() {
  console.log(2)
  t3()
  console.log(4)
}

function t3() {
  console.log(3)
  return
}

t1()
*/
async function fun1(next) {
  console.log(1111);
  await next();
  console.log('aaaaaa');
}

async function fun2(next) {
  console.log(22222);
  await next();
  console.log('bbbbb');
}

async function fun3() {
  console.log(3333);
}

function compose(middleware, oldNext) {
  return function() {
    return Promise.resolve(middleware(oldNext))
  }
  // return async function() {
  //   await middleware(oldNext);
  // }
}

const middlewares = [fun1, fun2, fun3];

// 最后一个中间件返回一个promise对象
let next = async function() {
  return Promise.resolve();
};

for (let i = middlewares.length - 1; i >= 0; i--) {
  next = compose(middlewares[i], next);
}
next();
