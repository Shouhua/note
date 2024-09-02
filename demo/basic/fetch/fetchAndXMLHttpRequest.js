/*
1. XMLHttpRequest不支持在service/Web worker环境中使用, fetch可以在service/Web workder环境中使用
2. fetch基于promise，返回值是promise，当然可以使用promise包装XMLHttpRequest(callback)
3. fetch对http接口的抽象，包括Request，Response，Headers，Body
4. fetch有允许是否跨域的设置，Header.mode="cors(默认)|no-cors|same-origin|navigate"
5. 在chrome devtools的network中显示type不一样，前者是xhr，后者是fetch
simple request & not-simple request
同时满足以下2大条件，就属于简单请求：
1）请求是以下三种方式之一：HEAD, GET, POST
2) http的头信息不超过以下几种字段:
  Accept,
  Accept-Language, 
  Content-Language, 
  Content-Type(3种值：application/x-www-form-urlencoded, multipart/form-data, text/plain)
*/
const url = 'http://10.201.102.63/api/kunlun/areas/situation'
const fetchUrl = 'http://localhost:3030'
/************** XMLHttpRequest ********************/
const xhr = new XMLHttpRequest()
xhr.open('PUT', fetchUrl, true)
xhr.setRequestHeader('Authorization', 'lIzpgHGrZHaPiGLnGXJEDCzeLxYhsEEksrHjMWdoaFlivfTvswMBDczCwlEy')
xhr.setRequestHeader('client-app-id', 'bigdata-web')
xhr.send(null)
// 原始的事件处理
xhr.onreadystatechange = function handleReadyStateChange(event) {
  if(xhr.readyState === xhr.DONE) {
    console.group('XMLHttpRequest')
    if(xhr.status = 200) {
      console.log('response header: ', xhr.getAllResponseHeaders())
      const resHeaders = xhr.getAllResponseHeaders() 
      const headers = resHeaders.split(/\r\n/).filter(Boolean)
      headers.forEach(item => {
        const h = item.split(':')
        console.log(`${h[0]}:${h[1]}`)
      })
      console.log('response: ', xhr.responseType, xhr.response)
    } else {
      console.log('status: ', xhr.status)
    }
    console.groupEnd()
  }
}
// 后来的浏览器添加的事件处理函数，xhr.readyState === xhr.DONE(4)
xhr.onload = function handleLoad() {
  console.log('on load: ', xhr.readyState)
}
/*************************************************/
/************** fetch ********************/
fetch(fetchUrl, {
  method: 'PUT',
  /**
   * cors: 表示可以进行跨域请求
   * no-cors：跟服务器没有关系，如果服务器允许跨域，请求会正常返回，但是response的data数据没有了，并且设置type: 'opaque'
   * 可以用于传输日志的情况, 只要求发送，不要求返回的
   {
      body: null
      bodyUsed: false
      headers: Headers {}
      ok: false
      redirected: false
      status: 0
      statusText: ""
      type: "opaque"
      url: ""
    }
    * same-origin: 最严格，没有发送请求，直接告诉跨域了，不能请求
   */
  mode: 'no-cors',
  headers: {
    'Authorization': 'lIzpgHGrZHaPiGLnGXJEDCzeLxYhsEEksrHjMWdoaFlivfTvswMBDczCwlEy',
    'client-app-id': 'bigdata-web',
  }
})
  .then((response) => {
    console.group('fetch')
    // Inspect the headers in the response
    response.headers.forEach(console.log);
    // OR you can do this
    for(let entry of response.headers.entries()) {
      console.log(entry);
    }
    return response.json()
  })
  .then((j) => {
    console.log('then: ')
    console.log(j)
  })
  .catch((e) => {
    console.log('catch: ')
    console.log(e)
  })
  .finally(() => {
    console.groupEnd()
  })