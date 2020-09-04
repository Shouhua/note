document.addEventListener('DOMContentLoaded', (event) => {
  console.log('document DOMContentLoaded triggered')
})

document.addEventListener('readystatechange', (event) => {
  console.log('dom state: ', document.readyState)
})

window.addEventListener('load', (event) => {
  console.log('window loaded triggered')

  const request = new XMLHttpRequest()

  /**
   * 跨域发送请求测试
   * 请求分为简单请求和复杂请求，简单请求是不会发送options请求协商跨域条件
   * 比如单纯的get请求，没有自定义的header，就不会发送preflight request
   * 复杂请求会先发送optons请求，告诉客户端服务器的
   * 跨域header: (options)
   * Access-Control-Request-Method
   * 跨域response:
   * Access-Control-Allowed-Orgin，(origin means schema://host:port schema, host, port)
   * access-control-Allowed-Methods,
   * Access-Control-Expose-Headers等
   */
  request.open('GET', 'http://localhost:3000/data.json', true)

  // 添加自定义header
  request.setRequestHeader('X-Custom', 'just for test')

  request.addEventListener('readystatechange', (event) => {
    if(request.readyState === 4) { // reponse loaded
      if(request.status === 200) {
        console.log(request.response)
      }
    }
  })
  request.send(null)
})