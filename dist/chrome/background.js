chrome.contextMenus.create({
    title: 'Viewify this link',
    contexts: ['link'],
    onclick: function (info, tab) {
        chrome.tabs.sendMessage(tab.id, info);
    }
});
