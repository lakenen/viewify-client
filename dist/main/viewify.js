var templates = {};
templates['overlay.html'] = '<div class="viewify-overlay-inner"><div class="viewify-status"><div class="viewify-status-message"></div><div class="viewify-status-link"><a href="#" download>download original</a></div></div><iframe class="viewify-content" src="about:blank" allowfullscreen></iframe><button class="viewify-close-btn"></button></div>';

templates['styles.css'] = '.viewify-overlay{z-index:99999999;position:fixed;top:0;left:0;right:0;bottom:0;opacity:1;visibility:visible;background:rgba(0,0,0,.4);-webkit-transition:opacity .5s,visibility 0s;transition:opacity .5s,visibility 0s}.viewify-overlay-inner{position:absolute;top:20px;left:20px;right:20px;bottom:20px;background:#fff;border-radius:5px}.viewify-overlay-hidden{visibility:hidden;opacity:0;-webkit-transition:opacity .2s,visibility 0s linear .2s;transition:opacity .2s,visibility 0s linear .2s}.viewify-content,.viewify-status{width:100%;height:100%;position:absolute;top:0;left:0;border:0}.viewify-status{display:none;text-align:center;font-family:Helvetica,sans-serif;font-size:1.4em;align-items:center;align-content:center;justify-content:center;background-position:center 10%;background-repeat:no-repeat;background-size:auto 25%;flex-wrap:wrap}.viewify-status-link,.viewify-status-message{width:100%;padding:1em}.viewify-close-btn{position:absolute;width:11px;height:11px;left:3px;top:5px;border:0;cursor:pointer;background-color:transparent;background-position:center center;background-repeat:no-repeat}.viewify-close-btn:hover{opacity:.5}.viewify-kill-scrolling{overflow:hidden}.viewify-overlay-error .viewify-content,.viewify-overlay-loading .viewify-content{display:none}.viewify-overlay-error .viewify-status,.viewify-overlay-loading .viewify-status{display:flex}';

function $(sel, el) {
    return (el || document).querySelector(sel);
}
function indexOf(arr, val) {
    if (arr.indexOf) {
        return arr.indexOf(val);
    } else {
        var i, l;
        for (i = 0, l = arr.length; i < l; ++i) {
            if (arr[i] === val) {
                return i;
            }
        }
        return -1;
    }
}
function forEach(arr, fn) {
    var i, l;
    for (i = 0, l = arr.length; i < l; ++i) {
        fn(arr[i]);
    }
}
function addClass(el, cls) {
    if (el.classList) {
        el.classList.add(cls);
    } else {
        el.setAttribute(el.getAttribute('class') + ' ' + cls);
    }
}
function removeClass(el, cls) {
    if (el.classList) {
        el.classList.remove(cls);
    } else {
        var classes = el.getAttribute('class') || '';
        classes = classes.trim().split(/\s+/);
        var ind = indexOf(classes, cls);
        if (ind > -1) {
            classes.splice(ind, 1);
        }
        classes = classes.join(' ');
        if (classes) {
            el.setAttribute('class', classes);
        }
    }
}
function hasClass(el, cls) {
    if (el.classList) {
        return el.classList.contains(cls);
    } else {
        var classes = el.getAttribute('class') || '';
        classes = classes.trim().split(/\s+/);
        return indexOf(classes, cls) > -1;
    }
}
function create(tag) {
    return document.createElement(tag);
}
function remove(el) {
    if (el.parentNode) {
        el.parentNode.removeChild(el);
    }
    return el;
}
function replace(oldEl, newEl) {
    oldEl.parentNode.replaceChild(newEl, oldEl);
}

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
    var links = document.querySelectorAll('a[href]:not([data-viewify-seen]');
        console.log('found ' + links.length + ' links');
    forEach(links, function (a) {
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
