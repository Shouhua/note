/**
 * blob Binary Large Object, 主要用于FILE对象，比如input选择文件得到的file list，或者
 *  dataTransfer中数据等
 */
const b1 = new Blob(data, {type: 'text/image'})
const b1Url = URL.createObjectURL(b1)
const img = doucment.getElementById('#imgId')
img.src = b1Url
URL.revokeObjectURL(b1Url)

const b = new Blob(['Hello, world!'], {type: 'text/plain'})
console.log(b.type, b.size)
b.arrayBuffer().then(val => {
	console.log(val)
})
const newBlob = new Blob([uint8Arr], {type: 'application/octet-stream'})

const url = URL.createObjectURL(b)
URL.revokeObjectURL(url)