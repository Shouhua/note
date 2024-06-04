/**
 * Father有一个prototype的属性，属性值是一个对象，对象里有一个属性constructor，指向Father
 * instanceof 判断原型与实例之间的关系, 判断实例的prototype在不在原型链上,只要实例与原型链上出现过的测试函数一致，则为true
 * http://louiszhai.github.io/2015/12/15/prototypeChain/
 * new解释 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/new
 */

function Father() {
  console.log('father function')
  this.property = true
}

Father.prototype.getFatherValue = function() {
  return this.property
}

function Son() {
  console.log('son fn')
  this.sonProperty = true
}

// Son.prototype = new Father()
原型继承
Son.prototype = Object.create(Father.prototype)
Son.prototype.constructor = Son // 修改原型的constructor为Son
Son.prototype.getSonValue = function() {
  return this.sonProperty
}

var instance = new Son()
console.log(instance.getFatherValue())

// 2中测试实例与原型链之间关系的方式，instanceof, isPrototypeOf
// instanceof
console.log(instance instanceof Father)
console.log(instance instanceof Son)
console.log(instance instanceof Object)
// isPrototypeOf
console.log(Father.prototype.isPrototypeOf(instance))
console.log(Son.prototype.isPrototypeOf(instance))
console.log(Object.prototype.isPrototypeOf(instance))

Function.prototype.new = function() {
  var args = arguments
  var constructor = this
  function Fake() {
    constructor.apply(this, args)
  }
  Fake.prototype = constructor.prototype
  return new Fake // 返回新的实例的constructor
}

function foo() {}
foo.new('a')