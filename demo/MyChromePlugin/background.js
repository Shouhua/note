chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({color: '#3aa757'}, function() {
    console.log("The color is green.");
  });

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'baidu.com', schemes: ['https']},
      })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });

  // chrome.contextMenus.create({
  //   title: "测试右键菜单",
  //   onclick: function(){alert('您点击了右键菜单！');}
  // });
});