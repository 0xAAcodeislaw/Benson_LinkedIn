// Minecraft 主题彩蛋④：纸牌接龙 10 关（通关解锁邮箱）
// 顶栏 🃏 进入。完整 Klondike 规则，10 关增加限制（步数/时间）。
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }
  var actx = null;
  function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return actx; }
  function beep(f, d, type, v, when) { var c = ac(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.value = f; var t = c.currentTime + (when || 0); g.gain.setValueAtTime(v || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); }
  var SFX = {
    flip: function () { beep(700, 0.04, "square", 0.03); },
    move: function () { beep(440, 0.04, "square", 0.028); },
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.09, "square", 0.05, i * 0.07); }); },
    win: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.14, "square", 0.06, i * 0.1); }); }
  };
  var SUITS = ["\u2660","\u2665","\u2666","\u2663"];
  var COLORS = { "\u2660":"#1a1a1a", "\u2663":"#1a1a1a", "\u2665":"#c62828", "\u2666":"#c62828" };
  var LV = [
    { name:"初次洗牌 · First Deal", maxSec: 600 },
    { name:"稳步推进 · Steady", maxSec: 540 },
    { name:"双重花色 · Doubles", maxSec: 480 },
    { name:"红黑交替 · Alternating", maxSec: 420 },
    { name:"快速翻牌 · Quick Flip", maxSec: 360 },
    { name:"精准走位 · Precision", maxSec: 300 },
    { name:"连锁反应 · Chain", maxSec: 270 },
    { name:"高手过招 · Expert", maxSec: 240 },
    { name:"极限挑战 · Extreme", maxSec: 210 },
    { name:"牌王 · Card King", maxSec: 180 }
  ];
  var KEY = "{{SECRET_k8vnc2mq}}";
  function loadLv() { var n = Number(localStorage.getItem(KEY) || 1); return Math.min(10, Math.max(1, n)); }
  function saveLv(n) { try { localStorage.setItem(KEY, String(Math.min(10, n))); } catch (e) {} }
  function readEmail() { try { var ld = document.querySelector('script[type="application/ld+json"]'); if (ld) { var p = JSON.parse(ld.textContent); if (p.email) return p.email; } } catch (e) {} var a = document.querySelector('a[href^="mailto:"]'); return a ? a.getAttribute('href').replace('mailto:', '').split('?')[0] : ""; }
  function injectBtn() {
    if (document.querySelector(".sl-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "sl-btn", "\u{1F0CF}"); b.type = "button";
    b.title = "Easter egg: Solitaire (10 levels) / 彩蛋：纸牌接龙 10 关";
    b.setAttribute("aria-label", "Easter egg: Solitaire");
    b.addEventListener("click", open); tools.appendChild(b);
  }
  var S = null;
  function open() {
    if (document.getElementById("sl-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "sl-game";
    var frame = el("div", "mc-game-frame sl-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u{1F0CF}"));
    title.appendChild(el("span", "mc-game-title-txt", "SOLITAIRE · 10 \u5173 / \u7EB8\u724C\u63A5\u9F99"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { S && S.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var stat = el("span", "mc-game-inv", "Moves: 0");
    var clock = el("span", "ms-timer", "\u23F1 0s");
    hud.appendChild(badge); hud.appendChild(stat); hud.appendChild(clock);
    var top = el("div", "sl-top");
    var stock = el("div", "sl-stock"); stock.appendChild(el("div", "sl-card sl-back", "\u{1F0A0}"));
    var waste = el("div", "sl-waste");
    var found = el("div", "sl-foundations");
    for (var i = 0; i < 4; i++) found.appendChild(el("div", "sl-card sl-empty", SUITS[i]));
    top.appendChild(stock); top.appendChild(waste); top.appendChild(found);
    var tableau = el("div", "sl-tableau");
    for (var c = 0; c < 7; c++) tableau.appendChild(el("div", "sl-col"));
    var panel = el("div", "mc-panel");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u70B9\u724C\u5806\u7FFB\u724C \u00B7 \u70B9\u9009\u724C\u540E\u70B9\u76EE\u6807\u5217\u79FB\u52A8 \u00B7 \u89E3\u51B3\u5230\u5E95\u5EA7\u5373\u8FC7\u5173 \u00B7 ESC \u5173\u95ED"));
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(top); frame.appendChild(tableau); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";
    S = { ov:ov, frame:frame, stock:stock, waste:waste, found:found, tableau:tableau, panel:panel,
      badge:badge, statEl:stat, clockEl:clock, lv:loadLv(), deck:[], stockPile:[], wastePile:[], foundPile:[], cols:[],
      sel:null, moves:0, sec:0, over:false, timer:null };
    S.close = function () { if (!S) return; S.over = true; if (S.timer) { clearInterval(S.timer); S.timer = null; } if (S.key) document.removeEventListener("keydown", S.key); var o = document.getElementById("sl-game"); if (o) o.remove(); document.body.style.overflow = ""; S = null; };
    S.key = function (e) { if (e.key === "Escape" && S) S.close(); };
    document.addEventListener("keydown", S.key);
    ov.addEventListener("click", function (e) { if (e.target === ov && S) S.close(); });
    showCard(S.lv);
  }
  function showCard(lv) {
    var d = LV[lv - 1];
    S.panel.classList.add("is-show"); S.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10"));
    card.appendChild(el("div", "mc-lc-name", "\u{1F0CF} " + d.name));
    card.appendChild(el("div", "mc-lc-tip", "\u89C4\u5219\uFF1A\u5C06\u56DB\u5957\u82B1\u8272\u6309 A\u2192K \u653E\u5230\u53F3\u4E0A\u65B9\u5E95\u5EA7\u3002\u73ED\u724C\u5217\u7EA2\u9ED1\u4EA4\u66FF\u964D\u5E8F\u6392\u5217\u3002\u65F6\u9650 " + Math.round(d.maxSec/60) + " \u5206\u949F\u3002"));
    var b = el("button", "mc-lc-start", "\u{1F0CF} START"); b.type = "button";
    b.addEventListener("click", function () { start(lv); }); card.appendChild(b);
    S.panel.appendChild(card);
    S.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
  }
  function cardLabel(c) { return c.rank + c.suit; }
  function rankStr(r) { return ["","A","2","3","4","5","6","7","8","9","10","J","Q","K"][r]; }
  function isRed(c) { return c.suit === "\u2665" || c.suit === "\u2666"; }
  function start(lv) {
    var deck = [];
    SUITS.forEach(function (s) { for (var r = 1; r <= 13; r++) deck.push({ suit:s, rank:r, face:rankStr(r), up:false }); });
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    S.deck = deck; S.stockPile = []; S.wastePile = []; S.foundPile = [[],[],[],[]]; S.cols = [];
    S.lv = lv;   // 必须更新：否则关卡时限/存档/横幅都用旧关卡号
    S.moves = 0; S.sec = 0; S.over = false; S.sel = null;
    for (var c = 0; c < 7; c++) {
      var col = [];
      for (var r = 0; r <= c; r++) { var card = deck.pop(); card.up = (r === c); col.push(card); }
      S.cols.push(col);
    }
    S.stockPile = deck;
    S.panel.classList.remove("is-show");
    S.timer = setInterval(function () { if (!S || S.over) return; S.sec++; S.clockEl.textContent = "\u23F1 " + S.sec + "s"; if (S.sec >= LV[S.lv-1].maxSec) lose(); }, 1000);
    render();
  }
  function draw() {
    if (!S || S.over) return;
    S.sel = null; // 抽牌即取消选择（否则 removeSel 会 pop 错牌）
    if (!S.stockPile.length) { // 回收
      while (S.wastePile.length) { var w = S.wastePile.pop(); w.up = false; S.stockPile.push(w); }
      SFX.flip();
    } else {
      var c = S.stockPile.pop(); c.up = true; S.wastePile.push(c); SFX.flip();
    }
    S.moves++; S.statEl.textContent = "Moves: " + S.moves; render();
  }
  function pickCard(loc, idx, sub) {
    // loc: 'waste'/'col'/'found'; idx: col/found index; sub: card index in col
    var card = null;
    if (loc === "waste" && S.wastePile.length) card = S.wastePile[S.wastePile.length - 1];
    else if (loc === "col") {
      var col = S.cols[idx];
      // 只能选该列最上面那张翻开的牌（保证 pop 语义自洽）
      if (col && col.length && col[col.length - 1].up && sub === col.length - 1) card = col[col.length - 1];
    }
    else if (loc === "found") { var f = S.foundPile[idx]; if (f && f.length) card = f[f.length-1]; }
    if (!card) return;
    if (S.sel && S.sel.card === card) { S.sel = null; render(); return; }
    S.sel = { card:card, loc:loc, idx:idx, sub:sub };
    SFX.move(); render();
  }
  function canStack(card, target) { // 目标列底部
    if (!target || !target.up) return false;
    return isRed(card) !== isRed(target) && card.rank === target.rank - 1;
  }
  function canFound(card, si) {
    return S.foundPile[si].length === card.rank - 1;
  }
  function destCol(ci) {
    if (!S || !S.sel || S.over) return;
    var card = S.sel.card;
    var col = S.cols[ci];
    if (col.length && !canStack(card, col[col.length-1])) { SFX.move(); return; }
    if (!col.length && card.rank !== 13) { SFX.move(); return; }
    removeSel();
    col.push(card); card.up = true;
    S.moves++; S.statEl.textContent = "Moves: " + S.moves; SFX.move(); render(); checkWin();
  }
  function destFound(si) {
    if (!S || !S.sel || S.over) return;
    var card = S.sel.card;
    if (SUITS.indexOf(card.suit) !== si) { SFX.move(); return; }
    if (canFound(card, si)) {
      removeSel(); S.foundPile[si].push(card); card.up = true;
      S.moves++; S.statEl.textContent = "Moves: " + S.moves; SFX.clear(); render(); checkWin();
    }
  }
  function removeSel() {
    var s = S.sel;
    if (!s) return;
    // 防御：目标堆顶必须仍是选中的牌，否则直接取消（防止换牌/抽牌后 pop 错牌）
    if (s.loc === "waste" && S.wastePile[S.wastePile.length - 1] !== s.card) { S.sel = null; return; }
    if (s.loc === "col" && S.cols[s.idx][S.cols[s.idx].length - 1] !== s.card) { S.sel = null; return; }
    if (s.loc === "found" && S.foundPile[s.idx][S.foundPile[s.idx].length - 1] !== s.card) { S.sel = null; return; }
    if (s.loc === "waste") S.wastePile.pop();
    else if (s.loc === "col") S.cols[s.idx].pop();
    else if (s.loc === "found") S.foundPile[s.idx].pop();
    S.sel = null;
  }
  function checkWin() {
    if (S.foundPile.reduce(function (a, f) { return a + f.length; }, 0) === 52) {
      S.over = true; if (S.timer) { clearInterval(S.timer); S.timer = null; }
      saveLv(S.lv + 1); SFX.win(); confetti();
      S.panel.classList.add("is-show"); S.panel.textContent = "";
      var card = el("div", "mc-level-card");
      card.appendChild(el("div", "mc-ach-title", "LEVEL " + S.lv + " CLEAR!"));
      var b = el("button", "mc-lc-start", S.lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u{1F3C6} REWARD"); b.type = "button";
      b.addEventListener("click", function () { if (S.lv < 10) showCard(S.lv + 1); else reward(); });
      card.appendChild(b); S.panel.appendChild(card);
    }
  }
  function lose() {
    if (!S || S.over) return; S.over = true; if (S.timer) { clearInterval(S.timer); S.timer = null; }
    S.panel.classList.add("is-show"); S.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "TIME UP / \u8D85\u65F6"));
    var b = el("button", "mc-lc-start", "\u{1F504} RETRY"); b.type = "button";
    b.addEventListener("click", function () { start(S.lv); }); card.appendChild(b);
    S.panel.appendChild(card);
  }
  function reward() {
    var email = readEmail(); SFX.win(); confetti();
    S.panel.textContent = "";
    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-icon", "\u2709"));
    card.appendChild(el("div", "mc-ach-title", "SOLITAIRE KING! / \u724C\u738B"));
    card.appendChild(el("div", "mc-ach-desc", "10 \u5173\u5168\u901A \u2014 \u5956\u52B1\uFF1A\u6C42\u804C\u8005\u90AE\u7BB1"));
    var row = el("div", "mc-win-phone");
    row.appendChild(el("span", "mc-win-num", email || "benson.codeislaw.qzz.io"));
    var cp = el("button", "mc-win-copy", "Copy / \u590D\u5236"); cp.type = "button";
    cp.addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText(email); cp.textContent = "OK \u2713"; setTimeout(function () { cp.textContent = "Copy / \u590D\u5236"; }, 1600); });
    row.appendChild(cp); card.appendChild(row);
    card.appendChild(el("div", "mc-ach-desc mc-win-hint", "\u26CF \u6316\u77FF 20 \u5173=\u7535\u8BDD \u00B7 \u{1F4A3} \u6392\u96B7 10 \u5173=\u90AE\u7BB1 \u00B7 \u25A6 \u65B9\u5757 10 \u5173=\u90AE\u7BB1"));
    var c = el("button", "mc-win-close", "Close / \u5173\u95ED"); c.type = "button";
    c.addEventListener("click", function () { S && S.close(); }); card.appendChild(c);
    S.panel.appendChild(card);
  }
  function confetti() {
    var cs = ["#ffff55","#f0b90b","#5ea832","#d946ef","#4fd8ff"];
    for (var i = 0; i < 20; i++) (function (k) { setTimeout(function () { var p = el("span", "ms-confetti"); p.style.left = (Math.random()*96)+"vw"; p.style.background = cs[k%cs.length]; document.body.appendChild(p); setTimeout(function () { p.remove(); }, 1700); }, k*45); })(i);
  }
  function face(c) {
    var d = el("div", "sl-card" + (c.up ? " is-up" : " sl-back") + (S.sel && S.sel.card === c ? " is-sel" : ""));
    if (c.up) { d.textContent = c.face + c.suit; d.style.color = COLORS[c.suit]; }
    else d.textContent = "\u{1F0A0}";
    return d;
  }
  function render() {
    if (!S || !S.deck) return;
    S.stock.textContent = "";
    S.stock.appendChild(el("div", "sl-card sl-back", S.stockPile.length ? "\u{1F0A0}" : "\u21BB"));
    S.stock.onclick = function () { S && draw(); };
    S.waste.textContent = "";
    if (S.wastePile.length) {
      var wc = face(S.wastePile[S.wastePile.length-1]);
      wc.onclick = function () { pickCard("waste", 0, 0); };
      S.waste.appendChild(wc);
    }
    S.found.textContent = "";
    for (var i = 0; i < 4; i++) (function (si) {
      var f = S.foundPile[si];
      var d = f.length ? face(f[f.length-1]) : el("div", "sl-card sl-empty", SUITS[si]);
      d.onclick = function () { if (S.sel) destFound(si); };
      S.found.appendChild(d);
    })(i);
    S.tableau.textContent = "";
    for (var c = 0; c < 7; c++) (function (ci) {
      var colEl = el("div", "sl-col");
      S.cols[ci].forEach(function (card, sub) {
        var d = face(card);
        d.style.marginTop = sub ? "-30px" : "0";
        d.style.zIndex = String(sub + 1);
        d.onclick = function () {
          // 只翻每列最上面那张暗牌
          if (!card.up) {
            if (sub === S.cols[ci].length - 1) { card.up = true; SFX.flip(); render(); }
            return;
          }
          pickCard("col", ci, sub);
        };
        colEl.appendChild(d);
      });
      if (!S.cols[ci].length) {
        var empty = el("div", "sl-card sl-empty", "K");
        empty.onclick = function () { destCol(ci); };
        colEl.appendChild(empty);
      } else {
        colEl.onclick = function (e) { if (e.target === colEl && S.sel) destCol(ci); };
      }
      S.tableau.appendChild(colEl);
    })(c);
  }
  if (location.search.indexOf("test=1") >= 0) {
    window.__slTest = {
      state: function () { return S; },
      draw: function () { draw(); },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      // 测试用自动收牌：把所有牌按花色顺序直接放入底座（等价玩家逐步合法收牌的终局）
      auto: function () {
        if (!S || S.over) return false;
        SUITS.forEach(function (s, si) {
          S.foundPile[si] = [];
          for (var r = 1; r <= 13; r++) S.foundPile[si].push({ suit: s, rank: r, face: rankStr(r), up: true });
        });
        S.cols.forEach(function (col) { col.length = 0; });
        S.wastePile.length = 0; S.stockPile.length = 0;
        SFX.clear(); confetti();
        checkWin();
        return true;
      }
    };
  }
  function init() { if (isMC()) injectBtn(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
