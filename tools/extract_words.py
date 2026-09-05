#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从四六级词汇 PDF 提取词库（逐页处理，按 y 聚行后行内分列）。

输出 default-words.js：window.DEFAULT_WORDS = { cet4:[...], cet6:[...] }
每条: { word, phonetic, meaning }

处理要点：
- 逐页处理（每页 y 独立），避免跨页 y 坐标重叠导致塌缩
- 每页内按 y 把 span 聚类成"行"(相邻 <=3.5px 视为同一行)，行内按 x 分列：
    序号(<45) / 单词(45-100) / 音标(100-200) / 释义(>=200)
- 含"单词"的行 = 新词条(同收割序号/音标/首行释义)；只含"释义"的行 = 续行，追加到当前词条
- 用英语词表修复被 PDF 文本层截断的长词（如 accommodatio -> accommodation）
- 清理音标中被错误插入的空格（空格后紧跟非 ASCII 音标字符时删除）
"""
import fitz  # pymupdf
import re, json, sys
import wordfreq  # 用于修复被截断的长词拼写

SERIAL_MAX_X = 45
WORD_MAX_X = 100
PHON_MAX_X = 200
HEADER_Y = 50
HEADER_TEXTS = {"序号单词", "注音", "释义"}
SERIAL_RE = re.compile(r"^\d+$")
LINE_GAP = 3.5  # 行聚类阈值(px)

# 页码页脚（PDF 每页底部的 "第 X 页 共 Y 页" / "page N" 等）会被误当成释义续行
PAGE_RE = re.compile(r"第\s*\d+\s*页|共\s*\d+\s*页?|page\s*\d+|p\.?\s*\d+", re.I)

# 已知的 PDF 文本层确定无疑的错词，提取后强制纠正（只放有把握的）
WORD_FIX = {"reservior": "reservoir"}


def clean_meaning(m):
    """去掉页码页脚并规整空白。"""
    if not m:
        return m
    m = PAGE_RE.sub("", m)
    m = re.sub(r"\s+", " ", m).strip()
    return m


def word_is_clean(w):
    """单词应仅含 ASCII（字母/数字/./-/ '）；含中文或乱码字符则视为脏数据丢弃。"""
    return bool(w) and all(ord(c) < 128 for c in w)


def classify(x):
    if x < SERIAL_MAX_X:
        return "serial"
    if x < WORD_MAX_X:
        return "word"
    if x < PHON_MAX_X:
        return "phonetic"
    return "meaning"


def clean_phonetic(p):
    if not p:
        return p
    # 删除音标中被错误插入的空格：空格前或后是非 ASCII（音标）字符时删掉
    out = []
    chars = list(p)
    for i, ch in enumerate(chars):
        if ch == " ":
            prev_na = i > 0 and ord(chars[i - 1]) > 127
            next_na = i + 1 < len(chars) and ord(chars[i + 1]) > 127
            if prev_na or next_na:
                continue
        out.append(ch)
    return "".join(out).strip()


def load_dict():
    try:
        import wordfreq
        flat = [w for sub in wordfreq.get_frequency_list("en") for w in sub]
        return set(w.lower() for w in flat)
    except Exception as e:
        print("warn: 未加载英语词表，跳过截断修复:", e, file=sys.stderr)
        return None


def repair_word(w, dset):
    if dset is None:
        return w
    wl = w.lower()
    if wl in dset:
        return w
    if not re.match(r"^[a-z][a-z.\-']*$", wl):
        return w
    # 候选：在词表中、是 w 的前缀、且只多 1~3 个字符
    cands = [c for c in dset if len(c) >= len(wl) + 1 and len(c) <= len(wl) + 3 and c.startswith(wl)]
    if not cands:
        return w
    # 补字符最少的一档里，按词频选最高频者（标准词必远常见）
    cands.sort(key=lambda c: (len(c) - len(wl), -wordfreq.zipf_frequency(c, "en"), c))
    best_delta = len(cands[0]) - len(wl)
    shortest = [c for c in cands if len(c) - len(wl) == best_delta]
    best = max(shortest, key=lambda c: wordfreq.zipf_frequency(c, "en"))
    if wordfreq.zipf_frequency(best, "en") >= 1.0:
        return best
    return w


