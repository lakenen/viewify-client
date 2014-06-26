/*global templates:true, $,addClass,removeClass,hasClass,create,replace*/

var ERR_CONNECTING = 'Error connecting to viewify server.';
var DOCS_URL = 'http://viewify.me/docs';
// var DOCS_URL = 'http://localhost:6789/docs';

var LOADING_CLASS = 'viewify-overlay-loading',
    ERROR_CLASS = 'viewify-overlay-error',
    HIDDEN_CLASS = 'viewify-overlay-hidden';

function isTopWindow() {
    return window === window.top;
}

function tryToParseJSON(json) {
    try {
        return JSON.parse(json);
    } catch (err) {
        return json;
    }
}

function ajax(method, url, data, callback) {
    var req = new XMLHttpRequest();
    req.open(method || 'GET', url, true);
    req.addEventListener('load', function () {
        var status = req.status;
        if (status === 200) {
            callback.call(req, null, req.responseText);
        } else {
            callback.call(req, req.responseText || req.statusCode || 'unknown error :(');
        }
    });
    req.addEventListener('error', function () {
        callback(ERR_CONNECTING);
    });
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(data);
    return req;
}

function json(method, url, data, callback) {
    return ajax(method, url, JSON.stringify(data), function (err, responseText) {
        callback.call(this, tryToParseJSON(err), tryToParseJSON(responseText));
    });
}

function getTemplate(name) {
    if (templates && templates[name]) {
        return templates[name];
    }
    return '';
}

function getSession(url, cb) {
    return json('POST', DOCS_URL, { url: url }, function (err, response) {
        if (err) {
            cb(err, response);
            return;
        }
        if (response.session) {
            cb(null, response.session);
        } else if (response.retry) {
            setTimeout(function () {
                getSession(url, cb);
            }, response.retry * 1000);
        }
    });
}

var currentRequest;
function viewifyLink(a) {
    var url = a.href;
    showOverlay();
    updateOverlay(null, null, url);
    if (a.dataset.viewifySession) {
        updateOverlay(null, a.dataset.viewifySession, url);
        return;
    }
    if (currentRequest) {
        currentRequest.abort();
    }
    currentRequest = getSession(url, function (err, session) {
        if (err) {
            // show error dialog :(
            updateOverlay(err.error || err, null, url);
            return;
        }
        a.dataset.viewifySession = session + '?theme=dark';
        updateOverlay(null, a.dataset.viewifySession, url);
    });
}

function showStatus(overlay, error, originalURL) {
    var statusEl = $('.viewify-status', overlay),
        messageEl = $('.viewify-status-message', statusEl),
        originalLink = $('.viewify-status-link a', statusEl);
    if (error) {
        console.error(error);
        error = 'Oops! Looks like there was an issue converting this document.';
        messageEl.innerText = error;
        removeClass(overlay, LOADING_CLASS);
        addClass(overlay, ERROR_CLASS);
    } else {
        removeClass(overlay, ERROR_CLASS);
        addClass(overlay, LOADING_CLASS);
        messageEl.innerText = 'Generating preview. Hold tight... it\'ll be done in a jiffy!';
    }
    originalLink.href = originalURL;
    originalLink.dataset.viewifyIgnore = true;
}

function showOverlay() {
    var overlay = $('.viewify-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        removeClass(overlay, HIDDEN_CLASS);
        if (!hasClass(document.body, 'viewify-kill-scrolling')) {
            document.body.dataset.top = document.body.scrollTop;
            addClass(document.body, 'viewify-kill-scrolling');
        }
    } else {
        initOverlay();
        showOverlay();
    }
}

function updateOverlay(error, url, originalURL) {
    var overlay = $('.viewify-overlay');
    if (overlay && !hasClass(overlay, HIDDEN_CLASS)) {
        if (url) {
            removeClass(overlay, LOADING_CLASS);
            var iframe = $('.viewify-content', overlay);
            iframe.src = url;
        } else {
            showStatus(overlay, error, originalURL);
        }
    }
}

function hideOverlay() {
    var overlay = $('.viewify-overlay');
    if (overlay) {
        addClass(overlay, HIDDEN_CLASS);
        $('.viewify-content', overlay).src = 'about:blank';
        overlay.addEventListener('webkitTransitionEnd', function () {
            overlay.style.display = 'none';
        });
    }
    removeClass(document.body, 'viewify-kill-scrolling');
    document.body.scrollTop = document.body.dataset.top;
}

function loadStyles() {
    var css = getTemplate('styles.css');
    var styleEl = document.createElement('style'),
        cssTextNode = document.createTextNode(css);
    try {
        styleEl.setAttribute('type', 'text/css');
        styleEl.appendChild(cssTextNode);
    } catch (err) {
        // uhhh IE < 9
    }
    document.getElementsByTagName('head')[0].appendChild(styleEl);
}

function initOverlay() {
    loadStyles();
    var html = getTemplate('overlay.html');
    var overlayEl = create('div');
    addClass(overlayEl, 'viewify-overlay', HIDDEN_CLASS);
    overlayEl.style.display = 'none';
    overlayEl.innerHTML = html;
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener('click', function (event) {
        if (event.target === overlayEl) {
            hideOverlay();
        }
    });
    var closeBtn = $('.viewify-close-btn', overlayEl);
    closeBtn.addEventListener('click', hideOverlay);
}

var clickedEl = null;

window.viewify = {
    fixLink: viewifyLink
};

function isDocumentURL(url) {
    return /\.(pdf|doc|docx|ppt|pptx)(\?.*)?(#.*)?$/.test(url);
}

function fixLink(a) {
    var clone = a.cloneNode(true);
    clone.removeAttribute('onclick');
    clone.removeAttribute('onmousedown');
    clone.removeAttribute('onmouseup');
    replace(a, clone);
    clone.addEventListener('click', function (event) {
        var a = this;
        if (!a.dataset.viewifyIgnore && isDocumentURL(a.href)) {
            viewifyLink(a);
            event.preventDefault();
            event.stopPropagation();
        }
    });
}

function fixLinks() {
    forEach(document.querySelectorAll('a[href]:not([data-viewify-seen]'), function (a) {
        a.setAttribute('data-viewify-seen', 1);
        if (isDocumentURL(a.href)) {
            fixLink(a);
        }
    });
}

if (isTopWindow()) {

    document.addEventListener('mousedown', function(event){
        clickedEl = event.target;
    }, true);


    document.addEventListener('keydown', function(event){
        if (event.keyCode === 27) { //esc
            hideOverlay();
        }
    }, true);

    fixLinks();

    setInterval(fixLinks, 500);

    // document.addEventListener('click', function (event) {
    //     if (event.target.tagName === 'A') {
    //         var a = event.target;
    //         if (!a.dataset.viewifyIgnore && isDocumentURL(a.href)) {
    //             viewifyLink(a);
    //             event.preventDefault();
    //             event.stopPropagation();
    //         }
    //     }
    // });

    // window.addEventListener('message', function (event) {
    //     if (event.origin === 'https://view-api.box.com') {
    //         if (event.data === 'close') {
    //             hideOverlay();
    //         }
    //     }
    // }, false);

} else {
    document.addEventListener('keydown', function(event){
        if (event.keyCode === 27) { //esc
            window.parent.postMessage('close', '*');
        }
    }, true);
}
