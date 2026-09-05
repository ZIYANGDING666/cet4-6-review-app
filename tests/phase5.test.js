// 阶段5：首页总览聚合（buildHome）
const { test, eq, ok, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase5';

test('buildHome 今日新背 = min(上限, 未学)', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['a', '', '1'], ['b', '', '2'], ['c', '', '3']]);
  s.settings.dailyNew = 10; // 上限大于未学
  eq(L.buildHome(s, 'cet4').todayNew, 3);
  s.settings.dailyNew = 2;  // 上限小于未学
  eq(L.buildHome(s, 'cet4').todayNew, 2);
});

test('buildHome 今日复习 = 到期复习数', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['a', '', '1'], ['b', '', '2']]);
  s.words.cet4[0].box = 1; s.words.cet4[0].next = Date.now() - 1;
  s.words.cet4[1].box = 3; s.words.cet4[1].next = Date.now() + L.DAY; // 未到期
  eq(L.buildHome(s, 'cet4').todayReview, 1);
});

test('buildHome 掌握词 = box>=3 计数', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet4', [['a', '', '1'], ['b', '', '2'], ['c', '', '3']]);
  s.words.cet4[0].box = 3; s.words.cet4[1].box = 5;
  eq(L.buildHome(s, 'cet4').mastered, 2);
  eq(L.buildHome(s, 'cet4').total, 3);
});

test('buildHome 携带 streak 与 最近考试', () => {
  const s = L.defaultState();
  s.streak = 4;
  s.exams.cet4 = [
    { id: '1', name: 'T1', questions: [], result: { date: '2026-01-01', accuracy: 50 } },
    { id: '2', name: 'T2', questions: [], result: { date: '2026-01-02', accuracy: 70 } },
    { id: '3', name: 'T3', questions: [], result: { date: '2026-01-03', accuracy: 80 } },
    { id: '4', name: 'T4', questions: [], result: { date: '2026-01-04', accuracy: 90 } },
  ];
  const h = L.buildHome(s, 'cet4');
  eq(h.streak, 4);
  eq(h.recentExams.length, 3); // 仅最近 3
  eq(h.recentExams[0].name, 'T4'); // 最近在前
  eq(h.recentExams[2].name, 'T2');
});

test('buildHome 未做考试时 recentExams 为空', () => {
  const s = L.defaultState();
  eq(L.buildHome(s, 'cet4').recentExams.length, 0);
});

summary(label);
