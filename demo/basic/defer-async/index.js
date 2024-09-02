/**
 * html解析是按照先后顺序来解析的，script分2中情况：
 * 1. 一种是内联型，即脚本直接写在script里面, 这种没有加载的请求过程，顺序执行，因此，放在header里面
 * 会阻碍dom树和render树的生成，进而影响view的渲染，可能出现白屏，卡顿等
 * 2. 需要外部加载的脚本，加入src的属性
 * 同步执行会阻塞渲染过程去下载和加载script，这个可能受到网络的影响，
 * 导致白屏，卡顿等，所以需要放在body的最后的一个元素，这个时候至少能看到dom的渲染了
 * 
 * （Chrome has a limit of 6 connections per host name, and a max of 10 connections. 
 * This essentially means that it can handle 6 requests at a time coming from the same host, 
 * and will handle 4 more coming from another host at the same time.
 * This is important when realizing how many requests are firing off from different hosts on the same page.
 * While Chrome can only handle 10 requests at a time, Firefox can handle up to 17.）
 * defer和async属性都会让异步的下载脚本，当然如果1个页面还是有6个的限制，不会阻塞页面的渲染过程
 * 不同的是，async异步下载完成后立即执行，所以不能控制脚本的执行顺序，
 * 
 * 1. 使用js动态添加的script，默认使用async的方式加载
 * 2. defer是在渲染完成后，DOMContentLoaded之前去执行, 按照出现的先后顺序执行
 * 3. script标签添加type=“module”默认使用类似defer的方式去加载脚本，但是也可以设置为async
 */
console.log("download script");