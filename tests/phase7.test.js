// 阶段7：题库（答案归一 / 导入套题 / 判分 / 做后感）
const { test, eq, ok, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase7';

test('normAnswer 多种写法归一为 0-3', () => {
  eq(L.normAnswer('A'), 0);
  eq(L.normAnswer('b'), 1);
  eq(L.normAnswer('C'), 2);
  eq(L.normAnswer('d'), 3);
  eq(L.normAnswer('1'), 0);
  eq(L.normAnswer('4'), 3);
  eq(L.normAnswer(''), 0);     // 兜底
  eq(L.normAnswer('X'), 0);    // 非法兜底
});

test('addExamSet 加入对应模式且 result 初始为 null', () => {
  const s = L.defaultState();
  const qs = [{ stem: 'q', opts: ['a', 'b', 'c', 'd'], answer: 0, explanation: '' }];
  const set = L.addExamSet(s, 'cet6', '模拟卷', qs);
  eq(s.exams.cet6.length, 1);
  eq(set.result, null);
  eq(set.name, '模拟卷');
  eq(set.questions.length, 1);
  eq(s.exams.cet4.length, 0); // 模式隔离
});

test('gradeExam 正确统计正确数与正确率（四舍五入）', () => {
  const qs = [
    { answer: 0 }, { answer: 1 }, { answer: 2 }, { answer: 3 },
  ];
  const sel = [0, 1, 3, 3]; // 第3题错（选3非2）
  const g = L.gradeExam(qs, sel);
  eq(g.right, 3);
  eq(g.total, 4);
  eq(g.accuracy, 75);
});

test('gradeExam 全错正确率 0、全对 100', () => {
  const qs = [{ answer: 0 }, { answer: 1 }];
  eq(L.gradeExam(qs, [1, 0]).accuracy, 0);
  eq(L.gradeExam(qs, [0, 1]).accuracy, 100);
});

test('recordExamResult 写入结果且保存做后感', () => {
  const s = L.defaultState();
  const qs = [{ answer: 0 }, { answer: 1 }, { answer: 2 }];
  const set = L.addExamSet(s, 'cet4', '卷', qs);
  const sel = [0, 1, 2];
  const reflections = { 0: '易错点A', 2: '易错点C' };
  const res = L.recordExamResult(set, sel, reflections);
  ok(set.result);
  eq(res.score, 3);
  eq(res.total, 3);
  eq(res.accuracy, 100);
  eq(set.result.reflections[0], '易错点A');
  eq(set.result.reflections[2], '易错点C');
  eq(set.result.date, L.todayStr());
});

test('recordExamResult 部分正确时正答率正确', () => {
  const s = L.defaultState();
  const qs = [{ answer: 0 }, { answer: 1 }, { answer: 2 }, { answer: 3 }];
  const set = L.addExamSet(s, 'cet4', '卷2', qs);
  L.recordExamResult(set, [0, 1, 2, 9], {}); // 第4题选9（无此选项）算错
  eq(set.result.accuracy, 75);
});

test('题库结果可被 recentExams 回看', () => {
  const s = L.defaultState();
  const qs = [{ answer: 0 }];
  const set = L.addExamSet(s, 'cet4', '卷3', qs);
  L.recordExamResult(set, [0], {});
  const rec = L.recentExams(s, 'cet4', 3);
  eq(rec.length, 1);
  eq(rec[0].name, '卷3');
  eq(rec[0].result.accuracy, 100);
});

summary(label);
