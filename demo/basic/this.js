// node环境和browser环境不同
// node环境里面的全局对象是global，但是全局变量不会挂在global上
// 'use strict'
// 在严格模式下，指向全局的this为undefined
// 箭头函数使用call，apply和bind时，第一个参数会被忽略，可以当成null
// 箭头函数不会创建自己的this,它只会从自己的作用域链的上一层继承this
// 箭头函数不绑定arguments
// 首先明确函数才具有作用域，this指向caller
// 作用域和上下文是2个概念

// ==非严格比较会类型转换，String, Boolean会转化成Number在进行比较，对象会使用toString后
// 进行比较，比如var o = {count: 0}; o == '[object Object]', 结果是true

// 变量提升
console.log(hoistVar) // undefined, 因为只是提升了变量声明，变量初始化没有提升
var hoistVar = 3
hoistVar1 = 1
console.log(hoistVar1) // 1
var hoistVar

var order = {
  name: 'desk',
  count: 30,
  getName: function() {
    console.log(this.name)
  },
  getCount: () => {
    console.log(this.count)
  }
}
var name = 'global name'
var count = 100

order.getName()
const getNameFn = order.getName
getNameFn()

order.getCount()
const getCountFn = order.getCount
getCountFn()

getNameFn.call(this)
getCountFn.call(order)

var id = 111;
const luke = {
    id: 2,
    func1: function() { // function函数跟谁调用有关系，还有call和apply，bind
        setTimeout(function(){ // 有自己的块级作用域，运行时单独的栈中，使用全局作用域
            console.log('func1: ', this.id)       
        }, 500)
    },
    func2: function(){
        let that = this;
        setTimeout(function(){
            console.log('func2: ', that.id)        
        }, 1500)
    },
    func3: function(){ // 里面的箭头函数的this被永久绑定在外层函数的this
      // arrow function里没有this，可以当成特殊的变量，就像func2一样
        setTimeout(() => {
            console.log('func3: ', this.id)        
        }, 2000)
    },
    func4: () => { // 箭头函数里面的this被设置为封闭的词法环境中
        setTimeout(() => {
            console.log('func4: ', this.id)        
        }, 2500)
    },
};

luke.func1();
luke.func2();
luke.func3();
luke.func4();

// 闭包问题
for(var i = 0; i < 3; i++) {
  // setTimeout(() => {
  //   console.log('ii: ', i)
  // }, 0);
  setTimeout(function(i) {
    console.log(i)
  }, 0, i) // 运行时使用的时全局的i，如果只改变var为let会提示undefined，可以传递值进入
}
console.log('i: ', i)