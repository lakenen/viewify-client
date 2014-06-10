function findDocs() {
    return [].filter.call(document.querySelectorAll('a[href]'), function (a) {
        return /\.(pdf|doc|docx|ppt|pptx)(\?.*)?(#.*)?$/.test(a.href);
    });
}

function ajax(options) {
    var req = new XMLHttpRequest();
    req.open(options.method || 'GET', options.url, true);
    req.addEventListener('load', function () {
        var status = req.status;
        if (status === 200) {
            options.then(null, JSON.parse(req.responseText));
        } else {
            options.then(JSON.parse(req.responseText));
        }
    });
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(options.data));
}

function getSession(url, cb) {
    ajax({
        method: 'POST',
        url: 'http://localhost:6789/doc',
        data: {
            url: url
        },
        then: function (err, response) {
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
        }
    });
}

function viewifyLink(a) {
    if (a.classList.contains('viewify-converting') || a.classList.contains('viewify-error')) {
        return;
    }
    if (a.dataset.viewifySession) {
        window.open('https://view-api.box.com/1/sessions/' + a.dataset.viewifySession + '/view');
        return;
    }
    var url = a.href;
    a.classList.add('viewify-converting');
    getSession(url, function (err, session) {
        a.classList.remove('viewify-converting');
        if (err) {
            a.classList.add('viewify-error');
            // show error dialog :(
            console.log(err);
            return;
        }
        a.dataset.viewifySession = session;
        window.open('https://view-api.box.com/1/sessions/' + session + '/view');
    });
}

var clickedEl = null;

document.addEventListener('mousedown', function(event){
    clickedEl = event.target;
}, true);

document.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') {
        var a = event.target;
        if (/\.(pdf|doc|docx|ppt|pptx)(\?.*)?(#.*)?$/.test(a.href)) {
            viewifyLink(a);
            event.preventDefault();
            event.stopPropagation();
        }
    }
});

chrome.runtime.onMessage.addListener(function (message) {
    viewifyLink(clickedEl);
});
