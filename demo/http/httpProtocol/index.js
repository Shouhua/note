/**
 * 队首阻塞：
 * http1.0，属于客户端的队首阻塞，只有当前面请求结束后，才能再次发送请求，重新建立TCP连接
 *    1. TCP每次重新连接，刚开始都要经过慢启动和调整滑动窗口，所有刚开始传输的都比较小，影响效率(cubic, bbr等算法)
 *    2. TCP的大量断开重连导致服务器端压力大
 * http1.1，属于服务端的队首阻塞，tcp可以复用，但是只有当前面的请求处理完后，才能处理后面的请求
 *  1. 引入Connection: keep-alive(1.1为默认)
 *  2. 引入pipelining(管线化)，以前是只能发送一个请求得到答复后在继续发送，现在可以发送多个请求，在服务端排队
 *      服务端利用多线程或者多进程并行处理，在按照发送顺序发送消息，但是还是有队首阻塞问题
 * http2.0，多路复用，将请求和响应分帧处理，优先级划分，不用管顺序了
 *    Connection, Stream, Frame(Head frame, data frame等)
 * 但是尽管如此，tcp传输协议还是有req-ack模型，如果中间有丢包情况(多路复用，分帧可以认为是业务层的多条线路，但是使用tcp
 * 传输还是一条线，当这条线上的某个包丢了时，还是要retry), 后面所有的包还是需要等待，所以引入了HTTP3(QUIC)
 * 彻底改写底层传输协议为UDP
 * 
 * Connection: close/keep-alive
 * HTTP1.0默认使用close，每次请求后都会关闭连接，从HTTP1.1后默认使用keep-alive保持连接，除非显示close
 * 
 * TCP”沾包“
 * TCP协议是流协议，消息之间并没有分割的概念，基于TCP的协议发出的数据，由于TCP有nagle优化协议，会将多个小数据包
 * 合并成一个包提高效率，比如早期的telnet协议，应用层协议在解包的时候就不能区分消息分割点不能正确的解析
 * 
 * HTTP协议是基于TCP协议，采用了2中分割方式：一种是长度分割，另一种是内容分割
 * 长度分割使用HTTP协议头Content-Length: 10告诉信息的长度
 * 内容分割采用Transfer-Encoding: chunked头：
 * 如果一个HTTP消息（包括客户端发送的请求消息或服务器返回的应答消息）的Transfer-Encoding消息头的值为chunked，那么，消息体由数量未定的块组成，并以最后一个大小为0的块为结束。
每一个非空的块都以该块包含数据的字节数（字节数以十六进制表示）开始，跟随一个CRLF （回车及换行），然后是数据本身，最后块CRLF结束。在一些实现中，块大小和CRLF之间填充有白空格（0x20）。
最后一块是单行，由块大小（0），一些可选的填充白空格，以及CRLF。最后一块不再包含任何数据，但是可以发送可选的尾部，包括消息头字段。
消息最后以CRLF结尾。
 * 注释：Content-Encoding: gzip这个http头部是告诉内容采用哪种方式压缩的，先压缩后分块


性能优化：
雅虎军规(https://github.com/creeperyang/blog/issues/1)
1. 外部链接部署到CDN上，比如各种库，不经常变动的css，js等, 压缩gzip
2. 接着是浏览器阻塞，我们的大量请求能不能发出去，下面使一些优化，但是最好的还是http2的server push
  1）浏览器阻塞(stalled), 代码中可以使用Promise.all()，不用等每个请求处理完毕后在去请求
  2）DNS查询，首先导入DNS缓存
  3）建立连接的时间，可以优化网络协议，比如使用http2多路复用；一个域有限制比如6个，可以将请求放在不同的域下，比如
    地图瓦片数据的加载
3. lazy loading
4. 合并请求，图片合并, css/js合并等
 */