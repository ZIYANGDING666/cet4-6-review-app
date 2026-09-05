# 开发计划 · 英语四六级复习 App v1

> 依据：`PRD.md`（v1，2026-09-03 确认）
> 起点：同目录 `index.html` 原型（已实现导航 / 词库导入 / 背单词 / 统计 / 题库的简版逻辑，可作为基础深化）
> 目标产物：可双击打开、完全离线、数据持久、满足 PRD §8（必须完成）+ §10（验收标准）的 v1

---

## 0. 执行原则

1. **单文件优先**：保持 `index.html` 内联 CSS + 原生 JS，双击即开，不引任何 CDN/外部库。
2. **所有写操作都 `save()` 且 `try/catch` 包裹**，失败降级为内存态不报错。
3. **每完成一个阶段，立刻跑一遍对应验收标准（AC）**，不过夜。
4. **不引入框架/构建工具**；图表用纯 SVG 字符串注入。
5. 以原型为基础"深化补全"，不推倒重来。

---

## 1. 阶段划分与任务清单

### 阶段 1 · 地基：结构 / 状态 / 导航 / 模式隔离
- [ ] 确认骨架：左侧 6 项导航 + 顶部 `modeSeg`（四级/六级）+ `#view` 容器。
- [ ] 状态层 `defaultState()` 含全字段：`mode, settings.dailyNew, streak, lastStudy, words{cet4,cet6}, stats{cet4,cet6}, exams{cet4,cet6}`。
- [ ] `load()`/`save()` 用 `try/catch`；首次无数据回退 `defaultState()`。
- [ ] 路由 `go(v)` + 导航点击绑定 + 模式切换后刷新当前视图（验证隔离）。
- [ ] 顶部显示日期与连击天数。
- **完成判据**：打开页面控制台无报错；切换四/六级各视图数据互不串（AC2）。

### 阶段 2 · 词库导入（背单词原料）
- [ ] `dlWordTpl()`：模板列 `word,phonetic,meaning`，导出带 BOM 防中文乱码。
- [ ] `parseCSV()`：健壮处理引号包裹、字段内逗号。
- [ ] `importWords()`：跳过表头行、去空行、`push` 带 `id` 且 `box=0`；`toast` 显示导入条数；`renderWords()` 列表含 单词/音标/释义/掌握度/下次复习。
- **完成判据**：AC3（下载模板→填≥10 词→导入→列表正确、未学数增加）。

### 阶段 3 · 每日计划 + SRS 排程
- [ ] 定义 `INTERVALS=[0,1,3,7,16]`；`dueCount(mode)`、`unseenCount(mode)`。
- [ ] 每日新词上限输入与保存（`saveDaily()`）。
- [ ] `buildQueue()`：新词取 `box===0` 至多 `dailyNew` 条；复习取 `next<=今日结束` 且 `box>0` 条。
- [ ] 计划页展示"今日新词 / 今日待复习"与"开始今日学习"按钮。
- **完成判据**：AC4（上限=N 时新词≤N；待复习=到期词数）。

### 阶段 4 · 背单词闯关
- [ ] `renderStudy()` 词卡渲染 + `speak()` 英文 TTS（`SpeechSynthesisUtterance`, `lang='en-US'`，`try/catch`）。
- [ ] 四选一生成：正确释义 + 同级别已导入词随机 3 个错误释义，`shuffle`。
- [ ] `answer()`：即时高亮（对=绿/错=红并显示正确项）；更新 `correct/wrong`；SRS 升/降级；算 `next`；`save`。
- [ ] 进度条 + 会话结束 `finishSession()`：写当日 `stats{date,news,reviews}`、打卡逻辑（lastStudy==今天不动；==昨天+1；否则=1）、结算页（新学/复习/正确率）。
- **完成判据**：AC5、AC6、AC11（部分）、AC7（部分）。

### 阶段 5 · 首页总览
- [ ] 4 卡聚合：今日新背=`min(dailyNew,unseen)`；今日复习=`dueCount`；连击；掌握=`box>=3` 计数。
- [ ] 快捷按钮跳转（开始学习 / 导入词库 / 做一套题）。
- [ ] 词库概况卡 + 最近考试卡（最近 3 套已做套题名称与正确率）。
- **完成判据**：AC11（首页聚合与底层数据一致）。

### 阶段 6 · 数据统计
- [ ] `lastNDates(30)` + 按日期聚合 `stats`。
- [ ] `barChart()` 纯 SVG：近 7 天 / 近 30 天，新词 vs 复习双色柱 + 轴标签 + 图例。
- [ ] 累计指标（累计学习/复习/掌握）+ 考试均正确率。
- **完成判据**：AC8（图表与累计数值正确）。

