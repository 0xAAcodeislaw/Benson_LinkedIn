// Minecraft 主题彩蛋⑧：两人军棋（陆战棋）10 关 —— 红方=你，黑方=本地 AI（手机/电脑浏览器算力，零联网）
// 规则：等级吃子/相同同归/炸弹同归/工兵挖雷/行营不可吃/大本营入后不动/铁路直线+工兵铁路网/吃军旗胜
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }

  var ROWS = 12, COLS = 5;
  var CHAR = { "9": "\u53F8", "8": "\u519B", "7": "\u5E08", "6": "\u65C5", "5": "\u56E2", "4": "\u8425", "3": "\u8FDE", "2": "\u6392", "1": "\u5DE5", "X": "\u96F7", "B": "\u70B8", "F": "\u65D7" };
  var VALUE = { "9": 1000, "8": 900, "7": 700, "6": 600, "5": 500, "4": 400, "3": 300, "2": 200, "1": 150, "X": 600, "B": 550, "F": 1e6 };
  var CAMP = ["2,1", "2,3", "3,2", "4,1", "4,3", "7,1", "7,3", "8,2", "9,1", "9,3"];
  var HQ = ["0,1", "0,3", "11,1", "11,3"];
  var LV = [
    { name: "\u65B0\u5175 \u00B7 Rookie",     jitter: 800 },
    { name: "\u5217\u5175 \u00B7 Private",    jitter: 600 },
    { name: "\u73ED\u957F \u00B7 Corporal",   jitter: 450 },
    { name: "\u6392\u957F \u00B7 Sergeant",   jitter: 350 },
    { name: "\u8FDE\u957F \u00B7 Officer",    jitter: 250 },
    { name: "\u8425\u957F \u00B7 Captain",    jitter: 180 },
    { name: "\u56E2\u957F \u00B7 Major",      jitter: 120 },
    { name: "\u65C5\u957F \u00B7 Colonel",    jitter: 80 },
    { name: "\u5E08\u957F \u00B7 General",    jitter: 40 },
    { name: "\u53F8\u4EE4 \u00B7 Marshal",    jitter: 0 }
  ];
  var KEY = "{{SECRET_jq8w3m2v}}";
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
  var SFX = { move: function () { beep(420, 0.04, "square", 0.03); }, cap: function () { beep(220, 0.08, "square", 0.05); }, both: function () { beep(160, 0.14, "square", 0.06); }, win: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); } };

  // ---- 棋盘拓扑 ----
  function isRail(r, c) {
    if (r === 1 || r === 5 || r === 6 || r === 10) return true; // 四条铁路横行
    if ((c === 0 || c === 4) && r >= 1 && r <= 10) return true; // 两翼铁路纵线
    return false;
  }
  function key(r, c) { return r + "," + c; }
  function isCamp(r, c) { return CAMP.indexOf(key(r, c)) >= 0; }
  function isHQ(r, c) { return HQ.indexOf(key(r, c)) >= 0; }
  // 公路相邻：上下左右，山界行 5-6 之间只通 0/2/4 列
  function roadAdj(r, c) {
    var out = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
      var rr = r + d[0], cc = c + d[1];
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
      if ((r === 5 && rr === 6) || (r === 6 && rr === 5)) { if (cc !== 0 && cc !== 2 && cc !== 4) return; } // 山界
      out.push([rr, cc]);
    });
    return out;
  }
  // 铁路相邻（工兵 BFS 用）
  function railAdj(r, c) {
    var out = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
      var rr = r + d[0], cc = c + d[1];
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
      if (!isRail(rr, cc) || !isRail(r, c)) return;
      out.push([rr, cc]);
    });
    return out;
  }

  // ---- 布阵（红方视角，黑方镜像；每方 25 枚 = 30 格 - 5 行营） ----
  var LAYOUT = [
    ["2", "X", "F", "X", "1"],
    ["9", "B", "8", "B", "7"],
    ["5", null, "6", null, "5"],
    ["7", "X", null, "6", "3"],
    ["1", null, "2", null, "1"],
    ["4", "3", "2", "3", "4"]
  ];
  function initBoard() {
    var b = [];
    for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(null); b.push(row); }
    for (var r2 = 0; r2 < 6; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      var s = LAYOUT[r2][c2];
      if (s) {
        b[r2][c2] = { red: false, t: s, stuck: isHQ(r2, c2) }; // 黑方上
        b[11 - r2][c2] = { red: true, t: s, stuck: isHQ(11 - r2, c2) }; // 红方下（同一布局行镜像）
      }
    }
    return b;
  }
  function countCheck(b, red) {
    var m = {};
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var p = b[r][c]; if (p && p.red === red) m[p.t] = (m[p.t] || 0) + 1;
    }
    return m;
  }

  // ---- 吃子判定：'win' 攻方胜 'lose' 攻方亡 'both' 同归 'flag' 扛旗 ----
  function battle(a, d) {
    if (d.t === "F") return "flag";
    if (d.t === "X") { // 地雷：工兵挖，炸弹同归，其他攻方亡
      if (a.t === "1") return "win";
      if (a.t === "B") return "both";
      return "lose";
    }
    if (a.t === "B") return "both"; // 炸弹与任何子同归
    if (a.t === d.t) return "both";
    return Number(a.t) > Number(d.t) ? "win" : "lose";
  }

  // ---- 走法生成 ----
  function movesOf(b, r, c) {
    var p = b[r][c], out = [];
    if (!p || p.stuck || p.t === "X" || p.t === "F") return out; // 地雷/军旗/入大本营后不动
    function tryDest(rr, cc) {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return;
      var d = b[rr][cc];
      if (d && d.red === p.red) return; // 己方占
      if (d && isCamp(rr, cc)) return; // 行营内的子不可被吃
      out.push([rr, cc]); // 送死走法保留（挡路战术正宗）
    }
    // 公路一步
    roadAdj(r, c).forEach(function (t) { tryDest(t[0], t[1]); });
    if (isRail(r, c)) {
      if (p.t === "1") {
        // 工兵：铁路网 BFS（任意拐弯，路径全铁路无阻挡）
        var seen = {}, q = [[r, c]];
        seen[key(r, c)] = 1;
        while (q.length) {
          var cur = q.shift();
          railAdj(cur[0], cur[1]).forEach(function (t) {
            var k = key(t[0], t[1]);
            if (seen[k]) return;
            if (b[t[0]][t[1]]) { tryDest(t[0], t[1]); seen[k] = 1; return; } // 可吃终点，不再延伸
            seen[k] = 1; q.push(t); tryDest(t[0], t[1]);
          });
        }
      } else {
        // 其余子：铁路直线滑行（4 方向，路径全铁路无阻挡）
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
          for (var rr = r + d[0], cc = c + d[1]; rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS; rr += d[0], cc += d[1]) {
            if (!isRail(rr, cc)) break;
            if (b[rr][cc]) { tryDest(rr, cc); break; }
            tryDest(rr, cc);
          }
        });
      }
    }
    return out;
  }
  function allLegal(b, red) {
    var out = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var p = b[r][c];
      if (p && p.red === red) movesOf(b, r, c).forEach(function (t) { out.push({ fr: [r, c], to: t, cap: b[t[0]][t[1]] }); });
    }
    return out;
  }

  // ---- AI：贪心启发 + 随机 jitter（本地算力，零联网） ----
  function aiPick(b, jitter) {
    var moves = allLegal(b, false);
    if (!moves.length) return null;
    var scored = moves.map(function (mv) {
      var v = 0;
      var d = mv.cap;
      if (d) {
        var res = battle(b[mv.fr[0]][mv.fr[1]], d);
        if (res === "flag") v += 1e6;
        else if (res === "win") v += VALUE[d.t] * 2;
        else if (res === "both") v += VALUE[d.t] - VALUE[b[mv.fr[0]][mv.fr[1]].t] + 40; // 同归：看换子比
      }
      v += (mv.to[0] - mv.fr[0]) * 12; // 向下推进（黑方向红方）
      if (isCamp(mv.to[0], mv.to[1])) v += 25;
      if (isHQ(mv.to[0], mv.to[1])) v -= 120; // 进大本营不能再动
      if (b[mv.fr[0]][mv.fr[1]].t === "9") v -= 15; // 司令略保守
      v += Math.random() * jitter;
      return { mv: mv, v: v };
    });
    scored.sort(function (a, b2) { return b2.v - a.v; });
    return scored[0].mv;
  }

  // ---- UI / 对局 ----
  var G = null;
  function open() {
    if (document.getElementById("jq-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "jq-game";
    var frame = el("div", "mc-game-frame jq-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u2691"));
    title.appendChild(el("span", "mc-game-title-txt", "\u4E24\u4EBA\u519B\u68CB \u00B7 10 \u5173"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { G && G.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var turn = el("span", "mc-game-inv", "\u7EA2\u65B9\u8D70\u68CB");
    var note = el("span", "ms-timer", "");
    hud.appendChild(badge); hud.appendChild(turn); hud.appendChild(note);
    var board = el("div", "jq-board");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u53F8>\u519B>\u5E08>\u65C5>\u56E2>\u8425>\u8FDE>\u6392>\u5DE5 \u00B7 \u70B8\u540C\u5F52 \u00B7 \u5DE5\u6398\u96F7 \u00B7 \u884C\u8425\u4E0D\u53EF\u5403 \u00B7 \u5403\u65D7\u80DC \u00B7 ESC \u5173\u95ED"));
    var panel = el("div", "mc-panel");
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(board); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";
    G = { ov: ov, frame: frame, board: board, panel: panel, badge: badge, turnEl: turn, noteEl: note,
      lv: loadLv(), b: null, sel: null, myTurn: true, thinking: false, over: false, timer: null };
    G.close = function () {
      if (!G) return;
      G.over = true;
      if (G.timer) { clearTimeout(G.timer); G.timer = null; }
      if (G.key) document.removeEventListener("keydown", G.key);
      var o = document.getElementById("jq-game"); if (o) o.remove();
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
    card.appendChild(el("div", "mc-lc-name", "\u2691 " + d.name));
    card.appendChild(el("div", "mc-lc-tip", "\u4E24\u4EBA\u519B\u68CB\uFF1A\u4F60\u6267\u7EA2\u65B9\uFF08\u4E0B\uFF09\uFF0CAI \u6267\u9ED1\u65B9\uFF08\u4E0A\uFF09\uFF0C\u5BF9\u5BC4\u5728\u4F60\u7684\u624B\u673A/\u7535\u8111\u672C\u5730\u7B97\u3002\u5927\u5403\u5C0F\uFF0C\u76F8\u540C\u540C\u5F52\uFF1B\u70B8\u5F39\u540C\u5F52\uFF1B\u5DE5\u5175\u6398\u96F7\uFF1B\u884C\u8425\u5B50\u4E0D\u53EF\u88AB\u5403\uFF1B\u94C1\u8DEF\u76F4\u8FBE\uFF0C\u5DE5\u5175\u94C1\u8DEF\u4EFB\u610F\u62D0\u5F2F\uFF1B\u5403\u6389\u519B\u65D7\u5373\u80DC\u3002"));
    var b = el("button", "mc-lc-start", "\u2691 \u5F00\u6218 \u00B7 START"); b.type = "button";
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
    card.appendChild(el("div", "mc-lc-num", G.lv < 10 ? "\u2713 \u625B\u65D7\u6210\u529F\uFF01" : "\u2713 \u5168\u901A\u5173\uFF01"));
    card.appendChild(el("div", "mc-lc-name", G.lv < 10 ? "\u2691 " + LV[G.lv].name + " \u5DF2\u89E3\u9501" : "\u4F60\u625B\u4E0B\u4E86\u519B\u65D7\uFF0C\u53F8\u4EE4\uFF01"));
    var b = el("button", "mc-lc-start", G.lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u518D\u6218\u4E00\u5C40 \u00B7 RETRY"); b.type = "button";
    b.addEventListener("click", function () { start(G.lv < 10 ? G.lv + 1 : G.lv); }); card.appendChild(b);
    G.panel.appendChild(card);
    render();
  }
  function lose() {
    if (!G || G.over) return;
    G.over = true;
    G.panel.classList.add("is-show"); G.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "\u2716 \u6218\u8D25"));
    card.appendChild(el("div", "mc-lc-name", "\u519B\u65D7\u5931\u5B88\uFF0C\u91CD\u6574\u65D7\u9F13\uFF01"));
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
    G.jitter = LV[lv - 1].jitter;
    G.badge.textContent = "Lv " + lv + "/10 \u00B7 " + LV[lv - 1].name;
    G.panel.classList.remove("is-show");
    render();
  }
  function render() {
    if (!G || !G.b) return;
    G.board.textContent = "";
    var frag = document.createDocumentFragment();
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var p = G.b[r][c];
      var d = document.createElement("div");
      d.className = "jq-cell" +
        (isRail(r, c) ? " rail" : "") +
        (isCamp(r, c) ? " camp" : "") +
        (isHQ(r, c) ? " hq" : "") +
        (G.sel && G.sel[0] === r && G.sel[1] === c ? " is-sel" : "") +
        (p && p.red ? " red" : p ? " blk" : "");
      if (p) d.textContent = CHAR[p.t];
      if (G.sel) {
        var ms = movesOf(G.b, G.sel[0], G.sel[1]);
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
  function applyMove(mv, mine) {
    var fr = mv.fr, to = mv.to;
    var a = G.b[fr[0]][fr[1]];
    var d = G.b[to[0]][to[1]];
    var res = d ? battle(a, d) : "move";
    if (!d || res === "win" || res === "flag") {
      if (d) SFX.cap(); else SFX.move();
      if (res === "flag") {
        G.b[fr[0]][fr[1]] = null;
        G.b[to[0]][to[1]] = a;
        if (mine) win(); else lose();
        return true;
      }
      G.b[fr[0]][fr[1]] = null;
      G.b[to[0]][to[1]] = { red: a.red, t: a.t, stuck: isHQ(to[0], to[1]) };
    } else if (res === "lose") {
      SFX.cap();
      G.b[fr[0]][fr[1]] = null; // 攻方亡，守方留
    } else { // both
      SFX.both();
      G.b[fr[0]][fr[1]] = null;
      G.b[to[0]][to[1]] = null;
    }
    return false;
  }
  function doMove(mv, mine) {
    var ended = applyMove(mv, mine);
    if (ended) return;
    G.sel = null;
    // 对方无子可动：判负
    if (!allLegal(G.b, !mine).length) { if (mine) win(); else lose(); return; }
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
        var mv = aiPick(G.b, G.jitter);
        if (!mv) { win(); return; } // 黑方无子可动 = 你赢
        doMove(mv, false);
      } finally {
        G.thinking = false;
        if (G) render();
      }
    }, 260);
  }
  function onCell(r, c) {
    if (!G || G.over || !G.myTurn || G.thinking || !G.b) return;
    var p = G.b[r][c];
    if (G.sel) {
      var ms = movesOf(G.b, G.sel[0], G.sel[1]);
      for (var i = 0; i < ms.length; i++) {
        if (ms[i][0] === r && ms[i][1] === c) {
          var mv = { fr: [G.sel[0], G.sel[1]], to: [r, c], cap: G.b[r][c] };
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
    window.__jqTest = {
      state: function () { return G; },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      move: function (fr, to) { G.b[fr[0]][fr[1]] && doMove({ fr: fr, to: to, cap: G.b[to[0]][to[1]] }, true); },
      aiMove: function () { aiThink(); },
      movesOf: function (r, c) { return movesOf(G.b, r, c); },
      battle: battle,
      allLegal: function (red) { return allLegal(G.b, red); },
      counts: function (red) { return countCheck(G.b, red); }
    };
  }
  function init() { if (isMC()) injectBtn(); }
  function injectBtn() {
    if (document.querySelector(".jq-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "jq-btn", "\u2691");
    b.type = "button";
    b.title = "Easter egg: Military Chess (10 levels) / 彩蛋：两人军棋 10 关";
    b.setAttribute("aria-label", "Easter egg: Military Chess");
    b.addEventListener("click", open);
    tools.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); // 字体就绪后重试（吸取 mc-chess 教训）
})();
