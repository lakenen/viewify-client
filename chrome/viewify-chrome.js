
chrome.runtime.onMessage.addListener(function (message) {
    viewify.fixLink(clickedEl);
});

function getURL(name) {
    return chrome.extension.getURL(name);
}
