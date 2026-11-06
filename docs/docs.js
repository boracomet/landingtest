// Docs: client-side search over /docs/search.json, mobile nav toggle,
// TOC highlighting.
(function () {
  'use strict';

  // ---- mobile sidebar toggle ----
  var navToggle = document.querySelector('.docs-nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
    });
  }

  // ---- search ----
  var input = document.getElementById('docs-search-input');
  var results = document.getElementById('docs-search-results');
  if (input && results) {
    var index = null, loading = null, active = -1;

    function load() {
      if (index) return Promise.resolve(index);
      if (loading) return loading;
      loading = fetch(input.getAttribute('data-search-index'), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          index = data.map(function (d) {
            return {
              d: d,
              title: d.title.toLowerCase(),
              headings: (d.headings || []).join(' ').toLowerCase(),
              text: ((d.description || '') + ' ' + d.text).toLowerCase()
            };
          });
          return index;
        })
        .catch(function () { index = []; return index; });
      return loading;
    }

    function tokens(q) {
      return q.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 1; });
    }

    function score(entry, terms) {
      var s = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var inTitle = entry.title.indexOf(t) >= 0;
        var inHead = entry.headings.indexOf(t) >= 0;
        var inText = entry.text.indexOf(t) >= 0;
        if (!inTitle && !inHead && !inText) return 0;
        if (inTitle) s += entry.title === t ? 20 : 10;
        if (inHead) s += 5;
        if (inText) s += 1;
      }
      return s;
    }

    function escapeHTML(s) {
      return s.replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function snippet(entry, terms) {
      var text = entry.d.text || '';
      var lower = text.toLowerCase();
      var pos = -1;
      for (var i = 0; i < terms.length && pos < 0; i++) pos = lower.indexOf(terms[i]);
      if (pos < 0) return escapeHTML(entry.d.description || text.slice(0, 120));
      var start = Math.max(0, pos - 50);
      var end = Math.min(text.length, pos + 90);
      var out = (start > 0 ? '…' : '') + escapeHTML(text.slice(start, end)) + (end < text.length ? '…' : '');
      terms.forEach(function (t) {
        var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        out = out.replace(re, '<mark>$1</mark>');
      });
      return out;
    }

    function renderResults(q) {
      var terms = tokens(q);
      active = -1;
      if (!terms.length) { results.hidden = true; results.innerHTML = ''; return; }
      load().then(function (idx) {
        var hits = idx.map(function (e) { return { e: e, s: score(e, terms) }; })
          .filter(function (h) { return h.s > 0; })
          .sort(function (a, b) { return b.s - a.s; })
          .slice(0, 8);
        if (!hits.length) {
          results.innerHTML = '<div class="r-empty">No results for “' + escapeHTML(q) + '”</div>';
        } else {
          results.innerHTML = hits.map(function (h) {
            var d = h.e.d;
            return '<a href="' + escapeHTML((window.SITE_ROOT || '/') + d.url.replace(/^\//, '')) + '">' +
              '<span class="r-section">' + escapeHTML(d.section) + '</span>' +
              '<span class="r-title">' + escapeHTML(d.title) + '</span>' +
              '<span class="r-snippet">' + snippet(h.e, terms) + '</span></a>';
          }).join('');
        }
        results.hidden = false;
      });
    }

    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { renderResults(input.value.trim()); }, 80);
    });
    input.addEventListener('focus', function () { load(); if (input.value.trim()) renderResults(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      var links = results.querySelectorAll('a');
      if (e.key === 'Escape') { results.hidden = true; input.blur(); return; }
      if (!links.length || results.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = e.key === 'ArrowDown' ? Math.min(active + 1, links.length - 1) : Math.max(active - 1, 0);
        links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
        links[active].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        window.location.href = links[active].getAttribute('href');
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.docs-search')) results.hidden = true;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  // ---- TOC highlighting ----
  var toc = document.querySelector('.docs-toc');
  if (toc && 'IntersectionObserver' in window) {
    var links = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var headings = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var current = null;
    var setActive = function (id) {
      if (current === id) return;
      current = id;
      Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === id); });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-90px 0px -70% 0px', threshold: 0 });
    headings.forEach(function (h) { io.observe(h); });
    if (headings.length) setActive(headings[0].id);
  }
})();
