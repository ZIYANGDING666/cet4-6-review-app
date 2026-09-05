/* app.js — 四六级复习 App 界面胶水层（Apple 浅色风 + 深色开关）
 * 纯本地、无网络、无外部库。依赖 logic.js(AppLogic) / parsers.js(AppParsers) / default-words.js(DEFAULT_WORDS)。
 */
(function () {
  'use strict';
  const L = window.AppLogic;
  const P = window.AppParsers;
  const D = window.DEFAULT_WORDS;
  const THEME_KEY = 'cet46_theme';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const modeName = m => (m === 'cet4' ? '四级' : '六级');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 图标（内联 SVG，仿 SF Symbols） ---------------- */
  const I = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>',
    plan: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M8 3v4M16 3v4M8 13h3M8 17h6"/></svg>',
    study: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2zM13 3l5 14a2 2 0 0 0 2 1V5a2 2 0 0 0-2-2"/></svg>',
    words: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v6M9.5 14h5"/></svg>',
    stats: '<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/></svg>',
    exams: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4M8 13l2 2 4-4"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 2 2 3.5 4 3.5 7a6 6 0 0 1-12 0c0-4 3-6 4-8 .8 1.5 2 2 2 4 1-2 0-4 0-6z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3zM12 10v5M12 17.5v.5"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 3v11M7 10l5 5 5-5M4 20h16"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 21V10M7 14l5-5 5 5M4 4h16"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    cross: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    shrink: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    mistake: '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v4h4M8 13l6-6M8 13l-1 4 4-1"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM17 8a5 5 0 0 1 0 8M19.5 5.5a8 8 0 0 1 0 13"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/></svg>'
  };

  /* ---------------- 音效（Web Audio 实时合成，无外部资源） ---------------- */
  const Sound = (function () {
    let ctx = null, muted = false, suppressUntil = 0;
    function ac() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, gain, when) {
      const c = ac(); if (!c || muted) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain || 0.08, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
    }
    return {
      click() { tone(520, 0.06, 'triangle', 0.05); },
      correct() { tone(660, 0.10, 'sine', 0.09); tone(880, 0.16, 'sine', 0.07, 0.09); },
      wrong() { tone(220, 0.16, 'sawtooth', 0.06); tone(150, 0.24, 'sine', 0.05, 0.07); },
      done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.20, 'sine', 0.08, i * 0.10)); },
      toggle() { muted = !muted; return muted; },
      isMuted() { return muted; },
      suppress() { suppressUntil = performance.now() + 80; },
      can() { return performance.now() >= suppressUntil; }
    };
  })();

  /* ---------------- 自定义圆环光标（JS 跟随，离线稳定） ---------------- */
  const Cursor = (function () {
    let dot = null, ring = null, x = 0, y = 0, rx = 0, ry = 0, on = false;
    function init() {
      if (reduceMotion) return;
      dot = document.createElement('div'); dot.className = 'cursor-dot';
      ring = document.createElement('div'); ring.className = 'cursor-ring';
      document.body.appendChild(ring); document.body.appendChild(dot);
      document.body.classList.add('custom-cursor');
      x = rx = window.innerWidth / 2; y = ry = window.innerHeight / 2;
      on = true;
      window.addEventListener('mousemove', move);
      document.addEventListener('mouseover', over);
      loop();
    }
    function move(e) { x = e.clientX; y = e.clientY; dot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function over(e) {
      const t = e.target.closest && e.target.closest('.btn,.opt,.nav-item,.mod-tile,.seg-btn,[onclick],button,a,select');
      if (ring) ring.classList.toggle('hover', !!t);
    }
    function loop() {
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      if (ring) ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    }
    return { init };
  })();

  /* ---------------- 双语励志名言（随机展示，含署名） ---------------- */
  const QUOTES = [
    { zh: '路虽远，行则将至。', en: 'A journey of a thousand miles begins with a single step.', author: 'Laozi 老子' },
    { zh: '学而不思则罔，思而不学则殆。', en: 'Learning without thought is labor lost; thought without learning is perilous.', author: 'Confucius 孔子' },
    { zh: '千里之行，始于足下。', en: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius 孔子' },
    { zh: '不积跬步，无以至千里。', en: 'A single step cannot reach a thousand miles, but many steps will.', author: 'Xunzi 荀子' },
    { zh: '天行健，君子以自强不息。', en: 'As heaven keeps moving, a wise person never stops striving to be strong.', author: 'I Ching 易经' },
    { zh: '失败是成功之母。', en: 'Failure is the mother of success.', author: 'Chinese proverb' },
    { zh: '世上无难事，只要肯登攀。', en: 'Nothing is hard in this world if you dare to climb the heights.', author: 'Mao Zedong' },
    { zh: '宝剑锋从磨砺出，梅花香自苦寒来。', en: 'Sharp swords are forged through grinding; plum blossoms bloom in cold winters.', author: 'Chinese proverb' },
    { zh: '滴水穿石。', en: 'Constant dripping wears away the stone.', author: 'Chinese proverb' },
    { zh: '熟能生巧。', en: 'Practice makes perfect.', author: 'English proverb' },
    { zh: '知识就是力量。', en: 'Knowledge is power.', author: 'Francis Bacon' },
    { zh: '种一棵树最好的时间是十年前，其次是现在。', en: 'The best time to plant a tree was twenty years ago; the second best is today.', author: 'Chinese proverb' },
    { zh: '心之所向，素履以往。', en: 'Go where your heart leads, even in simple shoes.', author: 'Classic Chinese' },
    { zh: '星光不问赶路人，时光不负有心人。', en: 'The stars do not ask the traveler; time never fails the earnest heart.', author: 'Chinese proverb' },
    { zh: '今日事，今日毕。', en: 'Never leave that till tomorrow which you can do today.', author: 'Benjamin Franklin' }
  ];
  function randomQuote() { return QUOTES[Math.floor(Math.random() * QUOTES.length)]; }
  // 在英文句中高亮当前词库已含的单词（最多 3 个，不同颜色）
  function hlQuote(en, wordSet) {
    const tokens = en.match(/[A-Za-z']+/g) || [];
    const chosen = []; const seen = new Set();
    for (const t of tokens) {
      const lw = t.toLowerCase();
      if (chosen.length >= 3) break;
      if (wordSet.has(lw) && !seen.has(lw)) { seen.add(lw); chosen.push(lw); }
    }
    if (!chosen.length) return esc(en);
    const map = {}; chosen.forEach((w, i) => { map[w] = (i % 3) + 1; });
    const re = new RegExp('\\b(' + chosen.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'gi');
    return en.replace(re, m => '<span class="hl hl' + map[m.toLowerCase()] + '">' + m + '</span>');
  }

  /* ---------------- 状态 ---------------- */
  let S = L.load();
  if (!S) S = L.defaultState();
  if (D && !S.defaultsSeeded) { L.seedDefaults(S, D); S.defaultsSeeded = true; L.save(S); }
  let curView = 'home';

  /* ---------------- 主题 ---------------- */
  let theme = localStorage.getItem(THEME_KEY) || 'light';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t); theme = t;
    const b = $('#themeToggle'); if (b) b.innerHTML = t === 'light' ? I.moon : I.sun;
  }

  /* ---------------- 持久化 ---------------- */
  function save() { L.save(S); }

  /* ---------------- TTS ---------------- */
  let voiceKit = null;
  function speak(text) {
    try {
      if (!('speechSynthesis' in window) || !text) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* noop */ }
  }

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.innerHTML = '<span>' + esc(msg) + '</span>';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------------- 模态框（替代 confirm/alert） ---------------- */
  function confirmModal(opts) {
    return new Promise(resolve => {
      const { title, message, okText, cancelText, danger } = Object.assign(
        { title: '确认', message: '', okText: '确定', cancelText: '取消', danger: false }, opts || {});
      const root = $('#modalRoot');
      root.innerHTML = '<div class="modal-mask"></div><div class="modal-card reveal in">' +
        '<div class="modal-ico ' + (danger ? 'bad' : 'ok') + '">' + (danger ? I.warn : I.check) + '</div>' +
        '<div class="modal-title">' + esc(title) + '</div>' +
        '<div class="modal-msg">' + esc(message) + '</div>' +
        '<div class="modal-actions">' +
        '<button class="btn ghost" data-act="cancel">' + esc(cancelText) + '</button>' +
        '<button class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="ok">' + esc(okText) + '</button>' +
        '</div></div>';
      const close = r => { root.innerHTML = ''; resolve(r); };
      root.querySelector('[data-act="cancel"]').onclick = () => close(false);
      root.querySelector('[data-act="ok"]').onclick = () => close(true);
      root.querySelector('.modal-mask').onclick = () => close(false);
    });
  }

  /* ---------------- 数字滚动 ---------------- */
  function countUp(el, target, dur) {
    if (!el) return;
    dur = dur || 700; target = Number(target) || 0;
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now(); const from = 0;
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (target - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function runCounts(root) {
    $$('.count', root).forEach(el => countUp(el, el.getAttribute('data-to'), 700));
  }

  /* ---------------- 入场动画 ---------------- */
  function revealIn(root) {
    const items = $$('.reveal', root);
    items.forEach((el, i) => {
      if (reduceMotion) { el.classList.add('in'); return; }
      el.style.transitionDelay = (i * 55) + 'ms';
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    });
  }

  /* ---------------- 视图切换 ---------------- */
  function go(v) {
    // 离开背单词时若会话未结束，自动存档快照
    if (curView === 'study' && v !== 'study' && session) {
      S.session = {
        mode: S.mode, idx: session.idx, queue: session.queue,
        done: session.done, learned: session.learned, reviewed: session.reviewed,
        ok: session.ok, total: session.total, target: session.target, answered: session.answered
      };
      save();
    }
    const view = $('#view');
    if (reduceMotion) { render(v); return; }
    view.classList.add('leaving');
    setTimeout(() => { render(v); }, 160);
  }
  function render(v) {
    curView = v;
    const view = $('#view');
    view.classList.remove('leaving');
    const map = { home: renderHome, plan: renderPlan, study: renderStudy, words: renderWords, stats: renderStats, exams: renderExams, mistakes: renderMistakes };
    (map[v] || renderHome)();
    view.classList.add('entering');
    requestAnimationFrame(() => {
      view.classList.remove('entering');
      revealIn(view);
      runCounts(view);
      paintRings();
    });
    updateTop();
    updateNav();
    Particles.setMode(v);
  }

  /* ---------------- 顶栏 / 导航 ---------------- */
  function updateTop() {
    $('#topTitle').textContent = ({ home: '首页总览', plan: '每日计划', study: '背单词', words: '词库', stats: '数据统计', exams: '题库', mistakes: '错题本' })[curView] || '首页总览';
    const m = S.mode;
    const slider = $('#segThumb');
    if (slider) slider.style.transform = 'translateX(' + (m === 'cet4' ? '0' : '100%') + ')';
    const sd = $('#segCet4'), sx = $('#segCet6');
    if (sd) sd.classList.toggle('on', m === 'cet4');
    if (sx) sx.classList.toggle('on', m === 'cet6');
    const st = $('#streak');
    if (st) { st.innerHTML = I.fire + '<b>' + (S.streak || 0) + '</b>'; st.classList.toggle('on', (S.streak || 0) > 0); }
    const dt = $('#dateLabel'); if (dt) dt.textContent = L.todayStr();
  }
  function updateNav() {
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.getAttribute('data-view') === curView));
  }
  function setMode(m) {
    if (m === S.mode) return;
    S.mode = m; save();
    const r = $('#view'); if (r) { r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 320); }
    render(curView);
  }

  /* ---------------- 粒子系统 ---------------- */
  const Particles = (function () {
    const cv = () => $('#fx');
    let ctx, raf = null, mode = 'home', parts = [], confetti = [], dpr = 1, W = 0, H = 0, running = false, mouse = { x: -999, y: -999 };
    function resize() {
      const c = cv(); if (!c) return;
      dpr = window.devicePixelRatio || 1; W = c.clientWidth; H = c.clientHeight;
      c.width = W * dpr; c.height = H * dpr; ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function ambient() {
      parts = [];
      if (reduceMotion) return;
      const n = Math.min(60, Math.floor(W / 18));
      const cols = ['#0a84ff', '#5ac8fa', '#30d5c8', '#7c5cff'];
      for (let i = 0; i < n; i++) parts.push({
        x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.4,
        vy: -(0.05 + Math.random() * 0.22), vx: (Math.random() - 0.5) * 0.18,
        a: 0.08 + Math.random() * 0.26, c: cols[i % cols.length]
      });
      // 几个大光斑
      for (let i = 0; i < 3; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: 60 + Math.random() * 70, vy: -0.04, vx: (Math.random() - 0.5) * 0.06, a: 0.04, c: cols[i % cols.length], glow: true });
    }
    function loop() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      if (mode === 'home') {
        parts.forEach(p => {
          p.y += p.vy; p.x += p.vx;
          if (p.y < -p.r * 2) { p.y = H + p.r; p.x = Math.random() * W; }
          if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
          ctx.fillStyle = p.c; ctx.globalAlpha = p.a; ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
      if (confetti.length) {
        confetti.forEach(p => {
          p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, p.life / p.max);
          ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
        });
        confetti = confetti.filter(p => p.life > 0 && p.y < H + 40);
      }
      if (mode === 'home' || confetti.length) raf = requestAnimationFrame(loop);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }
    function ensure() {
      if (running) return; running = true; resize(); raf = requestAnimationFrame(loop);
    }
    return {
      setMode(m) {
        if (!cv()) return;
        if (m === 'home') { ambient(); ensure(); }
        else { mode = m; if (!confetti.length && raf) { /* keep */ } }
      },
      celebrate() {
        if (reduceMotion || !cv()) return;
        resize();
        const cols = ['#0a84ff', '#5ac8fa', '#30d5c8', '#34c759', '#ff9f0a', '#7c5cff'];
        for (let i = 0; i < 80; i++) confetti.push({
          x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.32,
          vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 7,
          s: 6 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          life: 120 + Math.random() * 40, max: 160, c: cols[i % cols.length]
        });
        mode = 'celebrate'; ensure();
        setTimeout(() => { mode = curView; if (curView !== 'home') { confetti = []; if (raf) { cancelAnimationFrame(raf); running = false; } } }, 2600);
      },
      resize
    };
  })();
  window.addEventListener('resize', () => { Particles.resize(); if (curView === 'home') Particles.setMode('home'); });

  /* ============================================================
   *  视图：首页
   * ========================================================== */
  function renderHome() {
    const h = L.buildHome(S, S.mode);
    const mods = [
      { v: 'study', icon: I.study, t: '背单词', d: '听音辨义，四选一闯关', grad: true, click: 'startStudy()' },
      { v: 'plan', icon: I.plan, t: '每日计划', d: '你定目标，算法排程', grad: false },
      { v: 'words', icon: I.words, t: '词库', d: '上传 / 切换 / 下载词库', grad: false },
      { v: 'stats', icon: I.stats, t: '数据统计', d: '周月背词量与正确率', grad: false },
      { v: 'exams', icon: I.exams, t: '题库', d: '导入真题，判分回看', grad: false },
      { v: 'home', icon: I.home, t: '回到首页', d: '总览今日进度', grad: false }
    ];
    const greet = (function () { const hr = new Date().getHours(); return hr < 6 ? '夜深了' : hr < 12 ? '早安' : hr < 18 ? '午安' : '晚安'; })();
    const modCards = mods.map(m => {
      const click = m.click || ("go('" + m.v + "')");
      return '<button class="mod-tile reveal ' + (m.grad ? 'grad' : '') + '" onclick="' + click + '">' +
        '<span class="mod-ico">' + m.icon + '</span>' +
        '<span class="mod-t">' + m.t + '</span>' +
        '<span class="mod-d">' + m.d + '</span>' +
        '<span class="mod-go">进入 ›</span>' +
        '</button>';
    }).join('');
    const examsRows = (h.recentExams && h.recentExams.length)
      ? h.recentExams.map(e => (
        '<div class="ex-row"><span class="pill ' + (e.accuracy >= 60 ? 'ok' : 'warn') + '">' + e.accuracy + '%</span>' +
        '<span class="ex-name">' + esc(e.name) + '</span></div>')).join('')
      : '<div class="empty-sm">还没有做过的题，去题库来一套。</div>';

    const wordSet = new Set(S.words[S.mode].map(w => String(w.word || '').toLowerCase()));
    const q = randomQuote();
    const qEn = hlQuote(q.en, wordSet);
    $('#view').innerHTML =
      '<section class="hero reveal">' +
        '<div class="eyebrow">本地离线 · ' + modeName(S.mode) + ' · ' + L.todayStr() + '</div>' +
        '<h1 class="display quote-zh">' + esc(q.zh) + '</h1>' +
        '<p class="sub-lg quote-en">' + qEn + '<span class="quote-by"> — ' + esc(q.author) + '</span></p>' +
      '</section>' +
      '<section class="metrics">' +
        metric('今日新词', h.todayNew, '词', false) +
        metric('待复习', h.todayReview, '词', false) +
        metric('已掌握', h.mastered, '词', false) +
        metric('连续打卡', h.streak, '天', true) +
      '</section>' +
      '<section class="mod-grid reveal">' + modCards + '</section>' +
      '<section class="home-below">' +
        '<div class="card reveal lib-card"><div class="eyebrow">词库概况</div>' +
          '<div class="big-num count" data-to="' + h.total + '">0</div>' +
          '<div class="big-sub">总词数（' + modeName(S.mode) + '）</div>' +
          '<div class="pill-row">' +
            '<span class="pill">' + h.unseen + ' 未学</span>' +
            '<span class="pill">' + h.due + ' 待复习</span>' +
          '</div>' +
        '</div>' +
        '<div class="card reveal exam-card"><div class="eyebrow">最近考试</div>' + examsRows + '</div>' +
      '</section>';
  }
  function metric(label, val, unit, ok) {
    return '<div class="card metric reveal"><div class="eyebrow">' + label + '</div>' +
      '<div class="stat"><span class="count" data-to="' + val + '">0</span><span class="unit">' + unit + '</span></div>' +
      '<div class="metric-bar"><i class="' + (ok ? 'ok' : '') + '"></i></div></div>';
  }

  /* ============================================================
   *  视图：每日计划
   * ========================================================== */
  function renderPlan() {
    const cap = S.settings.dailyNew || 20;
    const news = Math.min(cap, L.unseenCount(S, S.mode));
    const revs = L.dueCount(S, S.mode);
    $('#view').innerHTML =
      '<div class="center-wrap">' +
      '<section class="reveal"><div class="eyebrow">每日计划</div>' +
        '<h1 class="h1">你定目标，算法排程。</h1>' +
        '<p class="sub-lg">基于遗忘曲线，每天该背多少、复习哪些，交给排程算。</p></section>' +
      '<section class="card reveal plan-card">' +
        '<div class="eyebrow">每日新词上限</div>' +
        '<div class="stepper">' +
          '<button class="step-btn" onclick="stepNew(-1)">−</button>' +
          '<input id="dailyNew" class="step-val" type="number" min="1" max="200" value="' + cap + '" onchange="commitNew()">' +
          '<button class="step-btn" onclick="stepNew(1)">+</button>' +
        '</div>' +
        '<div class="sub-sm">范围 1–200，保存后立即生效。</div>' +
        '<button class="btn primary save-ok" id="saveNew" onclick="commitNew()">保存设置</button>' +
      '</section>' +
      '<section class="plan-stats">' +
        ring('今日新词', news, cap) +
        ring('今日待复习', revs, Math.max(revs, 1)) +
      '</section>' +
      '<button class="btn primary big-cta reveal" onclick="startStudy()">开始今日学习</button>' +
      '</div>';
  }
  window.stepNew = function (d) {
    const el = $('#dailyNew'); let v = Math.max(1, Math.min(200, (parseInt(el.value, 10) || 1) + d));
    el.value = v; commitNew(true);
  };
  window.commitNew = function (silent) {
    const el = $('#dailyNew'); let v = Math.max(1, Math.min(200, parseInt(el.value, 10) || 1));
    el.value = v; S.settings.dailyNew = v; save();
    const b = $('#saveNew'); if (b && !silent) { b.textContent = '已保存 ✓'; setTimeout(() => b.textContent = '保存设置', 1200); }
  };

  function ring(label, val, max) {
    const pct = Math.max(0, Math.min(1, max ? val / max : 0));
    const r = 52, c = 2 * Math.PI * r, off = c * (1 - pct);
    return '<div class="card reveal ring-card"><div class="eyebrow">' + label + '</div>' +
      '<div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#30d5c8"/></linearGradient></defs>' +
      '<circle cx="60" cy="60" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="60" cy="60" r="' + r + '" class="ring-fg" stroke="url(#rg)" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" style="transition:stroke-dashoffset .8s var(--ease-apple)" data-off="' + off + '"/>' +
      '</svg><div class="ring-num"><b class="count" data-to="' + val + '">0</b><span>/ ' + max + '</span></div></div></div>';
  }
  function paintRings() { $$('.ring-fg').forEach(c => { c.style.strokeDashoffset = c.getAttribute('data-off'); }); }

  /* ============================================================
   *  视图：背单词（自动发音 + 0/x 计数）
   * ========================================================== */
  let session = null;

  function canResume() {
    const snap = S.session;
    if (!snap || snap.mode !== S.mode || !snap.queue || !snap.queue.length) return false;
    return snap.idx < snap.queue.length;
  }
  function resumeSession() {
    const snap = S.session;
    session = {
      queue: snap.queue, idx: snap.idx, done: snap.done || 0, learned: snap.learned || 0,
      reviewed: snap.reviewed || 0, ok: snap.ok || 0, total: snap.total || snap.queue.length,
      target: snap.target || (S.settings.dailyNew || snap.queue.length), answered: snap.answered || 0
    };
    S.session = null; save();
  }
  function invalidateSession() {
    S.session = null;
    if (session) session = null;
  }
  function buildSession() {
    let q = L.buildQueue(S, S.mode);
    if (!q.length && D) {
      const lib = L.activeWordLib(S, S.mode);
      if (lib && !lib.words.length) { L.seedDefaults(S, D, { mode: S.mode }); save(); q = L.buildQueue(S, S.mode); }
    }
    if (!q.length) return false;
    session = { queue: q, idx: 0, done: 0, learned: 0, reviewed: 0, ok: 0, total: q.length, target: S.settings.dailyNew || q.length, answered: 0 };
    return true;
  }
  // 由指定 id 列表新建会话（错题本/错题重做）
  function makeSession(ids, kind) {
    if (!ids || !ids.length) return false;
    session = { queue: ids.map(id => ({ id: id, type: kind })), idx: 0, done: 0, learned: 0, reviewed: 0, ok: 0, total: ids.length, target: ids.length, answered: 0 };
    return true;
  }

  function startStudy() {
    // 显式“开始今日学习”：丢弃旧快照，新建会话
    S.session = null; session = null; save();
    if (!buildSession()) { toast('当前没有可背的新词，去词库导入或下载默认词库'); return; }
    go('study');
  }
  window.startStudy = startStudy;

  // 错题本：按错词顺序纠错
  window.startMistakeFix = function () {
    const ids = L.listMistakes(S, S.mode).map(m => m.id);
    S.session = null; session = null; save();
    if (!makeSession(ids, 'mistake')) { toast('错题本是空的，去背单词吧'); return; }
    go('study');
  };
  // 错题重做：从历史错本随机抽 N 个（基础100，错题不足取全部，每多背1000词+50）
  window.startRetry = function () {
    const ids = L.pickRetry(S, S.mode);
    S.session = null; session = null; save();
    if (!ids.length) { toast('还没有错题，先去背单词'); return; }
    if (!makeSession(ids, 'mistake')) { toast('错题本是空的'); return; }
    go('study');
  };

  /* ---------------- 全屏 ---------------- */
  function syncFs() {
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('fs', fs);
    const b = $('#fsBtn'); if (b) b.innerHTML = fs ? I.shrink : I.expand;
  }
  window.toggleFullscreen = function () {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  };

  function renderStudy() {
    if (!session) {
      if (canResume()) resumeSession();
      else if (!buildSession()) {
        $('#view').innerHTML = '<div class="center-wrap"><h1 class="h1 reveal">暂无可背单词</h1><p class="sub-lg reveal">去词库导入或下载默认词库后再来。</p><button class="btn primary big-cta reveal" onclick="go(\'words\')">前往词库</button></div>';
        revealIn($('#view')); runCounts($('#view')); return;
      }
    }
    if (session.idx >= session.queue.length) { return finishStudy(); }
    const item = session.queue[session.idx];
    const w = L.findWord(S, S.mode, item.id);
    if (!w) { session.idx++; return renderStudy(); }
    const pool = S.words[S.mode].filter(x => x.id !== w.id).map(x => x.meaning);
    const opts = L.buildOptions(w.meaning, pool);
    const total = session.queue.length;
    const prog = total ? (session.done / total) * 100 : 0;
    const target = session.target;
    const shown = Math.min(session.done, target);

    $('#view').innerHTML =
      '<div class="center-wrap study-wrap">' +
      '<div class="study-head reveal">' +
        '<div class="eyebrow">' + (item.type === 'new' ? '新词' : '错题') + '</div>' +
        '<div class="study-count"><span class="count-now" id="cntNow">' + shown + '</span><span class="count-sep">/</span><span class="count-target" id="cntTarget">' + target + '</span></div>' +
        '<div class="progress"><i style="width:' + prog + '%"></i></div>' +
      '</div>' +
      '<div class="card word-card reveal" id="wordCard">' +
        '<div class="word-top"><button class="btn-icon" id="fsBtn" onclick="toggleFullscreen()" title="进入全屏">' + I.expand + '</button><button class="btn-icon" id="speakBtn" onclick="speakWord()">' + I.play + '</button></div>' +
        '<div class="word-main" id="wordMain">' + esc(w.word) + '</div>' +
        '<div class="word-phon">' + (w.phonetic ? esc(w.phonetic) : '点击 🔊 听发音') + '</div>' +
        '<div class="word-mean" id="wordMean" style="opacity:.0">' + esc(w.meaning) + '</div>' +
      '</div>' +
      '<div class="opts-grid reveal" id="optsGrid">' +
        opts.map((o, i) => '<button class="opt" data-i="' + i + '" data-m="' + esc(o) + '" onclick="chooseOpt(this)">' + esc(o) + '</button>').join('') +
      '</div>' +
      '</div>';
    // 自动发音
    speak(w.word);
    // 单词轻微入场
    if (!reduceMotion) { const wc = $('#wordCard'); wc.style.transform = 'scale(.96)'; requestAnimationFrame(() => wc.style.transform = ''); }
    revealIn($('#view')); runCounts($('#view'));
  }

  window.speakWord = function () {
    const wm = $('#wordMain'); if (wm) speak(wm.textContent);
    const wb = $('#speakBtn'); if (wb && !reduceMotion) { wb.classList.add('pulse'); setTimeout(() => wb.classList.remove('pulse'), 500); }
  };

  function markOpt(btn, type) {
    const svg = type === 'check' ? I.check : I.cross;
    btn.insertAdjacentHTML('afterbegin', '<span class="opt-mark ' + type + '">' + svg + '</span>');
  }
  window.chooseOpt = function (btn) {
    if (btn.disabled) return;
    const item = session.queue[session.idx];
    const w = L.findWord(S, S.mode, item.id);
    const chosen = btn.getAttribute('data-m');
    const correct = (chosen === w.meaning);
    // 禁用全部
    $$('#optsGrid .opt').forEach(b => { b.disabled = true; });
    const correctBtn = $$('#optsGrid .opt').find(b => b.getAttribute('data-m') === w.meaning);
    if (correct) {
      if (correctBtn) { correctBtn.classList.add('right'); markOpt(correctBtn, 'check'); }
      if (!reduceMotion) { btn.style.transform = 'scale(1.02)'; setTimeout(() => btn.style.transform = '', 180); }
    } else {
      btn.classList.add('wrong'); markOpt(btn, 'cross');
      if (correctBtn) { correctBtn.classList.add('right'); markOpt(correctBtn, 'check'); }
      if (!reduceMotion) { const g = $('#optsGrid'); g.classList.add('shake'); setTimeout(() => g.classList.remove('shake'), 320); }
    }
    // 记录 SRS + 错题本
    L.srsUpdate(w, correct);
    if (correct) L.removeMistake(S, S.mode, w.id); else L.recordMistake(S, S.mode, w.id);
    session.answered++; session.done++;
    if (item.type === 'new') session.learned++; else session.reviewed++;
    if (correct) session.ok++;
    // 音效（遮盖全局 click 音，避免叠音）
    if (correct) Sound.correct(); else Sound.wrong();
    Sound.suppress();
    // 更新计数（滚动）
    const tEl = $('#cntNow'); if (tEl) countUp(tEl, Math.min(session.done, session.target), 400);
    // 显示释义
    const wm = $('#wordMean'); if (wm) { wm.style.opacity = '1'; }
    save();
    // 下一题按钮（最后一题则结束并退出）
    const wrap = $('.study-wrap');
    const last = (session.idx + 1 >= session.queue.length);
    const next = document.createElement('button');
    next.className = 'btn primary big-cta reveal in';
    next.textContent = last ? '完成并退出' : '下一个 ›';
    next.onclick = () => { if (last) { finishStudy(); } else { session.idx++; renderStudy(); } };
    wrap.appendChild(next);
  };

  function finishStudy() {
    const learned = session.learned, reviewed = session.reviewed, ok = session.ok, total = session.total;
    const acc = total ? Math.round((ok / total) * 100) : 0;
    L.finishSession(S, S.mode, learned, reviewed, ok, total);
    S.session = null; session = null; save();
    Sound.done();
    Particles.celebrate();
    go('home');
    taskDoneModal(acc);
  }
  // 任务完成弹框：本次任务已完成，两个选项
  function taskDoneModal(acc) {
    const root = $('#modalRoot');
    root.innerHTML =
      '<div class="modal-mask"></div>' +
      '<div class="modal-card reveal in">' +
        '<div class="modal-ico ok">' + I.check + '</div>' +
        '<div class="modal-title">本次任务已完成</div>' +
        '<div class="modal-msg">正确率 ' + acc + '%。坚持就是胜利，今天的目标达成。</div>' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" data-act="rest">好的，休息一下</button>' +
          '<button class="btn primary" data-act="challenge">挑战自己，修改目标</button>' +
        '</div>' +
      '</div>';
    const close = () => { root.innerHTML = ''; };
    root.querySelector('[data-act="rest"]').onclick = close;
    root.querySelector('[data-act="challenge"]').onclick = () => { close(); go('plan'); };
  }
  function doneStat(label, val) {
    return '<div class="card"><div class="eyebrow">' + label + '</div><div class="stat"><span class="count" data-to="' + (isNaN(val) ? 0 : parseInt(val, 10)) + '">0</span><span class="unit">' + (String(val).indexOf('%') >= 0 ? '' : '词') + '</span></div></div>';
  }

  /* ============================================================
   *  视图：词库（多库切换 + docx/xlsx/pdf）
   * ========================================================== */
  function libSelectHtml(kind) {
    const libs = kind === 'word' ? L.listWordLibs(S, S.mode) : L.listExamLibs(S, S.mode);
    const active = kind === 'word' ? L.activeWordLib(S, S.mode) : L.activeExamLib(S, S.mode);
    return '<div class="lib-bar">' +
      '<span class="lib-label">当前' + (kind === 'word' ? '词库' : '题库') + '：</span>' +
      '<select id="libSel" class="select" onchange="switchLib(\'' + kind + '\')">' +
      libs.map(l => '<option value="' + l.id + '"' + (l === active ? ' selected' : '') + '>' + esc(l.name) + '（' + (kind === 'word' ? l.words.length : l.sets.length) + '）</option>').join('') +
      '</select>' +
      '<button class="btn ghost sm" onclick="delLib(\'' + kind + '\')">删除此库</button>' +
      '</div>';
  }
  window.switchLib = function (kind) {
    const id = $('#libSel').value;
    if (kind === 'word') { invalidateSession(); L.switchWordLib(S, S.mode, id); }
    else L.switchExamLib(S, S.mode, id);
    save(); render(kind === 'word' ? 'words' : 'exams');
    toast('已切换' + (kind === 'word' ? '词库' : '题库'));
  };
  window.delLib = async function (kind) {
    const libs = kind === 'word' ? L.listWordLibs(S, S.mode) : L.listExamLibs(S, S.mode);
    if (libs.length <= 1) { toast('至少保留一个' + (kind === 'word' ? '词库' : '题库')); return; }
    const ok = await confirmModal({ title: '删除该' + (kind === 'word' ? '词库' : '题库'), message: '删除后不可恢复，学习进度一并清除。', okText: '删除', danger: true });
    if (!ok) return;
    const id = $('#libSel').value;
    if (kind === 'word') { invalidateSession(); L.removeWordLib(S, S.mode, id); }
    else L.removeExamLib(S, S.mode, id);
    save(); render(kind === 'word' ? 'words' : 'exams');
    toast('已删除');
  };

  function renderWords() {
    const list = S.words[S.mode];
    const html =
      '<div class="view-head reveal"><div class="eyebrow">词库 · ' + modeName(S.mode) + '</div>' +
        '<h1 class="h1">上传、切换、随时开背。</h1></div>' +
      libSelectHtml('word') +
      '<section class="card reveal drop-zone">' +
        '<div class="eyebrow">上传词库</div>' +
        '<div class="drop-inner">' + I.upload +
          '<div class="drop-main">拖入或选择文件开始</div>' +
          '<div class="sub-sm">支持 Word / Excel / PDF（也可 CSV）· 列：单词, 音标, 释义</div></div>' +
        '<div class="row">' +
          '<button class="btn secondary" onclick="$(\'#wf\').click()">上传词库文件</button>' +
          '<button class="btn ghost" onclick="downloadDefaultWords()">下载默认词库</button>' +
          '<input type="file" id="wf" accept=".docx,.xlsx,.pdf,.csv" style="display:none" onchange="importWordFile(this)">' +
        '</div>' +
      '</section>' +
      '<section class="card reveal">' +
        '<div class="row between"><b>共 ' + list.length + ' 词</b>' +
          '<span class="pill-row"><span class="pill">' + L.unseenCount(S, S.mode) + ' 未学</span>' +
          '<span class="pill">' + L.dueCount(S, S.mode) + ' 待复习</span>' +
          '<span class="pill ok">' + L.masteredCount(S, S.mode) + ' 掌握</span></span></div>' +
        (list.length ? '<div class="table-wrap"><table><thead><tr><th>单词</th><th>音标</th><th>释义</th><th>掌握度</th><th>下次复习</th></tr></thead><tbody>' +
          list.slice(0, 200).map(w => '<tr><td class="w-word">' + esc(w.word) + '</td><td class="w-phon">' + esc(w.phonetic || '') + '</td><td class="w-mean">' + esc(w.meaning) + '</td><td><span class="pill l' + w.box + '">L' + w.box + '</span></td><td class="w-date">' + (w.next ? new Date(w.next).toISOString().slice(0, 10) : '—') + '</td></tr>').join('') +
          '</tbody></table></div>' : '<div class="empty-sm">还没有词，上传一份或用上面的按钮载入内置词库。</div>') +
      '</section>' +
      '<section class="card danger-zone reveal">' +
        '<div class="eyebrow">危险操作</div>' +
        '<div class="row between"><span class="sub-sm">清空当前（' + modeName(S.mode) + '）词库的全部单词与进度。</span>' +
          '<button class="btn danger" onclick="clearWords()">清空当前词库</button></div>' +
      '</section>';
    $('#view').innerHTML = html;
  }

  window.downloadDefaultWords = function () {
    if (!D) { toast('未找到内置默认词库'); return; }
    const rows = D[S.mode] || [];
    const csv = 'word,phonetic,meaning\n' + rows.map(r => [r.word, r.phonetic || '', r.meaning].map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    download('默认词库_' + modeName(S.mode) + '.csv', csv);
    toast('已下载默认词库 CSV');
  };

  window.importWordFile = async function (input) {
    const f = input.files && input.files[0]; if (!f) return;
    toast('解析中…');
    try {
      const rows = await P.parseWordFile(f);
      if (!rows.length) { toast('未解析到单词，检查文件格式'); return; }
      invalidateSession();
      L.addWordLib(S, S.mode, f.name.replace(/\.[^.]+$/, ''), rows, true);
      save(); renderWords();
      toast('已导入 ' + rows.length + ' 词并切换为当前库');
    } catch (e) { toast('解析失败：' + e.message); }
    input.value = '';
  };

  window.clearWords = async function () {
    const m = S.mode;
    if (!S.words[m].length) { toast('当前词库已经是空的'); return; }
    const ok = await confirmModal({ title: '清空当前词库', message: '将删除 ' + S.words[m].length + ' 个单词及进度，不可撤销。', okText: '清空', danger: true });
    if (!ok) return;
    invalidateSession(); L.clearMode(S, m); save(); renderWords();
    toast('已清空' + modeName(m) + '词库');
  };

  /* ============================================================
   *  视图：错题本
   * ========================================================== */
  function renderMistakes() {
    const ms = L.listMistakes(S, S.mode);
    const quota = L.retryQuota(S);
    const list = ms.map(m => {
      const w = L.findWord(S, S.mode, m.id);
      if (!w) return '';
      return '<div class="mistake-row">' +
        '<div class="mw"><b>' + esc(w.word) + '</b>' + (w.phonetic ? ' <span class="mphon">' + esc(w.phonetic) + '</span>' : '') +
          '<span class="mmean">' + esc(w.meaning) + '</span></div>' +
        '<span class="pill bad">' + (m.count || 1) + ' 次错</span></div>';
    }).join('');
    const html =
      '<div class="view-head reveal"><div class="eyebrow">错题本 · ' + modeName(S.mode) + '</div>' +
        '<h1 class="h1">把错过的词，逐个拿下。</h1></div>' +
      '<section class="card reveal">' +
        '<div class="row between"><b>共 ' + ms.length + ' 个错题</b>' +
          '<span class="sub-sm">错题重做每次抽 <b>' + Math.min(quota, ms.length || 1) + '</b> 个（每多背 1000 词 +50）</span></div>' +
        '<div class="row" style="margin-top:14px">' +
          '<button class="btn primary" onclick="startMistakeFix()">开始纠错（按错序）</button>' +
          '<button class="btn secondary" onclick="startRetry()"' + (ms.length ? '' : ' disabled') + '>错题重做（随机 ' + Math.min(quota, ms.length) + ' 个）</button>' +
        '</div>' +
      '</section>' +
      (ms.length ? '<section class="card reveal"><div class="table-wrap"><div class="mistake-list">' + list + '</div></div></section>' :
        '<section class="card reveal"><div class="empty-sm">还没有错题。背单词时答错的词会自动进这里。</div></section>') +
      (ms.length ? '<section class="card danger-zone reveal"><div class="row between"><span class="sub-sm">清空当前（' + modeName(S.mode) + '）错题本。</span>' +
        '<button class="btn danger" onclick="clearMistakes()">清空错题本</button></div></section>' : '');
    $('#view').innerHTML = html;
  }
  window.clearMistakes = async function () {
    const n = L.mistakeCount(S, S.mode);
    if (!n) { toast('错题本已经是空的'); return; }
    const ok = await confirmModal({ title: '清空错题本', message: '将删除 ' + n + ' 个错题记录，不可撤销。', okText: '清空', danger: true });
    if (!ok) return;
    S.mistakes[S.mode] = []; save(); renderMistakes();
    toast('已清空错题本');
  };

  /* ============================================================
   *  视图：数据统计
   * ========================================================== */
  function renderStats() {
    const cum = L.cumulative(S, S.mode);
    const w7 = L.aggregateStats(S, S.mode, 7);
    const w30 = L.aggregateStats(S, S.mode, 30);
    $('#view').innerHTML =
      '<div class="view-head reveal"><div class="eyebrow">数据统计 · ' + modeName(S.mode) + '</div>' +
        '<h1 class="h1">看得见的点滴积累。</h1></div>' +
      '<section class="metrics">' +
        metric('累计新学', cum.totalNews, '词', false) +
        metric('累计复习', cum.totalReviews, '次', false) +
        metric('已掌握', cum.mastered, '词', true) +
        metric('连续打卡', S.streak, '天', true) +
      '</section>' +
      '<section class="card reveal"><div class="eyebrow">近 7 天</div><div class="chart">' + L.barChart(w7) + '</div></section>' +
      '<section class="card reveal"><div class="eyebrow">近 30 天</div><div class="chart">' + L.barChart(w30) + '</div></section>';
  }

  /* ============================================================
   *  视图：题库（与词库同构）
   * ========================================================== */
  let examSession = null;
  function renderExams() {
    const sets = S.exams[S.mode];
    const html =
      '<div class="view-head reveal"><div class="eyebrow">题库 · ' + modeName(S.mode) + '</div>' +
        '<h1 class="h1">导入真题，判分回看。</h1></div>' +
      libSelectHtml('exam') +
      '<section class="card reveal drop-zone">' +
        '<div class="eyebrow">上传题库</div>' +
        '<div class="drop-inner">' + I.upload +
          '<div class="drop-main">拖入或选择文件开始</div>' +
          '<div class="sub-sm">支持 Word / Excel / PDF（也可 CSV）· 列：题干, A, B, C, D, 答案, 解析</div></div>' +
        '<div class="row">' +
          '<button class="btn secondary" onclick="$(\'#ef\').click()">上传题库文件</button>' +
          '<button class="btn ghost" onclick="downloadCurrentExams()">下载当前题库</button>' +
          '<input type="file" id="ef" accept=".docx,.xlsx,.pdf,.csv" style="display:none" onchange="importExamFile(this)">' +
        '</div>' +
      '</section>' +
      '<section class="card reveal"><div class="eyebrow">套题列表</div>' +
        (sets.length ? '<div class="set-list">' + sets.map(s => examRow(s)).join('') + '</div>' : '<div class="empty-sm">还没有套题，上传一份试试。</div>') +
      '</section>';
    $('#view').innerHTML = html;
  }
  function examRow(s) {
    const done = !!s.result;
    return '<div class="set-row' + (done ? ' done' : '') + '">' +
      '<div class="set-info"><b>' + esc(s.name) + '</b><span class="sub-sm">' + s.questions.length + ' 题</span>' +
      (done ? '<span class="pill ok">' + s.result.accuracy + '%</span>' : '<span class="pill">未做</span>') + '</div>' +
      '<div class="row">' +
        '<button class="btn primary sm" onclick="startExam(\'' + s.id + '\')">开始</button>' +
        (done ? '<button class="btn ghost sm" onclick="reviewExam(\'' + s.id + '\')">回看</button>' : '') +
      '</div></div>';
  }
  window.downloadCurrentExams = function () {
    const sets = S.exams[S.mode];
    let csv = 'name,stem,A,B,C,D,answer,explanation\n';
    sets.forEach(s => s.questions.forEach(q => {
      csv += [s.name, q.stem].concat(q.opts, ['ABCD'[q.answer], q.explanation || '']).map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',') + '\n';
    }));
    if (!sets.length) { toast('当前题库为空'); return; }
    download('当前题库_' + modeName(S.mode) + '.csv', csv);
    toast('已下载当前题库 CSV');
  };
  window.importExamFile = async function (input) {
    const f = input.files && input.files[0]; if (!f) return;
    toast('解析中…');
    try {
      const qs = await P.parseExamFile(f);
      if (!qs.length) { toast('未解析到题目，检查格式'); return; }
      L.addExamLib(S, S.mode, f.name.replace(/\.[^.]+$/, ''), [{ id: L.uid(), name: f.name.replace(/\.[^.]+$/, ''), questions: qs, result: null }], true);
      save(); renderExams();
      toast('已导入 ' + qs.length + ' 题并切换为当前题库');
    } catch (e) { toast('解析失败：' + e.message); }
    input.value = '';
  };

  window.startExam = function (id) {
    const set = S.exams[S.mode].find(s => s.id === id); if (!set) return;
    examSession = { set, idx: 0, sel: {}, ref: {} };
    renderExamQ();
  };
  function renderExamQ() {
    const { set, idx, sel } = examSession;
    if (idx >= set.questions.length) return submitExam();
    const q = set.questions[idx];
    const total = set.questions.length;
    $('#view').innerHTML =
      '<div class="center-wrap exam-wrap">' +
      '<div class="study-head reveal"><div class="eyebrow">第 ' + (idx + 1) + ' / ' + total + ' 题</div>' +
        '<div class="progress"><i style="width:' + ((idx / total) * 100) + '%"></i></div></div>' +
      '<div class="card reveal exam-q"><div class="exam-stem">' + esc(q.stem) + '</div>' +
        '<div class="opts-col">' + q.opts.map((o, i) =>
          '<button class="opt col" data-i="' + i + '" onclick="chooseExam(this)">' + esc(o) + '</button>').join('') + '</div></div>' +
      '<div class="exam-foot reveal"><button class="btn primary" onclick="examNext()">' + (idx + 1 >= total ? '交卷' : '下一题 ›') + '</button></div>' +
      '</div>';
    if (sel[idx] != null) { const b = $$('.opt.col')[sel[idx]]; if (b) b.classList.add('picked'); }
  }
  window.chooseExam = function (btn) {
    const i = parseInt(btn.getAttribute('data-i'), 10);
    examSession.sel[examSession.idx] = i;
    $$('.opt.col').forEach(b => b.classList.remove('picked'));
    btn.classList.add('picked');
  };
  window.examNext = function () {
    if (examSession.sel[examSession.idx] == null) { toast('先选一个答案'); return; }
    examSession.idx++; renderExamQ();
  };
  function submitExam() {
    const { set, sel, ref } = examSession;
    const selections = set.questions.map((_, i) => sel[i] != null ? sel[i] : -1);
    L.recordExamResult(set, selections, ref);
    save();
    const r = set.result;
    const acc = r.accuracy;
    $('#view').innerHTML =
      '<div class="center-wrap done-wrap">' +
      '<div class="eyebrow reveal">交卷完成</div><h1 class="display reveal">' + r.score + ' / ' + r.total + '</h1>' +
      '<div class="ring-card solo reveal"><svg class="ring" viewBox="0 0 120 120">' +
        '<circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" stroke="url(#rg2)" stroke-dasharray="' + (2 * Math.PI * 52) + '" stroke-dashoffset="' + (2 * Math.PI * 52) + '" data-off="' + (2 * Math.PI * 52 * (1 - acc / 100)) + '"/></svg>' +
        '<div class="ring-num"><b>' + acc + '%</b></div></div>' +
      '<section class="card reveal"><div class="eyebrow">逐题回顾 · 点开写做后感</div>' +
        set.questions.map((q, i) => {
          const right = sel[i] === q.answer;
          return '<div class="rev-item ' + (right ? 'r' : 'w') + '"><div class="rev-q">' + esc(q.stem) + '</div>' +
            '<div class="rev-a">你的：' + (sel[i] != null ? esc(q.opts[sel[i]]) : '—') + ' · 正确：' + esc(q.opts[q.answer]) + '</div>' +
            '<textarea class="refl" placeholder="这题的易错点…" onchange="saveRefl(\'' + set.id + '\',' + i + ',this.value)">' + esc((ref[i] || '')) + '</textarea></div>';
        }).join('') +
      '</section>' +
      '<button class="btn primary big-cta reveal" onclick="go(\'exams\')">返回题库</button></div>';
    revealIn($('#view')); runCounts($('#view')); requestAnimationFrame(paintRings);
  }
  window.saveRefl = function (sid, i, v) {
    const set = S.exams[S.mode].find(s => s.id === sid); if (!set || !set.result) return;
    set.result.reflections = set.result.reflections || {};
    set.result.reflections[i] = v; save();
  };
  window.reviewExam = function (id) {
    const set = S.exams[S.mode].find(s => s.id === id); if (!set) return;
    examSession = { set, idx: 0, sel: {}, ref: (set.result && set.result.reflections) || {} };
    // 回看：直接展示结果页
    const r = set.result; const acc = r.accuracy;
    $('#view').innerHTML =
      '<div class="center-wrap done-wrap"><div class="eyebrow reveal">回看</div><h1 class="display reveal">' + r.score + ' / ' + r.total + '</h1>' +
      '<div class="ring-card solo reveal"><div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120"><defs><linearGradient id="rg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#30d5c8"/></linearGradient></defs><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" stroke="url(#rg2)" stroke-dasharray="' + (2 * Math.PI * 52) + '" stroke-dashoffset="' + (2 * Math.PI * 52) + '" data-off="' + (2 * Math.PI * 52 * (1 - acc / 100)) + '"/></svg><div class="ring-num"><b>' + acc + '%</b></div></div></div>' +
      '<section class="card reveal"><div class="eyebrow">逐题回顾</div>' +
      set.questions.map((q, i) => { const right = (r && (r.reflections)); return '<div class="rev-item"><div class="rev-q">' + esc(q.stem) + '</div><div class="rev-a">正确：' + esc(q.opts[q.answer]) + '</div><textarea class="refl" placeholder="这题的易错点…" onchange="saveRefl(\'' + set.id + '\',' + i + ',this.value)">' + esc((r.reflections && r.reflections[i]) || '') + '</textarea></div>'; }).join('') +
      '</section><button class="btn primary big-cta reveal" onclick="go(\'exams\')">返回题库</button></div>';
    revealIn($('#view')); runCounts($('#view')); requestAnimationFrame(paintRings);
  };

  /* ============================================================
   *  工具：下载 / 备份
   * ========================================================== */
  function download(name, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  window.exportBackup = function () { download('cet46-backup-' + L.todayStr() + '.json', L.serializeBackup(S)); toast('已导出备份'); };
  window.importBackup = async function (input) {
    const f = input.files && input.files[0]; if (!f) return;
    const txt = await f.text();
    try {
      const st = L.deserializeBackup(txt);
      const ok = await confirmModal({ title: '导入备份', message: '将覆盖当前所有数据（词库/进度/题库）。', okText: '覆盖导入', danger: true });
      if (!ok) return;
      S = st; save(); render(curView);
      toast('已导入备份');
    } catch (e) { toast('备份文件无效'); }
    input.value = '';
  };

  /* ---------------- 初始化 ---------------- */
  function buildShell() {
    document.getElementById('app').innerHTML =
      '<aside class="sidebar">' +
        '<div class="brand"><span class="brand-mark">' + I.study + '</span><div><div class="brand-name">46级复习</div><div class="brand-cap">本地离线 · 数据存本机</div></div></div>' +
        '<nav class="nav">' +
          navItem('home', I.home, '首页总览') + navItem('plan', I.plan, '每日计划') +
          navItem('study', I.study, '背单词') + navItem('mistakes', I.mistake, '错题本') +
          navItem('words', I.words, '词库') +
          navItem('stats', I.stats, '数据统计') + navItem('exams', I.exams, '题库') +
        '</nav>' +
        '<div class="side-foot">v1 · 无联网</div>' +
      '</aside>' +
      '<div class="main">' +
        '<header class="topbar">' +
          '<div class="top-left"><span id="topTitle">首页总览</span></div>' +
          '<div class="seg" id="seg"><span class="seg-thumb" id="segThumb"></span>' +
            '<button class="seg-btn" id="segCet4" onclick="setMode(\'cet4\')">四级</button>' +
            '<button class="seg-btn" id="segCet6" onclick="setMode(\'cet6\')">六级</button></div>' +
          '<div class="top-right">' +
            '<span class="streak" id="streak"></span>' +
            '<span class="date-label" id="dateLabel"></span>' +
            '<button class="btn-icon" id="soundToggle" onclick="toggleSound()" title="音效开关"></button>' +
            '<button class="btn-icon" id="themeToggle" onclick="toggleTheme()" title="切换深浅色"></button>' +
          '</div>' +
        '</header>' +
        '<main class="content"><div id="view"></div></main>' +
      '</div>' +
      '<canvas id="fx"></canvas>' +
      '<div id="toast"></div><div id="modalRoot"></div>';
  }
  function navItem(v, svg, label) {
    return '<button class="nav-item" data-view="' + v + '" onclick="go(\'' + v + '\')"><span class="nav-ico">' + svg + '</span><span>' + label + '</span></button>';
  }
  window.toggleTheme = function () { applyTheme(theme === 'light' ? 'dark' : 'light'); };
  window.toggleSound = function () {
    const muted = Sound.toggle();
    const b = $('#soundToggle'); if (b) b.innerHTML = muted ? I.mute : I.sound;
    toast(muted ? '音效已关闭' : '音效已开启');
  };
  function syncSoundBtn() { const b = $('#soundToggle'); if (b) b.innerHTML = Sound.isMuted() ? I.mute : I.sound; }
  window.go = go;
  window.setMode = setMode;
  window.render = render;

  // 备份恢复入口（顶栏/侧栏可再加，这里挂到词库页危险区下方）
  function mountBackup() { /* 备份按钮在词库页 danger 区之后追加 */ }

  /* ---------------- 点击水波纹 ---------------- */
  function attachRipple() {
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('.btn, .opt, .nav-item, .mod-tile');
      if (!t || reduceMotion) return;
      const r = t.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      t.appendChild(span);
      setTimeout(() => span.remove(), 600);
    }, true);
  }
  // 点击音效：与答对/答错音互斥（chooseOpt 内已 suppress）
  function attachSound() {
    document.addEventListener('click', e => {
      if (!Sound.can()) return;
      const t = e.target.closest && e.target.closest('.btn, .opt, .nav-item, .mod-tile, .seg-btn, [onclick], button, a');
      if (t) Sound.click();
    });
  }

  // 启动
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  buildShell();
  applyTheme(theme);
  syncSoundBtn();
  Particles.resize();
  render('home');
  attachRipple();
  attachSound();
  Cursor.init();
})();