def extract_pdf(path, dset):
    doc = fitz.open(path)
    out = []
    repaired_total = 0
    seen = set()

    for pi in range(doc.page_count):
        # 本页 span（已过滤表头）
        page_spans = []
        d = doc[pi].get_text("dict")
        for b in d["blocks"]:
            for ln in b.get("lines", []):
                for s in ln["spans"]:
                    t = s["text"].strip()
                    if not t or t in HEADER_TEXTS:
                        continue
                    y = round(s["bbox"][1], 1)
                    x = round(s["bbox"][0], 1)
                    if y < HEADER_Y:
                        continue
                    page_spans.append((y, x, t, classify(x)))
        page_spans.sort()

        # 按 y 聚类成行
        lines = []
        cur = []
        for sp in page_spans:
            if cur and sp[0] - cur[-1][0] > LINE_GAP:
                lines.append(cur)
                cur = []
            cur.append(sp)
        if cur:
            lines.append(cur)

        # 行内处理
        cur_entry = None

        def flush():
            nonlocal cur_entry
            if cur_entry and cur_entry["word"] and cur_entry["meaning"]:
                cm = clean_meaning(cur_entry["meaning"])
                if cm and word_is_clean(cur_entry["word"]):
                    cur_entry["meaning"] = cm
                    out.append(cur_entry)
            cur_entry = None

        for line in lines:
            word_spans = [s for s in line if s[3] == "word"]
            phon_spans = [s for s in line if s[3] == "phonetic"]
            mean_spans = [s for s in line if s[3] == "meaning"]

            if word_spans:
                flush()
                w = " ".join(s[2] for s in word_spans).strip()
                p = clean_phonetic(" ".join(s[2] for s in phon_spans)).strip()
                m = re.sub(r"\s+", " ", " ".join(s[2] for s in mean_spans)).strip()
                rw = repair_word(w, dset)
                rw = WORD_FIX.get(rw.lower(), rw)
                if rw != w:
                    repaired_total += 1
                if rw.lower() in seen:
                    cur_entry = None  # 重复词跳过
                    continue
                seen.add(rw.lower())
                cur_entry = {"word": rw, "phonetic": p, "meaning": m}
            elif mean_spans and cur_entry is not None:
                add = re.sub(r"\s+", " ", " ".join(s[2] for s in mean_spans)).strip()
                if add:
                    cur_entry["meaning"] = (cur_entry["meaning"] + " " + add).strip()
        flush()
    doc.close()
    return out, repaired_total


if __name__ == "__main__":
    dset = load_dict()
    cet4, r4 = extract_pdf("C:/Users/18572/Downloads/33336c4384bf0b56ff0a98122f4152e9.pdf", dset)
    cet6, r6 = extract_pdf("C:/Users/18572/Downloads/cc47b1a61e98371f6c7b25e45327021d.pdf", dset)
    print(f"CET4 {len(cet4)} 条 (修复截断 {r4}), CET6 {len(cet6)} 条 (修复截断 {r6})", file=sys.stderr)

    for name, lst in (("CET4", cet4), ("CET6", cet6)):
        sample = {e["word"]: e for e in lst}
        for chk in ["accommodation", "a.m", "always", "amongst", "ability", "abolish", "abandon"]:
            if chk in sample:
                print(f"  [{name}] {chk}: phon={sample[chk]['phonetic']!r} mean={sample[chk]['meaning'][:26]!r}", file=sys.stderr)

    # 校验：是否有空 phonetic / 空 meaning / 重复 word
    empty_phon = sum(1 for e in cet4 + cet6 if not e["phonetic"])
    empty_mean = sum(1 for e in cet4 + cet6 if not e["meaning"])
    dup4 = len(cet4) - len({e["word"] for e in cet4})
    dup6 = len(cet6) - len({e["word"] for e in cet6})
    print(f"空音标 {empty_phon}, 空释义 {empty_mean}, 重复词 CET4 {dup4} / CET6 {dup6}", file=sys.stderr)

    payload = {"cet4": cet4, "cet6": cet6}
    with open("C:/Users/18572/Desktop/46级复习app/default-words.js", "w", encoding="utf-8") as f:
        f.write("// 默认词库（由词汇 PDF 自动提取，勿手改；如需更新请用 tools/extract_words.py 重新生成）\n")
        f.write("window.DEFAULT_WORDS = ")
        json.dump(payload, f, ensure_ascii=False, indent=1)
        f.write(";\n")
    print("已写出 default-words.js", file=sys.stderr)
