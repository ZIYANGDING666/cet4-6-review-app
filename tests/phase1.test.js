// 阶段1：地基 / 状态 / 存读 / 模式隔离
const { test, eq, ok, deepEq, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase1';

test('defaultState 含全部必需字段', () => {
  const s = L.defaultState();
  eq(s.mode, 'cet4');
  ok(s.settings && typeof s.settings.dailyNew === 'number');
  eq(s.streak, 0);
  eq(s.lastStudy, null);
  ok(Array.isArray(s.words.cet4) && Array.isArray(s.words.cet6));
  ok(Array.isArray(s.stats.cet4) && Array.isArray(s.stats.cet6));
  ok(Array.isArray(s.exams.cet4) && Array.isArray(s.exams.cet6));
});

test('normalize 补全缺失字段且不污染', () => {
  const s = L.normalize({ mode: 'cet6', words: { cet4: [{ id: 'x' }] } });
  eq(s.mode, 'cet6');
  eq(s.words.cet4.length, 1);
  eq(s.words.cet6.length, 0); // 缺失模式补空数组
  eq(s.settings.dailyNew, 20);
});

test('save/load 用自定义 storage 往返一致', () => {
  const store = { _m: {}, getItem(k){return this._m[k] ?? null;}, setItem(k,v){this._m[k]=String(v);} };
  const s = L.defaultState();
  s.settings.dailyNew = 15; s.streak = 3;
  ok(L.save(s, store));
  const r = L.load(store);
  ok(r);
  eq(r.settings.dailyNew, 15);
  eq(r.streak, 3);
  eq(r.mode, 'cet4');
});

test('load 无数据返回 null', () => {
  const store = { getItem(){return null;}, setItem(){} };
  eq(L.load(store), null);
});

test('模式隔离：cet4 与 cet6 的词库互不影响', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['apple', '/a/', '苹果'], ['banana', '/b/', '香蕉']]);
  eq(s.words.cet4.length, 2);
  eq(s.words.cet6.length, 0); // cet6 不受 cet4 导入影响
  const q4 = L.buildQueue(s, 'cet4');
  const q6 = L.buildQueue(s, 'cet6');
  eq(q4.length, 2);
  eq(q6.length, 0);
});

test('首页聚合按模式独立（AC2/AC11 基础）', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['apple', '', '苹果']]);
  const h4 = L.buildHome(s, 'cet4');
  const h6 = L.buildHome(s, 'cet6');
  eq(h4.todayNew, 1);
  eq(h6.todayNew, 0);
  eq(h4.total, 1);
  eq(h6.total, 0);
});

summary(label);
