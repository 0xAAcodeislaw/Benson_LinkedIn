// Minecraft 主题彩蛋⑤：雷电 10 关（纵向卷轴射击；通关解锁 LinkedIn）
// 顶栏 ✈️ 进入。canvas 渲染，自包含。静音遵守全局 mc_sound。
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }
  var actx = null;
  function ac() { if (actx === null) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = false; } } if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) {} } return actx || null; }
  function muted() { try { return localStorage.getItem("mc_sound") === "0"; } catch (e) { return false; } }
  function beep(f, d, type, v, when) {
    if (muted()) return;
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = f;
    var t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(v || 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + d + 0.02);
  }
  function noise(dur, vol, freq) {
    if (muted()) return;
    var c = ac(); if (!c) return;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 800;
    var g = c.createGain(); g.gain.value = vol || 0.1;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
  }
  var SFX = {
    shot:  function () { beep(880 + Math.random() * 80, 0.04, "square", 0.02); },
    boomS: function () { noise(0.09, 0.1, 900); },
    boomB: function () { noise(0.3, 0.16, 500); beep(90, 0.25, "sawtooth", 0.06); },
    hit:   function () { noise(0.25, 0.14, 600); beep(60, 0.3, "sawtooth", 0.07); },
    pick:  function () { beep(660, 0.07, "square", 0.05); beep(990, 0.1, "square", 0.05, 0.07); },
    warn:  function () { beep(440, 0.16, "square", 0.06); beep(330, 0.16, "square", 0.06, 0.18); beep(440, 0.16, "square", 0.06, 0.36); },
    oneup: function () { [523, 659, 784].forEach(function (f, i) { beep(f, 0.08, "square", 0.05, i * 0.06); }); beep(1047, 0.12, "square", 0.05, 0.18); },
    star:  function () { beep(1568, 0.05, "square", 0.03); },
    bomb:  function () { noise(0.5, 0.2, 400); beep(70, 0.5, "sawtooth", 0.08); beep(55, 0.6, "sawtooth", 0.06, 0.15); },
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); },
    win:   function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.15, "square", 0.06, i * 0.11); }); }
  };

  // ---- BGM：Web Audio 合成配乐，两套序列（普通 / Boss 战），遵守全局静音 ----
  var BGM = {
    t: null, step: 0, mode: null,
    seq: {
      normal: {
        bpm: 150,
        bass: [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 146.8, 0, 130.8, 0],
        lead: [440, 0, 0, 0, 523, 0, 659, 0, 880, 0, 0, 0, 659, 0, 523, 0],
        hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]
      },
      boss: {
        bpm: 172,
        bass: [73.4, 0, 73.4, 77.8, 73.4, 0, 87.3, 0, 73.4, 0, 73.4, 77.8, 82.4, 0, 87.3, 0],
        lead: [587, 0, 698, 0, 880, 0, 698, 0, 587, 0, 698, 0, 932, 0, 880, 698],
        hat:  [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1]
      }
    },
    start: function (mode) {
      this.stop();
      if (muted()) return;
      var c = ac(); if (!c) return;
      var s = this.seq[mode]; if (!s) return;
      this.mode = mode; this.step = 0;
      var self = this;
      var iv = Math.round(60 / s.bpm * 1000 / 4); // 16 分音符
      this.t = setInterval(function () { self.tick(); }, iv);
    },
    stop: function () { if (this.t) { clearInterval(this.t); this.t = null; } },
    tick: function () {
      if (muted()) return;
      var s = this.seq[this.mode]; if (!s) return;
      var i = this.step % 16;
      if (s.bass[i]) beep(s.bass[i], 0.12, "sawtooth", 0.026);
      if (s.lead[i]) beep(s.lead[i], 0.09, "square", 0.02);
      if (s.hat[i]) noise(0.02, 0.012, 6000);
      this.step++;
    }
  };

  var LV = [
    { name: "起飞 · Takeoff",      spawn: 1550, ehp: 1, esp: 1.2, brate: 2900, boss: 22,  mix: ["drop"] },
    { name: "巡逻 · Patrol",       spawn: 1350, ehp: 1, esp: 1.4, brate: 2600, boss: 30,  mix: ["drop", "sine"] },
    { name: "遭遇 · Skirmish",     spawn: 1200, ehp: 2, esp: 1.6, brate: 2400, boss: 38,  mix: ["drop", "sine", "dive"] },
    { name: "空战 · Dogfight",     spawn: 1000, ehp: 2, esp: 1.8, brate: 2000, boss: 52,  mix: ["drop", "sine", "dive"] },
    { name: "雷区 · Echelon",      spawn: 900,  ehp: 3, esp: 2.0, brate: 1800, boss: 64,  mix: ["sine", "dive", "hover"] },
    { name: "风暴 · Storm",        spawn: 820,  ehp: 3, esp: 2.2, brate: 1650, boss: 78,  mix: ["drop", "dive", "hover"] },
    { name: "围剿 · Siege",        spawn: 740,  ehp: 4, esp: 2.4, brate: 1500, boss: 92,  mix: ["sine", "dive", "hover"] },
    { name: "突击 · Assault",      spawn: 680,  ehp: 4, esp: 2.7, brate: 1350, boss: 108, mix: ["drop", "dive", "hover"] },
    { name: "决战 · Showdown",     spawn: 620,  ehp: 5, esp: 3.0, brate: 1200, boss: 126, mix: ["sine", "dive", "hover"] },
    { name: "雷电 · RAIDEN",       spawn: 560,  ehp: 6, esp: 3.4, brate: 1050, boss: 150, mix: ["drop", "sine", "dive", "hover"] }
  ];
  var KEY = "{{SECRET_o9w4t1zb}}";
  function loadLv() { var n = Number(localStorage.getItem(KEY) || 1); return Math.min(10, Math.max(1, n)); }
  function saveLv(n) { try { localStorage.setItem(KEY, String(Math.min(10, n))); } catch (e) {} }
  function readLinkedIn() {
    var a = document.querySelector('a[href*="linkedin.com/in"]');
    if (a) return a.getAttribute("href");
    try {
      var ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) { var p = JSON.parse(ld.textContent); if (p.sameAs) { for (var i = 0; i < p.sameAs.length; i++) if (String(p.sameAs[i]).includes("linkedin")) return p.sameAs[i]; } }
    } catch (e) {}
    return "https://benson.codeislaw.qzz.io";
  }
  function injectBtn() {
    if (document.querySelector(".rd-btn")) return;
    var tools = document.querySelector(".nav-tools"); if (!tools) return;
    var b = el("button", "rd-btn", "\u2708\uFE0F");
    b.type = "button";
    b.title = "Easter egg: RAIDEN (10 levels) / 彩蛋：雷电 10 关";
    b.setAttribute("aria-label", "Easter egg: Raiden shooter");
    b.addEventListener("click", open); tools.appendChild(b);
  }

  var W = 300, H = 420; // canvas 内部分辨率
  var R = null;

  function open() {
    if (document.getElementById("rd-game")) return;
    var ov = el("div", "mc-game-overlay"); ov.id = "rd-game";
    var frame = el("div", "mc-game-frame rd-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u2708\uFE0F"));
    title.appendChild(el("span", "mc-game-title-txt", "RAIDEN · 10 \u5173 / \u96F7\u7535"));
    var fsBtn = el("button", "rd-fsbtn", "\u26F6");
    fsBtn.type = "button"; fsBtn.title = "\u5168\u5C4F / Fullscreen";
    fsBtn.addEventListener("click", function () {
      if (!R) return;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var want = !R.frame.classList.contains("is-fs") && !document.fullscreenElement; // 显式目标态
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var p = R.frame.requestFullscreen && want && R.frame.requestFullscreen();
      if (p && p.catch) p.catch(function () { if (R) R.frame.classList.toggle("is-fs", want); }); // 非手势环境：伪全屏兜底
      setTimeout(function () { if (R && !document.fullscreenElement) R.frame.classList.toggle("is-fs", want); }, 140);
    });
    title.appendChild(fsBtn);
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { R && R.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var score = el("span", "mc-game-inv", "\u5206: 0");
    var lives = el("span", "ms-timer", "\u2708\uFE0F\u2708\uFE0F\u2708\uFE0F");
    var bombs = el("span", "ms-timer", "\u{1F4A3} 2");
    hud.appendChild(badge); hud.appendChild(score); hud.appendChild(bombs); hud.appendChild(lives);
    var bossBarWrap = el("div", "rd-bosswrap");
    bossBarWrap.style.display = "none";
    var bossFill = el("div", "rd-bossfill");
    bossBarWrap.appendChild(bossFill);
    var playRow = el("div", "rd-playrow");
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "rd-canvas";
    var side = el("div", "rd-side");
    side.appendChild(el("div", "mc-lc-sub", "\u706B\u529B Fire"));
    var fire = el("div", "rd-fire", "P1");
    side.appendChild(fire);
    side.appendChild(el("div", "mc-lc-sub", "\u5927\u7206\u96F7 Bomb"));
    var bombBtn = el("button", "rd-bombbtn", "\u{1F4A3} BOMB \u00D7 2");
    bombBtn.type = "button";
    bombBtn.title = "\u5927\u7206\u96F7\uFF1A\u6E05\u5168\u5C4F\u654C\u5F39+\u5168\u4F53\u4F24\u5BB3\uFF0C\u9677\u5165\u56F0\u5883\u65F6\u6551\u547D";
    bombBtn.addEventListener("click", function () { useBomb(); });
    side.appendChild(bombBtn);
    side.appendChild(el("div", "mc-lc-sub", "\u64CD\u4F5C"));
    side.appendChild(el("div", "rd-ops", "\u9F20\u6807\u60AC\u505C \u5168\u5411\u8DDF\u968F\n\u2190\u2191\u2193\u2192/WASD \u540C\u6548\n\u81EA\u52A8\u5F00\u706B \u00B7 B \u5927\u7206\u96F7\n\u89E6\u5C4F\u62D6\u52A8+\u70B8\u5F39\u6309\u94AE"));
    playRow.appendChild(canvas); playRow.appendChild(side);
    var panel = el("div", "mc-panel");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u9F20\u6807\u60AC\u505C=\u5168\u5411\u8DDF\u968F \u00B7 \u81EA\u52A8\u5F00\u706B \u00B7 B \u5927\u7206\u96F7\u6E05\u5C4F\u6551\u547D \u00B7 ESC \u5173\u95ED"));
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(bossBarWrap);
    frame.appendChild(playRow); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";

    R = {
      ov: ov, frame: frame, cv: canvas, ctx: canvas.getContext("2d"),
      panel: panel, badge: badge, scoreEl: score, livesEl: lives, bombsEl: bombs, bombBtn: bombBtn,
      bossWrap: bossBarWrap, bossFill: bossFill, fireEl: fire,
      lv: loadLv(), over: false, raf: null, key: null
    };
    R.onFs = function () { if (R) R.frame.classList.toggle("is-fs", !!document.fullscreenElement); };
    document.addEventListener("fullscreenchange", R.onFs);
    R.close = function () {
      if (!R) return;
      R.over = true;
      if (R.raf) cancelAnimationFrame(R.raf);
      if (R.key) document.removeEventListener("keydown", R.key);
      if (R.onFs) document.removeEventListener("fullscreenchange", R.onFs);
      if (R.keyUp) document.removeEventListener("keyup", R.keyUp);
      if (R.onBlur) window.removeEventListener("blur", R.onBlur);
      BGM.stop();
      if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
      var o = document.getElementById("rd-game"); if (o) o.remove();
      document.body.style.overflow = "";
      R = null;
    };
    R.key = function (e) {
      if (!R) return;
      if (e.key === "Escape") { R.close(); return; }
      if ((e.key === "b" || e.key === "B") && !e.repeat) { if (R.g && !R.g.over) useBomb(); }
      if ((e.key === "p" || e.key === "P") && !e.repeat) { if (R.g && !R.g.over) { R.g.paused = !R.g.paused; if (R.g.paused) BGM.stop(); else BGM.start(R.g.phase === "boss" || R.g.phase === "warn" ? "boss" : "normal"); } }
      if (R.g && !R.g.over) {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(e.key)) e.preventDefault();
        R.g.keys[e.key.toLowerCase()] = true;
        R.g.keys[e.key] = true;
      }
    };
    R.keyUp = function (e) { if (R && R.g) { R.g.keys[e.key.toLowerCase()] = false; R.g.keys[e.key] = false; } };
    document.addEventListener("keydown", R.key);
    document.addEventListener("keyup", R.keyUp);
    R.onBlur = function () { if (R && R.g) R.g.keys = {}; };
    window.addEventListener("blur", R.onBlur);
    ov.addEventListener("click", function (e) { if (e.target === ov && R) R.close(); });
    showCard(R.lv);
  }

  function showCard(lv) {
    if (!R) return;
    R.g = null; // 结束/待机态：停用旧对局渲染（RAF 循环画待机画面）
    var d = LV[lv - 1];
    R.panel.classList.add("is-show"); R.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10"));
    card.appendChild(el("div", "mc-lc-name", "\u2708 " + d.name));
    card.appendChild(el("div", "mc-lc-tip",
      "\u6D88\u706D\u654C\u673A\uFF0CBOSS \u767B\u573A\uFF08WARNING!\uFF09\u540E\u51FB\u8D25\u5B83\u8FC7\u5173\u3002\u5B9D\u7269\uFF1A\u84DD P \u5347\u706B\u529B\uFF08\u6700\u591A\u4E94\u5411\uFF09\u3001\u6A59 B \u52A0\u70B8\u5F39\u3001\u7EFF 1 \u52A0\u547D\u3001\u9EC4\u661F\u52A0\u5206\u3002\u9677\u5165\u5F39\u5E55\u56F4\u56F0\u65F6\u6309 B \uFF08\u6216\u70B9\u53F3\u4FA7 \u{1F4A3} \u6309\u94AE\uFF09\u91CA\u653E\u5927\u7206\u96F7\uFF1A\u6E05\u5168\u5C4F\u654C\u5F39+\u5168\u4F53\u4F24\u5BB3+\u77ED\u6682\u65E0\u654C \u2014\u2014 \u6BCF\u5173\u914D 2 \u679A\uFF0C\u4E0A\u9650 5 \u679A\uFF0C\u4E13\u6CBB\u5404\u79CD\u88AB\u56F4\u6B7B\u3002\u547D\u4E0E\u70B8\u5F39\u6BCF\u5173\u91CD\u7F6E\uFF08\u547D 3 \u6761\u3001\u70B8\u5F39 2 \u679A\uFF09\u3002"));
    var best = Number(localStorage.getItem("rd_best_" + lv)) || 0;
    if (best) card.appendChild(el("div", "mc-lc-stat", "\u{1F3C6} \u672C\u5173\u6700\u4F73 " + best + "\u5206"));
    card.appendChild(el("div", "mc-lc-stat", "\u2708\uFE0F\u2708\uFE0F\u2708\uFE0F \u6BCF\u5173\u914D 3 \u6761\u547D \u00B7 \u914D\u4E50 BGM \u5DF2\u5F00"));
    var b = el("button", "mc-lc-start", "\u2708 \u8D77\u98DE \u00B7 START");
    b.type = "button";
    b.addEventListener("click", function () { start(lv); });
    card.appendChild(b);
    R.panel.appendChild(card);
    R.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
    R.scoreEl.textContent = "\u5206: 0";
    R.livesEl.textContent = "\u2708\uFE0F\u2708\uFE0F\u2708\uFE0F";
    R.fireEl.textContent = "P1";
    R.bossWrap.style.display = "none";
    BGM.stop();
    drawIdle();
  }

  // ---- 游戏状态 ----
  function start(lv) {
    if (!R) return;
    var d = LV[lv - 1];
    R.lv = lv;
    R.g = {
      lv: lv, def: d, paused: false, over: false, t: 0, score: 0,
      keys: {}, px: W / 2, py: H - 60, power: 1, lives: 3, bombs: 2, bombCd: 0, bombFlash: 0, inv: INV_MS,
      shots: [], eshots: [], enemies: [], parts: [], stars: [],
      spawnT: 0, phase: "waves", phaseT: 0, boss: null, warn: 0,
      bossT: 0, shake: 0, best: 0
    };
    for (var i = 0; i < 52; i++) {
      var layer = i < 24 ? 0 : (i < 42 ? 1 : 2);
      var cfg = [
        { v: 0.5,  c: "#2a355c", s: 1, tw: 0 },
        { v: 1.1,  c: "#5d6fa8", s: 1, tw: 0 },
        { v: 2.3,  c: "#c7d2ff", s: 2, tw: 40 + Math.floor(Math.random() * 60) }
      ][layer];
      R.g.stars.push({ x: Math.random() * W, y: Math.random() * H, layer: layer, v: cfg.v * (0.8 + Math.random() * 0.5), s: cfg.s, c: cfg.c, tw: cfg.tw });
    }
    R.g.nebulae = [];
    for (var nI = 0; nI < 3; nI++) {
      R.g.nebulae.push({ x: Math.random() * (W - 90), y: Math.random() * H, w: 60 + Math.random() * 70, h: 40 + Math.random() * 60,
        v: 0.25 + Math.random() * 0.3, c: nI === 0 ? "rgba(70,50,120,0.20)" : (nI === 1 ? "rgba(30,60,110,0.18)" : "rgba(90,40,90,0.16)") });
    }
    R.g.shocks = [];
    R.panel.classList.remove("is-show");
    R.scoreEl.textContent = "\u5206: 0";
    R.livesEl.textContent = "\u2708\uFE0F\u2708\uFE0F\u2708\uFE0F";
    R.fireEl.textContent = "P1";
    updateBombHud();
    R.bossWrap.style.display = "none";
    BGM.start("normal");
    // 触屏拖动
    // 指针控制：鼠标/笔 = 悬停全向跟随（无需按键，可完美替代键盘）；触屏 = 拖动跟随（飞机在手指上方）
    R.cv.onpointerdown = R.cv.onpointermove = function (e) {
      if (!R || !R.g || R.g.over) return;
      var rect = R.cv.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (W / rect.width);
      var y = (e.clientY - rect.top) * (H / rect.height);
      var g = R.g;
      if (e.pointerType === "touch") {
        g.px = Math.max(14, Math.min(W - 14, x));
        g.py = Math.max(20, Math.min(H - 20, y - 14));
      } else {
        g.px = Math.max(14, Math.min(W - 14, x));
        g.py = Math.max(20, Math.min(H - 20, y));
      }
      g.touching = e.buttons > 0;
    };
    R.cv.onpointerup = function () { if (R && R.g) R.g.touching = false; };
    if (!R.raf) loop();
  }

  var lastTs = 0;
  function loop(ts) {
    R.raf = requestAnimationFrame(loop);
    if (!R || !R.g) { lastTs = 0; return; }
    var g = R.g;
    var dt = lastTs ? Math.min(50, ts - lastTs) : 16.7; // 毫秒，切页跳帧钳制
    lastTs = ts;
    if (!g.paused && !g.over && !R.panel.classList.contains("is-show")) step(dt);
    draw();
  }

  var WAVE_MS = 22000, INV_MS = 2400, WARN_MS = 2100;
  function step(dt) {
    var g = R.g, d = g.def;
    var f = dt / 16.7; // 60fps 基准因子：所有速度量乘 f，计时量用毫秒 —— 帧率无关
    g.t += f;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - f);
    // 星空 / 星云
    g.stars.forEach(function (s) { s.y += s.v * f; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } });
    g.nebulae.forEach(function (n) { n.y += n.v * f; if (n.y > H) { n.y = -n.h; n.x = Math.random() * (W - 90); } });
    // 玩家移动
    var sp = 3.2 * f;
    if (g.keys["arrowleft"] || g.keys["a"]) g.px -= sp;
    if (g.keys["arrowright"] || g.keys["d"]) g.px += sp;
    if (g.keys["arrowup"] || g.keys["w"]) g.py -= sp;
    if (g.keys["arrowdown"] || g.keys["s"]) g.py += sp;
    g.px = Math.max(14, Math.min(W - 14, g.px));
    g.py = Math.max(24, Math.min(H - 18, g.py));
    if (g.inv > 0) g.inv -= dt;
    if (g.bombCd > 0) g.bombCd -= dt;
    if (g.bombFlash > 0) g.bombFlash -= dt;
    // 自动开火（100ms 一轮，帧率无关）
    g.fireMs = (g.fireMs || 0) + dt;
    if (g.fireMs >= 100) { g.fireMs = 0; fire(); }
    // 玩家子弹
    g.shots.forEach(function (s) { s.x += s.vx * f; s.y += s.vy * f; });
    g.shots = g.shots.filter(function (s) { return s.y > -10 && s.x > -10 && s.x < W + 10; });
    // 出敌（wave 阶段，22 秒后 Boss）
    if (g.phase === "waves") {
      g.phaseT += dt;
      g.spawnT += dt;
      if (g.spawnT >= d.spawn) {
        g.spawnT = 0;
        var type = d.mix[Math.floor(Math.random() * d.mix.length)];
        spawnEnemy(type);
      }
      if (g.phaseT >= WAVE_MS && !g.boss) { startWarn(); }
    }
    // WARNING 倒计时 → 出 Boss
    if (g.warn > 0) {
      g.warn -= dt;
      if (g.warn <= 0) { g.warn = 0; spawnBoss(); }
    }
    // 敌机
    g.enemies.forEach(function (e) {
      e.t += f;
      if (e.type === "pw") { e.y += e.vy * f; return; }
      if (e.type === "drop") { e.y += e.vy * f; }
      else if (e.type === "sine") { e.y += e.vy * 0.7 * f; e.x = e.cx + Math.sin(e.t * 0.05) * 60; }
      else if (e.type === "dive") { e.y += (e.vy + e.t * 0.04) * f; }
      else if (e.type === "hover") {
        if (e.y < e.stopY) e.y += e.vy * f;
        else {
          e.shootMs = (e.shootMs || 0) + dt;
          if (e.shootMs >= Math.max(1000, Math.round(g.def.brate / 4))) { e.shootMs = 0; var v = aim(e.x, e.y + 10); eshoot(e.x, e.y + 10, v.vx, v.vy); }
        }
        if (e.t > 320) e.y += 2.5 * f;
      }
      if (e.hp === 1 && Math.random() < 0.02 * f) burst(e.x + (Math.random() - 0.5) * 10, e.y - 6, "#555b70", 1); // 受损冒烟
      if (e.hp <= 0) return;
      // 敌机撞玩家（pw 是补给，不撞）
      if (e.type !== "pw" && g.inv <= 0 && Math.abs(e.x - g.px) < 18 && Math.abs(e.y - g.py) < 18) hitPlayer();
    });
    g.enemies = g.enemies.filter(function (e) { return e.y < H + 30 && e.hp > 0; });
    // 敌弹
    g.eshots.forEach(function (s) { s.x += s.vx * f; s.y += s.vy * f; });
    g.eshots = g.eshots.filter(function (s) { return s.y < H + 10 && s.x > -10 && s.x < W + 10 && s.y > -10; });
    // 玩家弹 × 敌机 / Boss
    g.shots.forEach(function (s) {
      if (s.dead) return;
      g.enemies.forEach(function (e) {
        if (e.hp <= 0 || s.dead || e.type === "pw") return; // 补给不吃子弹
        if (Math.abs(s.x - e.x) < 16 && Math.abs(s.y - e.y) < 16) {
          s.dead = true; e.hp--; SFX.boomS();
          if (e.hp <= 0) killEnemy(e);
          else burst(s.x, s.y, "#ffff55", 3);
        }
      });
      if (!s.dead && g.boss && g.boss.hp > 0) {
        var b = g.boss;
        if (Math.abs(s.x - b.x) < 34 && Math.abs(s.y - (b.y + 14)) < 22) {
          s.dead = true; b.hp--; SFX.boomS();
          burst(s.x, s.y, "#ffff55", 3);
          R.bossFill.style.width = Math.max(0, b.hp / b.maxHp * 100) + "%";
          if (b.hp <= 0) bossDie();
        }
      }
    });
    g.shots = g.shots.filter(function (s) { return !s.dead; });
    // 玩家吃宝：P 火力 / B 炸弹 / 1UP 加命 / STAR 分数
    g.enemies.forEach(function (e) {
      if (e.type === "pw" && Math.abs(e.x - g.px) < 18 && Math.abs(e.y - g.py) < 18) {
        e.hp = 0;
        var kind = e.kind || "P";
        if (kind === "P") {
          if (g.power < 4) { g.power++; R.fireEl.textContent = "P" + g.power; }
          g.score += 50;
          SFX.pick();
          burst(g.px, g.py, "#4fd8ff", 8);
        } else if (kind === "B") {
          if (g.bombs < 5) g.bombs++;
          updateBombHud();
          SFX.pick();
          burst(g.px, g.py, "#ff7043", 10);
        } else if (kind === "1UP") {
          if (g.lives < 5) g.lives++;
          R.livesEl.textContent = "\u2708\uFE0F".repeat(Math.min(g.lives, 5));
          SFX.oneup();
          burst(g.px, g.py, "#5ea832", 12);
        } else {
          g.score += 80;
          SFX.star();
          burst(g.px, g.py, "#ffff55", 5);
        }
        R.scoreEl.textContent = "\u5206: " + g.score;
      }
    });
    // 敌弹 × 玩家
    if (g.inv <= 0) {
      for (var i = 0; i < g.eshots.length; i++) {
        var s = g.eshots[i];
        if (Math.abs(s.x - g.px) < 12 && Math.abs(s.y - g.py) < 14) { g.eshots.splice(i, 1); hitPlayer(); break; }
      }
    }
    // Boss 移动/弹幕
    if (g.boss && g.boss.hp > 0) {
      var b = g.boss;
      b.t += f;
      b.x += b.dir * b.spd * f;
      if (b.x < 40 || b.x > W - 40) b.dir *= -1;
      b.y = 46 + Math.sin(b.t * 0.02) * 8;
      b.shootMs = (b.shootMs || 0) + dt;
      if (b.shootMs >= Math.max(900, Math.round(g.def.brate / 3))) {
        b.shootMs = 0;
        var n = 3 + Math.floor((g.lv - 1) / 3); // 弹幕密度渐进：L1-3:3 L4-6:4 L7-9:5 L10:6
        for (var k = 0; k < n; k++) {
          var ang = Math.PI / 2 + (k - (n - 1) / 2) * 0.28;
          eshoot(b.x, b.y + 20, Math.cos(ang) * 2.2, Math.sin(ang) * 2.2);
        }
        beep(300, 0.05, "square", 0.03);
      }
      // Boss 体碰（贴脸也会受伤）
      if (g.inv <= 0 && Math.abs(b.x - g.px) < 30 && Math.abs(b.y + 10 - g.py) < 22) hitPlayer();
    }
    // 粒子 / 冲击波
    g.parts.forEach(function (p) { p.x += p.vx * f; p.y += p.vy * f; p.life -= f; });
    g.parts = g.parts.filter(function (p) { return p.life > 0; });
    g.shocks.forEach(function (s) { s.r += 2.6 * f; s.life -= f; });
    g.shocks = g.shocks.filter(function (s) { return s.life > 0; });
  }

  function fire() {
    var g = R.g, p = g.power;
    var v = -7.5;
    if (p === 1) shot(g.px, g.py - 14, 0, v);
    else if (p === 2) { shot(g.px - 6, g.py - 12, 0, v); shot(g.px + 6, g.py - 12, 0, v); }
    else if (p === 3) { shot(g.px, g.py - 14, 0, v); shot(g.px - 8, g.py - 10, -1.1, v); shot(g.px + 8, g.py - 10, 1.1, v); }
    else { shot(g.px, g.py - 14, 0, v); shot(g.px - 7, g.py - 12, -0.6, v); shot(g.px + 7, g.py - 12, 0.6, v); shot(g.px - 11, g.py - 8, -1.6, v * 0.92); shot(g.px + 11, g.py - 8, 1.6, v * 0.92); }
    SFX.shot();
  }
  function shot(x, y, vx, vy) { R.g.shots.push({ x: x, y: y, vx: vx, vy: vy }); }

  function spawnEnemy(type) {
    var g = R.g, d = g.def;
    var x = 30 + Math.random() * (W - 60), y = -20;
    var e = { type: type, x: x, y: y, hp: d.ehp, t: 0, vy: 1.1 * d.esp, cx: x };
    if (type === "dive") e.vy = 0.9 * d.esp;
    if (type === "hover") { e.stopY = 60 + Math.random() * 100; e.vy = 1.2 * d.esp; }
    // 掉落 roll：P 火力 / B 炸弹 / 1UP 加命 / STAR 分数星
    e.drop = rollDrop();
    g.enemies.push(e);
  }
  function rollDrop() {
    var r = Math.random();
    if (r < 0.05) return "B";
    if (r < 0.065) return "1UP";
    if (r < 0.205) return "P";
    if (r < 0.48) return "STAR";
    return null;
  }
  function killEnemy(e) {
    var g = R.g;
    g.score += 100;
    R.scoreEl.textContent = "\u5206: " + g.score;
    burst(e.x, e.y, "#ff7043", e.type === "hover" ? 12 : 8);
    SFX.boomS();
    if (e.drop) R.g.enemies.push({ type: "pw", kind: e.drop, x: e.x, y: e.y, hp: 999, t: 0, vy: 1.2, drop: false });
  }
  function eshoot(x, y, vx, vy) { R.g.eshots.push({ x: x, y: y, vx: vx, vy: vy }); }
  function aim(x, y) {
    var g = R.g;
    var dx = g.px - x, dy = g.py - y;
    var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    return { vx: dx / len * 2.1, vy: dy / len * 2.1 };
  }

  function startWarn() {
    var g = R.g;
    g.phase = "warn"; g.warn = WARN_MS;
    g.enemies.length = 0; g.eshots.length = 0;
    SFX.warn();
    BGM.start("boss"); // Boss 战配乐（更紧张的低音序列）
  }
  function spawnBoss() {
    var g = R.g;
    g.boss = { x: W / 2, y: -40, hp: g.def.boss, maxHp: g.def.boss, dir: 1.4, spd: 1 + g.lv * 0.08, t: 0 };
    g.phase = "boss";
    R.bossWrap.style.display = "";
    R.bossFill.style.width = "100%";
  }
  function bossDie() {
    var g = R.g;
    g.score += 2000 * g.lv;
    R.scoreEl.textContent = "\u5206: " + g.score;
    var bx = g.boss.x, by = g.boss.y;
    g.shocks.push({ x: bx, y: by, r: 6, life: 26, c: "#f0b90b" });
    g.eshots.length = 0; // 清场：Boss 死后残余弹幕不再误伤
    for (var i = 0; i < 5; i++) (function (k) {
      setTimeout(function () { if (!R || R.g !== g) return; burst(bx + (Math.random() - 0.5) * 50, by + (Math.random() - 0.5) * 30, "#ffff55", 14); SFX.boomB(); shake(); }, k * 160);
    })(i);
    R.bossWrap.style.display = "none";
    g.boss = null;
    setTimeout(function () { if (R && R.g === g && !g.over) levelClear(); }, 900);
  }
  // 大爆雷：清全屏敌弹 + 全体伤害 + 短暂无敌 —— 陷入困境时救命
  function useBomb() {
    if (!R || !R.g || R.g.over || R.g.bombs <= 0 || R.g.bombCd > 0) return;
    var g = R.g;
    g.bombs--;
    updateBombHud();
    g.bombCd = 500; g.bombFlash = 420;
    g.eshots.length = 0; // 清全屏敌弹
    g.inv = Math.max(g.inv, 1400); // 1.4s 无敌
    g.enemies.slice().forEach(function (e) {
      if (e.type === "pw") return;
      e.hp -= 3;
      if (e.hp <= 0) killEnemy(e); else burst(e.x, e.y, "#ffff55", 4);
    });
    if (g.boss && g.boss.hp > 0) {
      g.boss.hp -= 12;
      R.bossFill.style.width = Math.max(0, g.boss.hp / g.boss.maxHp * 100) + "%";
      if (g.boss.hp <= 0) bossDie();
    }
    g.shocks.push({ x: g.px, y: g.py, r: 8, life: 40, c: "#f0b90b" });
    g.shocks.push({ x: g.px, y: g.py, r: 20, life: 34, c: "rgba(255,255,255,0.9)" });
    g.shocks.push({ x: W / 2, y: H / 2, r: 30, life: 46, c: "#f0b90b" });
    shake(); shake();
    SFX.bomb();
  }
  function updateBombHud() {
    if (R && R.g) {
      R.bombsEl.textContent = "\u{1F4A3} " + R.g.bombs;
      if (R.bombBtn) { R.bombBtn.textContent = "\u{1F4A3} BOMB \u00D7 " + R.g.bombs; R.bombBtn.disabled = R.g.bombs <= 0; }
    }
  }
  function hitPlayer() {
    var g = R.g;
    if (g.lives > 0) g.lives--;
    R.livesEl.textContent = "\u2708\uFE0F".repeat(Math.max(0, g.lives));
    g.power = Math.max(1, g.power - 1);
    R.fireEl.textContent = "P" + g.power;
    burst(g.px, g.py, "#5ea832", 14);
    SFX.hit(); shake();
    g.eshots.length = 0;
    g.px = W / 2; g.py = H - 60; g.inv = INV_MS;
    if (g.lives <= 0) gameOver();
  }
  function gameOver() {
    var g = R.g; g.over = true; BGM.stop();
    SFX.boomB();
    R.panel.classList.add("is-show"); R.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "GAME OVER / \u5760\u673A"));
    card.appendChild(el("div", "mc-lc-stat", "\u{1F3AF} \u5F97\u5206 " + g.score + " \u00B7 Lv " + g.lv));
    var b = el("button", "mc-lc-start", "\u{1F504} \u91CD\u98DE \u00B7 RETRY");
    b.type = "button";
    b.addEventListener("click", function () { start(g.lv); });
    card.appendChild(b);
    R.panel.appendChild(card);
  }
  function levelClear() {
    var g = R.g;
    if (!g || g.over) return; // 兜底：坠机后不覆盖 GAME OVER
    g.over = true; BGM.stop();
    var lv = g.lv, sc = g.score;
    var prev = Number(localStorage.getItem("rd_best_" + lv)) || 0;
    if (sc > prev) { try { localStorage.setItem("rd_best_" + lv, String(sc)); } catch (e) {} }
    saveLv(lv + 1);
    SFX.clear(); confetti();
    R.panel.classList.add("is-show"); R.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-ach-title", "LEVEL " + lv + " CLEAR! / \u7B2C " + lv + " \u5173\u901A\u5173\uFF01"));
    card.appendChild(el("div", "mc-lc-stat", "\u{1F3AF} " + sc + "\u5206 \u00B7 " + (sc > prev ? "\u{1F389}NEW RECORD!" : "\u6700\u4F73 " + prev)));
    var b = el("button", "mc-lc-start", lv < 10 ? "\u4E0B\u4E00\u5173 \u2192" : "\u{1F3C6} \u9886\u53D6\u5956\u52B1 \u00B7 REWARD");
    b.type = "button";
    b.addEventListener("click", function () { if (lv < 10) showCard(lv + 1); else reward(); });
    card.appendChild(b);
    R.panel.appendChild(card);
  }
  function reward() {
    var url = readLinkedIn();
    SFX.win(); confetti();
    R.panel.textContent = "";
    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-icon", "\u{1F517}"));
    card.appendChild(el("div", "mc-ach-title", "ACE PILOT! / \u738B\u724C\u98DE\u884C\u5458"));
    card.appendChild(el("div", "mc-ach-desc", "10 \u5173\u5168\u901A \u2014 \u5956\u52B1\uFF1A\u6C42\u804C\u8005\u7684 LinkedIn / Your reward"));
    var row = el("div", "mc-win-phone");
    row.appendChild(el("span", "mc-win-num", url));
    var cp = el("button", "mc-win-copy", "Copy / \u590D\u5236"); cp.type = "button";
    cp.addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText(url); cp.textContent = "OK \u2713"; setTimeout(function () { cp.textContent = "Copy / \u590D\u5236"; }, 1600); });
    row.appendChild(cp); card.appendChild(row);
    card.appendChild(el("div", "mc-ach-desc mc-win-hint", "\u26CF \u6316\u77FF=\u7535\u8BDD \u00B7 \u{1F4A3}\u25A6\u{1F0CF}=\u90AE\u7BB1 \u00B7 \u2708 \u96F7\u7535=LinkedIn \u2014 \u5168\u90E8\u96C6\u9F50\uFF01"));
    var c = el("button", "mc-win-close", "Close / \u5173\u95ED"); c.type = "button";
    c.addEventListener("click", function () { R && R.close(); }); card.appendChild(c);
    R.panel.appendChild(card);
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

  // 爆炸粒子（canvas 内绘制，不进 DOM —— 雷电高频爆炸不走 DOM 粒子）
  var BOOM_COLORS = ["#ffff55", "#ff7043", "#f0b90b", "#ffffff"];
  function burst(x, y, color, n) {
    var g = R.g;
    g.shocks.push({ x: x, y: y, r: 3, life: 16, c: "rgba(255,255,255,0.85)" });
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var v = 1 + Math.random() * 3;
      var c = i % 2 === 0 ? color : BOOM_COLORS[i % BOOM_COLORS.length];
      g.parts.push({ x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 14 + Math.random() * 12, c: c });
    }
  }
  function shake() { var g = R.g; if (g) g.shake = 10; }

  // ---- 渲染 ----
  function drawIdle() {
    if (!R) return;
    var ctx = R.ctx;
    ctx.fillStyle = "#0b0d16"; ctx.fillRect(0, 0, W, H);
    drawShip(ctx, W / 2, H - 60, "#5ea832", 1.4);
  }
  function drawShip(ctx, x, y, color, s) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 3 * s, y - 9 * s, 6 * s, 15 * s);       // 机身
    ctx.fillRect(x - 11 * s, y + 1 * s, 8 * s, 6 * s);      // 左后掠翼
    ctx.fillRect(x + 3 * s, y + 1 * s, 8 * s, 6 * s);       // 右后掠翼
    ctx.fillStyle = "#2e5a18";
    ctx.fillRect(x - 12 * s, y - 2 * s, 2 * s, 5 * s);      // 翼尖导弹
    ctx.fillRect(x + 10 * s, y - 2 * s, 2 * s, 5 * s);
    ctx.fillStyle = "#4fd8ff";
    ctx.fillRect(x - 2 * s, y - 7 * s, 4 * s, 4 * s);       // 座舱
    ctx.fillStyle = "#ffff55";
    ctx.fillRect(x - 2 * s, y - 12 * s, 4 * s, 3 * s);      // 机头
    ctx.fillStyle = Math.random() < 0.5 ? "#f0b90b" : "#ff7043";
    ctx.fillRect(x - 4 * s, y + 7 * s, 2 * s, 2 * s + Math.random() * 3 * s);  // 双引擎焰
    ctx.fillRect(x + 2 * s, y + 7 * s, 2 * s, 2 * s + Math.random() * 3 * s);
  }
  function draw() {
    if (!R) return;
    var ctx = R.ctx, g = R.g;
    var ox = 0, oy = 0;
    if (g && g.shake > 0) { ox = (Math.random() - 0.5) * g.shake; oy = (Math.random() - 0.5) * g.shake; }
    ctx.fillStyle = "#0b0d16";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(ox, oy);
    if (!g) { ctx.restore(); drawIdle(); return; }
    // 星云
    g.nebulae.forEach(function (n) { ctx.fillStyle = n.c; ctx.fillRect(n.x, n.y, n.w, n.h); });
    // 雷达网格（缓慢下移）
    ctx.strokeStyle = "rgba(90,110,170,0.10)";
    ctx.lineWidth = 1;
    var gy = (g.t * 1.1) % 40;
    for (var yy = -40 + gy; yy < H; yy += 40) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
    for (var xx = 15; xx < W; xx += 30) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, H); ctx.stroke(); }
    // 三层星空（近层闪烁）
    g.stars.forEach(function (s) {
      var tw = s.tw && (g.t % (s.tw * 2) < s.tw);
      ctx.fillStyle = tw ? "#ffffff" : s.c;
      ctx.fillRect(s.x, s.y, s.s, s.s + (s.layer === 2 ? 2 : 1));
    });
    // 掉落宝物（发光底 + 字母：P 火力 / B 炸弹 / 1 加命 / 星 分数）
    var PW_STYLE = {
      P:    { bg: "#4fd8ff", glow: "rgba(79,216,255,0.4)",  txt: "P",  tc: "#0b3a52" },
      B:    { bg: "#ff7043", glow: "rgba(255,112,67,0.4)",  txt: "B",  tc: "#54220e" },
      "1UP":{ bg: "#5ea832", glow: "rgba(94,168,50,0.4)",   txt: "1",  tc: "#12300a" },
      STAR: { bg: "#ffff55", glow: "rgba(255,255,85,0.35)", txt: "\u2605", tc: "#6b5a00" }
    };
    g.enemies.forEach(function (e) {
      if (e.type === "pw") {
        var st = PW_STYLE[e.kind || "P"];
        var bob = Math.sin(e.t * 0.15) * 2;
        ctx.fillStyle = st.glow;
        ctx.fillRect(e.x - 10, e.y - 10 + bob, 20, 20);
        ctx.fillStyle = st.bg;
        ctx.fillRect(e.x - 7, e.y - 7 + bob, 14, 14);
        ctx.fillStyle = st.tc;
        ctx.font = '9px "MinecraftPixel", monospace';
        ctx.textAlign = "center";
        ctx.fillText(st.txt, e.x, e.y + 3 + bob);
      }
    });
    // 敌机（四种造型）
    g.enemies.forEach(function (e) {
      if (e.type === "pw") return;
      if (e.type === "drop") {
        ctx.fillStyle = "#e05252";
        ctx.fillRect(e.x - 7, e.y - 7, 14, 9);
        ctx.fillRect(e.x - 4, e.y + 2, 8, 7);
        ctx.fillStyle = "#8a1f1f";
        ctx.fillRect(e.x - 9, e.y - 5, 3, 5);
        ctx.fillRect(e.x + 6, e.y - 5, 3, 5);
      } else if (e.type === "sine") {
        ctx.fillStyle = "#d946ef";
        ctx.fillRect(e.x - 10, e.y - 4, 6, 8);
        ctx.fillRect(e.x + 4, e.y - 4, 6, 8);
        ctx.fillStyle = "#9c27b0";
        ctx.fillRect(e.x - 4, e.y - 6, 8, 10);
      } else if (e.type === "dive") {
        ctx.fillStyle = "#ff7043";
        ctx.fillRect(e.x - 5, e.y - 8, 10, 6);
        ctx.fillRect(e.x - 3, e.y - 2, 6, 8);
        ctx.fillRect(e.x - 1, e.y + 6, 2, 4);
      } else {
        ctx.fillStyle = "#c62828";
        ctx.fillRect(e.x - 10, e.y - 5, 20, 10);
        ctx.fillRect(e.x - 14, e.y - 2, 5, 5);
        ctx.fillRect(e.x + 9, e.y - 2, 5, 5);
        ctx.fillStyle = "#ffff55";
        ctx.fillRect(e.x - 2, e.y + 3, 4, 4);
      }
    });
    // Boss（多层舰体 + 核心脉冲 + 炮塔 + 受损反馈）
    if (g.boss) {
      var b = g.boss;
      ctx.fillStyle = "#5c1440";
      ctx.fillRect(b.x - 32, b.y - 12, 64, 26);
      ctx.fillStyle = "#8a1f5c";
      ctx.fillRect(b.x - 26, b.y - 8, 52, 20);
      ctx.fillRect(b.x - 44, b.y - 2, 14, 14);
      ctx.fillRect(b.x + 30, b.y - 2, 14, 14);
      var pulse = 4 + Math.floor(g.t / 6) % 3;
      ctx.fillStyle = "#d946ef";
      ctx.fillRect(b.x - pulse, b.y + 2, pulse * 2, pulse);
      ctx.fillStyle = "#ffff55";
      ctx.fillRect(b.x - 22, b.y + 6, 6, 5);
      ctx.fillRect(b.x + 16, b.y + 6, 6, 5);
      if (b.hp < b.maxHp * 0.5 && Math.random() < 0.02 * f) burst(b.x + (Math.random() - 0.5) * 50, b.y + 12, "#555b70", 2);
      if (b.hp < b.maxHp * 0.25 && Math.floor(g.t / 5) % 2 === 0) {
        ctx.fillStyle = "rgba(255,85,85,0.35)";
        ctx.fillRect(b.x - 32, b.y - 12, 64, 26);
      }
    }
    // 玩家
    var blink = g.inv > 0 && Math.floor(g.inv / 120) % 2 === 0;
    if (!blink) drawShip(ctx, g.px, g.py, "#5ea832", 1);
    // 玩家弹（光晕 + 白芯）
    g.shots.forEach(function (s) {
      ctx.fillStyle = "rgba(255,255,85,0.35)";
      ctx.fillRect(s.x - 3, s.y - 8, 6, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x - 1.5, s.y - 6, 3, 8);
    });
    // 敌弹（红光晕 + 白芯）
    g.eshots.forEach(function (s) {
      ctx.fillStyle = "rgba(255,85,85,0.4)";
      ctx.fillRect(s.x - 4, s.y - 4, 8, 8);
      ctx.fillStyle = "#ff5555";
      ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
    });
    // 冲击波
    g.shocks.forEach(function (s) {
      ctx.globalAlpha = Math.max(0, s.life / 16);
      ctx.strokeStyle = s.c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // 爆炸粒子
    g.parts.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 24);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;
    // 大爆雷全屏白闪
    if (g.bombFlash > 0) {
      ctx.globalAlpha = Math.min(0.85, g.bombFlash / 420);
      ctx.fillStyle = "#fff8e1";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // WARNING（红色条纹带 + 大字 + 副标）
    if (g.warn > 0 && Math.floor(g.warn / 140) % 2 === 0) {
      ctx.fillStyle = "rgba(255,85,85,0.22)";
      ctx.fillRect(0, H / 2 - 58, W, 22);
      ctx.fillRect(0, H / 2 + 26, W, 22);
      ctx.fillStyle = "#ff5555";
      ctx.font = '18px "MinecraftPixel", monospace';
      ctx.textAlign = "center";
      ctx.fillText("W A R N I N G", W / 2, H / 2 - 8);
      ctx.font = '8px "MinecraftPixel", monospace';
      ctx.fillStyle = "#ffb0b0";
      ctx.fillText("LARGE ENEMY APPROACHING", W / 2, H / 2 + 12);
    }
    // 暗角
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, 8);
    ctx.fillRect(0, H - 8, W, 8);
    ctx.fillRect(0, 0, 8, H);
    ctx.fillRect(W - 8, 0, 8, H);
    ctx.restore();
  }

  // ?test=1 自动化钩子
  if (location.search.indexOf("test=1") >= 0) {
    window.__rdTest = {
      state: function () { return R && R.g; },
      start: function (lv) { start(lv); },
      card: function (lv) { showCard(lv); },
      solve: function () { // 直接把 boss 打空触发真实 bossDie→levelClear 链
        if (!R || !R.g || R.g.over) return false;
        if (R.g.phase === "waves") { R.g.phaseT = 60 * 22; startWarn(); }
        if (R.g.warn > 0) R.g.warn = 1;
        if (R.g.boss) { R.g.boss.hp = 1; }
        return true;
      },
      killBoss: function () { if (R && R.g && R.g.boss) { R.g.boss.hp = 0; bossDie(); } },
      bomb: function () { useBomb(); }
    };
  }

  function init() { if (isMC()) injectBtn(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
