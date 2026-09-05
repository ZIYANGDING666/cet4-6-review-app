/*
 * logic.js — 四六级复习 App v1 核心逻辑（纯函数，可单测）
 * 同时支持浏览器（挂载到 window.AppLogic）与 Node（module.exports）。
 * 不依赖 DOM / 网络 / 外部库。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AppLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const INTERVALS = [0, 1, 3, 7, 16]; // 各 SRS 等级对应的复习间隔（天）
  const DAY = 86400000;
  const KEY = 'cet46_proto_v1';
  const MODES = ['cet4', 'cet6'];

  /* ---------------- 状态 ---------------- */
  function mkWordLib(name, words) { return { id: uid(), name: name || '我的词库', words: words || [], active: true }; }
  function mkExamLib(name, sets) { return { id: uid(), name: name || '我的题库', sets: sets || [], active: true }; }

  function defaultState() {
    const w4 = mkWordLib('内置词库', []), w6 = mkWordLib('内置词库', []);
    const e4 = mkExamLib('内置题库', []), e6 = mkExamLib('内置题库', []);
    return {
      mode: 'cet4',
      settings: { dailyNew: 20 },
      streak: 0,
      lastStudy: null,
      libs: { cet4: [w4], cet6: [w6] },
      examLibs: { cet4: [e4], cet6: [e6] },
      // words/exams 始终指向当前激活库的数组（引用一致）
      words: { cet4: w4.words, cet6: w6.words },
      exams: { cet4: e4.sets, cet6: e6.sets },
      stats: { cet4: [], cet6: [] },
      session: null, // 背单词断点快照 {mode, idx, queue, done, learned, reviewed, ok, total, target, answered}
      mistakes: { cet4: [], cet6: [] }, // 错题本：[{id, count, first, last}]
      lifetimeLearned: 0 // 累计所背单词数（用于错题重做抽查数）
    };
  }

  function _active(ls) { if (!ls || !ls.length) return null; const i = ls.findIndex(l => l.active); return ls[i >= 0 ? i : 0]; }

  // 与默认值合并，保证缺字段不报错（兼容旧数据/部分备份）
  function normalize(s) {
    s = s || {};
    const d = defaultState();
    const words = s.words || {};
    const stats = s.stats || {};
    const exams = s.exams || {};
    const libs = {}, examLibs = {};
    MODES.forEach(m => {
      let wl = (s.libs && s.libs[m]) ? s.libs[m] : null;
      if (!wl || !wl.length) wl = [mkWordLib('我的词库', words[m] || [])];
      wl.forEach((l, i) => { l.id = l.id || uid(); l.name = l.name || ('词库' + (i + 1)); l.words = l.words || []; });
      if (!wl.some(l => l.active)) wl[0].active = true;
      libs[m] = wl;

      let el = (s.examLibs && s.examLibs[m]) ? s.examLibs[m] : null;
      if (!el || !el.length) el = [mkExamLib('我的题库', exams[m] || [])];
      el.forEach((l, i) => { l.id = l.id || uid(); l.name = l.name || ('题库' + (i + 1)); l.sets = l.sets || []; });
      if (!el.some(l => l.active)) el[0].active = true;
      examLibs[m] = el;
    });
    const actW = {}, actE = {};
    MODES.forEach(m => { actW[m] = _active(libs[m]).words; actE[m] = _active(examLibs[m]).sets; });
    return {
      mode: s.mode === 'cet6' ? 'cet6' : 'cet4',
      settings: Object.assign({}, d.settings, s.settings || {}),
      streak: s.streak || 0,
      lastStudy: s.lastStudy || null,
      libs: libs, examLibs: examLibs,
      words: actW, exams: actE,
      stats: { cet4: stats.cet4 || [], cet6: stats.cet6 || [] },
      session: s.session || null,
      mistakes: { cet4: (s.mistakes && s.mistakes.cet4) || [], cet6: (s.mistakes && s.mistakes.cet6) || [] },
      lifetimeLearned: s.lifetimeLearned || 0
    };
  }

  const memStorage = (function () {
    const m = {};
    return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _clear: () => { for (const k in m) delete m[k]; } };
  })();

  function resolveStorage(storage) {
    if (storage) return storage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return memStorage;
  }

  function save(state, storage) {
    try { resolveStorage(storage).setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }
  function load(storage) {
    try {
      const raw = resolveStorage(storage).getItem(KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (e) { return null; }
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------------- CSV ---------------- */
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    text = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n') {
          if (cur === '' && row.length === 0) { /* 空行跳过 */ }
          else { row.push(cur); rows.push(row); }
          row = []; cur = '';
        }
        else cur += c;
      }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function isHeaderRow(row) {
    if (!row || !row.length) return false;
    const f = String(row[0] || '').toLowerCase().trim();
    return f === 'word' || f === '单词';
  }

  /* ---------------- 词库 ---------------- */
  // rows: 二维数组；返回 {added, errors:[行号]}
  function addWords(state, mode, rows) {
    let added = 0; const errors = [];
    (rows || []).forEach((row, i) => {
      if (!row || !row.length) return;
      if (i === 0 && isHeaderRow(row)) return;
      const word = String(row[0] || '').trim();
      const phonetic = String(row[1] || '').trim();
      const meaning = String(row[2] || '').trim();
      if (!word || !meaning) { errors.push(i); return; }
      state.words[mode].push({ id: uid(), word, phonetic, meaning, box: 0, next: 0, reviews: 0, correct: 0, wrong: 0 });
      added++;
    });
    return { added, errors };
  }

  function unseenCount(state, mode) { return state.words[mode].filter(w => w.box === 0).length; }
  function dueCount(state, mode) {
    const now = Date.now();
    return state.words[mode].filter(w => w.box > 0 && w.next <= now).length;
  }
  function masteredCount(state, mode) { return state.words[mode].filter(w => w.box >= 3).length; }

  // 今日队列：只背新词（box===0），至多 dailyNew 条。复习环节已改为「错题本」。
  function buildQueue(state, mode) {
    const list = state.words[mode];
    const cap = state.settings.dailyNew || 0;
    return list.filter(w => w.box === 0).slice(0, cap).map(w => ({ id: w.id, type: 'new' }));
  }

  function findWord(state, mode, id) { return state.words[mode].find(w => w.id === id); }

  /* ---------------- 错题本 ---------------- */
  function mistakeCount(state, mode) { return (state.mistakes[mode] || []).length; }
  function listMistakes(state, mode) { return (state.mistakes[mode] || []); }
  // 记录一次答错：去重累加次数
  function recordMistake(state, mode, id) {
    if (!state.mistakes[mode]) state.mistakes[mode] = [];
    const now = Date.now();
    const ex = state.mistakes[mode].find(m => m.id === id);
    if (ex) { ex.count = (ex.count || 1) + 1; ex.last = now; }
    else state.mistakes[mode].push({ id: id, count: 1, first: now, last: now });
  }
  // 答对后从错本移除（已掌握）
  function removeMistake(state, mode, id) {
    if (!state.mistakes[mode]) return;
    const i = state.mistakes[mode].findIndex(m => m.id === id);
    if (i >= 0) state.mistakes[mode].splice(i, 1);
  }
  // 错题重做抽查数：基础 100；错题不足 100 按实际错题数；每多背 1000 词 +50
  function retryQuota(state) {
    const extra = 50 * Math.floor((state.lifetimeLearned || 0) / 1000);
    return 100 + extra;
  }
  // 从历史错本随机抽取 n 个 id（不足则全取），洗牌返回
  function pickRetry(state, mode, rng) {
    rng = rng || Math.random;
    const all = (state.mistakes[mode] || []).slice();
    if (!all.length) return [];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const n = Math.min(retryQuota(state), all.length);
    return shuffle(all).slice(0, n).map(m => m.id);
  }

  // 把默认词库灌入 state.words[mode]（带 SRS 初始字段）。
  // defaultWords: { cet4:[{word,phonetic,meaning}, ...], cet6:[...] }
  // opts: { force?:bool, mode?:'cet4'|'cet6' }
  //   - 非 force：仅填充当前为空的级别，不覆盖用户已导入的词
  //   - force：用默认词库覆盖指定(或全部)级别
  // 返回 { cet4: 实际写入条数, cet6: 实际写入条数 }
  function seedDefaults(state, defaultWords, opts) {
    opts = opts || {};
    const force = !!opts.force;
    const modes = opts.mode ? [opts.mode] : MODES;
    const res = { cet4: 0, cet6: 0 };
    modes.forEach(mode => {
      const defs = (defaultWords && defaultWords[mode]) || [];
      if (!defs.length) return;
      let lib = _active(state.libs && state.libs[mode]);
      if (!lib) { lib = mkWordLib('内置词库', []); (state.libs[mode] = state.libs[mode] || []).push(lib); }
      if (!force && lib.words.length) return;
      const arr = defs
        .map(d => ({
          id: uid(),
          word: String(d.word || '').trim(),
          phonetic: String(d.phonetic || '').trim(),
          meaning: String(d.meaning || '').trim(),
          box: 0, next: 0, reviews: 0, correct: 0, wrong: 0
        }))
        .filter(w => w.word && w.meaning);
      lib.words = arr;
      state.words[mode] = arr;
      res[mode] = arr.length;
    });
    return res;
  }

  // 清空指定级别的当前激活词库（只清当前库，不动其它库/级别）
  function clearMode(state, mode) {
    if (!mode) mode = state.mode;
    const lib = _active(state.libs && state.libs[mode]);
    const before = (state.words[mode] || []).length;
    if (lib) { lib.words.length = 0; state.words[mode] = lib.words; }
    else state.words[mode] = [];
    return before;
  }

  /* ---------------- 多词库管理 ---------------- */
  function listWordLibs(state, mode) { return (state.libs && state.libs[mode]) || []; }
  function listExamLibs(state, mode) { return (state.examLibs && state.examLibs[mode]) || []; }
  function activeWordLib(state, mode) { return _active(state.libs && state.libs[mode]); }
  function activeExamLib(state, mode) { return _active(state.examLibs && state.examLibs[mode]); }

  function addWordLib(state, mode, name, words, makeActive) {
    const lib = mkWordLib(name, words || []);
    (state.libs[mode] = state.libs[mode] || []).push(lib);
    if (makeActive) {
      state.libs[mode].forEach(l => { l.active = (l === lib); });
      state.words[mode] = lib.words;
    }
    return lib;
  }
  function switchWordLib(state, mode, id) {
    const ls = state.libs[mode] || [];
    let found = null;
    ls.forEach(l => { if (l.id === id) { l.active = true; found = l; } else l.active = false; });
    if (found) state.words[mode] = found.words;
    return found;
  }
  function removeWordLib(state, mode, id) {
    const ls = state.libs[mode] || [];
    if (ls.length <= 1) return false;
    const idx = ls.findIndex(l => l.id === id);
    if (idx < 0) return false;
    ls.splice(idx, 1);
    if (!ls.some(l => l.active)) ls[0].active = true;
    state.words[mode] = _active(ls).words;
    return true;
  }

  function addExamLib(state, mode, name, sets, makeActive) {
    const lib = mkExamLib(name, sets || []);
    (state.examLibs[mode] = state.examLibs[mode] || []).push(lib);
    if (makeActive) {
      state.examLibs[mode].forEach(l => { l.active = (l === lib); });
      state.exams[mode] = lib.sets;
    }
    return lib;
  }
  function switchExamLib(state, mode, id) {
    const ls = state.examLibs[mode] || [];
    let found = null;
    ls.forEach(l => { if (l.id === id) { l.active = true; found = l; } else l.active = false; });
    if (found) state.exams[mode] = found.sets;
    return found;
  }
  function removeExamLib(state, mode, id) {
    const ls = state.examLibs[mode] || [];
    if (ls.length <= 1) return false;
    const idx = ls.findIndex(l => l.id === id);
    if (idx < 0) return false;
    ls.splice(idx, 1);
    if (!ls.some(l => l.active)) ls[0].active = true;
    state.exams[mode] = _active(ls).sets;
    return true;
  }

  // SRS 更新：对一个词记录一次作答结果
  function srsUpdate(word, correct) {
    word.reviews = (word.reviews || 0) + 1;
    if (correct) {
      word.correct = (word.correct || 0) + 1;
      word.box = Math.min(5, (word.box || 0) + 1);
    } else {
      word.wrong = (word.wrong || 0) + 1;
      word.box = 1;
    }
    const days = INTERVALS[Math.max(0, (word.box || 1) - 1)] || 0;
    word.next = Date.now() + days * DAY;
    return word;
  }

  // 生成四选一选项：保证含正确释义，且无重复
  function buildOptions(correctMeaning, poolMeanings, rng) {
    rng = rng || Math.random;
    const pool = (poolMeanings || []).filter(m => m && m !== correctMeaning);
    const sh = pool.slice();
    for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
    const distractors = sh.slice(0, 3);
    const opts = distractors.concat([correctMeaning]);
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    return opts;
  }

  /* ---------------- 题库 ---------------- */
  function normAnswer(a) {
    if (a == null) return 0;
    const s = String(a).trim().toUpperCase();
    if (/^[A-D]$/.test(s)) return 'ABCD'.indexOf(s);
    const n = parseInt(s, 10);
    return (n >= 1 && n <= 4) ? n - 1 : 0;
  }

  // questions: [{stem, opts:[A,B,C,D], answer(0-3), explanation}]
  function addExamSet(state, mode, name, questions) {
    const set = { id: uid(), name: name || '未命名套题', questions: questions || [], result: null };
    state.exams[mode].push(set);
    return set;
  }

  function gradeExam(questions, selections) {
    let right = 0;
    (questions || []).forEach((q, i) => { if (selections[i] === q.answer) right++; });
    const total = (questions || []).length;
    const accuracy = total ? Math.round((right / total) * 100) : 0;
    return { right, total, accuracy };
  }

  function recordExamResult(set, selections, reflections) {
    const g = gradeExam(set.questions, selections);
    set.result = {
      date: todayStr(),
      score: g.right,
      total: g.total,
      accuracy: g.accuracy,
      reflections: reflections || {}
    };
    return set.result;
  }

  /* ---------------- 日期 / 打卡 / 会话结算 ---------------- */
  function todayStr(d) { d = d || new Date(); return d.toISOString().slice(0, 10); }
  function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

  // 一次学习会话结束后写统计 + 打卡
  function finishSession(state, mode, learned, reviewed, ok, total) {
    const t = todayStr();
    let st = state.stats[mode].find(x => x.date === t);
    if (!st) { st = { date: t, news: 0, reviews: 0 }; state.stats[mode].push(st); }
    st.news += learned; st.reviews += reviewed;
    state.lifetimeLearned = (state.lifetimeLearned || 0) + learned;
    if (state.lastStudy !== t) {
      state.streak = (state.lastStudy === yesterdayStr()) ? state.streak + 1 : 1;
      state.lastStudy = t;
    }
    return { learned, reviewed, accuracy: total ? Math.round((ok / total) * 100) : 0 };
  }

  /* ---------------- 统计聚合 ---------------- */
  function lastNDates(n, end) {
    const a = []; const base = end ? new Date(end) : new Date();
    for (let i = n - 1; i >= 0; i--) { const d = new Date(base); d.setDate(d.getDate() - i); a.push(d.toISOString().slice(0, 10)); }
    return a;
  }
  // 返回 [{date, label, news, reviews}]
  function aggregateStats(state, mode, nDays) {
    const dates = lastNDates(nDays);
    const map = {};
    state.stats[mode].forEach(s => { map[s.date] = s; });
    return dates.map(d => ({ date: d, label: d.slice(5), news: map[d] ? map[d].news : 0, reviews: map[d] ? map[d].reviews : 0 }));
  }
  function cumulative(state, mode) {
    const st = state.stats[mode];
    return {
      totalNews: st.reduce((a, s) => a + s.news, 0),
      totalReviews: st.reduce((a, s) => a + s.reviews, 0),
      mastered: masteredCount(state, mode)
    };
  }
  function examAvgAccuracy(state, mode) {
    const done = state.exams[mode].filter(e => e.result);
    if (!done.length) return 0;
    return Math.round(done.reduce((a, e) => a + e.result.accuracy, 0) / done.length);
  }
  function recentExams(state, mode, n) {
    return state.exams[mode].filter(e => e.result).slice(-(n || 3)).reverse();
  }

  // 首页聚合数据
  function buildHome(state, mode) {
    const cap = state.settings.dailyNew || 0;
    return {
      todayNew: Math.min(cap, unseenCount(state, mode)),
      todayReview: dueCount(state, mode),
      streak: state.streak,
      mastered: masteredCount(state, mode),
      total: state.words[mode].length,
      unseen: unseenCount(state, mode),
      due: dueCount(state, mode),
      recentExams: recentExams(state, mode, 3).map(e => ({ name: e.name, accuracy: e.result.accuracy }))
    };
  }

  /* ---------------- 备份 ---------------- */
  function serializeBackup(state) { return JSON.stringify(state, null, 2); }
  function deserializeBackup(str) { return normalize(JSON.parse(str)); }

  /* ---------------- 图表（纯 SVG 字符串） ---------------- */
  function barChart(days) {
    const w = 560, h = 200, pad = 28, gw = (w - pad * 2) / days.length;
    const max = Math.max(1, ...days.map(d => d.news + d.reviews));
    let svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%">';
    svg += '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="#262b36"/>';
    days.forEach((d, i) => {
      const x = pad + gw * i + gw * 0.18, bw = gw * 0.32;
      const hn = d.news / max * (h - pad * 2), hr = d.reviews / max * (h - pad * 2);
      svg += '<rect x="' + x + '" y="' + (h - pad - hn) + '" width="' + bw + '" height="' + hn + '" fill="#7c9cff" rx="3"><title>新词 ' + d.news + '</title></rect>';
      svg += '<rect x="' + (x + bw + 2) + '" y="' + (h - pad - hr) + '" width="' + bw + '" height="' + hr + '" fill="#5b7cfa" opacity="0.6"><title>复习 ' + d.reviews + '</title></rect>';
      if (i % Math.ceil(days.length / 8) === 0 || days.length <= 8) svg += '<text x="' + (x + bw) + '" y="' + (h - pad + 14) + '" text-anchor="middle">' + d.label + '</text>';
    });
    svg += '<rect x="' + pad + '" y="14" width="10" height="10" fill="#7c9cff"/><text x="' + (pad + 16) + '" y="23">新词</text>';
    svg += '<rect x="' + (pad + 60) + '" y="14" width="10" height="10" fill="#5b7cfa" opacity="0.6"/><text x="' + (pad + 76) + '" y="23">复习</text>';
    return svg + '</svg>';
  }

  return {
    INTERVALS, DAY, KEY, MODES,
    defaultState, normalize, save, load,
    uid, parseCSV, isHeaderRow, addWords,
    unseenCount, dueCount, masteredCount,
    buildQueue, findWord, srsUpdate, seedDefaults, clearMode, buildOptions,
    mistakeCount, listMistakes, recordMistake, removeMistake, retryQuota, pickRetry,
    normAnswer, addExamSet, gradeExam, recordExamResult,
    todayStr, yesterdayStr, finishSession,
    lastNDates, aggregateStats, cumulative, examAvgAccuracy, recentExams, buildHome,
    serializeBackup, deserializeBackup, barChart,
    listWordLibs, activeWordLib, addWordLib, switchWordLib, removeWordLib,
    listExamLibs, activeExamLib, addExamLib, switchExamLib, removeExamLib
  };
});
