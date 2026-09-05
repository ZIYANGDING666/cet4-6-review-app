// 阶段11：清空当前词库(clearMode) 测试
const L = require('../logic.js');
const { test, eq, ok, summary } = require('./_util');

const DEF = {
  cet4: [{ word: 'apple', phonetic: '/æ/', meaning: '苹果' }],
  cet6: [{ word: 'cat', phonetic: '/k/', meaning: '猫' }]
};

test('clearMode 清空指定级别并返回删除数', () => {
  const s = L.defaultState();
  L.seedDefaults(s, DEF, { force: true });
  eq(s.words.cet4.length, 1);
  eq(s.words.cet6.length, 1);
  const n = L.clearMode(s, 'cet4');
  eq(n, 1);
  eq(s.words.cet4.length, 0);
  eq(s.words.cet6.length, 1); // 其它级别不受影响
});

test('clearMode 默认用 state.mode', () => {
  const s = L.defaultState();
  s.mode = 'cet6';
  L.seedDefaults(s, DEF, { force: true });
  L.clearMode(s); // 不传 mode
  eq(s.words.cet6.length, 0);
  eq(s.words.cet4.length, 1);
});

test('clearMode 空词库返回 0', () => {
  const s = L.defaultState();
  const n = L.clearMode(s, 'cet4');
  eq(n, 0);
  eq(s.words.cet4.length, 0);
});

summary('phase11');
