// 阶段9：集成测试 —— 模拟真实使用链路，覆盖 PRD 验收标准 AC1~AC11
const { test, eq, ok, deepEq, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase9';

// 真实链路：导入词 -> 计划排程 -> 背单词(全对) -> 结算 -> 统计 -> 题库 -> 备份 -> 隔离
test('AC3 导入：CSV 解析 + 批量入库', () => {
  const s = L.defaultState();
  const csv = 'word,phonetic,meaning\n' + Array.from({ length: 12 }, (_, i) => `w${i},/p${i}/,m${i}`).join('\n');
  const r = L.addWords(s, 'cet4', L.parseCSV(csv));
  eq(r.added, 12);
  eq(s.words.cet4.length, 12);
});

test('AC4 计划：新词不超过上限', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', Array.from({ length: 12 }, (_, i) => [`w${i}`, '', `m${i}`]));
  s.settings.dailyNew = 5;
  const q = L.buildQueue(s, 'cet4');
  eq(q.filter(x => x.type === 'new').length, 5);
});

test('AC5/AC6 背单词：选项含正确项；判对升级 SRS；结算写入统计与打卡', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', Array.from({ length: 5 }, (_, i) => [`w${i}`, '', `m${i}`]));
  s.settings.dailyNew = 5;
  const q = L.buildQueue(s, 'cet4');
  let learned = 0, correctCnt = 0, total = 0;
  q.filter(x => x.type === 'new').forEach(it => {
    const w = L.findWord(s, 'cet4', it.id);
    const opts = L.buildOptions(w.meaning, s.words.cet4.filter(x => x.id !== w.id).map(x => x.meaning));
    ok(opts.includes(w.meaning)); // AC5：正确释义在选项中
    eq(opts.length, 4);           // AC5：四选一
    L.srsUpdate(w, true);         // 全对
    learned++; correctCnt++; total++;
  });
  const res = L.finishSession(s, 'cet4', learned, 0, correctCnt, total);
  eq(res.accuracy, 100);
  eq(s.streak, 1);
  ok(s.words.cet4.every(w => w.box >= 1)); // 学过的词已脱离未学
});

test('AC7 持久化：save 后 load 数据一致', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['a', '', '1'], ['b', '', '2']]);
  s.streak = 3;
  const store = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); } };
  L.save(s, store);
  const loaded = L.load(store);
  eq(loaded.words.cet4.length, 2);
  eq(loaded.streak, 3);
});

test('AC8 统计：当日统计正确、图表无 NaN', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', Array.from({ length: 5 }, (_, i) => [`w${i}`, '', `m${i}`]));
  s.settings.dailyNew = 5;
  const q = L.buildQueue(s, 'cet4');
  let learned = 0, correctCnt = 0, total = 0;
  q.forEach(it => { const w = L.findWord(s, 'cet4', it.id); L.srsUpdate(w, true); learned++; correctCnt++; total++; });
  L.finishSession(s, 'cet4', learned, 0, correctCnt, total);
  const agg = L.aggregateStats(s, 'cet4', 7);
  const today = agg.find(x => x.date === L.todayStr());
  eq(today.news, 5);
  ok(!L.barChart(agg).includes('NaN'));
  const c = L.cumulative(s, 'cet4');
  eq(c.totalNews, 5);
});

test('AC9 题库：导入->判分->正答率->做后感', () => {
  const s = L.defaultState();
  const qs = [
    { stem: 'q1', opts: ['a', 'b', 'c', 'd'], answer: 0, explanation: '' },
    { stem: 'q2', opts: ['a', 'b', 'c', 'd'], answer: 1, explanation: '' },
  ];
  L.addExamSet(s, 'cet4', '卷A', qs);
  const set = s.exams.cet4[0];
  L.recordExamResult(set, [0, 1], { 0: '易错点' });
  eq(set.result.accuracy, 100);
  eq(set.result.score, 2);
  eq(set.result.reflections[0], '易错点');
});

test('AC10 备份恢复：导出 JSON 再导入完整一致', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['a', '', '1']]);
  s.streak = 4;
  const s2 = L.deserializeBackup(L.serializeBackup(s));
  deepEq(L.normalize(s), s2);
});

test('AC11 首页聚合与底层数据一致 + AC2 模式隔离', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', Array.from({ length: 10 }, (_, i) => [`w${i}`, '', `m${i}`]));
  s.settings.dailyNew = 4;
  const h = L.buildHome(s, 'cet4');
  eq(h.todayNew, 4);
  eq(h.total, 10);
  eq(h.unseen, 10);
  // 切到六级：完全隔离
  eq(L.buildHome(s, 'cet6').total, 0);
  eq(L.buildQueue(s, 'cet6').length, 0);
  eq(s.words.cet6.length, 0);
});

test('完整链路串联：导入->计划->学习->统计->题库->备份 不抛错', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', Array.from({ length: 8 }, (_, i) => [`w${i}`, `/p${i}/`, `m${i}`]));
  s.settings.dailyNew = 6;
  const q = L.buildQueue(s, 'cet4');
  let learned = 0, correctCnt = 0, total = 0;
  q.forEach(it => {
    const w = L.findWord(s, 'cet4', it.id);
    L.srsUpdate(w, true);
    if (it.type === 'new') learned++;
    correctCnt++; total++;
  });
  L.finishSession(s, 'cet4', learned, q.length - learned, correctCnt, total);
  L.addExamSet(s, 'cet4', '卷', [{ stem: 'q', opts: ['a', 'b', 'c', 'd'], answer: 0, explanation: '' }]);
  L.recordExamResult(s.exams.cet4[0], [0], {});
  const restored = L.deserializeBackup(L.serializeBackup(s));
  eq(restored.words.cet4.length, 8);
  eq(restored.exams.cet4.length, 1);
  ok(L.aggregateStats(restored, 'cet4', 30).length === 30);
});

summary(label);
