// ==UserScript==
// @name         Show Me My People!
// @namespace    https://github.com/Screamir/show-me-my-people
// @version      1.0.0
// @description  Shows your own follower count on your profile main page for the extra lazy.
// @author       Screamir
// @match        https://www.pixiv.net/*
// @icon         https://www.pixiv.net/favicon.ico
// @run-at       document-start
// @grant        none
// @noframes
// @license      MIT
// @homepageURL  https://github.com/Screamir/show-me-my-people
// @supportURL   https://github.com/Screamir/show-me-my-people/issues
// @updateURL    https://update.greasyfork.org/scripts/587544/Show%20Me%20My%20People.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/587544/Show%20Me%20My%20People.user.js
// @compatible   firefox
// @compatible   chrome
// @compatible   edge
// @compatible   safari
// ==/UserScript==

(function () {
  'use strict';

  const MARK = 'data-pf-followers-link';

  const countCache = new Map();
  const inFlight = new Set();
  const pending = new Map();

  function getUserId() {
    const m = location.pathname.match(/\/users\/(\d+)/);
    return m ? m[1] : null;
  }

  function buildFollowersHref(userId) {
    const m = location.pathname.match(/^\/([a-z]{2})\/users\//);
    return `${m ? '/' + m[1] : ''}/users/${userId}/followers`;
  }

  function relabelAndFindNumberNode(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const t = node.nodeValue;
      if (/following/i.test(t)) node.nodeValue = t.replace(/following/gi, 'Followers');
      else if (/フォロー(?!ワー)/.test(t)) node.nodeValue = t.replace(/フォロー(?:中)?/g, 'フォロワー');
    }
    return nodes.find((n) => /[\d,]/.test(n.nodeValue)) || null;
  }

  function setCount(node, count) {
    if (!node) return;
    const repl =
      count === 'loading' ? '…' :
      count == null ? '—' :
      count.toLocaleString();
    const t = node.nodeValue;
    const next = /[\d,]+/.test(t) ? t.replace(/[\d,]+/, repl) : repl;
    if (next !== t) node.nodeValue = next;
  }

  function scrapeCount(userId) {
    const needle = `/users/${userId}/followers`;
    for (const a of document.querySelectorAll('a[href*="/followers"]')) {
      if (a.hasAttribute(MARK)) continue;
      if (!(a.getAttribute('href') || '').includes(needle)) continue;
      const digits = (a.textContent || '').replace(/\D/g, '');
      if (digits) return parseInt(digits, 10);
    }
    return null;
  }

  async function fetchCount(userId) {
    try {
      const res = await fetch(
        `/ajax/user/${userId}/followers?offset=0&limit=1&rest=show&lang=en`,
        { headers: { accept: 'application/json' }, credentials: 'include' }
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (json.error) return null;
      const total = json.body && json.body.total;
      return typeof total === 'number' ? total : null;
    } catch {
      return null;
    }
  }

  function findProfileFollowingAnchor() {
    for (const a of document.querySelectorAll('a[href$="/following"]')) {
      if (a.hasAttribute(MARK)) continue;
      const parent = a.parentElement;
      if (!parent) continue;
      if (parent.querySelector('a[href*="/followers"]')) continue;
      return a;
    }
    return null;
  }

  function onCloneClick(e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const router = window.next && window.next.router;
    const target = e.currentTarget.getAttribute('href');
    if (router && typeof router.push === 'function') {
      e.preventDefault();
      router.push(target);
    }
  }

  function ensureCount(clone, userId) {
    const numberNode = clone._pfNumberNode;

    if (countCache.has(userId)) {
      setCount(numberNode, countCache.get(userId));
      return;
    }

    const scraped = scrapeCount(userId);
    if (scraped != null) {
      countCache.set(userId, scraped);
      const t = pending.get(userId);
      if (t) { clearTimeout(t); pending.delete(userId); }
      setCount(numberNode, scraped);
      return;
    }

    setCount(numberNode, 'loading');

    if (!inFlight.has(userId) && !pending.has(userId)) {
      const timer = setTimeout(() => {
        pending.delete(userId);
        const late = scrapeCount(userId);
        if (late != null) { countCache.set(userId, late); schedule(); return; }
        inFlight.add(userId);
        fetchCount(userId).then((c) => {
          countCache.set(userId, c);
          inFlight.delete(userId);
          schedule();
        });
      }, 300);
      pending.set(userId, timer);
    }
  }

  function inject() {
    const userId = getUserId();
    if (!userId) return;

    const href = buildFollowersHref(userId);

    let clone = document.querySelector(`a[${MARK}]`);
    if (clone && (clone.getAttribute(MARK) !== href || !clone.isConnected)) {
      clone.remove();
      clone = null;
    }

    if (!clone) {
      const following = findProfileFollowingAnchor();
      if (!following || following.parentElement.querySelector(`[${MARK}]`)) return;

      clone = following.cloneNode(true);
      clone.setAttribute(MARK, href);
      clone.setAttribute('href', href);
      clone.removeAttribute('aria-current');
      clone.style.marginLeft = '16px';
      clone._pfNumberNode = relabelAndFindNumberNode(clone);
      clone.addEventListener('click', onCloneClick);
      following.after(clone);
    }

    ensureCount(clone, userId);
  }

  function refreshOnThemeChange() {
    const clone = document.querySelector(`a[${MARK}]`);
    if (clone) clone.remove();
    schedule();
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try { inject(); } catch (_) {}
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const themeObserver = new MutationObserver(refreshOnThemeChange);
  themeObserver.observe(document.documentElement, { attributes: true });
  const attachBody = () => document.body && themeObserver.observe(document.body, { attributes: true });
  if (document.body) attachBody();
  else document.addEventListener('DOMContentLoaded', attachBody, { once: true });

  for (const m of ['pushState', 'replaceState']) {
    const orig = history[m];
    history[m] = function () {
      const r = orig.apply(this, arguments);
      schedule();
      return r;
    };
  }
  window.addEventListener('popstate', schedule);

  let polls = 0;
  const pid = setInterval(() => {
    schedule();
    if (++polls > 40 || document.querySelector(`a[${MARK}]`)) clearInterval(pid);
  }, 60);

  schedule();
})();