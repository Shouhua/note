# defer和async
html解析是按照先后顺序来解析的，script分两种情况：
1. 一种是内联型，即脚本直接写在script里面, 这种没有加载时的请求过程，按照html解析顺序执行，因此，放在header里面会阻碍dom树和style树的生成，进而影响界面的渲染，可能出现白屏，卡顿等
2. 需要外部加载的脚本，需要添加src属性，默认情况下跟内联型相同，会阻塞渲染过程去下载和加载script，同时可能受到网络的影响，导致白屏，卡顿等，所以需要放在body的最后的一个元素，这个时候至少能看到dom的渲染结果  

defer和async是script标签的属性，它们都异步的下载脚本，不会阻塞页面的渲染过程。（当然1个页面还是有6个的限制)
::: tip
Chrome has a limit of 6 connections per host name, and a max of 10 connections. 
This essentially means that it can handle 6 requests at a time coming from the same host, and will handle 4 more coming from another host at the same time.This is important when realizing how many requests are firing off from different hosts on the same page.
:::
defer和async不同的是，async异步下载完成后立即执行，如果有多个脚本就不能控制脚本的执行顺序，使用js动态添加的script，默认使用async的方式加载。defer是在渲染完成后，DOMContentLoaded之前去执行。script标签添加type="module"默认使用类似defer的方式去加载脚本，但是也可以手动设置为async方式  
使用场景：webpack中split chunk加载的时候就是使用动态添加async script的方式