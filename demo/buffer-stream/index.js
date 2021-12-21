/**
 * buffer可以认为是一块内存区域，可以将字符串编码(utf8, base64)后放在buffer中，然后可以解码读取
 * stream可以认为是一种内存操作的封装，比如使用buffer需要读取完文件后才能进行传输，但是流是可以连续的读取传输的
 * 另外，stream还具有可组合性
 * stream可以认为就是像个管道（host），它不占用内存，可以发起去读流，但是需要提前分配好buffer(内存空间), 就像发起指令一样，读，写，查长度等，跟其他静态语言比如c#概念类似
 */

// const fs = require('fs')
// const path = require('path')

// const file = fs.createWriteStream(path.resolve(__dirname, './writeFile.txt'))
// for(let i = 0; i < 10; i++) {
//   file.write(`${i} `)
// }

// const read = fs.createReadStream(path.resolve(__dirname, './writeFile.txt'))
// console.log('read file...')
// read.on('data', (chunk) => {
//   console.log(chunk)
// })
// .on('end', () => {
//   console.log('end...')
// })

const http = require('http')

const server = http.createServer((req, res) => {
  const { method, url, rawHeaders, headers } = req
  console.log(`method: ${method}, url: ${url}, rawHeader: ${rawHeaders}`)
  console.log(`headers: ${headers}`)
  let body = ''
  req.setEncoding('utf8')
  req.on('data', (chunk) => {
    debugger;
    body += chunk
  })

  req.on('end', () => {
    try {
      // const data = Json.parse(body)
      // res.write(typeof data)
      // res.end()

      // res.writeHead(200, {
      //   "Content-Type": "Application/Json"
      // })
      req.pipe(res)
      res.end()
    } catch(e) {
      res.statusCode = 404
      return res.end(`error: ${e.message}`)
    }
  })
})

server.listen(3000, () => {
  console.log('server is listening on port 3000')
})

// curl localhost:3000 -d {}