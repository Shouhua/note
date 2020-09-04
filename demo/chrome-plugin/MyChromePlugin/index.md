# manifest.json

- background (html or js)
- content_scripts (matches, js, css, run_at)  
向指定页面注入js，css，可以访问页面的dom，但是不能访问js文件，如果要和js文件进行交互通信，只能通过injected js来实现，另外在content_script中只能访问4中chrome api，如果还要其他api的支援，可以使用background中的js通信:
  1. chrome.extension(getURL , inIncognitoContext , lastError , onRequest , sendRequest)
  2. chrome.i18n
  3. chrome.runtime(connect , getManifest , getURL , id , onConnect , onMessage , sendMessage)
  4. chrome.storage  

  前面有提到injected js，其实就是在content_scripts脚本中动态注入js的脚本
  ```js
  // 向页面注入JS
  function injectCustomJs(jsPath)
  {
    jsPath = jsPath || 'js/inject.js';
    var temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
    temp.src = chrome.extension.getURL(jsPath);
    temp.onload = function()
    {
      // 放在页面不好看，执行完后移除掉
      this.parentNode.removeChild(this);
    };
    document.head.appendChild(temp);
  }
  ```
  还需要在web_accessible_resources中显示的声明才能有权限访问
  ```js
  {
    // 普通页面能够直接访问的插件资源列表，如果不设置是无法直接访问的
    "web_accessible_resources": ["js/inject.js"],
  }
  ```
- web_accessible_resources(js)
- options_ui(html)
- devtools_page(html)  
  生命周期跟随devtools面板的打开关闭一样，devtools页面只能访问有限的chrome api和一组特有的devtools API，比如：chrome.devtools.panel, chrome.devtools.inspectedWindow, chrome.devtools.network。同样，如果需要访问其他的chrome api，就只能通过通信的方式