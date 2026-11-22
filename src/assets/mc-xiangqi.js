// Minecraft 主题彩蛋⑥：中国象棋 10 关（电脑对手；通关解锁盲盒奖励）
// 🀄 进入。规则完整：车马炮象士将兵、蹩马腿、塞象眼、将帅不照面、送将禁手、将军检测、将死/困毙。
// AI：alpha-beta 剪枝 + 位置价值表，搜索深度按难度 0-4。
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }

  // ---- 棋盘：9 列 × 10 行。piece = { t:'R'|'N'|'B'|'A'|'K'|'C'|'P', red:bool } ----
  // 红在下（rows 5-9），黑在上（rows 0-4）。t：R车 N马 B相/象 A仕/士 K帅/将 C炮 P兵/卒
  var CHAR = {
    R: ["車", "俥"], N: ["馬", "傌"], B: ["象", "相"], A: ["士", "仕"],
    K: ["將", "帥"], C: ["砲", "炮"], P: ["卒", "兵"]
  };
  var VALUE = { R: 600, N: 270, B: 120, A: 120, K: 6000, C: 285, P: 30 };
  var START = [
    ["bR","bN","bB","bA","bK","bA","bB","bN","bR"],
    [null,null,null,null,null,null,null,null,null,null],
    [null,"bC",null,null,null,null,null,null,"bC",null],
    ["bP",null,"bP",null,"bP",null,"bP",null,"bP",null],
    [null,null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null,null],
    ["rP",null,"rP",null,"rP",null,"rP",null,"rP",null],
    [null,"rC",null,null,null,null,null,null,"rC",null],
    [null,null,null,null,null,null,null,null,null,null],
    ["rR","rN","rB","rA","rK","rA","rB","rN","rR"]
  ];
  function initBoard() {
    var b = [];
    for (var r = 0; r < 10; r++) {
      b.push([]);
      for (var c = 0; c < 9; c++) {
        var s = START[r][c], red = s ? s[0] === "r" : false, t = s ? s[1] : null;
        b[r].push(t ? { t: t, red: red } : null);
      }
    }
    return b;
  }

  // ---- 走法生成 ----
  function inBoard(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }
  function inPalace(r, c, red) { return c >= 3 && c <= 5 && (red ? r >= 7 : r <= 2); }
  function sameSide(a, b) { return a && b && a.red === b.red; }
  function pseudoMoves(b, r, c) {
    var p = b[r][c], out = [];
    function push(rr, cc) {
      if (!inBoard(rr, cc)) return;
      var t = b[rr][cc];
      if (!t || t.red !== p.red) out.push([rr, cc]);
    }
    var red = p.red, t = p.t, i;
    if (t === "R") {
      for (i = c - 1; i >= 0; i--) { if (b[r][i]) { push(r, i); break; } push(r, i); }
      for (i = c + 1; i < 9; i++) { if (b[r][i]) { push(r, i); break; } push(r, i); }
      for (i = r - 1; i >= 0; i--) { if (b[i][c]) { push(i, c); break; } push(i, c); }
      for (i = r + 1; i < 10; i++) { if (b[i][c]) { push(i, c); break; } push(i, c); }
    } else if (t === "C") {
      var jumped = false;
      for (i = c - 1; i >= 0; i--) { if (b[r][i]) { if (jumped) { push(r, i); } break; } if (jumped) push(r, i); else jumped = true; }
      jumped = false;
      for (i = c + 1; i < 9; i++) { if (b[r][i]) { if (jumped) { push(r, i); } break; } if (jumped) push(r, i); else jumped = true; }
      jumped = false;
      for (i = r - 1; i >= 0; i--) { if (b[i][c]) { if (jumped) { push(i, c); } break; } if (jumped) push(i, c); else jumped = true; }
      jumped = false;
      for (i = r + 1; i < 10; i++) { if (b[i][c]) { if (jumped) { push(i, c); } break; } if (jumped) push(i, c); else jumped = true; }
    } else if (t === "N") {
      [[-2,-1,1,0],[2,-1,-1,0],[-2,1,1,0],[2,1,-1,0],[-1,-2,0,1],[1,-2,0,1],[-1,2,0,1],[1,2,0,-1]].forEach(function (d) {
        // 蹩马腿：腿坐标也要在盘内（边线马腿越界=不被蹩，否则 b[越界] 读 undefined 崩溃）
        if (inBoard(r + d[0], c + d[1]) && inBoard(r + d[2], c + d[3]) && !b[r + d[2]][c + d[3]]) push(r + d[0], c + d[1]);
      });
    } else if (t === "B") {
      [[-2,-2],[-2,2],[2,-2],[2,2]].forEach(function (d) {
        var er = red ? r + d[0] : r - d[0]; // 相不过河（红向下，象向上）
        var ec = c + d[1];
        var br = (r + er) / 2, bc = (c + ec) / 2; // 象眼=起点到落点中点（原实现 br 恒按红方向，黑象 er 反向后 br 越界崩溃）
        if (inBoard(er, ec) && !b[br][bc] && (red ? er >= 5 : er <= 4)) push(er, ec); // 塞象眼
      });
    } else if (t === "A") {
      [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function (d) {
        var er = red ? r + d[0] : r - d[0], ec = c + d[1];
        if (inPalace(er, ec, red)) push(er, ec);
      });
    } else if (t === "K") {
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(function (d) {
        var er = red ? r + d[0] : r - d[0], ec = c + d[1];
        if (inPalace(er, ec, red)) push(er, ec);
      });
      // 将帅照面（飞将）
      for (i = red ? r - 1 : r + 1; ; i += red ? -1 : 1) {
        if (!inBoard(i, c)) break;
        if (b[i][c]) { if (b[i][c].t === "K" && b[i][c].red !== red) out.push([i, c]); break; }
      }
    } else if (t === "P") {
      var fwd = red ? -1 : 1;
      push(r + fwd, c);
      var crossed = red ? r <= 4 : r >= 5; // 已过河
      if (crossed) { push(r, c - 1); push(r, c + 1); }
    }
    return out;
  }
  function findKing(b, red) {
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = b[r][c];
      if (p && p.t === "K" && p.red === red) return [r, c];
    }
    return null;
  }
  function attacked(b, r, c, byRed) { // (r,c) 是否被 byRed 方攻击
    for (var rr = 0; rr < 10; rr++) for (var cc = 0; cc < 9; cc++) {
      var p = b[rr][cc];
      if (p && p.red === byRed) {
        var ms = pseudoMoves(b, rr, cc);
        for (var i = 0; i < ms.length; i++) if (ms[i][0] === r && ms[i][1] === c) return true;
      }
    }
    return false;
  }
  function inCheck(b, red) {
    var k = findKing(b, red);
    if (!k) return true;
    // 照面即被将
    var foe = findKing(b, !red);
    if (foe && foe[1] === k[1]) {
      var clear = true;
      for (var r = Math.min(foe[0], k[0]) + 1; r < Math.max(foe[0], k[0]); r++) if (b[r][k[1]]) { clear = false; break; }
      if (clear) return true;
    }
    return attacked(b, k[0], k[1], !red);
  }
  function allMoves(b, red) {
    var out = [];
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = b[r][c];
      if (p && p.red === red) {
        pseudoMoves(b, r, c).forEach(function (m) {
          var fr = b[m[0]][m[1]];
          b[r][c] = null; b[m[0]][m[1]] = p;
          if (!inCheck(b, red)) out.push({ fr: [r, c], to: [m[0], m[1]], cap: fr });
          b[m[0]][m[1]] = fr; b[r][c] = p;
        });
      }
    }
    return out;
  }
  function makeMove(b, mv) {
    var p = b[mv.fr[0]][mv.fr[1]];
    b[mv.fr[0]][mv.fr[1]] = null;
    b[mv.to[0]][mv.to[1]] = p;
    return p;
  }

  // ---- AI：alpha-beta ----
  function evalBoard(b, forRed) {
    var s = 0;
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = b[r][c];
      if (!p) continue;
      var v = VALUE[p.t];
      // 位置微调：兵过河增值、靠中心马炮增值
      if (p.t === "P" && (p.red ? r <= 4 : r >= 5)) v += 45;
      if ((p.t === "N" || p.t === "C") && c >= 2 && c <= 6) v += 12;
      s += p.red === forRed ? v : -v;
    }
    return s;
  }
  function search(b, depth, alpha, beta, red, forRed) {
    // depth 传 0 时这里收到 -1，必须 <=0 终止（原 ===0 判断让 -1 无穷递归 → 栈溢出 → bestMove 的 undo 不执行 → 棋盘漂移）
    if (depth <= 0) return evalBoard(b, forRed);
    var moves = allMoves(b, red);
    if (!moves.length) return evalBoard(b, forRed);
    var best = red === forRed ? -1e9 : 1e9;
    for (var i = 0; i < moves.length; i++) {
      var p = makeMove(b, moves[i]);
      var v = search(b, depth - 1, alpha, beta, !red, forRed);
      // 恢复
      b[moves[i].fr[0]][moves[i].fr[1]] = p;
      b[moves[i].to[0]][moves[i].to[1]] = moves[i].cap;
      if (red === forRed) {
        if (v > best) best = v;
        if (best > alpha) alpha = best;
      } else {
        if (v < best) best = v;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, red, depth, jitter) {
    var moves = allMoves(b, red);
    if (!moves.length) return null;
    var scored = [];
    for (var i = 0; i < moves.length; i++) {
      var p = makeMove(b, moves[i]);
      var v = search(b, depth - 1, -1e9, 1e9, !red, red);
      b[moves[i].fr[0]][moves[i].fr[1]] = p;
      b[moves[i].to[0]][moves[i].to[1]] = moves[i].cap;
      scored.push({ mv: moves[i], v: v + (jitter ? (Math.random() * 2 - 1) * jitter : 0) });
    }
    scored.sort(function (a, b2) { return b2.v - a.v; });
    return scored[0].mv;
  }

  // ---- UI / 对局 ----
  var LV = [
    { name: "新手 · Newbie",   depth: 0, jitter: 260, note: "AI 走棋偏随机，适合熟悉规则" },
    { name: "中级 · Casual",   depth: 1, jitter: 120, note: "AI 会吃子但不看后果" },
    { name: "高手 · Advanced", depth: 2, jitter: 40,  note: "AI 有两步预判" },
    { name: "大师 · Master",   depth: 3, jitter: 0,   note: "AI 三层剪枝搜索，谨慎行事" },
    { name: "顶尖 · Grandmaster", depth: 4, jitter: 0, note: "AI 四层搜索，滴水不漏" }
  ];
  var KEY = "{{SECRET_p3x7n5kd}}";
  function loadLv() { var n = Number(localStorage.getItem(KEY) || 1); return Math.min(10, Math.max(1, n)); }
  function saveLv(n) { try { localStorage.setItem(KEY, String(Math.min(10, n))); } catch (e) {} }
  function confetti() {
    var cs = ["#ffff55", "#f0b90b", "#5ea832", "#d946ef", "#4fd8ff"];
    for (var i = 0; i < 22; i++) (function (k) {
      setTimeout(function () {
        var p = el("span", "ms-confetti");
        p.style.left = (Math.random() * 96) + "vw";
        p.style.background = cs[k % cs.length];
        document.body.appendChild(p);
        setTimeout(function () { p.remove(); }, 1700);
      }, k * 45);
    })(i);
  }
  var actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return actx; }
  function beep(f, d, type, v) { try { if (localStorage.getItem("mc_sound") === "0") return; } catch (e) {} var c = ac(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.value = f; var t = c.currentTime; g.gain.setValueAtTime(v || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
  var SFX = { move: function () { beep(420, 0.04, "square", 0.03); }, cap: function () { beep(220, 0.08, "square", 0.05); }, check: function () { beep(880, 0.08, "square", 0.05); beep(660, 0.1, "square", 0.05, 0.08); }, win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); } };

  var G = null;
  function open() {
    if (document.getElementById("cc-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "cc-game";
    var frame = el("div", "mc-game-frame cc-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u{1F0B4}"));
    title.appendChild(el("span", "mc-game-title-txt", "\u4E2D\u56FD\u8C61\u68CB · 10 \u5173"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { G && G.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var turn = el("span", "mc-game-inv", "\u7EA2\u65B9\u8D70\u68CB");
    var note = el("span", "ms-timer", "");
    hud.appendChild(badge); hud.appendChild(turn); hud.appendChild(note);
    var panel = el("div", "mc-panel");
    var board = el("div", "cc-board");
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(board); frame.appendChild(panel);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";
    G = { ov: ov, frame: frame, board: board, panel: panel, badge: badge, turnEl: turn, noteEl: note,
      lv: loadLv(), b: null, sel: null, myTurn: false, over: false, thinking: false, timer: null };
    G.close = function () {
      if (!G) return; G.over = true;
      if (G.timer) { clearTimeout(G.timer); G.timer = null; }
      if (G.key) document.removeEventListener("keydown", G.key);
      var o = document.getElementById("cc-game"); if (o) o.remove();
      document.body.style.overflow = ""; G = null;
    };
    G.key = function (e) { if (e.key === "Escape" && G) G.close(); };
    document.addEventListener("keydown", G.key);
    ov.addEventListener("click", function (e) { if (e.target === ov && G) G.close(); });
    showCard(G.lv);
  }
  function showCard(lv) {
    if (!G) return;
    var d = LV[Math.min(lv, 5) - 1];
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "\u7B2C " + lv + " \u5173 / 10 \u00B7 \u96BE\u5EA6\uFF1A" + LV[Math.min(((lv - 1) % 5) + 1, 5) - 1].name));
    card.appendChild(el("div", "mc-lc-name", "\u{1F0B4} \u4E2D\u56FD\u8C61\u68CB"));
    card.appendChild(el("div", "mc-lc-tip", "\u89C4\u5219\uFF1A\u5B8C\u6574\u4E2D\u56FD\u8C61\u68CB\uFF08\u8E6C\u9A6C\u817F/\u585E\u8C61\u773C/\u5C06\u5E05\u4E0D\u7167\u9762/\u9001\u5C06\u7981\u624B\uFF09\u3002\u4F60\u6267\u7EA2\u65B9\uFF0CAI \u6267\u9ED1\u65B9\u3002\n" + d.note + "\n\u5403\u5B8C\u5BF9\u65B9\u8001\u5C06\u6216\u4F7F\u5176\u65E0\u6CD5\u884C\u68CB\u5373\u80DC\u3002\u6BCF 2 \u5173\u96BE\u5EA6\u63D0\u5347\u4E00\u6863\uFF0C\u7B2C 9-10 \u5173\u4E3A\u9876\u5CF0\u96BE\u5EA6\u3002"));
    var best = Number(localStorage.getItem("cc_best_" + lv)) || 0;
    if (best) card.appendChild(el("div", "mc-lc-stat", "\u{1F3C6} \u672C\u5173\u6700\u4F73\u7528\u6B65 " + best));
    var b = el("button", "mc-lc-start", "\u{1F0B4} \u5F00\u5C40 \u00B7 START");
    b.type = "button";
    b.addEventListener("click", function () { start(lv); });
    card.appendChild(b);
    G.panel.appendChild(card);
    G.badge.textContent = "Lv " + lv + "/10";
    G.board.textContent = "";
    G.board.classList.add("is-idle");
    G.noteEl.textContent = "";
  }
  function start(lv) {
    if (!G) return;
    G.lv = lv;
    G.b = initBoard();
    G.sel = null; G.myTurn = true; G.over = false; G.thinking = false;
    G.panel.classList.remove("is-show");
    G.board.classList.remove("is-idle");
    G.noteEl.textContent = "";
    G.depth = Math.min(4, Math.floor((lv - 1) / 2)); // 0,0,1,1,2,2,3,3,4,4
    G.jitter = [260, 120, 40, 0][Math.min(3, Math.floor((lv - 1) / 2) + (lv >= 9 ? 1 : 0))] || 0;
    G.badge.textContent = "Lv " + lv + "/10 \u00B7 " + LV[G.depth].name;
    render();
  }
  function render() {
    if (!G || !G.b) return;
    G.board.textContent = "";
    var frag = document.createDocumentFragment();
    for (var r = 0; r < 10; r++) for (var c = 0; c < 9; c++) {
      var p = G.b[r][c];
      var d = document.createElement("div");
      d.className = "cc-cell" + ((r + c) % 2 ? " alt" : "") +
        (G.sel && G.sel[0] === r && G.sel[1] === c ? " is-sel" : "") +
        (p && p.red ? " red" : " blk") + (p ? " has" : "");
      if (p) d.textContent = CHAR[p.t][p.red ? 1 : 0];
      // 走位提示：空格目标也显示（原实现包在 if(p) 里，兵/车移动到空格无提示）
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
    var redK = findKing(G.b, true), blkK = findKing(G.b, false);
    G.turnEl.textContent = G.myTurn ? "\u7EA2\u65B9\u8D70\u68CB\uFF08\u4F60\uFF09" : "\u9ED1\u65B9\u601D\u8003\u4E2D...";
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
          var pc = makeMove(G.b, mv);
          var bad = inCheck(G.b, true);
          G.b[mv.to[0]][mv.to[1]] = mv.cap; G.b[mv.fr[0]][mv.fr[1]] = pc; // 恢复目标格与源格（原实现把 cap 写回源格，目标格残留棋子 → 棋子复制）
          if (bad) { G.noteEl.textContent = "\u7981\u624B\uFF1A\u8FD9\u6B65\u4F1A\u88AB\u5C06\u519B\uFF01"; setTimeout(function () { if (G) G.noteEl.textContent = ""; }, 1200); return; }
          doMove(mv, true);
          return;
        }
      }
    }
    if (p && p.red) { G.sel = [r, c]; SFX.move(); render(); }
    else { G.sel = null; render(); }
  }
  function doMove(mv, mine) {
    var cap = G.b[mv.to[0]][mv.to[1]];
    makeMove(G.b, mv);
    G.sel = null;
    if (cap) SFX.cap(); else SFX.move();
    // 胜负判定
    if (cap && cap.t === "K") { win(); render(); return; }
    if (!allMoves(G.b, mine ? false : true).length) { win(); render(); return; } // 对方困毙
    var foeRed = mine ? false : true;
    if (inCheck(G.b, foeRed)) { SFX.check(); G.noteEl.textContent = mine ? "\u5C06\u519B\uFF01" : ""; }
    render();
    if (mine) { G.myTurn = false; aiThink(); } else { G.myTurn = true; }
  }
  function aiThink() {
    if (!G || G.over) return;
    G.thinking = true;
    G.noteEl.textContent = "";
    G.timer = setTimeout(function () {
      if (!G || G.over) return;
      try {
        var mv = bestMove(G.b, false, G.depth, G.jitter);
        if (!mv) { win(); return; } // AI 困毙 → 你赢
        doMove(mv, false);
      } finally {
        G.thinking = false; // 无论 AI 内部是否异常都复位，防"思考中"卡死
      }
      if (inCheck(G.b, true)) { G.noteEl.textContent = "\u4F60\u88AB\u5C06\u519B\uFF01"; }
    }, 220); // 思考延迟：走棋有"电脑在想"的手感
  }
  function win() {
    if (!G || G.over) return;
    G.over = true;
    if (G.timer) { clearTimeout(G.timer); G.timer = null; }
    var lv = G.lv;
    var prev = Number(localStorage.getItem("cc_best_" + lv)) || 0;
    var moves = 0;
    if (!prev) { try { localStorage.setItem("cc_best_" + lv, "1"); } catch (e) {} }
    saveLv(lv + 1);
    SFX.win(); confetti();
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "LEVEL " + lv + " CLEAR! / \u7B2C " + lv + " \u5173\u901A\u5173\uFF01"));
    var b = el("button", "mc-lc-start", lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u{1F3C6} \u9886\u53D6\u5956\u52B1 \u00B7 REWARD");
    b.type = "button";
    b.addEventListener("click", function () { if (lv < 10) showCard(lv + 1); else reward(); });
    card.appendChild(b);
    G.panel.appendChild(card);
  }
  function reward() {
    G.panel.textContent = "";
    SFX.win(); confetti();
    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-icon", "\u{1F0B4}"));
    card.appendChild(el("div", "mc-ach-title", "\u8C61\u68CB\u5927\u5E08! / XIANGQI MASTER"));
    card.appendChild(el("div", "mc-ach-desc", "10 \u5173\u5168\u901A \u2014 \u4E94\u6E38\u5168\u96C6\u9FDE\u5B8C\uFF01\u4F60\u5DF2\u96C6\u9F50\u5168\u90E8\u5956\u52B1\uFF01"));
    card.appendChild(el("div", "mc-ach-desc mc-win-hint", "\u26CF \u6316\u77FF=\u7535\u8BDD \u00B7 \u{1F4A3}\u25A6\u{1F0CF}=\u90AE\u7BB1 \u00B7 \u2708\uFE0F=\u6311\u6218 LinkedIn \u00B7 \u{1F0B4} \u8C61\u68CB=\u5B8C\u7F8E\u6536\u5B98"));
    var c = el("button", "mc-win-close", "Close / \u5173\u95ED"); c.type = "button";
    c.addEventListener("click", function () { G && G.close(); }); card.appendChild(c);
    G.panel.appendChild(card);
  }
  function confetti() {
    var cs = ["#ffff55", "#f0b90b", "#5ea832", "#d946ef", "#4fd8ff"];
    for (var i = 0; i < 22; i++) (function (k) {
      setTimeout(function () {
        var p = el("span", "ms-confetti");
        p.style.left = (Math.random() * 96) + "vw";
        p.style.background = cs[k % cs.length];
        document.body.appendChild(p);
        setTimeout(function () { p.remove(); }, 1700);
      }, k * 45);
    })(i);
  }
  // ?test=1 自动化钩子
  if (location.search.indexOf("test=1") >= 0) {
    window.__ccTest = {
      state: function () { return G; },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      move: function (fr, to) { G.b[fr[0]][fr[1]] && doMove({ fr: fr, to: to, cap: G.b[to[0]][to[1]] }, true); },
      aiMove: function () { aiThink(); },
      // 调试：规则内核（测试误报用）
      pseudoMoves: function (r, c) { return pseudoMoves(G.b, r, c); },
      makeMove: function (b, mv) { return makeMove(b, mv); },
      inCheck: function (b, red) { return inCheck(b, red); },
      attacked: function (r, c, byRed) { return attacked(G.b, r, c, byRed); }
    };
  }
  function init() { if (isMC()) injectBtn(); }
  function injectBtn() {
    if (document.querySelector(".cc-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "cc-btn", "\u{1F0B4}");
    b.type = "button";
    b.title = "Easter egg: Xiangqi (10 levels) / 彩蛋：中国象棋 10 关";
    b.setAttribute("aria-label", "Easter egg: Xiangqi");
    b.addEventListener("click", open);
    tools.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
