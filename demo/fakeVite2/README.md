1. Roadmap
根据vitejs使用cjs重复实现，目前已经完成：
	dev server(include ws)，
	moduleGraph/pluginContainer,
	hmr，
	import glob,
	openBrowser,
	overlay,
	launch-editor-middleware,
	handle css/scss and css hmr
	handle asset
	prebundle
接下来需要完成的:
	proxy middleware
	vue plugin

2. dev执行过程
- server部分，首先是个文件服务，各种middleware，然后在提供服务的同时，利用类似rollup插件系统各种分析改写文件  
middleware流程使用原生http新建server，使用connect生成middleware，文件服务使用sirv，改写使用connect-history-api-fallback，可以参考简单的sirv-demo工程
timeMiddleware: 计算request在整个middleware中的时间
corsMiddleware：设置CORS
proxyMiddleware: 设置proxy
__open-in-editor: 当发生错误时候，使用shadow dom在浏览器中显示错误，并且附上发生错误的文件和行号，当点击链接时候，利用这个middleware可以跳到相应IDE中的文件中的对应行上，增加开发者体验(DX)
ping: 提供PING服务，客户端可以探测服务器是否可用

servePublicMiddleware: 首先判断request是不是请求的public中的文件
**transformMiddleware**: 使用plugins分析转化请求的文件
serveStaticMiddleware: 处理请求'/@fs/*'
spaFallbackMiddleware: rewrite 以‘/’结尾的request为‘/index.html’
**indexHtmlMiddleware**: 以html为入口分析文件中scripts和各种assets等

- plugins部分, 主体包括pluginContainer和moduleGraph, 类似rollup的插件系统，不同于v1推出这一部分，主要是为了dev和build共用处理过程，尽量保证dev和build环境一致性，moduleGraph主要是存储module的各种import和importer关系，用于plugins中分析使用，具体不分析了，可以看代码，下面重点记录上面2个重点middleware处理流程
1) indexHtmlMiddleware
主要部分和关系存储均放在html plugin中(assetAttrsConfig, resolveHtmlTransforms, applyHtmlTransforms, traverseHtml, getScriptInfo, addToHTMLProxyCache)，这个middleware主要是分析里面的script和assets标签，如果是src就相应的rewrite url，如果是content，就使用htmlProxyMap存储，最后注入'/@fakeVite/client'
2) css  
这个没什么好说的，dev环境做了相应的事情编译了css

3. build执行过程
前面说过dev和build共用了大部分的plugins，尽量保证环境一致
1) buildHtmlPlugin
不同于传统的打包工具，比如webpack，在build中，默认是将html文件作为入口文件的。首要步骤就是transform分析html，主体根dev大致一致, 返回js，供后面js和assests分析，这个js，rollup会自动生成类似于index.123.js, transform过程跟dev比较一致，关键是抽取了js，删除了script和css标签。  
generateBundle默认情况下html会生成index.123.js, 其他有3个地方手动asset类型emitFile, css/asset/html
2) css
注意到config.build.cssCodeSplit, 如果为false，那就是将所有的css会成一个style.css，然后加载在html中；如果为true，就会每个chunk生成一个css文件，加载在html中。默认值是!lib