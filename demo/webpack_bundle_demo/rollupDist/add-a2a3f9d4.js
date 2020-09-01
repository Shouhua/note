'use strict';

function add(a, b) {
  let { name } = { name: 'hello, world!' };
  return name + a + b;
}

exports.default = add;
