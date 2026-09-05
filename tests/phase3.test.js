// 阶段3：每日计划 + SRS 排程
const { test, eq, ok, summary } = require('./_util');
const L = require('../logic.js');
const DAY = L.DAY;

function addWordsDirect(s, mode, n) {
  for (let i = 0; i < n; i++) L.addWords(s, mode, [['w' + i, '', 'm' + i]]);
}

const label = 'phase3';

test('unseenCount 仅统计 box===0', () => {
  const s = L.defaultState();
  addWordsDirect(s, 'cet4', 4);
  eq(L.unseenCount(s, 'cet4'), 4);
  s.words.cet4[0].box = 2;
  eq(L.unseenCount(s, 'cet4'), 3);
});

test('dueCount 仅统计 box>0 且 next<=now（未来不算）', () => {
  const s = L.defaultState();
  addWordsDirect(s, 'cet4', 3);
  eq(L.dueCount(s, 'cet4'), 0); // 全未学
  s.words.cet4[0].box = 1; s.words.cet4[0].next = Date.now() - 1;        // 到期
  s.words.cet4[1].box = 1; s.words.cet4[1].next = Date.now() + DAY;       // 未到期
  eq(L.dueCount(s, 'cet4'), 1);
});

test('buildQueue 新词不超过 dailyNew 上限（AC4）', () => {
  const s = L.defaultState();
  addWordsDirect(s, 'cet4', 10);
  s.settings.dailyNew = 3;
  const q = L.buildQueue(s, 'cet4');
  const news = q.filter(x => x.type === 'new');
  eq(news.length, 3);
  ok(q.every(x => x.type === 'new'));
  eq(L.unseenCount(s, 'cet4'), 10); // 未学总数仍是 10，仅排队 3
});

test('buildQueue 只排新词（复习已改为错题本，不再入队）', () => {
  const s = L.defaultState();
  addWordsDirect(s, 'cet4', 5);
  s.settings.dailyNew = 2;
  // 让其中 2 个变成"已学过"，验证它们不再进队列
  s.words.cet4[0].box = 1; s.words.cet4[0].next = Date.now() - 1000;
  s.words.cet4[1].box = 2; s.words.cet4[1].next = Date.now() - 1000;
  const q = L.buildQueue(s, 'cet4');
  const news = q.filter(x => x.type === 'new').length;
  const revs = q.filter(x => x.type === 'rev').length;
  eq(news, 2); // 上限 2 个新词
  eq(revs, 0); // 复习词不再进队列
  eq(q.length, 2);
});

test('dailyNew 为 0 时不排新词', () => {
  const s = L.defaultState();
  addWordsDirect(s, 'cet4', 3);
  s.settings.dailyNew = 0;
  const q = L.buildQueue(s, 'cet4');
  eq(q.filter(x => x.type === 'new').length, 0);
});

test('队列为空时 buildQueue 返回空数组（边界）', () => {
  const s = L.defaultState();
  eq(L.buildQueue(s, 'cet4').length, 0);
});

summary(label);
