// 极简测试工具：无外部依赖
let pass = 0, fail = 0; const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('  \u2713 ' + name); }
  catch (e) { fail++; failures.push(name + ' -> ' + e.message); console.log('  \u2717 ' + name + ' -> ' + e.message); }
}
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a));
}
function ok(c, msg) { if (!c) throw new Error(msg || 'expected truthy'); }
function approx(a, b, msg) { if (Math.abs(a - b) > 1e-9) throw new Error((msg ? msg + ': ' : '') + 'expected ~' + b + ' got ' + a); }
function deepEq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg ? msg + ': ' : '') + 'not deep-equal');
}
function summary(label) {
  console.log('\n[' + (label || '') + '] PASS ' + pass + '  FAIL ' + fail);
  if (fail) { console.log('FAILURES:\n' + failures.join('\n')); process.exitCode = 1; }
}
module.exports = { test, eq, ok, approx, deepEq, summary };
