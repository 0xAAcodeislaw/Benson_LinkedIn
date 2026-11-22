// Minecraft 主题彩蛋⑨：两人跳棋（西洋跳棋 Checkers）10 关 —— 红方=你执下，黑方=本地 AI（手机/电脑算力零联网）
// 规则：斜走一格/隔子跳吃/有吃必吃/吃后连跳/到底升王（可前后走跳）/吃光或困死对方胜
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }

  var N = 8;
  var LV = [
    { name: "\u65B0\u624B \u00B7 Beginner",    depth: 0, jitter: 400 },
    { name: "\u5165\u95E8 \u00B7 Novice",      depth: 0, jitter: 200 },
    { name: "\u4E2D\u7EA7 \u00B7 Casual",      depth: 1, jitter: 150 },
    { name: "\u8FDB\u9636 \u00B7 Improver",    depth: 1, jitter: 100 },
    { name: "\u9AD8\u624B \u00B7 Advanced",    depth: 2, jitter: 80 },
    { name: "\u5F3A\u624B \u00B7 Strong",      depth: 2, jitter: 40 },
    { name: "\u5927\u5E08 \u00B7 Expert",      depth: 3, jitter: 20 },
    { name: "\u5B97\u5E08 \u00B7 Master",      depth: 3, jitter: 0 },
    { name: "\u9AD8\u5E08 \u00B7 Grandmaster", depth: 4, jitter: 0 },
    { name: "\u4F20\u5947 \u00B7 Legend",      depth: 4, jitter: 0 }
  ];
  var KEY = "{{SECRET_ck7p2m9q}}";
  function loadLv() { var n = Number(localStorage.getItem(KEY) || 1); return Math.min(10, Math.max(1, n)); }
  function saveLv(n) { try { localStorage.setItem(KEY, String(Math.min(10, n))); } catch (e) {} }
  function confetti() {
    var cs = ["#ffff55", "#f0b90b", "#5ea832", "#d946ef", "#4fd8ff"];
    for (var i = 0; i < 22; i++) (function (k) {
      setTimeout(function () {
        var p = el("span", "ms-confetti"); p.style.left = (Math.random() * 96) + "vw"; p.style.background = cs[k % cs.length];
        document.body.appendChild(p); setTimeout(function () { p.remove(); }, 1700);
      }, k * 45);
    })(i);
  }
  var actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return actx; }
  function beep(f, d, type, v) { try { if (localStorage.getItem("mc_sound") === "0") return; } catch (e) {} var c = ac(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.value = f; var t = c.currentTime; g.gain.setValueAtTime(v || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
  var SFX = { move: function () { beep(420, 0.04, "square", 0.03); }, cap: function () { beep(220, 0.08, "square", 0.05); }, king: function () { beep(660, 0.12, "square", 0.05); beep(880, 0.12, "square", 0.05, 0.1); }, win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); } };

  function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function dark(r, c) { return (r + c) % 2 === 1; }
  function initBoard() {
    var b = [];
    for (var r = 0; r < N; r++) { var row = []; for (var c = 0; c < N; c++) row.push(null); b.push(row); }
    for (var r2 = 0; r2 < 3; r2++) for (var c2 = 0; c2 < N; c2++) if (dark(r2, c2)) b[r2][c2] = { red: false, k: false }; // 黑上
    for (var r3 = 5; r3 < N; r3++) for (var c3 = 0; c3 < N; c3++) if (dark(r3, c3)) b[r3][c3] = { red: true, k: false }; // 红下
    return b;
  }

  // 单跳（跳吃）与单步走法；dir：普通子只向前，王双向
  function pieceDirs(p, red) {
    if (p.k) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return red ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }
  function jumpsFrom(b, r, c) {
    var p = b[r][c], out = [];
    if (!p) return out;
    pieceDirs(p, p.red).forEach(function (d) {
      var mr = r + d[0], mc = c + d[1], tr = r + 2 * d[0], tc = c + 2 * d[1];
      if (!inB(tr, tc)) return;
      var mid = b[mr][mc];
      if (mid && mid.red !== p.red && !b[tr][tc]) out.push({ fr: [r, c], to: [tr, tc], cap: [mr, mc], capP: mid });
    });
    return out;
  }
  function stepsFrom(b, r, c) {
    var p = b[r][c], out = [];
    if (!p) return out;
    pieceDirs(p, p.red).forEach(function (d) {
      var tr = r + d[0], tc = c + d[1];
      if (inB(tr, tc) && !b[tr][tc]) out.push({ fr: [r, c], to: [tr, tc], cap: null });
    });
    return out;
  }
  // 强制吃子：全场有跳则只能跳；返回 {moves, mustCap}
  function allMoves(b, red) {
    var caps = [], steps = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var p = b[r][c];
      if (p && p.red === red) {
        caps.push.apply(caps, jumpsFrom(b, r, c));
        steps.push.apply(steps, stepsFrom(b, r, c));
      }
    }
    return { moves: caps.length ? caps : steps, mustCap: caps.length > 0 };
  }
  function applyMove(b, mv) {
    var p = b[mv.fr[0]][mv.fr[1]];
    b[mv.fr[0]][mv.fr[1]] = null;
    var crowned = false;
    if (!p.k && ((p.red && mv.to[0] === 0) || (!p.red && mv.to[0] === N - 1))) { p = { red: p.red, k: true }; crowned = true; }
    b[mv.to[0]][mv.to[1]] = p;
    if (mv.cap) b[mv.cap[0]][mv.cap[1]] = null;
    return crowned;
  }
  function undoMove(b, mv, orig) {
    b[mv.fr[0]][mv.fr[1]] = orig;
    b[mv.to[0]][mv.to[1]] = null;
    if (mv.cap) b[mv.cap[0]][mv.cap[1]] = mv.capP || { red: !orig.red, k: false };
  }

  // ---- AI：alpha-beta（单跳为单位，强制吃子规则内） ----
  function evalBoard(b, forRed) {
    var s = 0;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var p = b[r][c];
      if (!p) continue;
      var v = p.k ? 160 : 100;
      v += (p.red ? 7 - r : r) * 3; // 推进
      s += p.red === forRed ? v : -v;
    }
    return s;
  }
  function search(b, depth, alpha, beta, red, forRed) {
    if (depth <= 0) return evalBoard(b, forRed);
    var am = allMoves(b, red);
    if (!am.moves.length) return red === forRed ? -99000 : 99000; // 困死/吃光
    var best = red === forRed ? -1e9 : 1e9;
    for (var i = 0; i < am.moves.length; i++) {
      var mv = am.moves[i];
      var orig = b[mv.fr[0]][mv.fr[1]];
      applyMove(b, mv);
      // 连跳：吃后还能跳则同一方继续（浅层处理：吃子步不消耗深度）
      var cont = mv.cap && jumpsFrom(b, mv.to[0], mv.to[1]).length > 0;
      var v = search(b, cont ? depth : depth - 1, alpha, beta, cont ? red : !red, forRed);
      undoMove(b, mv, orig);
      if (red === forRed) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, red, depth, jitter) {
    var am = allMoves(b, red);
    if (!am.moves.length) return null;
    var scored = [];
    for (var i = 0; i < am.moves.length; i++) {
      var mv = am.moves[i];
      var orig = b[mv.fr[0]][mv.fr[1]];
      applyMove(b, mv);
      var cont = mv.cap && jumpsFrom(b, mv.to[0], mv.to[1]).length > 0;
      var v = search(b, cont ? depth : depth - 1, -1e9, 1e9, cont ? red : !red, red);
      undoMove(b, mv, orig);
      scored.push({ mv: mv, v: v + (jitter ? (Math.random() * 2 - 1) * jitter : 0) });
    }
    scored.sort(function (a, b2) { return b2.v - a.v; });
    return scored[0].mv;
  }

  // ---- UI / 对局 ----
  var G = null;
  function open() {
    if (document.getElementById("ck-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "ck-game";
    var frame = el("div", "mc-game-frame ck-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u25CE"));
    title.appendChild(el("span", "mc-game-title-txt", "\u4E24\u4EBA\u8DF3\u68CB \u00B7 10 \u5173"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { G && G.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var turn = el("span", "mc-game-inv", "\u7EA2\u65B9\u8D70\u68CB");
    var note = el("span", "ms-timer", "");
    hud.appendChild(badge); hud.appendChild(turn); hud.appendChild(note);
    var board = el("div", "ck-board");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u659C\u8D70\u4E00\u683C \u00B7 \u9694\u5B50\u8DF3\u5403 \u00B7 \u6709\u5403\u5FC5\u5403 \u00B7 \u8FDE\u8DF3\u7EE7\u7EED\u70B9 \u00B7 \u5230\u5E95\u5347\u738B \u00B7 ESC \u5173\u95ED"));
    var panel = el("div", "mc-panel");
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(board); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";
    G = { ov: ov, frame: frame, board: board, panel: panel, badge: badge, turnEl: turn, noteEl: note,
      lv: loadLv(), b: null, sel: null, myTurn: true, thinking: false, over: false, timer: null, chain: false };
    G.close = function () {
      if (!G) return;
      G.over = true;
      if (G.timer) { clearTimeout(G.timer); G.timer = null; }
      if (G.key) document.removeEventListener("keydown", G.key);
      var o = document.getElementById("ck-game"); if (o) o.remove();
      document.body.style.overflow = ""; G = null;
    };
    G.key = function (e) { if (e.key === "Escape" && G) G.close(); };
    document.addEventListener("keydown", G.key);
    ov.addEventListener("click", function (e) { if (e.target === ov && G) G.close(); });
    showCard(G.lv);
  }
  function showCard(lv) {
    var d = LV[lv - 1];
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10"));
    card.appendChild(el("div", "mc-lc-name", "\u25CE " + d.name));
    card.appendChild(el("div", "mc-lc-tip", "\u4F60\u6267\u7EA2\u65B9\uFF08\u4E0B\uFF09\uFF0CAI \u6267\u9ED1\u65B9\uFF0C\u5BF9\u5BC4\u5728\u672C\u5730\u7B97\u529B\u3002\u659C\u524D\u8D70\uFF0C\u9694\u5B50\u8DF3\u5403\uFF0C\u6709\u5403\u5FC5\u5403\uFF0C\u5403\u540E\u80FD\u8DF3\u5FC5\u987B\u8FDE\u8DF3\uFF1B\u8D70\u5230\u5BF9\u65B9\u5E95\u7EBF\u5347\u738B\uFF08\u53EF\u524D\u540E\u8D70\u8DF3\uFF09\u3002\u5403\u5149\u6216\u56F0\u6B7B\u5BF9\u65B9\u5373\u80DC\u3002"));
    var b = el("button", "mc-lc-start", "\u25CE \u5F00\u6218 \u00B7 START"); b.type = "button";
    b.addEventListener("click", function () { start(lv); }); card.appendChild(b);
    G.panel.appendChild(card);
    G.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
  }
  function win() {
    if (!G || G.over) return;
    G.over = true;
    SFX.win(); confetti();
    saveLv(G.lv < 10 ? G.lv + 1 : G.lv);
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", G.lv < 10 ? "\u2713 \u80DC\u5229\uFF01" : "\u2713 \u5168\u901A\u5173\uFF01"));
    card.appendChild(el("div", "mc-lc-name", G.lv < 10 ? "\u25CE " + LV[G.lv].name + " \u5DF2\u89E3\u9501" : "\u4F60\u5403\u5149\u4E86\u5BF9\u624B\uFF01"));
    var b = el("button", "mc-lc-start", G.lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u518D\u6765\u4E00\u5C40 \u00B7 RETRY"); b.type = "button";
    b.addEventListener("click", function () { start(G.lv < 10 ? G.lv + 1 : G.lv); }); card.appendChild(b);
    G.panel.appendChild(card);
    render();
  }
  function lose() {
    if (!G || G.over) return;
    G.over = true;
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "\u2716 \u5931\u8D25"));
    card.appendChild(el("div", "mc-lc-name", "\u68CB\u5B50\u88AB\u5403\u5149\u6216\u88AB\u56F0\uFF0C\u518D\u6218\uFF01"));
    var b = el("button", "mc-lc-start", "\u{1F504} RETRY"); b.type = "button";
    b.addEventListener("click", function () { start(G.lv); }); card.appendChild(b);
    G.panel.appendChild(card);
    render();
  }
  function start(lv) {
    if (!G) return;
    G.lv = lv; saveLv(lv);
    G.b = initBoard();
    G.sel = null; G.myTurn = true; G.thinking = false; G.over = false; G.chain = false;
    G.depth = LV[lv - 1].depth; G.jitter = LV[lv - 1].jitter;
    G.badge.textContent = "Lv " + lv + "/10 \u00B7 " + LV[lv - 1].name;
    G.panel.classList.remove("is-show");
    render();
  }
  function render() {
    if (!G || !G.b) return;
    G.board.textContent = "";
    var frag = document.createDocumentFragment();
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var p = G.b[r][c];
      var d = document.createElement("div");
      d.className = "ck-cell" + (dark(r, c) ? " dk" : " lt") +
        (G.sel && G.sel[0] === r && G.sel[1] === c ? " is-sel" : "") + (p ? " has" : "");
      if (p) {
        var pc = el("span", "ck-pc" + (p.red ? " red" : " blk") + (p.k ? " king" : ""), p.k ? "\u265B" : "\u25CF");
        d.appendChild(pc);
      }
      if (G.sel) {
        var ms = legalFrom(G.sel[0], G.sel[1]);
        for (var i = 0; i < ms.length; i++) if (ms[i].fr[0] === r && ms[i].fr[1] === c) d.classList.add("can");
      }
      (function (rr, cc) {
        d.addEventListener("click", function () { onCell(rr, cc); });
      })(r, c);
      frag.appendChild(d);
    }
    G.board.appendChild(frag);
    G.turnEl.textContent = G.over ? "\u5BF9\u5C40\u7ED3\u675F" : (G.chain ? "\u8FDE\u8DF3\uFF01\u7EE7\u7EED\u8DF3" : (G.myTurn ? "\u7EA2\u65B9\u8D70\u68CB\uFF08\u4F60\uFF09" : "\u9ED1\u65B9\u601D\u8003\u4E2D..."));
  }
  // 当前回合/连跳状态下，指定子的合法走法（强制吃子/连跳锁子）
  function legalFrom(r, c) {
    var p = G.b[r][c];
    if (!p) return [];
    var all = allMoves(G.b, p.red);
    var mine = all.moves.filter(function (m) { return m.fr[0] === r && m.fr[1] === c; });
    if (G.chain) return mine.filter(function (m) { return !!m.cap; }); // 连跳只能继续跳
    return mine;
  }
  function doMove(mv, mine) {
    var crowned = applyMove(G.b, mv);
    G.sel = null;
    if (mv.cap) SFX.cap(); else SFX.move();
    if (crowned) { SFX.king(); G.noteEl.textContent = "\u5347\u738B\uFF01"; setTimeout(function () { if (G) G.noteEl.textContent = ""; }, 1500); }
    // 连跳：吃后同子还能跳 → 同一方继续（玩家链式点；AI 循环）
    var canChain = mv.cap && jumpsFrom(G.b, mv.to[0], mv.to[1]).length > 0;
    if (canChain) {
      if (mine) { G.chain = true; G.sel = [mv.to[0], mv.to[1]]; render(); return; }
      // AI 连跳：立即继续（仍在其回合）
      aiChain(mv.to[0], mv.to[1]);
      return;
    }
    G.chain = false;
    var foe = !mine;
    var am = allMoves(G.b, foe);
    if (!am.moves.length) { if (mine) win(); else lose(); return; } // 吃光/困死
    render();
    if (mine) { G.myTurn = false; aiThink(); } else { G.myTurn = true; }
  }
  function aiChain(r, c) {
    G.timer = setTimeout(function () {
      if (!G || G.over) return;
      var js = jumpsFrom(G.b, r, c);
      if (!js.length) { // 连跳终止（正常不会发生：canChain 已保证有跳）
        G.myTurn = true; render(); return;
      }
      // 贪心选能吃/推进的跳
      js.sort(function (a, b2) { return (b2.to[0] > a.to[0] ? 1 : -1); }); // 向红方底线
      var mv = js[0];
      mv.fr = [r, c];
      doMove(mv, false);
    }, 240);
  }
  function aiThink() {
    if (!G || G.over) return;
    G.thinking = true;
    G.turnEl.textContent = "\u9ED1\u65B9\u6013\u8003\u4E2D...";
    G.timer = setTimeout(function () {
      if (!G || G.over) return;
      try {
        var mv = bestMove(G.b, false, G.depth, G.jitter);
        if (!mv) { win(); return; } // 黑无合法走法 = 你胜
        doMove(mv, false);
      } finally {
        G.thinking = false;
        if (G) render();
      }
    }, 240);
  }
  function onCell(r, c) {
    if (!G || G.over || !G.myTurn || G.thinking || !G.b) return;
    var p = G.b[r][c];
    if (G.sel) {
      var ms = legalFrom(G.sel[0], G.sel[1]);
      for (var i = 0; i < ms.length; i++) {
        if (ms[i].to[0] === r && ms[i].to[1] === c) {
          doMove(ms[i], true);
          return;
        }
      }
      // 连跳中点别处无效（必须继续跳）
      if (G.chain) return;
    }
    if (p && p.red) {
      // 强制吃子提示：全场有跳但该子无跳 → 提示换子
      var am = allMoves(G.b, true);
      if (am.mustCap) {
        var mine = legalFrom(r, c);
        var hasCap = mine.some(function (m) { return !!m.cap; });
        if (!hasCap) { G.noteEl.textContent = "\u6709\u5403\u5FC5\u5403\uFF0C\u6362\u53EF\u8DF3\u7684\u5B50\uFF01"; setTimeout(function () { if (G) G.noteEl.textContent = ""; }, 1400); return; }
      }
      G.sel = [r, c]; SFX.move(); render();
    } else { G.sel = null; render(); }
  }
  // ?test=1 自动化钩子
  if (location.search.indexOf("test=1") >= 0) {
    window.__ckTest = {
      state: function () { return G; },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      move: function (mv) { doMove(mv, true); },
      jumpsFrom: function (r, c) { return jumpsFrom(G.b, r, c); },
      allMoves: function (red) { return allMoves(G.b, red); },
      bestMove: function () { return bestMove(G.b, false, G.depth, G.jitter); }
    };
  }
  function init() { if (isMC()) injectBtn(); }
  function injectBtn() {
    if (document.querySelector(".ck-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "ck-btn", "\u25CE");
    b.type = "button";
    b.title = "Easter egg: Checkers (10 levels) / 彩蛋：两人跳棋 10 关";
    b.setAttribute("aria-label", "Easter egg: Checkers");
    b.addEventListener("click", open);
    tools.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
})();
