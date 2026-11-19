// Minecraft 主题彩蛋 ②：扫雷 10 关（与挖矿 20 关配对：挖雷给邮箱）
// 顶栏 💣 按钮进入。只在 Minecraft 主题启用。
(function () {
  "use strict";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function isMC() {
    try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); }
    catch (e) { return false; }
  }

  // 独立音效（不依赖 mc-enhance 内部函数）
  var actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} }
    return actx;
  }
  function beep(freq, dur, type, vol, when) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    var t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(vol || 0.045, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    reveal: function () { beep(520 + Math.random() * 120, 0.05, "square", 0.035); },
    flag:   function () { beep(880, 0.06, "square", 0.05); beep(1200, 0.06, "square", 0.04, 0.06); },
    boom:   function () { [180, 120, 80].forEach(function (f, i) { beep(f, 0.24, "sawtooth", 0.09, i * 0.05); }); },
    clear:  function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); },
    win:    function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.15, "square", 0.06, i * 0.11); }); }
  };

  // 10 关：行列、雷数递增
  var LEVELS = [
    { name: "初探雷区 · First Steps",   rows: 6,  cols: 6,  mines: 4,  tip: "6×6 小雷区，只有 4 颗雷。点格子看数字（周围 8 格有几颗雷），右键插旗。" },
    { name: "小径 · Pathfinder",        rows: 7,  cols: 7,  mines: 6,  tip: "数字=周围雷数。先点出大片空白区，再沿边缘推理。" },
    { name: "雷声 · Rumble",            rows: 8,  cols: 8,  mines: 10, tip: "经典初级难度。旗子不够时别乱插，先标记确定的雷。" },
    { name: "交叉路口 · Crossroads",    rows: 8,  cols: 9,  mines: 13, tip: "长方形雷区。出现「1-2-1」边缘法则时，中间那格通常是雷。" },
    { name: "雷阵 · Minefield",         rows: 9,  cols: 9,  mines: 16, tip: "别慌，第一下永远安全（首击自动避开雷）。" },
    { name: "深水雷 · Deep Water",      rows: 9,  cols: 10, mines: 20, tip: "数字相同的一排，比较重叠区域能推出雷的位置。" },
    { name: "迷雾 · Fog",               rows: 10, cols: 10, mines: 24, tip: "角落的 3 一定意味着相邻三格全是雷。" },
    { name: "雷暴 · Thunderstorm",      rows: 10, cols: 11, mines: 29, tip: "先扫边缘，别在中间硬猜。双面插旗是技巧不是运气。" },
    { name: "炼狱 · Inferno",           rows: 11, cols: 12, mines: 35, tip: "高难！记住：雷数固定，插满旗子后其余格可全点开。" },
    { name: "雷神 · Thunder Lord",      rows: 12, cols: 13, mines: 44, tip: "最终雷区。全部翻完非雷格，解锁求职者的邮箱！" }
  ];
  var KEY = "{{SECRET_12gud4k4}}";      // 已通到第几关
  var SEEN = "ms_seen";

  function loadLv() { var n = Number(localStorage.getItem(KEY) || 1); return Math.min(10, Math.max(1, n)); }
  function saveLv(n) { try { localStorage.setItem(KEY, String(Math.min(10, n))); } catch (e) {} }
  function readEmail() {
    try {
      var ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) { var p = JSON.parse(ld.textContent); if (p.email) return p.email; }
    } catch (e) {}
    var a = document.querySelector('a[href^="mailto:"]');
    return a ? a.getAttribute('href').replace('mailto:', '').split('?')[0] : "";
  }

  function injectBtn() {
    if (document.querySelector(".ms-btn")) return;
    var tools = document.querySelector(".nav-tools");
    if (!tools) return;
    var b = el("button", "ms-btn", "\u{1F4A3}");
    b.type = "button";
    b.title = "Easter egg: Minesweeper (10 levels) / 彩蛋：扫雷 10 关";
    b.setAttribute("aria-label", "Easter egg: Minesweeper");
    b.addEventListener("click", open);
    tools.appendChild(b);
  }

  var M = null;

  function open() {
    if (document.getElementById("ms-game")) return;
    var ov = el("div", "mc-game-overlay");
    ov.id = "ms-game";
    var frame = el("div", "mc-game-frame ms-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u{1F4A3}"));
    title.appendChild(el("span", "mc-game-title-txt", "MINESWEEPER · 10 levels / 扫雷闯关"));
    var rst = el("button", "ms-reset", "\u21BB");
    rst.type = "button"; rst.title = "从头开始 / Reset";
    rst.addEventListener("click", function () { saveLv(1); M && M.close(); open(); });
    title.appendChild(rst);
    var x = el("button", "mc-game-close", "\u00D7");
    x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { M && M.close(); });
    title.appendChild(x);

    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var mines = el("span", "mc-game-inv", "Mines / \u96B7: --");
    var timer = el("span", "ms-timer", "\u23F1 0s");
    hud.appendChild(badge); hud.appendChild(mines); hud.appendChild(timer);

    var board = el("div", "ms-board");
    var panel = el("div", "mc-panel");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u5DE6\u952E\u7FFB\u5F00 \u00B7 \u53F3\u952E/\u957F\u6309 \u63D2\u65D7 \u00B7 \u65B0\u624B\u9996\u70B9\u5B89\u5168 \u00B7 ESC \u5173\u95ED"));

    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(board);
    frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame);
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";

    M = {
      ov: ov, frame: frame, board: board, panel: panel,
      badge: badge, minesEl: mines, timerEl: timer,
      lv: loadLv(), grid: null, started: false, over: false,
      flags: 0, revealed: 0, sec: 0, tick: null, firstClick: null
    };
      M.close = function () {
        if (!M) return;
        M.over = true;
        if (M.tick) { clearInterval(M.tick); M.tick = null; }
        if (M.key) document.removeEventListener("keydown", M.key);
        var o = document.getElementById("ms-game"); if (o) o.remove();
        document.body.style.overflow = "";
        M = null;
      };
      M.key = function (e) { if (e.key === "Escape" && M) M.close(); };
      document.addEventListener("keydown", M.key);
    ov.addEventListener("click", function (e) { if (e.target === ov && M) M.close(); });
    M.onKey = function (e) { if (e.key === "Escape" && M) M.close(); };
    showCard(M.lv);
  }

  function showCard(lv) {
    if (!M) return;
    var def = LEVELS[lv - 1];
    M.panel.classList.add("is-show");
    M.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10"));
    card.appendChild(el("div", "mc-lc-name", "\u{1F4A3} " + def.name + " · " + def.rows + "\u00D7" + def.cols + " / " + def.mines + "\u96B7"));
    card.appendChild(el("div", "mc-lc-tip", def.tip));
    var best = Number(localStorage.getItem("ms_best_" + lv)) || 0;
    if (best) card.appendChild(el("div", "mc-lc-stat", "\u{1F3C6} \u672C\u5173\u6700\u4F73 " + best + "s"));
    var start = el("button", "mc-lc-start", "\u{1F4A3} \u5F00\u59CB\u6392\u96B7 \u00B7 START");
    start.type = "button";
    start.addEventListener("click", function () { startLevel(lv); });
    card.appendChild(start);
    M.panel.appendChild(card);
    M.badge.textContent = "Lv " + lv + "/10 \u00B7 " + def.name;
    M.minesEl.textContent = "Mines / \u96B7: " + def.mines;
  }

  function startLevel(lv) {
    if (!M) return;
    var def = LEVELS[lv - 1];
    M.lv = lv; M.started = false; M.over = false; M.flags = 0; M.revealed = 0; M.sec = 0;
    M.grid = [];
    for (var r = 0; r < def.rows; r++) {
      var row = [];
      for (var c = 0; c < def.cols; c++) row.push({ mine: false, n: 0, open: false, flag: false });
      M.grid.push(row);
    }
    M.panel.classList.remove("is-show");
    M.minesEl.textContent = "Mines / \u96B7: " + def.mines;
    M.timerEl.textContent = "\u23F1 0s";
    renderBoard();
  }

  function placeMines(sr, sc) {
    var def = LEVELS[M.lv - 1];
    var spots = [];
    for (var r = 0; r < def.rows; r++) {
      for (var c = 0; c < def.cols; c++) {
        if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue; // 首击 3×3 安全区
        spots.push([r, c]);
      }
    }
    for (var i = spots.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = spots[i]; spots[i] = spots[j]; spots[j] = t;
    }
    for (var k = 0; k < Math.min(def.mines, spots.length); k++) {
      M.grid[spots[k][0]][spots[k][1]].mine = true;
    }
    // 邻雷数
    for (var rr = 0; rr < def.rows; rr++) {
      for (var cc = 0; cc < def.cols; cc++) {
        if (M.grid[rr][cc].mine) continue;
        M.grid[rr][cc].n = neighbors(rr, cc).filter(function (p) { return M.grid[p[0]][p[1]].mine; }).length;
      }
    }
  }

  function neighbors(r, c) {
    var out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < M.grid.length && nc >= 0 && nc < M.grid[0].length) out.push([nr, nc]);
      }
    }
    return out;
  }

  function reveal(r, c) {
    if (!M || M.over) return;
    var cell = M.grid[r][c];
    if (cell.open || cell.flag) return;
    if (!M.started) {
      placeMines(r, c);
      M.started = true;
      M.tick = setInterval(function () { if (M && !M.over) { M.sec++; M.timerEl.textContent = "\u23F1 " + M.sec + "s"; } }, 1000);
    }
    if (cell.mine) { boom(r, c); return; }
    flood(r, c);
    SFX.reveal();
    checkWin();
  }

  function flood(r, c) {
    var stack = [[r, c]];
    while (stack.length) {
      var p = stack.pop(), rr = p[0], cc = p[1];
      var cell = M.grid[rr][cc];
      if (cell.open || cell.flag || cell.mine) continue;
      cell.open = true; M.revealed++;
      if (cell.n === 0) {
        neighbors(rr, cc).forEach(function (q) {
          if (!M.grid[q[0]][q[1]].open && !M.grid[q[0]][q[1]].mine) stack.push(q);
        });
      }
    }
    renderBoard();
  }

  function toggleFlag(r, c) {
    if (!M || M.over) return;
    var cell = M.grid[r][c];
    if (cell.open) return;
    cell.flag = !cell.flag;
    M.flags += cell.flag ? 1 : -1;
    SFX.flag();
    renderBoard();
  }

  function boom(r, c) {
    M.over = true;
    if (M.tick) { clearInterval(M.tick); M.tick = null; }
    M.grid[r][c].open = true;
    SFX.boom();
    fxShake();
    renderBoard();
    M.panel.classList.add("is-show");
    M.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "\u{1F4A5} BOOM! / \u8E29\u96B7\u4E86\uFF01"));
    var retry = el("button", "mc-lc-start", "\u{1F504} \u91CD\u8BD5\u672C\u5173 \u00B7 RETRY");
    retry.type = "button";
    retry.addEventListener("click", function () { startLevel(M.lv); });
    card.appendChild(retry);
    M.panel.appendChild(card);
  }

  function checkWin() {
    var def = LEVELS[M.lv - 1];
    if (M.revealed < def.rows * def.cols - def.mines) return;
    M.over = true;
    if (M.tick) { clearInterval(M.tick); M.tick = null; }
    var prev = Number(localStorage.getItem("ms_best_" + M.lv)) || 0;
    if (!prev || M.sec < prev) { try { localStorage.setItem("ms_best_" + M.lv, String(M.sec)); } catch (e) {} }
    saveLv(M.lv + 1);
    SFX.clear();
    fxConfetti();
    M.panel.classList.add("is-show");
    M.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "LEVEL " + M.lv + " CLEAR! / \u7B2C " + M.lv + " \u5173\u901A\u5173\uFF01"));
    card.appendChild(el("div", "mc-lc-stat", "\u23F1 " + M.sec + "s \u00B7 \u{1F4A3} " + def.mines + "\u96B7\u5168\u907F\u5F00"));
    var b = el("button", "mc-lc-start", M.lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u{1F3C6} \u9886\u53D6\u90AE\u7BB1 \u00B7 REWARD");
    b.type = "button";
    b.addEventListener("click", function () { if (M.lv < 10) showCard(M.lv + 1); else showReward(); });
    card.appendChild(b);
    M.panel.appendChild(card);
  }

  function showReward() {
    var email = readEmail();
    M.panel.textContent = "";
    SFX.win();
    fxConfetti();
    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-icon", "\u2709"));
    card.appendChild(el("div", "mc-ach-title", "MINE MASTER! / \u6392\u96B7\u5927\u5E08\uFF01"));
    card.appendChild(el("div", "mc-ach-desc", "10 \u5173\u5168\u901A \u2014 \u5956\u52B1\uFF1A\u6C42\u804C\u8005\u7684\u90AE\u7BB1 / Your reward: the email"));
    var row = el("div", "mc-win-phone");
    row.appendChild(el("span", "mc-win-num", email || "benson.codeislaw.qzz.io"));
    var cp = el("button", "mc-win-copy", "Copy / \u590D\u5236");
    cp.type = "button";
    cp.addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText(email); cp.textContent = "OK \u2713"; setTimeout(function () { cp.textContent = "Copy / \u590D\u5236"; }, 1600); });
    row.appendChild(cp);
    card.appendChild(row);
    card.appendChild(el("div", "mc-ach-desc mc-win-hint", "\u26CF \u6316\u77FF 20 \u5173=\u7535\u8BDD \u00B7 \u{1F4A3} \u6392\u96B7 10 \u5173=\u90AE\u7BB1 \u2014\u2014 \u73B0\u5B9E\u4E2D\u53D1\u90AE\u4EF6\u66F4\u5FEB :)"));
    var close = el("button", "mc-win-close", "Close / \u5173\u95ED");
    close.type = "button";
    close.addEventListener("click", function () { M && M.close(); });
    card.appendChild(close);
    M.panel.appendChild(card);
  }

  function fxConfetti() {
    var cs = ["#ffff55", "#f0b90b", "#5ea832", "#d946ef", "#4fd8ff"];
    for (var i = 0; i < 20; i++) {
      (function (k) {
        setTimeout(function () {
          var p = el("span", "ms-confetti");
          p.style.left = (Math.random() * 96) + "vw";
          p.style.background = cs[k % cs.length];
          document.body.appendChild(p);
          setTimeout(function () { p.remove(); }, 1700);
        }, k * 45);
      })(i);
    }
  }
  function fxShake() {
    if (!M) return;
    M.frame.classList.remove("is-shake");
    void M.frame.offsetWidth;
    M.frame.classList.add("is-shake");
  }

  function renderBoard() {
    if (!M || !M.grid) return;
    var b = M.board;
    b.textContent = "";
    b.style.gridTemplateColumns = "repeat(" + M.grid[0].length + ", 1fr)";
    var frag = document.createDocumentFragment();
    for (var r = 0; r < M.grid.length; r++) {
      for (var c = 0; c < M.grid[0].length; c++) {
        var cell = M.grid[r][c];
        var d = document.createElement("div");
        d.className = "ms-cell" + (cell.open ? " is-open" : "") + (cell.flag ? " is-flag" : "") + (cell.mine && cell.open ? " is-boom" : "");
        d.dataset.r = String(r); d.dataset.c = String(c);
        if (cell.open && cell.n && !cell.mine) { d.textContent = String(cell.n); d.classList.add("n" + cell.n); }
        if (cell.flag) d.textContent = "\u2691";
        if (cell.mine && cell.open) d.textContent = "\u{1F4A5}";
        (function (rr, cc) {
          d.addEventListener("click", function (e) { reveal(rr, cc); });
          d.addEventListener("contextmenu", function (e) { e.preventDefault(); toggleFlag(rr, cc); });
          // 触屏长按由浏览器原生派发 contextmenu，统一走上面那条路径（不再叠加自定义 timer，避免双插旗）
        })(r, c);
        frag.appendChild(d);
      }
    }
    b.appendChild(frag);
    M.minesEl.textContent = "Mines / \u96B7: " + (LEVELS[M.lv - 1].mines - M.flags);
  }

  // 自动化钩子：仅 ?test=1 时暴露内部状态（正常访问完全不可见）
  if (location.search.indexOf("test=1") >= 0) {
    window.__msTest = {
      state: function () { return M; },
      open: function (r, c) { reveal(r, c); },
      flag: function (r, c) { toggleFlag(r, c); },
      start: function (lv) { startLevel(lv); },
      card: function (lv) { showCard(lv); },
      // 测试用：按真实雷位依次翻开所有安全格（每格都走 reveal 的完整规则链）
      solve: function () {
        if (!M || M.over || !M.grid) return false;
        for (var r = 0; r < M.grid.length; r++) {
          for (var c = 0; c < M.grid[0].length; c++) {
            if (!M.grid[r][c].mine && !M.grid[r][c].open) reveal(r, c);
            if (M.over) return true; // 通关面板已弹出
          }
        }
        return true;
      }
    };
  }

  function init() {
    if (!isMC()) return;
    injectBtn();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
