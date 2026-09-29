/* lb-sync.js — 어떤 리더보드 점수를 제출할지 결정 (순수 로직, 노드 테스트).
   sent = 마지막으로 제출에 성공한 값 { gallery, clears: { themeId: runs } }.
   UMD: module.exports for node tests, SG.LbSync in browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.LbSync = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'earthbeyond_lb_sent';
  const LB_GALLERY = 'gallery_total';

  function empty() { return { gallery: 0, clears: {} }; }

  function plan(cur, sent) {
    const out = [];
    const s = sent || empty();
    if ((cur.galleryTotal || 0) > (s.gallery || 0)) {
      out.push({ lbId: LB_GALLERY, score: cur.galleryTotal, kind: 'gallery' });
    }
    (cur.clears || []).forEach(function (c) {
      if (c.clearRuns > 0 && !(s.clears && s.clears[c.themeId])) {
        out.push({ lbId: c.lbId, score: c.clearRuns, kind: 'clear', themeId: c.themeId });
      }
    });
    return out;
  }

  function markSent(sent, item) {
    const s = { gallery: (sent && sent.gallery) || 0, clears: Object.assign({}, sent && sent.clears) };
    if (item.kind === 'gallery') s.gallery = Math.max(s.gallery, item.score);
    else s.clears[item.themeId] = item.score;
    return s;
  }

  function load(store) {
    try {
      const v = JSON.parse(store.getItem ? store.getItem(KEY) : store[KEY]);
      if (v && typeof v.gallery === 'number' && v.clears) return v;
    } catch (_) {}
    return empty();
  }
  function save(store, sent) {
    const s = JSON.stringify(sent);
    if (store.setItem) store.setItem(KEY, s); else store[KEY] = s;
  }

  return { plan, markSent, load, save, KEY, LB_GALLERY };
});
