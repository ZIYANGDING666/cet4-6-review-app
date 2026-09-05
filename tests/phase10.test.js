// 阶段10：默认词库(seedDefaults) 测试
const L = require('../logic.js');
const { test, eq, ok, summary } = require('./_util');

const DEF = {
  cet4: [
    { word: 'apple', phonetic: '/æ/', meaning: '苹果' },
    { word: 'banana', meaning: '香蕉' }            // 无音标
  ],
  cet6: [
    { word: 'cat', phonetic: '/k/', meaning: '猫' }
  ]
};

test('seedDefaults 基本播种', () => {
  const s = L.defaultState();
  const r = L.seedDefaults(s, DEF);
  eq(r.cet4, 2);
  eq(r.cet6, 1);
  eq(s.words.cet4.length, 2);
  eq(s.words.cet6.length, 1);

  const a = s.words.cet4[0];
  ok(!!a.id, '生成了 id');
  eq(a.word, 'apple');
  eq(a.phonetic, '/æ/');
  eq(a.meaning, '苹果');
  eq(a.box, 0);
  eq(a.next, 0);
  eq(a.reviews, 0);
  eq(L.unseenCount(s, 'cet4'), 2);
});

test('seedDefaults 不覆盖已有词（非 force）', () => {
  const s = L.defaultState();
  s.words.cet4.push({ id: 'x', word: 'zebra', phonetic: '', meaning: '斑马', box: 2, next: 0, reviews: 1, correct: 1, wrong: 0 });
  const before = s.words.cet4.length;
  const r = L.seedDefaults(s, DEF);
  eq(r.cet4, 0);
  eq(s.words.cet4.length, before);
  eq(s.words.cet4[0].word, 'zebra');
  eq(r.cet6, 1);
});

test('seedDefaults force 覆盖指定级别', () => {
  const s = L.defaultState();
  s.words.cet4.push({ id: 'x', word: 'zebra', phonetic: '', meaning: '斑马', box: 2, next: 0, reviews: 1, correct: 1, wrong: 0 });
  const r = L.seedDefaults(s, DEF, { force: true, mode: 'cet4' });
  eq(r.cet4, 2);
  eq(s.words.cet4.length, 2);
  eq(s.words.cet4[0].word, 'apple');
  eq(r.cet6, 0);
});

test('seedDefaults 过滤残缺条目', () => {
  const bad = { cet4: [{ word: '', meaning: '无词' }, { word: 'ok', meaning: '' }, { word: 'good', meaning: '好' }], cet6: [] };
  const s = L.defaultState();
  const r = L.seedDefaults(s, bad);
  eq(r.cet4, 1);
  eq(s.words.cet4[0].word, 'good');
});

test('seedDefaults 无默认数据时安全返回', () => {
  const s = L.defaultState();
  const r = L.seedDefaults(s, null);
  eq(r.cet4, 0);
  eq(r.cet6, 0);
  eq(s.words.cet4.length, 0);
});

summary('phase10');
