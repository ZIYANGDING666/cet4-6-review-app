// 阶段6：数据统计（聚合 / 累计 / 图表）
const { test, eq, ok, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase6';

test('lastNDates 返回 n 个日期且末位为今天', () => {
  const d = L.lastNDates(7);
  eq(d.length, 7);
  eq(d[6], L.todayStr());
  // 首位为 6 天前
  const sixAgo = new Date(); sixAgo.setDate(sixAgo.getDate() - 6);
  eq(d[0], sixAgo.toISOString().slice(0, 10));
});

test('aggregateStats 长度正确、缺日期补 0、匹配日期', () => {
  const s = L.defaultState();
  const dates = L.lastNDates(7);
  const today = dates[6];
  s.stats.cet4 = [{ date: today, news: 5, reviews: 2 }];
  const agg = L.aggregateStats(s, 'cet4', 7);
  eq(agg.length, 7);
  eq(agg[6].news, 5);
  eq(agg[6].reviews, 2);
  eq(agg[0].news, 0); // 最旧一天无数据
  const sumNews = agg.reduce((a, x) => a + x.news, 0);
  eq(sumNews, 5);
});

test('aggregateStats 30 天长度正确', () => {
  const s = L.defaultState();
  const agg = L.aggregateStats(s, 'cet4', 30);
  eq(agg.length, 30);
  eq(agg.reduce((a, x) => a + x.news + x.reviews, 0), 0);
});

test('cumulative 累计学习/复习/掌握', () => {
  const s = L.defaultState();
  s.stats.cet4 = [
    { date: '2026-01-01', news: 5, reviews: 2 },
    { date: '2026-01-02', news: 3, reviews: 1 },
  ];
  L.addWords(s, 'cet4', [['a', '', '1'], ['b', '', '2'], ['c', '', '3']]);
  s.words.cet4[0].box = 3; s.words.cet4[1].box = 4;
  const c = L.cumulative(s, 'cet4');
  eq(c.totalNews, 8);
  eq(c.totalReviews, 3);
  eq(c.mastered, 2);
});

test('examAvgAccuracy 平均且四舍五入', () => {
  const s = L.defaultState();
  eq(L.examAvgAccuracy(s, 'cet4'), 0); // 无数据
  s.exams.cet4 = [
    { id: '1', name: 'T1', questions: [], result: { accuracy: 50 } },
    { id: '2', name: 'T2', questions: [], result: { accuracy: 100 } },
  ];
  eq(L.examAvgAccuracy(s, 'cet4'), 75);
});

test('barChart 生成合法 SVG 且包含聚合数值', () => {
  const days = [{ date: '2026-01-01', label: '01-01', news: 2, reviews: 3 }];
  const svg = L.barChart(days);
  ok(svg.includes('<svg'));
  ok(svg.includes('新词 2'));
  ok(svg.includes('复习 3'));
  ok(!svg.includes('NaN'));
});

test('barChart 多日不出现 NaN（全 0 时 max 兜底为1）', () => {
  const days = L.lastNDates(7).map(d => ({ date: d, label: d.slice(5), news: 0, reviews: 0 }));
  const svg = L.barChart(days);
  ok(!svg.includes('NaN'));
  ok(svg.includes('<svg'));
});

summary(label);
