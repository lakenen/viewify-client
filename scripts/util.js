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
