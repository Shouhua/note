/**
 * new.target判断函数是否通过new创建，如果是则指向构造方法或者函数的引用。在普通函数中，new.target=undefined
 */
function Foo() {
  if(new.target === Foo) {
    console.log('create function by new operator')
  }
  if(new.target === undefined) {
    console.log('regular function')
  }
  console.log('new.target: ', new.target)
}

const foo = new Foo()
Foo()

function Bar() {
  if(!(this instanceof Bar)) {
    console.log('not init by new')
    return
  }
  console.log('init by new')
}

const bar = new Bar()
Bar()

/**
 * new operator
 * prototype就是{}
 * construct就是function实例
 */
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