### 阶段 7 · 题库
- [ ] `dlExamTpl()`：列 `stem,optionA,optionB,optionC,optionD,answer,explanation`。
- [ ] `importExams()`：`answer` 归一 A–D→0–3；`push` 套题（含 `name` 来自输入框）。
- [ ] 列表：套名 / 题数 / 状态 / 正确率 / 操作（开始 / 查看）。
- [ ] `startExam()` 逐题单选；`submitExam()` 判分→写 `result{date,score,total,accuracy,reflections}`；每题揭示对错 + 做后感 `textarea` 自动存。
- [ ] `viewResult()` 回看（题、答案、解析、做后感）。
- **完成判据**：AC9（导入→作答→判分→做后感→回看 全闭环）。

### 阶段 8 · 备份与恢复（PRD §7 必须项，原型尚未实现）
- [ ] 在「词库导入」页底部新增"数据备份与恢复"卡片。
- [ ] `exportBackup()`：下载 `cet46-backup-YYYYMMDD.json`（整体 `S` 序列化）。
- [ ] `importBackup()`：file input → **确认弹窗** → 覆盖 `S` → `save()` → 全视图重渲染。
- **完成判据**：AC10（导出→清空 localStorage→导入→数据完整恢复）。

### 阶段 9 · 收尾与全量验收
- [ ] 离线校验：DevTools → Network 无任何外部请求（AC1）。
- [ ] 持久化：关闭并重新打开浏览器，词/进度/统计/考试结果均在（AC7）。
- [ ] 全量走查 11 条 AC（见 §3）。
- [ ] 边界：空词库进背单词有引导提示；空题库有提示；模式切换后各视图正确重载。
- [ ] 代码整理：删除原型硬编码示例、统一命名与注释。

---

## 2. 关键实现要点（速查）

| 项目 | 取值 / 写法 |
|---|---|
| 存储键 | `localStorage['cet46_proto_v1']` |
| 状态结构 | `{mode, settings:{dailyNew}, streak, lastStudy, words:{cet4:[],cet6:[]}, stats:{cet4:[],cet6:[]}, exams:{cet4:[],cet6:[]}}` |
| 单词对象 | `{id, word, phonetic, meaning, box, next, reviews, correct, wrong}`（`box` 0=未学，1–5=SRS 级） |
| SRS 更新 | 答对 `box=min(5,box+1)`；答错 `box=1`；`next=now + INTERVALS[box-1]*86400000` |
| 间隔天数 | `INTERVALS=[0,1,3,7,16]` |
| 打卡 | `lastStudy==今天`→不变；`==昨天`→`streak+1`；否则 `streak=1` |
| 发音 | `new SpeechSynthesisUtterance(text)`，`lang='en-US'`，按钮点击触发 |
| 图表 | 纯 SVG 字符串拼接注入，无外部库 |
| 干扰项 | 同级别 `words` 中随机取 3 个不同释义 |
| CSV 导入 | 带 BOM 的 UTF-8；首行表头跳过；字段去空 |

---

## 3. 验收对照表（AC → 阶段）

| AC | 内容 | 对应阶段 |
|---|---|---|
| AC1 | 双击打开、无任何外部网络请求 | 阶段 9 |
| AC2 | 四/六级数据完全隔离 | 阶段 1 |
| AC3 | 词库模板下载 + 导入正确 | 阶段 2 |
| AC4 | 每日上限与待复习队列正确 | 阶段 3 |
| AC5 | 背单词发音 + 四选一判对错 | 阶段 4 |
| AC6 | SRS 升降级 + 会话结算 + 统计写入 | 阶段 4 |
| AC7 | 刷新/关闭/重启数据不丢 | 阶段 9 |
| AC8 | 周/月图表与累计指标正确 | 阶段 6 |
| AC9 | 题库导入→判分→做后感→回看 | 阶段 7 |
| AC10 | 导出/导入 JSON 备份恢复 | 阶段 8 |
| AC11 | 首页聚合与底层数据一致 | 阶段 5 |

---

## 4. 风险与备注

- **localStorage 容量**：约 5MB，普通词库（数千词）+ 考试记录足够；若超大，PRD 已留口可升级 IndexedDB + 一行本地服务命令（v1 不做）。
- **`file://` 限制**：部分浏览器在 `file://` 下对 `localStorage` 支持不稳，建议用 **Chrome / Edge 双击打开**；如遇异常，提供 `python -m http.server` 本地一行命令兜底。
- **Web Speech API**：仅 Chrome/Edge 稳定，Safari/Firefox 可能无音；已用 `try/catch` 保证不崩，v1 不做音频文件兜底（PRD §9）。
- **SRS 深度**：v1 用简化 Leitner 5 级，非完整 SM-2（PRD §9 明确）。

---

## 5. 建议执行节奏

- 按阶段 1→9 顺序推进（阶段 2/3/4 有依赖：无词库则背单词无法跑）。
- 每完成一个阶段，跑对应 AC 后再进入下一阶段；若用 git，每阶段一次提交。
- 阶段 8（备份恢复）虽靠后，但因是 PRD 必须项，不可省略。
- 全部阶段完成后，统一走查 §3 全部 11 条 AC 作为发布门槛。
