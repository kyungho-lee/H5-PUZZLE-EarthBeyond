/* hall-of-fame.js — 명예의 전당 「N번째 우주정복자」 (v0.9.2, 순수 로직 · 노드 테스트).
   리더보드 hall_of_fame (Bridge SaaS, scoreOrder asc = 적을수록 위).
   값 = 엔딩을 처음 본 순간의 도착 시각 = 2026-01-01 00:00 UTC 부터 지난 초(클라이언트 시계, 1 이상 정수).
   → 오름차순 순위가 곧 도착 순서 = "N번째 우주정복자".
   한 저장에 한 번: 처음 엔딩을 볼 때 값을 정해 저장(earthbeyond_hof)하고, 다시 보기 · 재플레이는 값을 바꾸지 않는다.
   전송은 성공할 때까지 동기화 때마다 다시 시도하고(sent), 성공한 뒤로는 보내지 않는다.
   알려진 한계: 같은 초에 끝낸 두 사람은 같은 값(순위는 리더보드가 정함) · 시계를 과거로 돌리면 앞설 수 있음
   (클라이언트 시각이라 막을 수 없다 — docs/ending/ending-credits-plan.md 「명예의 전당」).
   UMD: module.exports (node) / SG.HallOfFame (browser). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.HallOfFame = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var KEY = 'earthbeyond_hof';
  var LB_ID = 'hall_of_fame';
  var EPOCH_MS = Date.UTC(2026, 0, 1);

  function scoreAt(ms) { return Math.max(1, Math.floor((Number(ms) - EPOCH_MS) / 1000)); }

  function _get(store) {
    try { return JSON.parse(store.getItem ? store.getItem(KEY) : store[KEY]); } catch (_) { return null; }
  }
  function _set(store, v) {
    var s = JSON.stringify(v);
    try { if (store.setItem) store.setItem(KEY, s); else store[KEY] = s; } catch (_) {}
  }
  function load(store) {
    var v = _get(store) || {};
    var score = Number.isInteger(v.score) && v.score > 0 ? v.score : 0;
    return { score: score, sent: score > 0 && v.sent === true, rank: Number.isInteger(v.rank) && v.rank > 0 ? v.rank : 0 };
  }
  // 처음 엔딩을 본 순간 — 값이 이미 있으면 그대로(isNew false).
  function record(store, nowMs) {
    var st = load(store);
    if (st.score) return { state: st, isNew: false };
    st = { score: scoreAt(nowMs), sent: false, rank: 0 };
    _set(store, st);
    return { state: st, isNew: true };
  }
  function needsSubmit(st) { return !!(st && st.score > 0 && !st.sent); }
  function markSent(store) { var st = load(store); if (!st.score) return st; st.sent = true; _set(store, st); return st; }
  function saveRank(store, rank) { var st = load(store); if (!st.score || !(rank > 0)) return st; st.rank = rank; _set(store, st); return st; }

  // getEntries 결과 → [{ id, name, score, rank }] 오름차순
  function normalize(entries) {
    if (!Array.isArray(entries)) return null;
    var rows = entries.map(function (e) {
      return { id: String(e && (e.id != null ? e.id : e.playerId) || ''), name: e && e.name ? String(e.name) : '', score: Number(e && e.score) || 0, rank: Number(e && e.rank) || 0 };
    }).filter(function (r) { return r.score > 0; });
    rows.sort(function (a, b) { return (a.rank && b.rank) ? a.rank - b.rank : a.score - b.score; });
    rows.forEach(function (r, i) { if (!r.rank) r.rank = i + 1; });
    return rows;
  }
  // 내 순위: 목록에서 내 id → 그 순위. 못 찾으면 내 값보다 작은(먼저 온) 줄 수 + 1 (목록이 잘렸으면 하한).
  function rankOf(rows, myId, myScore) {
    if (!rows) return 0;
    var me = myId ? rows.find(function (r) { return r.id === String(myId); }) : null;
    if (me) return me.rank;
    if (!(myScore > 0)) return 0;
    return rows.filter(function (r) { return r.score < myScore; }).length + 1;
  }

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function conquerorLine(lang, n) {
    if (!(n > 0)) return '';
    return lang === 'ko' ? '👑 당신은 ' + n + '번째 우주정복자!' : '👑 You are the ' + ordinal(n) + ' Universe Conqueror!';
  }
  // 로비 띠: 내 순위가 있으면 그것, 없으면 정복자 수
  function bannerLine(lang, count, myRank) {
    var ko = lang === 'ko';
    if (myRank > 0) return ko ? '👑 당신은 ' + myRank + '번째 우주정복자 — 명예의 전당 보기' : '👑 You are the ' + ordinal(myRank) + ' Universe Conqueror — see the Hall of Fame';
    if (!(count > 0)) return ko ? '👑 아직 우주를 정복한 사람이 없습니다 — 첫 번째가 되세요!' : '👑 No one has conquered the universe yet — be the first!';
    return ko ? '👑 ' + count + '명이 우주를 정복했습니다 — 명예의 전당에 도전!'
      : '👑 ' + count + (count === 1 ? ' player has' : ' players have') + ' conquered the universe — join the Hall of Fame!';
  }
  function lockedLine(lang) {
    return lang === 'ko' ? '🔒 세 장을 모두 끝내고 엔딩을 보면 이름이 올라갑니다' : '🔒 Finish all 3 chapters to enter the Hall of Fame';
  }
  // 목록 표시용: 상위 top 줄 + (내가 밖이면) 내 줄
  function displayRows(rows, myId, myScore, top) {
    if (!rows) return null;
    var n = top || 5, out = rows.slice(0, n).map(function (r) { return Object.assign({}, r, { isMe: !!myId && r.id === String(myId) }); });
    var myRank = rankOf(rows, myId, myScore);
    if (myRank > n && myScore > 0) out.push({ id: String(myId || ''), name: '', score: myScore, rank: myRank, isMe: true, sep: true });
    return out;
  }

  return { KEY: KEY, LB_ID: LB_ID, EPOCH_MS: EPOCH_MS, scoreAt: scoreAt, load: load, record: record, needsSubmit: needsSubmit,
    markSent: markSent, saveRank: saveRank, normalize: normalize, rankOf: rankOf, ordinal: ordinal,
    conquerorLine: conquerorLine, bannerLine: bannerLine, lockedLine: lockedLine, displayRows: displayRows };
});
