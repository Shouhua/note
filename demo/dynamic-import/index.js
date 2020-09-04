// import greet from './module.js';
// import是编译时引用，导出的是只读引用，不能改变导出的内容，但是能改变导出对象里面的值, 在运行时改变模块的值后，再次使用的时候会得到最新的值
// require是运行时调用，导出的是一份拷贝，能改变导出的对象，所用在运行时改变模块的值后，不能获取到最新的值

// window.onload = function() {
  // const f = () => import(/* webpackChunkName: module */'./module.js')
  // var btn = document.querySelector('#btn');
  // btn.innerHTML = 'Greet';
  // btn.addEventListener('click', function(ev){
  //   f().then(function(module) {
  //     console.log(module);
  //     module.default();
  //   });
//  });
// }
  console.log('before');
  var i = [];
  var p = new Promise((resolve, reject) => {
    console.log('in Promise');
    // i = [resolve, reject];
    setTimeout(() => {
      console.log('in promise timeout');
      resolve();
    }, 10);
  });
  var s = document.createElement('script');
  s.type = 'module';
  s.src = 'module.js';
  s.onload = (ev) => {
    console.log('in script load event: ', ev)
  }
  document.head.appendChild(s);
  Promise.resolve(p).then((v)=> {console.log('resolve by hand')})
  console.log('dynamic import: ', import('./module.js'));
  p.then(() => {console.log('promise')});
  // i[0]();
  console.log('after');