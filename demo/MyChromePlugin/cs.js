// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
// {
// 	// console.log(sender.tab ?"from a content script:" + sender.tab.url :"from the extension");
// 	if(request.cmd == 'test') alert(request.value);
// 	sendResponse('我收到了你的消息！');
// });

const script = document.createElement('script')
script.src = chrome.runtime.getURL('script.js')
// script.dataset.options = JSON.stringify(options)
script.onload = () => {
	console.log('script onload event occured')
	// script.remove()
}
script.id = `console-injected-script`
;(document.head || document.documentElement).appendChild(script)

console.log(`[console] injected script`)