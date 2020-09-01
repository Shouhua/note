'use strict'
var root = { // return 5
  left: {
    left: {},
    right: {}
  },
  right: {
    left: {}
  }
}

function countNode(root) {
  let count = 0
  function cn(root) {
    if(root === null || typeof root === 'undefined') {
      return 0
    }
    count++
    cn(root.left)
    cn(root.right)
    return count
  }
  cn(root)
  console.log(count)
}

countNode(root)
