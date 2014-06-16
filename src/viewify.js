
/*global getURL:false*/

var $ = function (sel, el) { return (el || document).querySelector(sel); },
    create = function (tag) { return document.createElement(tag); },
    templates = {};

var ERR_CONNECTING = 'Error connecting to viewify server.';

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
}

function json(method, url, data, callback) {
    ajax(method, url, JSON.stringify(data), function (err, responseText) {
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
    json('POST', 'http://localhost:6789/docs', { url: url }, function (err, response) {
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

function getSessionURL(id) {
    // return 'https://view-api.box.com/1/sessions/' + id + '/view?theme=dark';
    return 'http://localhost:8000/1/sessions/' + id + '/view?theme=dark';
}

function viewifyLink(a) {
    var url = a.href;
    showOverlay(null, null, url);
    if (a.dataset.viewifySession) {
        showOverlay(null, a.dataset.viewifySession, url);
        return;
    }
    getSession(url, function (err, session) {
        if (err) {
            // show error dialog :(
            showOverlay(err.error || err, null, url);
            return;
        }
        a.dataset.viewifySession = getSessionURL(session);
        showOverlay(null, a.dataset.viewifySession, url);
    });
}

function showStatus(overlay, error, originalURL) {
    var statusEl = $('.viewify-status', overlay),
        messageEl = $('.viewify-status-message', statusEl),
        originalLink = $('.viewify-status-link a', statusEl);
    if (error) {
        messageEl.innerText = sanitize(error);
        overlay.classList.remove('viewify-overlay-loading');
        overlay.classList.add('viewify-overlay-error');
    } else {
        overlay.classList.remove('viewify-overlay-error');
        overlay.classList.add('viewify-overlay-loading');
        messageEl.innerText = 'Viewifying document... it\'ll be done in a jiffy!';
    }
    originalLink.href = originalURL;
    originalLink.dataset.viewifyIgnore = true;
}

function sanitize(text) {
    if (typeof text !== 'string') {
        text = JSON.stringify(text);
    }
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showOverlay(error, url, originalURL) {
    var overlay = $('.viewify-overlay');
    if (overlay) {
        overlay.classList.remove('viewify-overlay-hidden');
        if (!document.body.classList.contains('viewify-kill-scrolling')) {
            document.body.dataset.top = document.body.scrollTop;
            document.body.classList.add('viewify-kill-scrolling');
        }
        if (url) {
            overlay.classList.remove('viewify-overlay-loading');
            var iframe = $('.viewify-content', overlay);
            iframe.src = url;
        } else {
            showStatus(overlay, error, originalURL);
        }
    } else {
        getTemplate('overlay.html', function (err, html) {
            var overlay = create('div');
            overlay.classList.add('viewify-overlay', 'viewify-overlay-hidden');
            overlay.innerHTML = html;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) {
                    hideOverlay();
                }
            });
            var closeBtn = $('.viewify-close-btn', overlay);
            closeBtn.addEventListener('click', hideOverlay);
            showOverlay(error, url, originalURL);
        });
    }
}

function hideOverlay() {
    var overlay = $('.viewify-overlay');
    if (overlay) {
        overlay.classList.add('viewify-overlay-hidden');
        $('.viewify-content', overlay).src = 'about:blank';
    }
    document.body.classList.remove('viewify-kill-scrolling');
    document.body.scrollTop = document.body.dataset.top;
}

var clickedEl = null;

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

window.viewify = {
    fixLink: viewifyLink
};
