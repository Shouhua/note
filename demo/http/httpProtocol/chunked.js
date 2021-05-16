var os = require('os')
require('net').createServer((socket) => {
  socket.on('connect', (data) => {
    console.log('[connect]: ', data)
  })
  /**
   * GET / HTTP/1.1
   * HOST: www.google.com
   * 
   */
  // socket.on('data', (data) => {
  //   console.log('[data]: ', data.toString())
  //   socket.write('HTTP/1.1 200 OK\r\n')
  //   socket.write('Content-length: 12\r\n')
  //   socket.write('\r\n')
  //   socket.write('hello world!')
  //   // socket.destroy()
  // })
  socket.on('data', (data) => {
    console.log('[data]: ', data.toString())
    socket.write('HTTP/1.1 200 OK\n')
    socket.write('Transfer-Encoding: chunked\n')
    socket.write('\n')

    socket.write('3\n')
    socket.write('123\n')

    socket.write(`4\n`)
    socket.write(`helo`+os.EOL)

    socket.write('0\n')
    socket.write('\n')
    // socket.destroy()
    // socket.write('HTTP/1.1 200 OK\r\n');
    // socket.write('Transfer-Encoding: chunked\r\n');
    // socket.write('\r\n');

    // socket.write('b\r\n');
    // socket.write('01234567890\r\n');

    // socket.write('5\r\n');
    // socket.write('12345\r\n');

    // socket.write('0\r\n');
    // socket.write('\r\n');
  })
  socket.on('close', (data) => {
    console.log('[close]: ', data)
  })
}).listen(9000)