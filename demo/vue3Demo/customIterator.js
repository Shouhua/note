/**
Type[Symbol.iterator] = function() {
  return {
    next: function() {
      return {
        value: Type,
        done: Boolean
      }
    }
  }
}
*[Symbol.iterator] = function() {
  for(let i = 0; i < 5; i++) {
    yield i
  }
  return 
}
*/

const obj = {
  foo: 'bar'
}

Object.prototype[Symbol.iterator] = function() {
  var _this = this
  var keys = Object.keys(_this)
  var currentIndex = -1
  return {
    next: function() {
      currentIndex++
      return {
        value: _this[keys[currentIndex]],
        done: currentIndex + 1 > keys.length
      }
    }
  }
}

Object.defineProperty(Object, 'Symbol.iterator', {
  enuerable: false,
  configurable: false,
  writable: false,
  value: function() {
    var _this = this
    var keys = Object.keys(_this)
    var currentIndex = -1
    return {
      next: function() {
        currentIndex++
        return {
          value: _this[keys[currentIndex]],
          done: currentIndex + 1 > keys.length
        }
      }
    }
  }
})

for(item of obj) {
  console.log(item)
}