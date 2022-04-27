const md5 = require('js-md5')

// hex string -> byte array(display by decimal format)
const fromHexString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

// 实现shiro中的simple hash md5算法，里面有个迭代，记住是总的hash次数
var msg = 'superAdmin1234567a'
var iterCount = 2

let hex = md5(msg)

// 需要将结果转化成byte array
let result = fromHexString(hex)

// 迭代次数需要decrease by 1
for(let i = 0; i < iterCount - 1; i++) {
	hex = md5(result)	
	result = fromHexString(hex)
}

console.log(hex)
