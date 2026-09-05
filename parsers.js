/*
 * parsers.js — 离线文档解析（docx / xlsx / pdf），无任何外部依赖。
 * 浏览器端使用原生 DecompressionStream 解压 zip（docx/xlsx 本质是 zip），
 * PDF 采用尽力文本提取（正则抽取内容流中的文字串），标注为 best-effort。
 * 暴露：parseWordFile(file) -> Promise<[{word,phonetic,meaning}]>
 *       parseExamFile(file) -> Promise<[{stem,opts:[A,B,C,D],answer,explanation}]>
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AppParsers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function hasDecompression() { return typeof DecompressionStream !== 'undefined'; }

  async function inflateRaw(bytes) {
    if (!hasDecompression()) throw new Error('当前环境不支持 DecompressionStream，无法解压 docx/xlsx');
    const ds = new DecompressionStream('deflate-raw');
    const w = ds.writable.getWriter(); w.write(bytes); w.close();
    const r = ds.readable.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await r.read();
      if (done) break;
      chunks.push(value); total += value.length;
    }
    const out = new Uint8Array(total); let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  }

  /* ---------- 迷你 ZIP 读取（仅支持 store / deflate） ---------- */
  async function unzip(buf) {
    const dv = new DataView(buf);
    const u8 = new Uint8Array(buf);
    // 找 EOCD
    let eocd = -1;
    for (let i = u8.length - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('不是有效的 zip/docx/xlsx 文件');
    const entries = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true); // central dir offset
    const files = {};
    for (let n = 0; n < entries; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const compSize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commLen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      let name = '';
      for (let k = 0; k < nameLen; k++) name += String.fromCharCode(u8[p + 46 + k]);
      // local header
      const lnameLen = dv.getUint16(lho + 26, true);
      const lextraLen = dv.getUint16(lho + 28, true);
      const dataStart = lho + 30 + lnameLen + lextraLen;
      const comp = u8.subarray(dataStart, dataStart + compSize);
      let data;
      if (method === 0) data = comp.slice();
      else if (method === 8) data = await inflateRaw(comp);
      else throw new Error('不支持的压缩方式: ' + method);
      files[name] = data;
      p += 46 + nameLen + extraLen + commLen;
    }
    return files;
  }

  function dec(u8) { return new TextDecoder('utf-8').decode(u8); }

  /* ---------- docx ---------- */
  function parseDocxText(xml) {
    // 表格行 -> 单元格数组；段落 -> 单行
    const rows = [];
    const trRe = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
    let m;
    while ((m = trRe.exec(xml))) {
      const tr = m[1];
      const cells = [];
      const tcRe = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
      let c;
      while ((c = tcRe.exec(tr))) cells.push(extractWT(c[1]));
      if (cells.length) rows.push(cells);
    }
    // 段落（排除已属于表格的）
    const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    while ((m = paraRe.exec(xml))) {
      const txt = extractWT(m[1]);
      if (txt && txt.trim()) rows.push([txt.trim()]);
    }
    return rows;
  }
  function extractWT(block) {
    let s = '', mm;
    const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
    while ((mm = re.exec(block))) s += decodeXml(mm[1]);
    return s;
  }

  /* ---------- xlsx ---------- */
  function parseXlsxRows(files) {
    const ssXml = files['xl/sharedStrings.xml'];
    const ss = ssXml ? parseSharedStrings(dec(ssXml)) : [];
    // 取第一个工作表
    let sheetXml = null;
    for (const k in files) { if (/xl\/worksheets\/sheet\d+\.xml$/.test(k)) { sheetXml = dec(files[k]); break; } }
    if (!sheetXml) throw new Error('xlsx 中未找到工作表');
    const rows = [];
    const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let m;
    while ((m = rowRe.exec(sheetXml))) {
      const cells = {}; let maxC = 0;
      const cRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      let c;
      while ((c = cRe.exec(m[1]))) {
        const attrs = c[1];
        const rM = /r="([A-Z]+)\d+"/.exec(attrs);
        if (!rM) continue;
        const col = colToIdx(rM[1]);
        const tM = /t="([^"]+)"/.exec(attrs);
        const inner = c[2];
        let val = '';
        if (tM && tM[1] === 's') {
          const vM = /<v>(\d+)<\/v>/.exec(inner);
          if (vM) val = ss[parseInt(vM[1], 10)] || '';
        } else {
          const vM = /<t>([\s\S]*?)<\/t>|<v>([\s\S]*?)<\/v>/.exec(inner);
          if (vM) val = decodeXml(vM[1] || vM[2] || '');
        }
        cells[col] = val;
        if (col > maxC) maxC = col;
      }
      const arr = [];
      for (let i = 0; i <= maxC; i++) arr.push(cells[i] || '');
      rows.push(arr);
    }
    return rows;
  }
  function parseSharedStrings(xml) {
    const out = []; let m;
    const re = /<si>([\s\S]*?)<\/si>/g;
    while ((m = re.exec(xml))) {
      let s = '', mm; const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
      while ((mm = tRe.exec(m[1]))) s += decodeXml(mm[1]);
      out.push(s);
    }
    return out;
  }
  function colToIdx(letters) {
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  /* ---------- pdf (best-effort) ---------- */
  async function parsePdfLines(buf) {
    const u8 = new Uint8Array(buf);
    const raw = dec(u8);
    let text = '';
    // 尝试解压每个 stream 块
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = streamRe.exec(raw))) {
      const body = m[1];
      const bytes = new Uint8Array(body.length);
      for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 0xff;
      try {
        const out = await inflateRaw(bytes);
        text += dec(out) + '\n';
      } catch (e) { /* 非压缩流，忽略 */ }
    }
    // 也在原文里直接抽取括号文字（未压缩 PDF）
    text += '\n' + raw;
    const runs = [];
    let r;
    const parenRe = /\(((?:[^()\\]|\\.)*)\)/g;
    while ((r = parenRe.exec(text))) runs.push(decodePdfStr(r[1]));
    // TJ 数组里的文字
    const tj = /\[([^\]]*)\]/g;
    while ((r = tj.exec(text))) {
      const inner = r[1];
      let q;
      const qr = /\(((?:[^()\\]|\\.)*)\)/g;
      while ((q = qr.exec(inner))) runs.push(decodePdfStr(q[1]));
    }
    return runs.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }
  function decodePdfStr(s) {
    return s.replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[c]))
      .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8) & 0xff));
  }

  /* ---------- 通用：XML 实体解码 ---------- */
  function decodeXml(s) {
    return String(s)
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }

  /* ---------- 行 -> 结构化对象 ---------- */
  function splitRow(arr) {
    // arr: 单元格数组；若只有一个单元格，按 tab / 多个空格 / 竖线切分
    if (arr.length === 1) return arr[0].split(/\t|\s{2,}|\|/).map(x => x.trim()).filter(Boolean);
    return arr.map(x => String(x == null ? '' : x).trim());
  }
  function looksLikeHeader(cells) {
    const f = (cells[0] || '').toLowerCase();
    return ['word', '单词', 'stem', '题干', 'question', '题目'].includes(f);
  }
  function mapWords(rows) {
    const out = [];
    rows.forEach((row, i) => {
      const cells = splitRow(row);
      if (!cells.length) return;
      if (i === 0 && looksLikeHeader(cells)) return;
      const word = (cells[0] || '').trim();
      const phonetic = (cells[1] || '').trim();
      const meaning = (cells.slice(2).join(' ')).trim() || (cells[1] || '').trim();
      if (!word) return;
      out.push({ word, phonetic, meaning: meaning || '' });
    });
    return out;
  }
  function mapExams(rows) {
    const out = [];
    rows.forEach((row, i) => {
      const cells = splitRow(row);
      if (!cells.length) return;
      if (i === 0 && looksLikeHeader(cells)) return;
      const stem = (cells[0] || '').trim();
      const opts = cells.slice(1, 5).map(x => (x || '').trim());
      if (!stem || opts.length < 2) return;
      const ansRaw = (cells[5] || '').trim().toUpperCase();
      let answer = 0;
      if (/^[A-D]$/.test(ansRaw)) answer = 'ABCD'.indexOf(ansRaw);
      else { const n = parseInt(ansRaw, 10); if (n >= 1 && n <= 4) answer = n - 1; }
      const explanation = (cells[6] || '').trim();
      out.push({ stem, opts, answer, explanation });
    });
    return out;
  }

  /* ---------- 文件入口 ---------- */
  function extOf(name) {
    const i = name.lastIndexOf('.');
    return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
  }
  async function readBuffer(file) {
    return await file.arrayBuffer();
  }
  async function fileToRows(file) {
    const ext = extOf(file.name);
    const buf = await readBuffer(file);
    if (ext === 'csv' || ext === 'txt') {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
      return text.split(/\r?\n/).map(l => l.split(/,|\t/).map(x => x.replace(/^"|"$/g, '').trim()));
    }
    if (ext === 'xlsx') return parseXlsxRows(await unzip(buf));
    if (ext === 'docx') {
      const files = await unzip(buf);
      const docXml = files['word/document.xml'];
      if (!docXml) throw new Error('docx 中未找到 document.xml');
      return parseDocxText(dec(docXml));
    }
    if (ext === 'pdf') {
      const lines = await parsePdfLines(buf);
      return lines.map(l => [l]); // 每行一单元格，后续按空白切分
    }
    throw new Error('不支持的格式：.' + ext + '（支持 docx / xlsx / pdf / csv）');
  }

  async function parseWordFile(file) { return mapWords(await fileToRows(file)); }
  async function parseExamFile(file) { return mapExams(await fileToRows(file)); }

  return { parseWordFile, parseExamFile, fileToRows, unzip, parsePdfLines, mapWords, mapExams };
});
