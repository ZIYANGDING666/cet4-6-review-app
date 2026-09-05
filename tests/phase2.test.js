// 阶段2：词库导入（CSV 解析 + 入库）
const { test, eq, ok, summary } = require('./_util');
const L = require('../logic.js');

const label = 'phase2';

test('parseCSV 普通字段', () => {
  const rows = L.parseCSV('a,b,c\n1,2,3');
  eq(rows.length, 2);
  eq(rows[0].join(','), 'a,b,c');
  eq(rows[1].join(','), '1,2,3');
});

test('parseCSV 引号内逗号不拆分', () => {
  const rows = L.parseCSV('word,phonetic,meaning\nhello,"/h/,/e/",你好');
  eq(rows.length, 2);
  eq(rows[1][1], '/h/,/e/'); // 含逗号的音标保持完整
});

test('parseCSV 双引号转义为单引号', () => {
  const rows = L.parseCSV('a,b\n"he said ""hi""",x');
  eq(rows[1][0], 'he said "hi"');
});

test('parseCSV 空行被忽略', () => {
  const rows = L.parseCSV('a,b\n1,2\n\n3,4');
  eq(rows.length, 3);
});

test('addWords 跳过表头并正确入库（box=0, 带 id）', () => {
  const s = L.defaultState();
  const csv = 'word,phonetic,meaning\napple,/ˈæpl/,苹果\nbanana,/bənɑːnə/,香蕉';
  const rows = L.parseCSV(csv);
  const r = L.addWords(s, 'cet4', rows);
  eq(r.added, 2);
  eq(r.errors.length, 0);
  eq(s.words.cet4.length, 2);
  ok(s.words.cet4[0].id);
  eq(s.words.cet4[0].box, 0);
  eq(s.words.cet4[0].word, 'apple');
  eq(s.words.cet4[0].meaning, '苹果');
});

test('addWords 跳过空行与缺释义的行（经 parseCSV 真实链路）', () => {
  const s = L.defaultState();
  // 空行应被 parseCSV 丢弃；dog 行缺释义 -> 记为一个错误
  const csv = 'word,phonetic,meaning\ncat,/kæt/,猫\n\ndog,/dɒɡ/,';
  const rows = L.parseCSV(csv);
  const r = L.addWords(s, 'cet4', rows);
  eq(r.added, 1);
  eq(r.errors.length, 1);
  eq(s.words.cet4.length, 1);
});

test('addWords 映射到 cet6 不影响 cet4（模式隔离）', () => {
  const s = L.defaultState();
  L.addWords(s, 'cet6', [['zz', '', 'z']]);
  eq(s.words.cet6.length, 1);
  eq(s.words.cet4.length, 0);
});

summary(label);
