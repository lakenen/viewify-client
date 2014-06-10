'use strict';

var url = require('url'),
    http = require('http-https');

var SESSION_URL = 'http://localhost:6789/doc';

var supportedTypes = [
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx'
];
var filesRE = new RegExp('\\.(' + supportedTypes.join('|') + ')$', 'i');

function readJSONResponse(res, cb) {
    var body = '';
    res.on('data', function (d) {
        body += d.toString();
    });
    res.on('end', function () {
        cb(null, JSON.parse(body));
    });
    res.on('error', cb);
}

function requestJSON(uri, method, body, cb) {
    var req,
        options = url.parse(uri);
    options.method = method;

    req = http.request(options, function (res) {
        readJSONResponse(res, function (err, body) {
            if (err) {
                cb(err, res);
                return;
            }
            cb(null, res, body);
        });
    });
    body = body ? JSON.stringify(body) : '';
    req.end(body);
    req.on('error', function (err) {
        cb(err);
    });
}

function isValidFileURI(uri) {
    var parts = url.parse(uri);
    return filesRE.test(parts.pathname);
}

function getSession(url, cb) {
    var req = http.request(SESSION_URL, function (err, res, body) {
        if (res.statusCode !== 200) {
            cb(body);
        }

        if (body.session) {
            cb(null, body.session);
        } else if (body.retry) {
            setTimeout(function () {
                getSession(url, cb);
            }, body.retry * 1000);
        }
    });
    req.end(JSON.stringify({ url: url }));
    req.on('error', function (err) {
        cb(err);
    });
}

function viewify(a) {
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

document.addEventListener('click', function (event) {
    var a = event.target;
    if (a.tagName === 'A') {
        if (isValidFileURI(a.href)) {
            viewify(a);
            event.preventDefault();
            event.stopPropagation();
        }
    }
});
