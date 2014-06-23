
/*global getURL:false*/

var $ = function (sel, el) { return (el || document).querySelector(sel); },
    addClass = function (el, cls) { el.classList.add(cls); },
    removeClass = function (el, cls) { el.classList.remove(cls); },
    hasClass = function (el, cls) { return el.classList.contains(cls); },
    create = function (tag) { return document.createElement(tag); },
    templates = {};

var ERR_CONNECTING = 'Error connecting to viewify server.';
var DOCS_URL = 'http://107.170.254.232/docs';
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

function getTemplate(name, callback) {
    if (templates[name]) {
        callback(null, templates[name]);
    } else {
        ajax('GET', getURL(name), null, function (err, html) {
            if (html) {
                templates[name] = html;
            }
            callback(err, html);
        });
    }
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
        messageEl.innerText = error;
        removeClass(overlay, LOADING_CLASS);
        addClass(overlay, ERROR_CLASS);
    } else {
        removeClass(overlay, ERROR_CLASS);
        addClass(overlay, LOADING_CLASS);
        messageEl.innerText = 'Viewifying document... it\'ll be done in a jiffy!';
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
        loadOverlay(showOverlay);
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

function loadOverlay(done) {
    getTemplate('overlay.html', function (err, html) {
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
        if (typeof done === 'function') {
            done();
        }
    });
}

var clickedEl = null;

window.viewify = {
    fixLink: viewifyLink
};

if (isTopWindow()) {
    // for now, don't do anything if it's not the top window...
    // solving this issue will require some security considerations

    if (document.readyState !== 'complete') {
        document.onload = loadOverlay;
    } else {
        loadOverlay();
    }

    document.addEventListener('mousedown', function(event){
        clickedEl = event.target;
    }, true);


    document.addEventListener('keydown', function(event){
        if (event.keyCode === 27) { //esc
            hideOverlay();
        }
    }, true);

    document.addEventListener('click', function (event) {
        if (event.target.tagName === 'A') {
            var a = event.target;
            if (!a.dataset.viewifyIgnore && /\.(pdf|doc|docx|ppt|pptx)(\?.*)?(#.*)?$/.test(a.href)) {
                viewifyLink(a);
                event.preventDefault();
                event.stopPropagation();
            }
        }
    });

    window.addEventListener('message', function (event) {
        if (event.origin === 'https://view-api.box.com') {
            if (event.data === 'close') {
                hideOverlay();
            }
        }
    }, false);

} else {
    document.addEventListener('keydown', function(event){
        if (event.keyCode === 27) { //esc
            window.parent.postMessage('close', '*');
        }
    }, true);
}
