// Minecraft 主题彩蛋⑦：国际象棋 10 关（红方=你执白，黑方=电脑 AI，百分百本地对弈）
// 架构与 mc-xiangqi 一致：顶栏按钮 → 游戏中心代理 → 面板对弈；?test=1 暴露 chTest 钩子
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }

  // ---- 棋盘：红（玩家/白方）在下，黑（AI）在上 ----
  var START = [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["rP", "rP", "rP", "rP", "rP", "rP", "rP", "rP"],
    ["rR", "rN", "rB", "rQ", "rK", "rB", "rN", "rR"]
  ];
  var CHAR = { K: "\u738B", Q: "\u540E", R: "\u8F66", B: "\u8C61", N: "\u9A6C", P: "\u5175" };
  var VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
  var LV = [
    { name: "\u65B0\u624B \u00B7 Beginner",    depth: 0, jitter: 220, note: "AI \u968F\u673A\u8D70\u68CB\uFF0C\u719F\u6089\u89C4\u5219" },
    { name: "\u5165\u95E8 \u00B7 Novice",       depth: 0, jitter: 120, note: "AI \u4F1A\u5403\u5B50\u4F46\u770B\u4E0D\u8FDC" },
    { name: "\u4E2D\u7EA7 \u00B7 Casual",       depth: 1, jitter: 80,  note: "AI \u4F1A\u7B80\u5355\u7B97\u4E00\u6B65" },
    { name: "\u8FDB\u9636 \u00B7 Improver",     depth: 1, jitter: 30,  note: "AI \u4E0D\u518D\u4E71\u9001\u5B50" },
    { name: "\u9AD8\u624B \u00B7 Advanced",     depth: 2, jitter: 20,  note: "AI \u6709\u4E24\u6B65\u9884\u5224" },
    { name: "\u5F3A\u624B \u00B7 Strong",       depth: 2, jitter: 0,   note: "AI \u4E25\u8C28\u7684\u4E24\u5C42\u641C\u7D22" },
    { name: "\u5927\u5E08 \u00B7 Expert",       depth: 3, jitter: 0,   note: "AI \u4E09\u5C42\u526A\u679D\u641C\u7D22" },
    { name: "\u5B97\u5E08 \u00B7 Master",       depth: 3, jitter: 0,   note: "AI \u8003\u8651\u5B50\u529B\u4E0E\u4F4D\u7F6E" },
    { name: "\u9AD8\u5E08 \u00B7 Grandmaster",  depth: 4, jitter: 0,   note: "AI \u56DB\u5C42\u6DF1\u7B97\uFF0C\u6EC4\u6C34\u4E0D\u6F0F" },
    { name: "\u4F20\u5947 \u00B7 Legend",       depth: 4, jitter: 0,   note: "\u6700\u7EC8\u5173\uFF01\u5C0F\u5FC3\u88AB\u5C06\u6B7B" }
  ];
  var KEY = "{{SECRET_ch9k2p4x}}";
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
  var SFX = { move: function () { beep(420, 0.04, "square", 0.03); }, cap: function () { beep(220, 0.08, "square", 0.05); }, check: function () { beep(880, 0.08, "square", 0.05); beep(660, 0.1, "square", 0.05, 0.08); }, win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); } };

  // ---- 走法生成 ----
  function inBoard(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function initBoard() {
    var b = [];
    for (var r = 0; r < 8; r++) {
      var row = [];
      for (var c = 0; c < 8; c++) { var s = START[r][c]; row.push(s ? { red: s[0] === "r", t: s[1] } : null); }
      b.push(row);
    }
    return b;
  }
  function pseudoMoves(b, r, c) {
    var p = b[r][c], out = [];
    if (!p) return out;
    var red = p.red, t = p.t, i, d;
    function push(rr, cc) {
      if (!inBoard(rr, cc)) return;
      var q = b[rr][cc];
      if (!q || q.red !== red) out.push([rr, cc]);
    }
    function slide(dr, dc) {
      for (var rr = r + dr, cc = c + dc; inBoard(rr, cc); rr += dr, cc += dc) {
        if (b[rr][cc]) { push(rr, cc); return; }
        push(rr, cc);
      }
    }
    if (t === "R") { slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1); }
    else if (t === "B") { slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1); }
    else if (t === "Q") { slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1); slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1); }
    else if (t === "N") {
      [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]].forEach(function (d2) { push(r + d2[0], c + d2[1]); });
    }
    else if (t === "K") {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(function (d2) { push(r + d2[0], c + d2[1]); });
    }
    else if (t === "P") {
      var fwd = red ? -1 : 1, start = red ? 6 : 1;
      if (inBoard(r + fwd, c) && !b[r + fwd][c]) {
        out.push([r + fwd, c]);
        if (r === start && !b[r + 2 * fwd][c]) out.push([r + 2 * fwd, c]);
      }
      for (var d = -1; d <= 1; d += 2) { // 斜吃（仅当目标有对方子）
        var rr = r + fwd, cc = c + d;
        if (inBoard(rr, cc) && b[rr][cc] && b[rr][cc].red !== red) out.push([rr, cc]);
      }
    }
    return out;
  }
  function findKing(b, red) {
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) { var p = b[r][c]; if (p && p.t === "K" && p.red === red) return [r, c]; }
    return null;
  }
  // (r,c) 是否被 byRed 方攻击（兵斜吃/马日/王邻/直线车后/斜线象后，模式枚举不依赖 pseudoMoves）
  function attacked(b, r, c, byRed) {
    var d, p;
    for (d of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]) { // 马
      p = b[r + d[0]] ? b[r + d[0]][c + d[1]] : null;
      if (p && p.red === byRed && p.t === "N") return true;
    }
    for (d of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { // 王
      p = b[r + d[0]] ? b[r + d[0]][c + d[1]] : null;
      if (p && p.red === byRed && p.t === "K") return true;
    }
    var pr = byRed ? r + 1 : r - 1; // 红兵向上走，攻击其出发行相邻斜格
    for (d = -1; d <= 1; d += 2) { // 兵
      p = b[pr] ? b[pr][c + d] : null;
      if (p && p.red === byRed && p.t === "P") return true;
    }
    for (d of [[-1,0],[1,0],[0,-1],[0,1]]) { // 直线：车/后
      for (var rr = r + d[0], cc = c + d[1]; inBoard(rr, cc); rr += d[0], cc += d[1]) {
        p = b[rr][cc];
        if (p) { if (p.red === byRed && (p.t === "R" || p.t === "Q")) return true; break; }
      }
    }
    for (d of [[-1,-1],[-1,1],[1,-1],[1,1]]) { // 斜线：象/后
      for (var rr2 = r + d[0], cc2 = c + d[1]; inBoard(rr2, cc2); rr2 += d[0], cc2 += d[1]) {
        p = b[rr2][cc2];
        if (p) { if (p.red === byRed && (p.t === "B" || p.t === "Q")) return true; break; }
      }
    }
    return false;
  }
  function inCheck(b, red) {
    var k = findKing(b, red);
    if (!k) return true;
    return attacked(b, k[0], k[1], !red);
  }
  function makeMove(b, mv) {
    var p = b[mv.fr[0]][mv.fr[1]];
    b[mv.fr[0]][mv.fr[1]] = null;
    var moved = p;
    // 兵到底线自动升后（新对象；undo 时源格放回原对象即可还原）
    if (p.t === "P" && (mv.to[0] === 0 || mv.to[0] === 7)) moved = { red: p.red, t: "Q" };
    b[mv.to[0]][mv.to[1]] = moved;
    return moved;
  }
  // 试走恢复：源格放回原子（升变还原为兵），目标格放回被吃子或空
  function undoMove(b, mv, orig) {
    b[mv.fr[0]][mv.fr[1]] = orig;
    b[mv.to[0]][mv.to[1]] = mv.cap;
  }
  function allMoves(b, red) {
    var out = [];
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var p = b[r][c];
      if (p && p.red === red) {
        pseudoMoves(b, r, c).forEach(function (m) {
          var cap = b[m[0]][m[1]];
          var mv = { fr: [r, c], to: [m[0], m[1]], cap: cap };
          makeMove(b, mv);
          if (!inCheck(b, red)) out.push(mv);
          undoMove(b, mv, p);
        });
      }
    }
    return out;
  }

  // ---- AI：alpha-beta ----
  function evalBoard(b, forRed) {
    var s = 0;
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var p = b[r][c];
      if (!p) continue;
      var v = VALUE[p.t];
      if (p.t === "P") v += (p.red ? 6 - r : r - 1) * 6; // 兵推进增值
      if ((p.t === "N" || p.t === "B" || p.t === "Q") && c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 12; // 中心控制
      s += p.red === forRed ? v : -v;
    }
    return s;
  }
  function search(b, depth, alpha, beta, red, forRed) {
    if (depth <= 0) return evalBoard(b, forRed);
    var moves = allMoves(b, red);
    if (!moves.length) return inCheck(b, red) ? (red === forRed ? -99000 : 99000) : 0; // 将死/逼和
    moves.sort(function (a, b2) { return (b2.cap ? VALUE[b2.cap.t] : 0) - (a.cap ? VALUE[a.cap.t] : 0); }); // 吃子优先提剪枝
    var best = red === forRed ? -1e9 : 1e9;
    for (var i2 = 0; i2 < moves.length; i2++) {
      var mv = moves[i2];
      var orig = b[mv.fr[0]][mv.fr[1]];
      makeMove(b, mv);
      var v = search(b, depth - 1, alpha, beta, !red, forRed);
      undoMove(b, mv, orig);
      if (red === forRed) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, red, depth, jitter) {
    var moves = allMoves(b, red);
    if (!moves.length) return null;
    var scored = [];
    for (var i = 0; i < moves.length; i++) {
      var mv = moves[i];
      var orig = b[mv.fr[0]][mv.fr[1]];
      makeMove(b, mv);
      var v = search(b, depth - 1, -1e9, 1e9, !red, red);
      undoMove(b, mv, orig);
      scored.push({ mv: mv, v: v + (jitter ? (Math.random() * 2 - 1) * jitter : 0) });
    }
    scored.sort(function (a, b2) { return b2.v - a.v; });
    return scored[0].mv;
  }

  // ---- UI / 对局 ----
  var G = null;
  function open() {
    if (document.getElementById("ch-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "ch-game";
    var frame = el("div", "mc-game-frame ch-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u265A"));
    title.appendChild(el("span", "mc-game-title-txt", "\u56FD\u9645\u8C61\u68CB \u00B7 10 \u5173"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { G && G.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var turn = el("span", "mc-game-inv", "\u7EA2\u65B9\u8D70\u68CB");
    var note = el("span", "ms-timer", "");
    hud.appendChild(badge); hud.appendChild(turn); hud.appendChild(note);
    var board = el("div", "ch-board");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u70B9\u5B50\u9009\u5B50 \u00B7 \u70B9\u76EE\u6807\u8D70\u5B50 \u00B7 \u5175\u5230\u5E95\u81EA\u52A8\u5347\u540E \u00B7 ESC \u5173\u95ED"));
    var panel = el("div", "mc-panel");
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(board); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";
    G = { ov: ov, frame: frame, board: board, panel: panel, badge: badge, turnEl: turn, noteEl: note,
      lv: loadLv(), b: null, sel: null, myTurn: true, thinking: false, over: false, timer: null,
      castle: { wk: true, wq: true, bk: true, bq: true } };
    G.close = function () {
      if (!G) return;
      G.over = true;
      if (G.timer) { clearTimeout(G.timer); G.timer = null; }
      if (G.key) document.removeEventListener("keydown", G.key);
      var o = document.getElementById("ch-game"); if (o) o.remove();
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
    card.appendChild(el("div", "mc-lc-name", "\u265A " + d.name));
    card.appendChild(el("div", "mc-lc-tip", "\u89C4\u5219\uFF1A\u56FD\u9645\u8C61\u68CB\u3002\u4F60\u6267\u7EA2\u65B9\uFF08\u767D\uFF09\uFF0C\u7535\u8111\u6267\u9ED1\u65B9\u3002\u5C06\u6B7B\u6216\u903C\u548C\u5373\u8FC7\u5173\u3002" + d.note));
    var b = el("button", "mc-lc-start", "\u265A \u5F00\u5C40 \u00B7 START"); b.type = "button";
    b.addEventListener("click", function () { start(lv); }); card.appendChild(b);
    G.panel.appendChild(card);
    G.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
  }
  function win() {
    if (!G || G.over) return;
    G.over = true;
    SFX.win(); confetti();
    saveLv(G.lv < 10 ? G.lv + 1 : G.lv);
    if (G.lv < 10) {
      G.panel.classList.add("is-show"); G.panel.textContent = "";
      var card = el("div", "mc-level-card");
      card.appendChild(el("div", "mc-lc-num", "\u2713 \u901A\u5173\uFF01"));
      card.appendChild(el("div", "mc-lc-name", "\u265A " + LV[G.lv].name + " \u5DF2\u89E3\u9501"));
      var b = el("button", "mc-lc-start", "\u4E0B\u4E00\u5173 \u2192"); b.type = "button";
      b.addEventListener("click", function () { start(G.lv + 1); }); card.appendChild(b);
      G.panel.appendChild(card);
    } else {
      G.panel.classList.add("is-show"); G.panel.textContent = "";
      var card2 = el("div", "mc-level-card");
      card2.appendChild(el("div", "mc-lc-num", "\u265A \u5168\u901A\u5173\uFF01"));
      card2.appendChild(el("div", "mc-lc-name", "\u4F60\u51FB\u8D25\u4E86\u4F20\u5947\u96BE\u5EA6\uFF01"));
      card2.appendChild(el("div", "mc-lc-tip", "10 \u5173\u5168\u90E8\u901A\u5173\uFF0C\u771F\u6B63\u7684\u56FD\u9645\u8C61\u68CB\u9AD8\u624B\uFF01"));
      G.panel.appendChild(card2);
    }
    render();
  }
  function draw() { // AI 困毙（逼和）也算过关
    if (!G || G.over) return;
    G.over = true;
    SFX.win(); confetti();
    saveLv(G.lv < 10 ? G.lv + 1 : G.lv);
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "\u00BD \u903C\u548C\uFF01"));
    card.appendChild(el("div", "mc-lc-name", "\u65E0\u53EF\u8D70\u4E4B\u7B56 \u2014 \u7B97\u4F60\u8D62"));
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
    card.appendChild(el("div", "mc-lc-num", "\u2716 \u88AB\u5C06\u6B7B"));
    card.appendChild(el("div", "mc-lc-name", "\u738B\u65E0\u53EF\u9003\uFF0C\u518D\u8BD5\u4E00\u6B21\uFF01"));
    var b = el("button", "mc-lc-start", "\u{1F504} RETRY"); b.type = "button";
    b.addEventListener("click", function () { start(G.lv); }); card.appendChild(b);
    G.panel.appendChild(card);
    render();
  }
  function start(lv) {
    if (!G) return;
    G.lv = lv; saveLv(lv);
    G.b = initBoard();
    G.sel = null; G.myTurn = true; G.thinking = false; G.over = false;
    G.castle = { wk: true, wq: true, bk: true, bq: true };
    var d = LV[lv - 1];
    G.depth = d.depth; G.jitter = d.jitter;
    G.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
    G.panel.classList.remove("is-show");
    render();
  }
  function render() {
    if (!G || !G.b) return;
    G.board.textContent = "";
    var frag = document.createDocumentFragment();
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var p = G.b[r][c];
      var d = document.createElement("div");
      d.className = "ch-cell" + ((r + c) % 2 ? " dark" : "") +
        (G.sel && G.sel[0] === r && G.sel[1] === c ? " is-sel" : "") +
        (p && p.red ? " red" : " blk") + (p ? " has" : "");
      if (p) d.textContent = CHAR[p.t];
      // 走位提示：空格目标也显示
      if (G.sel) {
        var ms = pseudoMoves(G.b, G.sel[0], G.sel[1]);
        for (var i = 0; i < ms.length; i++) if (ms[i][0] === r && ms[i][1] === c) d.classList.add("can");
      }
      (function (rr, cc) {
        d.addEventListener("click", function () { onCell(rr, cc); });
      })(r, c);
      frag.appendChild(d);
    }
    G.board.appendChild(frag);
    G.turnEl.textContent = G.over ? "\u5BF9\u5C40\u7ED3\u675F" : (G.myTurn ? "\u7EA2\u65B9\u8D70\u68CB\uFF08\u4F60\uFF09" : "\u9ED1\u65B9\u601D\u8003\u4E2D...");
  }
  function doMove(mv, mine) {
    var cap = G.b[mv.to[0]][mv.to[1]];
    var moved = makeMove(G.b, mv);
    // 易位权维护：王/车动了就清
    if (moved.t === "K") { if (moved.red) { G.castle.wk = false; G.castle.wq = false; } else { G.castle.bk = false; G.castle.bq = false; } }
    if (moved.t === "R") {
      if (moved.red) { if (mv.fr[1] === 0) G.castle.wq = false; if (mv.fr[1] === 7) G.castle.wk = false; }
      else { if (mv.fr[1] === 0) G.castle.bq = false; if (mv.fr[1] === 7) G.castle.bk = false; }
    }
    G.sel = null;
    if (cap) SFX.cap(); else SFX.move();
    if (moved.t === "Q" && ((mv.fr[0] === 6 && mv.to[0] === 7) || (mv.fr[0] === 1 && mv.to[0] === 0))) {
      G.noteEl.textContent = "\u5347\u53D8\uFF01\u5175 \u2192 \u540E";
      setTimeout(function () { if (G) G.noteEl.textContent = ""; }, 1500);
    }
    // 对方无合法走法：将死=赢/输，逼和=过关
    var foeRed = !mine;
    if (!allMoves(G.b, foeRed).length) {
      if (inCheck(G.b, foeRed)) { if (mine) { win(); return; } lose(); return; }
      draw(); return;
    }
    if (inCheck(G.b, foeRed)) SFX.check();
    render();
    if (mine) { G.myTurn = false; aiThink(); } else { G.myTurn = true; }
  }
  function aiThink() {
    if (!G || G.over) return;
    G.thinking = true;
    G.turnEl.textContent = "\u9ED1\u65B9\u601D\u8003\u4E2D...";
    G.timer = setTimeout(function () {
      if (!G || G.over) return;
      try {
        var mv = bestMove(G.b, false, G.depth, G.jitter);
        if (!mv) { draw(); return; } // AI 无子可走 = 逼和（你赢）
        doMove(mv, false);
      } finally {
        G.thinking = false;
        if (G) render();
      }
      if (G && inCheck(G.b, true)) { G.noteEl.textContent = "\u4F60\u88AB\u5C06\u519B\uFF01"; setTimeout(function () { if (G) G.noteEl.textContent = ""; }, 1500); }
    }, 220);
  }
  function onCell(r, c) {
    if (!G || G.over || !G.myTurn || G.thinking || !G.b) return;
    var p = G.b[r][c];
    if (G.sel) {
      var legal = pseudoMoves(G.b, G.sel[0], G.sel[1]);
      for (var i = 0; i < legal.length; i++) {
        if (legal[i][0] === r && legal[i][1] === c) {
          // 试走：不许送将
          var mv = { fr: [G.sel[0], G.sel[1]], to: [r, c], cap: G.b[r][c] };
          var orig = G.b[mv.fr[0]][mv.fr[1]];
          makeMove(G.b, mv);
          var bad = inCheck(G.b, true);
          undoMove(G.b, mv, orig);
          if (bad) { G.noteEl.textContent = "\u7981\u624B\uFF1A\u8FD9\u6B65\u4F1A\u88AB\u5C06\u519B\uFF01"; setTimeout(function () { if (G) G.noteEl.textContent = ""; }, 1200); return; }
          doMove(mv, true);
          return;
        }
      }
    }
    if (p && p.red) { G.sel = [r, c]; SFX.move(); render(); }
    else { G.sel = null; render(); }
  }
  // ?test=1 自动化钩子
  if (location.search.indexOf("test=1") >= 0) {
    window.__chTest = {
      state: function () { return G; },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      move: function (fr, to) { G.b[fr[0]][fr[1]] && doMove({ fr: fr, to: to, cap: G.b[to[0]][to[1]] }, true); },
      aiMove: function () { aiThink(); },
      pseudoMoves: function (r, c) { return pseudoMoves(G.b, r, c); },
      makeMove: function (b, mv) { return makeMove(b, mv); },
      inCheck: function (b, red) { return inCheck(b, red); },
      attacked: function (r, c, byRed) { return attacked(G.b, r, c, byRed); },
      legalMoves: function (red) { return allMoves(G.b, red); }
    };
  }
  function init() { if (isMC()) injectBtn(); }
  function injectBtn() {
    if (document.querySelector(".ch-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "ch-btn", "\u265A");
    b.type = "button";
    b.title = "Easter egg: Chess (10 levels) / 彩蛋：国际象棋 10 关";
    b.setAttribute("aria-label", "Easter egg: Chess");
    b.addEventListener("click", open);
    tools.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); // 字体就绪后重试（首次访问 defer 时字体未加载）
})();
