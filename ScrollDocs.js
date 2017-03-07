/**
 * Created by mihaisandor on 12/2/17.
 */
!function (e, t) {
  'function' == typeof define && define.amd ? define([], t(e)) : 'object' == typeof exports ?
      module.exports = t(e) : e.flappylang = t(e)
}('undefined' != typeof global ? global : this.window || this.global, (e) => {
  'use strict';
  let t, n, a, o, r, c, s = {},
    i = 'querySelector' in document && 'addEventListener' in e && 'classList' in document.createElement('_'),
    l = [],
    u = {
      selector: '[data-flappylang] a',
      selectorHeader: '[data-flappylang-header]',
      offset: 0,
      activeClass: 'active',
      callback: () => {
      }
    },
    f = (e, t, n) => {
      if ('[object Object]' === Object.prototype.toString.call(e))
        for (let a in e) Object.prototype.hasOwnProperty.call(e, a) &&
        t.call(n, e[a], a, e);
      else
        for (let o = 0, r = e.length; r > o; o++) t.call(n, e[o], o, e)
    },
    d = function () {
      let e = {},
        t = !1,
        n = 0,
        a = arguments.length;
      '[object Boolean]' === Object.prototype.toString.call(arguments[0]) && (t = arguments[0], n++);
      for (let o = (n) => {
        for (let a in n) Object.prototype.hasOwnProperty.call(n, a) &&
        (t && '[object Object]' === Object.prototype.toString.call(n[a]) ? e[a] = d(!0, e[a], n[a]) : e[a] = n[a])
      }; a > n; n++) {
        let r = arguments[n];
        o(r)
      }
      return e
    },
    v = (e) => {
      return Math.max(e.scrollHeight, e.offsetHeight, e.clientHeight)
    },
    g = () => {
      return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight,
        document.documentElement.offsetHeight, document.body.clientHeight, document.documentElement.clientHeight)
    },
    m = (e) => {
      let n = 0;
      if (e.offsetParent)
        do n += e.offsetTop,
          e = e.offsetParent; while (e);
      return n = n - r - t.offset,
        n >= 0 ? n : 0
    },
    p = () => {
      l.sort((e, t) => {
        return e.distance > t.distance ? -1 : e.distance < t.distance ? 1 : 0
      })
    };
  s.setDistances = () => {
    a = g(), r = o ? v(o) + m(o) : 0, f(l, (e) => {
      e.distance = m(e.target)
    }), p()
  };
  let h = () => {
      let e = document.querySelectorAll(t.selector);
      f(e, (e) => {
        e.hash && l.push({
          nav: e,
          target: document.querySelector(e.hash),
          parent: 'li' === e.parentNode.tagName.toLowerCase() ? e.parentNode : null,
          distance: 0
        })
      })
    },
    y = (e) => {
      c && (c.nav.classList.remove(t.activeClass), c.parent && c.parent.classList.remove(t.activeClass)),
        e.nav.classList.add(t.activeClass), e.parent && e.parent.classList.add(t.activeClass), t.callback(e), c = {
        nav: e.nav,
        parent: e.parent
      }
    };
  s.getCurrentNav = () => {
    let t = e.pageYOffset;
    if (e.innerHeight + t >= a) return y(l[0]);
    for (let n = 0, o = l.length; o > n; n++) {
      let r = l[n];
      if (r.distance < t) return y(r)
    }
  };
  let b = () => {
    f(l, (e) => {
      e.nav.classList.contains(t.activeClass) && (c = {
        nav: e.nav,
        parent: e.parent
      })
    })
  };
  s.destroy = () => {
    t && (e.removeEventListener('resize', H, !1), e.removeEventListener('scroll', H, !1), l = [],
      t = null, n = null, a = null, o = null, r = null, c = null)
  };
  let H = (e) => {
    n || (n = setTimeout(() => {
      n = null, 'scroll' === e.type && s.getCurrentNav(), 'resize' === e.type && (s.setDistances(), s.getCurrentNav())
    }, 66))
  };
  return s.init = (n) => {
    i && (s.destroy(), t = d(u, n || {}), o = document.querySelector(t.selectorHeader), h(), 0 !== l.length && (b(),
      s.setDistances(), s.getCurrentNav(), e.addEventListener('resize', H, !1), e.addEventListener('scroll', H, !1)))
  }, s
});

(() => {
  flappylang.init({
    selector: 'nav[role="navigation"] > ul li.active ul li a',
    selectorHeader: 'nav[role="navigation"] > ul li.active',
    offset: 0,
    activeClass: 'active',
    callback: (nav) => {
      let title = document.title + '' - '' + nav.target.textContent;
      let hash = '#' + nav.target.id;
      if (window.location.hash !== hash) {
        history.replaceState(null, title, window.location.pathname + hash);
      }
    }
  });

  toggleClass = (element, className) => {
    if (!element || !className) {
      return;
    }

    let classString = element.className,
      nameIndex = classString.indexOf(className);
    if (nameIndex == -1) {
      classString += ' ' + className;
    } else {
      classString = classString.substr(0, nameIndex) + classString.substr(nameIndex + className.length);
    }
    element.className = classString;
  };

  document.getElementById('menu-toggle').addEventListener('mousedown', () => {
    toggleClass(document.getElementById('menu-toggle'), 'open');
    toggleClass(document.querySelector('nav[role="navigation"]'), "open");
  });
})();
