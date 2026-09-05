// 阶段4：背单词闯关（SRS 升降级 / 选项生成 / 会话结算+打卡）
const { test, eq, ok, summary } = require('./_util');
const L = require('../logic.js');
const DAY = L.DAY;

const label = 'phase4';

function mkWord(over) { return Object.assign({ id: 'x', word: 'w', phonetic: '', meaning: '意思', box: 0, next: 0, reviews: 0, correct: 0, wrong: 0 }, over || {}); }

test('srsUpdate 答对：box0->1，next 为今天（间隔0天）', () => {
  const w = mkWord({ box: 0 });
  const before = Date.now();
  L.srsUpdate(w, true);
  eq(w.box, 1);
  ok(Math.abs(w.next - (before + L.INTERVALS[0] * DAY)) < 5000);
  eq(w.correct, 1); eq(w.reviews, 1);
});

test('srsUpdate 答对：box1->2，间隔1天', () => {
  const w = mkWord({ box: 1 });
  const before = Date.now();
  L.srsUpdate(w, true);
  eq(w.box, 2);
  ok(Math.abs(w.next - (before + L.INTERVALS[1] * DAY)) < 5000);
});

test('srsUpdate 答对：box5 封顶不超 5', () => {
  const w = mkWord({ box: 5 });
  L.srsUpdate(w, true);
  eq(w.box, 5);
});

test('srsUpdate 答错：box 重置为 1，next 为今天，wrong+1', () => {
  const w = mkWord({ box: 4, correct: 3 });
  const before = Date.now();
  L.srsUpdate(w, false);
  eq(w.box, 1);
  eq(w.wrong, 1);
  ok(Math.abs(w.next - before) < 5000);
});

test('buildOptions 含正确释义、共4项、无重复（pool 充足）', () => {
  const correct = '苹果';
  const pool = ['香蕉', '橘子', '梨', '桃', '葡萄', '西瓜'];
  const opts = L.buildOptions(correct, pool);
  eq(opts.length, 4);
  ok(opts.includes(correct));
  eq(new Set(opts).size, 4); // 无重复
});

test('buildOptions 干扰项不足时仍保证正确项且无重复', () => {
  const correct = '苹果';
  const pool = ['香蕉']; // 只有 1 个干扰
  const opts = L.buildOptions(correct, pool);
  ok(opts.includes(correct));
  eq(new Set(opts).size, opts.length); // 无重复
  ok(opts.length >= 1 && opts.length <= 4);
});

test('buildOptions 确定性 rng 可复现', () => {
  const correct = 'A';
  const pool = ['B', 'C', 'D', 'E', 'F'];
  const seq = () => 0; // 固定 rng
  const o1 = L.buildOptions(correct, pool, seq);
  const o2 = L.buildOptions(correct, pool, seq);
  eq(JSON.stringify(o1), JSON.stringify(o2));
  ok(o1.includes('A'));
});

test('finishSession 写入当日统计', () => {
  const s = L.defaultState();
  s.stats.cet4 = [{ date: L.todayStr(), news: 2, reviews: 1 }];
  const r = L.finishSession(s, 'cet4', 1, 2, 3, 3);
  const st = s.stats.cet4.find(x => x.date === L.todayStr());
  eq(st.news, 3);
  eq(st.reviews, 3);
  eq(r.accuracy, 100);
});

test('finishSession 打卡：首日 streak=1', () => {
  const s = L.defaultState();
  s.lastStudy = null; s.streak = 0;
  L.finishSession(s, 'cet4', 1, 0, 1, 1);
  eq(s.streak, 1);
  eq(s.lastStudy, L.todayStr());
});

test('finishSession 打卡：连续（昨天地）streak+1', () => {
  const s = L.defaultState();
  s.lastStudy = L.yesterdayStr(); s.streak = 5;
  L.finishSession(s, 'cet4', 1, 0, 1, 1);
  eq(s.streak, 6);
  eq(s.lastStudy, L.todayStr());
});

test('finishSession 打卡：已学过今天则不变', () => {
  const s = L.defaultState();
  s.lastStudy = L.todayStr(); s.streak = 7;
  L.finishSession(s, 'cet4', 1, 0, 1, 1);
  eq(s.streak, 7);
});

summary(label);
