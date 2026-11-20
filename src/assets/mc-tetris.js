// Minecraft 主题彩蛋③：俄罗斯方块 10 关（清行晋级；通关解锁邮箱）
// 顶栏 🟦 按钮进入。只在 Minecraft 主题启用。自包含。
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }
  var actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return actx; }
  function beep(f, d, type, v, when) { try { if (localStorage.getItem("mc_sound") === "0") return; } catch (e) {} var c = ac(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.value = f; var t = c.currentTime + (when || 0); g.gain.setValueAtTime(v || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
  var SFX = {
    tap: function () { beep(400 + Math.random() * 100, 0.04, "square", 0.03); },
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.09, "square", 0.05, i * 0.07); }); },
    win: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.14, "square", 0.06, i * 0.1); }); },
    tick: function () { beep(900, 0.03, "square", 0.025); }
  };

  var LV = [
    { name: "热身 · Warm-up",    lines: 2, speed: 900 },
    { name: "起步 · Startup",    lines: 3, speed: 820 },
    { name: "稳手 · Steady",     lines: 3, speed: 740 },
    { name: "节奏 · Rhythm",     lines: 4, speed: 660 },
    { name: "加速 · Accelerate", lines: 4, speed: 580 },
    { name: "飞快 · Swift",      lines: 5, speed: 500 },
    { name: "疾风 · Gale",       lines: 5, speed: 420 },
    { name: "闪电 · Lightning",  lines: 6, speed: 340 },
    { name: "光速 · Lightspeed", lines: 6, speed: 260 },
    { name: "极限 · Ultimate",   lines: 8, speed: 180 }
  ];
  var SH = {
    I: [[1,1,1,1]], O: [[1,1],[1,1]], T: [[1,1,1],[0,1,0]],
    S: [[0,1,1],[1,1,0]], Z: [[1,1,0],[0,1,1]], J: [[1,0,0],[1,1,1]], L: [[0,0,1],[1,1,1]]
  };
  var CO = { I:"#4fd8ff", O:"#ffff55", T:"#d946ef", S:"#5ea832", Z:"#ff7043", J:"#5b8cff", L:"#ffa940" };
  var KEY = "{{SECRET_741qvxs8}}";
  function loadLv() { var n = Number(localStorage.getItem(KEY) || 1); return Math.min(10, Math.max(1, n)); }
  function saveLv(n) { try { localStorage.setItem(KEY, String(Math.min(10, n))); } catch (e) {} }
  function readEmail() {
    try { var ld = document.querySelector('script[type="application/ld+json"]'); if (ld) { var p = JSON.parse(ld.textContent); if (p.email) return p.email; } } catch (e) {}
    var a = document.querySelector('a[href^="mailto:"]'); return a ? a.getAttribute('href').replace('mailto:', '').split('?')[0] : "";
  }
  function injectBtn() {
    if (document.querySelector(".tt-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "tt-btn", "\u25A6"); b.type = "button";
    b.title = "Easter egg: Tetris (10 levels) / 彩蛋：俄罗斯方块 10 关";
    b.setAttribute("aria-label", "Easter egg: Tetris");
    b.addEventListener("click", open); tools.appendChild(b);
  }
  var A = null;
  function open() {
    if (document.getElementById("tt-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "tt-game";
    var frame = el("div", "mc-game-frame tt-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u25A6"));
    title.appendChild(el("span", "mc-game-title-txt", "TETRIS · 10 关 / 俄罗斯方块"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { A && A.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var lines = el("span", "mc-game-inv", "Lines / \u884C: --");
    var score = el("span", "ms-timer", "Score / \u5206: 0");
    hud.appendChild(badge); hud.appendChild(lines); hud.appendChild(score);
    var row = el("div", "tt-playrow");
    var board = el("div", "tt-board");
    var side = el("div", "tt-side");
    side.appendChild(el("div", "mc-lc-sub", "Next / \u4E0B\u4E00\u4E2A"));
    var next = el("div", "tt-next"); side.appendChild(next);
    var pad = el("div", "tt-pad");
    [["\u2190",-1],["\u21BB",9],["\u2193",8],["\u2192",1],["\u23E9",0]].forEach(function (d) {
      var b = el("button", "mc-tet-padbtn" === "" ? "" : "ms-cell", d[0]); // 复用样式类
      b.className = "tt-padbtn"; b.type = "button"; b.dataset.a = String(d[1]);
      b.addEventListener("click", function () { padAct(d[1]); }); pad.appendChild(b);
    });
    side.appendChild(pad); row.appendChild(board); row.appendChild(side);
    var panel = el("div", "mc-panel");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u2190\u2192 \u79FB\u52A8 \u00B7 \u2191 \u65CB\u8F6C \u00B7 \u2193 \u8F6F\u964D \u00B7 \u7A7A\u683C \u786C\u964D \u00B7 ESC \u5173\u95ED"));
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(row); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";
    A = { ov: ov, frame: frame, board: board, panel: panel, badge: badge, linesEl: lines, scoreEl: score, nextBox: next,
      g: null, cur: null, next: null, lv: loadLv(), lines: 0, score: 0, over: false, timer: null, key: null };
    A.close = function () { if (!A) return; A.over = true; if (A.timer) { clearInterval(A.timer); A.timer = null; } if (A.key) document.removeEventListener("keydown", A.key); var o = document.getElementById("tt-game"); if (o) o.remove(); document.body.style.overflow = ""; A = null; };
    ov.addEventListener("click", function (e) { if (e.target === ov && A) A.close(); });
    A.key = function (e) {
      if (!A || A.over) return;
      if (A.panel.classList.contains("is-show")) { if (e.key === "Escape") A.close(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); mv(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); mv(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); rot(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); step(true); }
      else if (e.key === " ") { e.preventDefault(); hard(); }
      else if (e.key === "Escape") A.close();
    };
    document.addEventListener("keydown", A.key);
    showCard(A.lv);
  }
  function padAct(a) {
    if (!A || A.over || A.panel.classList.contains("is-show")) return;
    if (a === -1) mv(-1); else if (a === 1) mv(1); else if (a === 9) rot();
    else if (a === 8) step(true); else if (a === 0) hard();
  }
  function showCard(lv) {
    if (!A) return;
    var d = LV[lv - 1];
    A.panel.classList.add("is-show"); A.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10"));
    card.appendChild(el("div", "mc-lc-name", "\u25A6 " + d.name + " \u00B7 " + d.speed + "ms"));
    card.appendChild(el("div", "mc-lc-tip", "\u76EE\u6807\uFF1A\u6D88\u9664 " + d.lines + " \u884C\u8FC7\u5173\u3002\u2190\u2192 \u79FB\u52A8\uFF0C\u2191 \u65CB\u8F6C\uFF0C\u2193 \u8F6F\u964D\uFF0C\u7A7A\u683C\u786C\u964D\u3002"));
    var best = Number(localStorage.getItem("tt_best_" + lv)) || 0;
    if (best) card.appendChild(el("div", "mc-lc-stat", "\u{1F3C6} \u6700\u4F73 " + best + "\u5206"));
    var b = el("button", "mc-lc-start", "\u25A6 START"); b.type = "button";
    b.addEventListener("click", function () { start(lv); }); card.appendChild(b);
    A.panel.appendChild(card);
    A.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
    A.linesEl.textContent = "Lines / \u884C: 0/" + d.lines;
    A.scoreEl.textContent = "Score / \u5206: 0";
  }
  function rand() { var k = Object.keys(SH); return k[Math.floor(Math.random() * k.length)]; }
  function copy(m) { return m.map(function (r) { return r.slice(); }); }
  function hit(m, r, c) {
    for (var i = 0; i < m.length; i++) for (var j = 0; j < m[i].length; j++) {
      if (!m[i][j]) continue;
      var nr = r + i, nc = c + j;
      if (nc < 0 || nc >= 10 || nr >= 20) return true;
      if (nr >= 0 && A.g[nr][nc]) return true;
    }
    return false;
  }
  function spawn() {
    var k = A.next || rand(); // 当前方块用已显示的预览（否则 Next 提示永远不兑现）
    A.cur = { k: k, m: copy(SH[k]), r: 0, c: Math.floor((10 - SH[k][0].length) / 2) };
    A.next = rand();
    if (hit(A.cur.m, A.cur.r, A.cur.c)) over();
    render();
  }
  function start(lv) {
    if (!A) return;
    A.lv = lv; A.lines = 0; A.score = 0; A.over = false;
    A.g = []; for (var r = 0; r < 20; r++) A.g.push(new Array(10).fill(0));
    A.panel.classList.remove("is-show");
    A.linesEl.textContent = "Lines / \u884C: 0/" + LV[lv - 1].lines;
    A.scoreEl.textContent = "Score / \u5206: 0";
    spawn();
    if (A.timer) clearInterval(A.timer);
    A.timer = setInterval(function () { if (A && !A.over && !A.panel.classList.contains("is-show")) step(false); }, LV[lv - 1].speed);
    render();
  }
  function mv(d) { if (!A || !A.cur || A.over || A.locking) return; if (!hit(A.cur.m, A.cur.r, A.cur.c + d)) { A.cur.c += d; render(); } }
  function rot() {
    if (!A || !A.cur || A.over || A.locking) return;
    var m = A.cur.m, rm = [];
    for (var j = 0; j < m[0].length; j++) { rm.push([]); for (var i = m.length - 1; i >= 0; i--) rm[j].push(m[i][j]); }
    var offs = [0,-1,1,-2,2];
    for (var k = 0; k < offs.length; k++) if (!hit(rm, A.cur.r, A.cur.c + offs[k])) { A.cur.m = rm; A.cur.c += offs[k]; SFX.tick(); render(); return; }
  }
  function step(soft) {
    if (!A || !A.cur || A.over || A.locking) return;
    if (!hit(A.cur.m, A.cur.r + 1, A.cur.c)) { A.cur.r++; if (soft) A.score += 1; render(); }
    else lock();
  }
  function hard() { if (!A || !A.cur || A.over || A.locking) return; var n = 0; while (!hit(A.cur.m, A.cur.r + 1, A.cur.c)) { A.cur.r++; n++; } A.score += n * 2; lock(); }
  function lock() {
    if (!A || !A.cur || A.locking) return;
    var m = A.cur.m, r = A.cur.r, c = A.cur.c, k = A.cur.k;
    A.cur = null; // 立即锁定：清行动画窗口内输入自然失效（防重入 lock）
    A.locking = true;
    for (var i = 0; i < m.length; i++) for (var j = 0; j < m[i].length; j++) if (m[i][j] && r + i >= 0) A.g[r + i][c + j] = k;
    SFX.tap();
    var full = [];
    for (var rr = 0; rr < 20; rr++) if (A.g[rr].every(function (v) { return v; })) full.push(rr);
    if (full.length) {
      A.score += [0,100,300,500,800][Math.min(full.length,4)] * A.lv;
      full.forEach(function (fr) { for (var cc = 0; cc < 10; cc++) A.g[fr][cc] = "CLEAR"; });
      render(); SFX.clear();
      var self = full.slice();
      var snapshot = A; // 捕获本局实例：窗口内关闭再重开时旧回调不污染新局
      setTimeout(function () {
        if (A !== snapshot || !A || A.over) return;
        A.locking = false;
        self.sort(function (a,b) { return a-b; }).forEach(function (fr) { A.g.splice(fr,1); A.g.unshift(new Array(10).fill(0)); });
        A.lines += self.length;
        A.linesEl.textContent = "Lines / \u884C: " + A.lines + "/" + LV[A.lv - 1].lines;
        A.scoreEl.textContent = "Score / \u5206: " + A.score;
        if (A.lines >= LV[A.lv - 1].lines) { clearlv(); return; }
        spawn();
      }, 130);
    } else { A.locking = false; A.scoreEl.textContent = "Score / \u5206: " + A.score; spawn(); }
  }
  function over() {
    if (!A) return; A.over = true;
    if (A.timer) { clearInterval(A.timer); A.timer = null; }
    A.panel.classList.add("is-show"); A.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "GAME OVER / \u5806\u5230\u9876\u4E86"));
    var b = el("button", "mc-lc-start", "\u{1F504} RETRY"); b.type = "button";
    b.addEventListener("click", function () { start(A.lv); }); card.appendChild(b);
    A.panel.appendChild(card);
  }
  function clearlv() {
    if (!A) return; A.over = true;
    if (A.timer) { clearInterval(A.timer); A.timer = null; }
    var lv = A.lv, sc = A.score;
    var prev = Number(localStorage.getItem("tt_best_" + lv)) || 0;
    if (sc > prev) { try { localStorage.setItem("tt_best_" + lv, String(sc)); } catch (e) {} }
    saveLv(lv + 1);
    SFX.clear(); confetti();
    A.panel.classList.add("is-show"); A.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "LEVEL " + lv + " CLEAR!"));
    card.appendChild(el("div", "mc-lc-stat", "\u{1F3AF} " + sc + "\u5206 \u00B7 " + (sc > prev ? "\u{1F389}NEW RECORD" : "BEST " + prev)));
    var b = el("button", "mc-lc-start", lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u{1F3C6} REWARD");
    b.type = "button";
    b.addEventListener("click", function () { if (lv < 10) showCard(lv + 1); else reward(); });
    card.appendChild(b); A.panel.appendChild(card);
  }
  function reward() {
    var email = readEmail();
    SFX.win(); confetti();
    A.panel.textContent = "";
    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-icon", "\u2709"));
    card.appendChild(el("div", "mc-ach-title", "TETRIS MASTER! / \u65B9\u5757\u5927\u5E08"));
    card.appendChild(el("div", "mc-ach-desc", "10 \u5173\u5168\u901A \u2014 \u5956\u52B1\uFF1A\u6C42\u804C\u8005\u90AE\u7BB1"));
    var row = el("div", "mc-win-phone");
    row.appendChild(el("span", "mc-win-num", email || "benson.codeislaw.qzz.io"));
    var cp = el("button", "mc-win-copy", "Copy / \u590D\u5236"); cp.type = "button";
    cp.addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText(email); cp.textContent = "OK \u2713"; setTimeout(function () { cp.textContent = "Copy / \u590D\u5236"; }, 1600); });
    row.appendChild(cp); card.appendChild(row);
    card.appendChild(el("div", "mc-ach-desc mc-win-hint", "\u26CF \u6316\u77FF 20 \u5173=\u7535\u8BDD \u00B7 \u25A6 \u65B9\u5757 10 \u5173=\u90AE\u7BB1"));
    var c = el("button", "mc-win-close", "Close / \u5173\u95ED"); c.type = "button";
    c.addEventListener("click", function () { A && A.close(); }); card.appendChild(c);
    A.panel.appendChild(card);
  }
  function confetti() {
    var cs = ["#ffff55","#f0b90b","#5ea832","#d946ef","#4fd8ff"];
    for (var i = 0; i < 20; i++) (function (k) { setTimeout(function () { var p = el("span", "ms-confetti"); p.style.left = (Math.random()*96)+"vw"; p.style.background = cs[k%cs.length]; document.body.appendChild(p); setTimeout(function () { p.remove(); }, 1700); }, k*45); })(i);
  }
  function render() {
    if (!A) return;
    var b = A.board; b.textContent = "";
    var f = document.createDocumentFragment();
    for (var r = 0; r < 20; r++) for (var c = 0; c < 10; c++) {
      var d = document.createElement("div"); d.className = "tt-cell";
      var v = A.g[r][c];
      if (v === "CLEAR") d.classList.add("is-clear");
      else if (v) { d.classList.add("on"); d.style.background = CO[v] || "#888"; }
      f.appendChild(d);
    }
    if (A.cur) for (var i = 0; i < A.cur.m.length; i++) for (var j = 0; j < A.cur.m[i].length; j++) {
      if (!A.cur.m[i][j]) continue;
      var rr = A.cur.r + i, cc = A.cur.c + j;
      if (rr < 0 || rr >= 20 || cc < 0 || cc >= 10) continue;
      var cd = f.children[rr*10+cc];
      if (cd) { cd.classList.add("on", "cur"); cd.style.background = CO[A.cur.k]; }
    }
    b.appendChild(f);
    A.nextBox.textContent = "";
    var nm = SH[A.next];
    for (var pr = 0; pr < 4; pr++) for (var pc = 0; pc < 4; pc++) {
      var pd = el("div", "tt-cell");
      if (nm[pr] && nm[pr][pc]) { pd.classList.add("on"); pd.style.background = CO[A.next]; }
      A.nextBox.appendChild(pd);
    }
  }
  if (location.search.indexOf("test=1") >= 0) {
    window.__ttTest = {
      state: function () { return A; },
      hard: function () { hard(); },
      move: function (d) { mv(d); },
      rot: function () { rot(); },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      // 测试用：直接构造已清除行并触发过关判定（走真实 clearlv 奖励链）
      solve: function () {
        if (!A || A.over) return false;
        A.lines = LV[A.lv - 1].lines;
        A.score += 1000 * A.lv;
        if (A.timer) { clearInterval(A.timer); A.timer = null; }
        clearlv();
        return true;
      }
    };
  }
  function init() { if (isMC()) injectBtn(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
