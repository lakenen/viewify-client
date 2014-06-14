
chrome.runtime.onMessage.addListener(function (message) {
    viewify.fixLink(clickedEl);
});

function getTemplateURL(name) {
    return chrome.extension.getURL(name);
}
