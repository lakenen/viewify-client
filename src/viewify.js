var $ = function (sel, el) { return (el || document).querySelector(sel); },
    remove = function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); },
    create = function (tag) { return document.createElement(tag); },
    templates = {};

function findDocs() {
    return [].filter.call(document.querySelectorAll('a[href]'), function (a) {
        return /\.(pdf|doc|docx|ppt|pptx)(\?.*)?(#.*)?$/.test(a.href);
    });
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
            callback.call(req, req.responseText);
        }
    });
    req.addEventListener('error', callback);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(data);
}

function json(method, url, data, callback) {
    ajax(method, url, JSON.stringify(data), function (err, responseText) {
        callback.call(this, tryToParseJSON(err), tryToParseJSON(responseText));
    });
}

function getTemplate(name, callback) {
    /*global getTemplateURL:false*/
    if (templates[name]) {
        callback(null, templates[name]);
    } else {
        ajax('GET', getTemplateURL(name), null, function (err, html) {
            if (html) {
                templates[name] = html;
            }
            callback(err, html);
        });
    }
}

function getSession(url, cb) {
    json('POST', 'http://localhost:6789/doc', { url: url }, function (err, response) {
        if (err) {
            cb(err);
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

function viewifyLink(a) {
    var url = a.href;
    showOverlay(null, null, url);
    if (a.classList.contains('viewify-error')) {
        showOverlay('error...', null, url);
        return;
    }
    if (a.dataset.viewifySession) {
        console.log(a.dataset.viewifySession)
        showOverlay(null, 'https://view-api.box.com/1/sessions/' + a.dataset.viewifySession + '/view?theme=dark', url);
        return;
    }
    a.classList.add('viewify-converting');
    getSession(url, function (err, session) {
        a.classList.remove('viewify-converting');
        if (err) {
            a.classList.add('viewify-error');
            // show error dialog :(
            console.log(err);
            showOverlay(err, null, url);
            return;
        }
        a.dataset.viewifySession = session;
        console.log(session)
        showOverlay(null, 'https://view-api.box.com/1/sessions/' + session + '/view?theme=dark', url);
    });
}

function showOverlay(error, url, original) {
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
        } else if (error) {
            overlay.classList.remove('viewify-overlay-loading');
            overlay.classList.add('viewify-overlay-error');
            $('.viewify-status', overlay).innerText = error;
        } else {
            overlay.classList.remove('viewify-overlay-error');
            overlay.classList.add('viewify-overlay-loading');
            $('.viewify-status', overlay).innerHTML = 'viewifying document... (<a href="'+original+'">download original</a>)';
            $('.viewify-status a', overlay).dataset.viewifyIgnore = true;
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
            $('.viewify-close-btn', overlay).addEventListener('click', hideOverlay);
            showOverlay(error, url, original);
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
