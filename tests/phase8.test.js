// 阶段8：备份与恢复（JSON 往返）
const { test, eq, ok, deepEq, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase8';

function sampleState() {
  const s = L.defaultState();
  s.settings.dailyNew = 12;
  s.streak = 5; s.lastStudy = L.todayStr();
  L.addWords(s, 'cet4', [['apple', '/a/', '苹果'], ['banana', '', '香蕉']]);
  s.words.cet4[0].box = 3; // 制造一个已掌握词
  s.stats.cet4 = [{ date: L.todayStr(), news: 4, reviews: 1 }];
  L.addExamSet(s, 'cet4', '卷', [{ stem: 'q', opts: ['a', 'b', 'c', 'd'], answer: 0, explanation: '' }]);
  L.recordExamResult(s.exams.cet4[0], [0], { 0: '笔记' });
  return s;
}

test('serialize → deserialize 往返后结构完全一致', () => {
  const s = sampleState();
  const s2 = L.deserializeBackup(L.serializeBackup(s));
  // 与 normalize 后的原状态逐字段一致
  deepEq(L.normalize(s), s2);
});

test('备份恢复保留关键数据（词/统计/考试/设置/打卡）', () => {
  const s = sampleState();
  const s2 = L.deserializeBackup(L.serializeBackup(s));
  eq(s2.words.cet4.length, 2);
  eq(s2.words.cet4[0].meaning, '苹果');
  eq(s2.words.cet4[0].box, 3);
  eq(s2.settings.dailyNew, 12);
  eq(s2.streak, 5);
  eq(s2.stats.cet4[0].news, 4);
  eq(s2.exams.cet4.length, 1);
  eq(s2.exams.cet4[0].result.accuracy, 100);
  eq(s2.exams.cet4[0].result.reflections[0], '笔记');
});

test('恢复后两模式隔离仍然成立', () => {
  const s = sampleState();
  L.addWords(s, 'cet6', [['z', '', 'z']]);
  const s2 = L.deserializeBackup(L.serializeBackup(s));
  eq(s2.words.cet6.length, 1);
  eq(s2.words.cet4.length, 2);
});

test('部分/空备份反序列化不抛错且补全默认值', () => {
  const partial = L.deserializeBackup(JSON.stringify({ settings: { dailyNew: 7 } }));
  eq(partial.settings.dailyNew, 7);
  eq(partial.words.cet4.length, 0);
  eq(partial.mode, 'cet4');
});

test('非法 JSON 反序列化抛错（需上层捕获）', () => {
  let threw = false;
  try { L.deserializeBackup('not json{{'); } catch (e) { threw = true; }
  ok(threw);
});

summary(label);
