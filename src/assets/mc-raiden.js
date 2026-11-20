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
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.1, "square", 0.05, i * 0.08); }); },
    win:   function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.15, "square", 0.06, i * 0.11); }); }
  };

  var LV = [
    { name: "起飞 · Takeoff",      spawn: 1400, ehp: 1, esp: 1.2, brate: 2600, boss: 26,  mix: ["drop"] },
    { name: "巡逻 · Patrol",       spawn: 1250, ehp: 1, esp: 1.4, brate: 2400, boss: 34,  mix: ["drop", "sine"] },
    { name: "遭遇 · Skirmish",     spawn: 1100, ehp: 2, esp: 1.6, brate: 2200, boss: 42,  mix: ["drop", "sine", "dive"] },
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
    var b = el("button", "rd-btn", "\u2708");
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
    title.appendChild(el("span", null, "\u2708"));
    title.appendChild(el("span", "mc-game-title-txt", "RAIDEN · 10 \u5173 / \u96F7\u7535"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { R && R.close(); }); title.appendChild(x);
    var hud = el("div", "mc-game-hud");
    var badge = el("span", "mc-lv-badge", "Lv --");
    var score = el("span", "mc-game-inv", "\u5206: 0");
    var lives = el("span", "ms-timer", "\u2708\u2708\u2708");
    hud.appendChild(badge); hud.appendChild(score); hud.appendChild(lives);
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
    side.appendChild(el("div", "mc-lc-sub", "\u64CD\u4F5C"));
    side.appendChild(el("div", "rd-ops", "\u2190\u2191\u2193\u2192/WASD \u79FB\u52A8\n\u81EA\u52A8\u5F00\u706B\nP \u6682\u505C\n\u89E6\u5C4F\u62D6\u52A8\u540C\u6837\u53EF\u73A9"));
    playRow.appendChild(canvas); playRow.appendChild(side);
    var panel = el("div", "mc-panel");
    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "\u81EA\u52A8\u5F00\u706B \u00B7 \u5403 P \u5347\u706B\u529B \u00B7 \u51FB\u8D25 BOSS \u8FC7\u5173 \u00B7 \u88AB\u51FB\u4E2D\u6389\u4E00\u7EA7\u706B\u529B \u00B7 ESC \u5173\u95ED"));
    frame.appendChild(title); frame.appendChild(hud); frame.appendChild(bossBarWrap);
    frame.appendChild(playRow); frame.appendChild(panel); frame.appendChild(help);
    ov.appendChild(frame); document.body.appendChild(ov); document.body.style.overflow = "hidden";

    R = {
      ov: ov, frame: frame, cv: canvas, ctx: canvas.getContext("2d"),
      panel: panel, badge: badge, scoreEl: score, livesEl: lives,
      bossWrap: bossBarWrap, bossFill: bossFill, fireEl: fire,
      lv: loadLv(), over: false, raf: null, key: null
    };
    R.close = function () {
      if (!R) return;
      R.over = true;
      if (R.raf) cancelAnimationFrame(R.raf);
      if (R.key) document.removeEventListener("keydown", R.key);
      var o = document.getElementById("rd-game"); if (o) o.remove();
      document.body.style.overflow = "";
      R = null;
    };
    R.key = function (e) {
      if (!R) return;
      if (e.key === "Escape") { R.close(); return; }
      if (e.key === "p" || e.key === "P") { if (R.g) R.g.paused = !R.g.paused; }
      if (R.g && !R.g.over) {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(e.key)) e.preventDefault();
        R.g.keys[e.key.toLowerCase()] = true;
        R.g.keys[e.key] = true;
      }
    };
    R.keyUp = function (e) { if (R && R.g) { R.g.keys[e.key.toLowerCase()] = false; R.g.keys[e.key] = false; } };
    document.addEventListener("keydown", R.key);
    document.addEventListener("keyup", R.keyUp);
    ov.addEventListener("click", function (e) { if (e.target === ov && R) R.close(); });
    showCard(R.lv);
  }

  function showCard(lv) {
    if (!R) return;
    var d = LV[lv - 1];
    R.panel.classList.add("is-show"); R.panel.textContent = "";
    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10"));
    card.appendChild(el("div", "mc-lc-name", "\u2708 " + d.name));
    card.appendChild(el("div", "mc-lc-tip",
      "\u6D88\u706D\u654C\u673A\uFF0C\u4E00\u6BB5\u65F6\u95F4\u540E BOSS \u767B\u573A\uFF08WARNING\uFF01\uFF09\u3002\u51FB\u8D25 BOSS \u8FC7\u5173\u3002\u5403\u84DD\u8272 P \u5347\u706B\u529B\uFF1A\u5355\u53D1\u2192\u53CC\u53D1\u2192\u4E09\u5411\u2192\u4E94\u5411\u3002\u88AB\u51FB\u4E2D\u6389\u4E00\u7EA7\u706B\u529B\u3001\u6389\u4E00\u6761\u547D\uFF08\u5171 3 \u6761\uFF09\u3002\u638C\u63E1\uFF1A\u81EA\u52A8\u5F00\u706B\uFF0C\u4E13\u5FC3\u8D70\u4F4D\uFF01"));
    var best = Number(localStorage.getItem("rd_best_" + lv)) || 0;
    if (best) card.appendChild(el("div", "mc-lc-stat", "\u{1F3C6} \u672C\u5173\u6700\u4F73 " + best + "\u5206"));
    var b = el("button", "mc-lc-start", "\u2708 \u8D77\u98DE \u00B7 START");
    b.type = "button";
    b.addEventListener("click", function () { start(lv); });
    card.appendChild(b);
    R.panel.appendChild(card);
    R.badge.textContent = "Lv " + lv + "/10 \u00B7 " + d.name;
    R.scoreEl.textContent = "\u5206: 0";
    R.livesEl.textContent = "\u2708\u2708\u2708";
    R.fireEl.textContent = "P1";
    R.bossWrap.style.display = "none";
    drawIdle();
  }

  // ---- 游戏状态 ----
  function start(lv) {
    if (!R) return;
    var d = LV[lv - 1];
    R.lv = lv;
    R.g = {
      lv: lv, def: d, paused: false, over: false, t: 0, score: 0,
      keys: {}, px: W / 2, py: H - 60, power: 1, lives: 3, inv: 120,
      shots: [], eshots: [], enemies: [], parts: [], stars: [],
      spawnT: 0, phase: "waves", phaseT: 0, boss: null, warn: 0,
      bossT: 0, shake: 0, best: 0
    };
    for (var i = 0; i < 46; i++) R.g.stars.push({ x: Math.random() * W, y: Math.random() * H, v: 0.4 + Math.random() * 1.8, s: Math.random() < 0.3 ? 2 : 1 });
    R.panel.classList.remove("is-show");
    R.scoreEl.textContent = "\u5206: 0";
    R.livesEl.textContent = "\u2708\u2708\u2708";
    R.fireEl.textContent = "P1";
    R.bossWrap.style.display = "none";
    // 触屏拖动
    R.cv.onpointerdown = R.cv.onpointermove = function (e) {
      if (!R || !R.g || R.g.over) return;
      var rect = R.cv.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (W / rect.width);
      var y = (e.clientY - rect.top) * (H / rect.height);
      R.g.px = Math.max(14, Math.min(W - 14, x));
      if (e.pointerType === "touch" || e.buttons) R.g.py = Math.max(20, Math.min(H - 20, y - 14));
      R.g.touching = true;
    };
    R.cv.onpointerup = function () { if (R && R.g) R.g.touching = false; };
    if (!R.raf) loop();
  }

  function loop() {
    R.raf = requestAnimationFrame(loop);
    if (!R || !R.g) return;
    var g = R.g;
    if (!g.paused && !g.over && !R.panel.classList.contains("is-show")) step();
    draw();
  }

  function step() {
    var g = R.g, d = g.def;
    g.t++;
    if (g.shake > 0) g.shake--;
    // 星空
    g.stars.forEach(function (s) { s.y += s.v; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } });
    // 玩家移动
    var sp = 3.2;
    if (g.keys["arrowleft"] || g.keys["a"]) g.px -= sp;
    if (g.keys["arrowright"] || g.keys["d"]) g.px += sp;
    if (g.keys["arrowup"] || g.keys["w"]) g.py -= sp;
    if (g.keys["arrowdown"] || g.keys["s"]) g.py += sp;
    g.px = Math.max(14, Math.min(W - 14, g.px));
    g.py = Math.max(24, Math.min(H - 18, g.py));
    if (g.inv > 0) g.inv--;
    // 自动开火
    if (g.t % 6 === 0) fire();
    // 玩家子弹
    g.shots.forEach(function (s) { s.x += s.vx; s.y += s.vy; });
    g.shots = g.shots.filter(function (s) { return s.y > -10 && s.x > -10 && s.x < W + 10; });
    // 出敌（wave 阶段）
    if (g.phase === "waves") {
      g.phaseT++;
      g.spawnT += 16.7; // 帧时长≈16.7ms，spawnT 用毫秒口径与 LV 配置对齐
      if (g.spawnT >= d.spawn && g.phaseT < 60 * 22) {
        g.spawnT = 0;
        var type = d.mix[Math.floor(Math.random() * d.mix.length)];
        spawnEnemy(type);
      }
      if (g.phaseT >= 60 * 22 && !g.boss) { startWarn(); }
    }
    // WARNING 倒计时 → 出 Boss
    if (g.warn > 0) {
      g.warn--;
      if (g.warn === 0) spawnBoss();
    }
    // 敌机
    g.enemies.forEach(function (e) {
      e.t++;
      if (e.type === "drop") { e.y += e.vy; }
      else if (e.type === "sine") { e.y += e.vy * 0.7; e.x = e.cx + Math.sin(e.t * 0.05) * 60; }
      else if (e.type === "dive") { e.y += e.vy + e.t * 0.04; }
      else if (e.type === "hover") {
        if (e.y < e.stopY) e.y += e.vy;
        else if (e.t % Math.max(40, Math.round(g.def.brate / 16.7 / 4)) === 0) { var v = aim(e.x, e.y + 10); eshoot(e.x, e.y + 10, v.vx, v.vy); }
        if (e.t > 320) e.y += 2.5;
      }
      if (e.hp <= 0) return;
      // 敌机撞玩家（pw 是补给，不撞）
      if (e.type !== "pw" && g.inv <= 0 && Math.abs(e.x - g.px) < 18 && Math.abs(e.y - g.py) < 18) hitPlayer();
    });
    g.enemies = g.enemies.filter(function (e) { return e.y < H + 30 && e.hp > 0; });
    // 敌弹
    g.eshots.forEach(function (s) { s.x += s.vx; s.y += s.vy; });
    g.eshots = g.eshots.filter(function (s) { return s.y < H + 10 && s.x > -10 && s.x < W + 10 && s.y > -10; });
    // 玩家弹 × 敌机
    g.shots.forEach(function (s) {
      if (s.dead) return;
      g.enemies.forEach(function (e) {
        if (e.hp <= 0 || s.dead) return;
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
    // 玩家吃 P（火力升级）
    g.enemies.forEach(function (e) {
      if (e.type === "pw" && Math.abs(e.x - g.px) < 16 && Math.abs(e.y - g.py) < 16) {
        e.hp = 0;
        if (g.power < 4) { g.power++; R.fireEl.textContent = "P" + g.power; }
        g.score += 50;
        R.scoreEl.textContent = "\u5206: " + g.score;
        SFX.pick();
        burst(g.px, g.py, "#4fd8ff", 8);
      }
    });
    // 敌弹/敌机 × 玩家
    if (g.inv <= 0) {
      for (var i = 0; i < g.eshots.length; i++) {
        var s = g.eshots[i];
        if (Math.abs(s.x - g.px) < 12 && Math.abs(s.y - g.py) < 14) { g.eshots.splice(i, 1); hitPlayer(); break; }
      }
    }
    // Boss 移动/弹幕
    if (g.boss && g.boss.hp > 0) {
      var b = g.boss;
      b.t++;
      b.x += b.dir * b.spd;
      if (b.x < 40 || b.x > W - 40) b.dir *= -1;
      b.y = 46 + Math.sin(b.t * 0.02) * 8;
      if (b.t % Math.max(34, Math.round(g.def.brate / 16.7 / 3)) === 0) {
        // 扇形弹
        var n = 3 + Math.floor(g.lv / 3);
        for (var k = 0; k < n; k++) {
          var ang = Math.PI / 2 + (k - (n - 1) / 2) * 0.28;
          eshoot(b.x, b.y + 20, Math.cos(ang), Math.sin(ang) * 2.6, Math.sin(ang) * 0);
        }
        SFX.tick && SFX.tick();
        beep(300, 0.05, "square", 0.03);
      }
    }
    // 粒子/飘字
    g.parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.life--; });
    g.parts = g.parts.filter(function (p) { return p.life > 0; });
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
    // 部分敌机掉落 P
    e.drop = Math.random() < 0.12;
    g.enemies.push(e);
  }
  function killEnemy(e) {
    var g = R.g;
    g.score += 100;
    R.scoreEl.textContent = "\u5206: " + g.score;
    burst(e.x, e.y, "#ff7043", e.type === "hover" ? 12 : 8);
    SFX.boomS();
    if (e.drop) R.g.enemies.push({ type: "pw", x: e.x, y: e.y, hp: 999, t: 0, vy: 1.2, drop: false });
  }
  function eshoot(x, y, vx, vy) { R.g.eshots.push({ x: x, y: y, vx: vx, vy: vy }); }
  function aim(x, y) {
    var g = R.g;
    var dx = g.px - x, dy = g.py - y;
    var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    return { vx: dx / len * 2.4, vy: dy / len * 2.4 };
  }
  function eshoot(x, y, vx, vy) { R.g.eshots.push({ x: x, y: y, vx: vx, vy: vy }); }

  function startWarn() {
    var g = R.g;
    g.phase = "warn"; g.warn = 130;
    g.enemies.length = 0; g.eshots.length = 0;
    SFX.warn();
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
    for (var i = 0; i < 5; i++) (function (k) {
      setTimeout(function () { burst(bx + (Math.random() - 0.5) * 50, by + (Math.random() - 0.5) * 30, "#ffff55", 14); SFX.boomB(); shake(); }, k * 160);
    })(i);
    R.bossWrap.style.display = "none";
    g.boss = null;
    setTimeout(function () { if (R && R.g) levelClear(); }, 900);
  }
  function hitPlayer() {
    var g = R.g;
    if (g.lives > 0) g.lives--;
    R.livesEl.textContent = "\u2708".repeat(Math.max(0, g.lives));
    g.power = Math.max(1, g.power - 1);
    R.fireEl.textContent = "P" + g.power;
    burst(g.px, g.py, "#5ea832", 14);
    SFX.hit(); shake();
    g.eshots.length = 0;
    g.px = W / 2; g.py = H - 60; g.inv = 130;
    if (g.lives <= 0) gameOver();
  }
  function gameOver() {
    var g = R.g; g.over = true;
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
    var g = R.g; g.over = true;
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
  function burst(x, y, color, n) {
    var g = R.g;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var v = 1 + Math.random() * 3;
      g.parts.push({ x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 14 + Math.random() * 12, c: color });
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
    ctx.fillRect(x - 3 * s, y - 10 * s, 6 * s, 16 * s);
    ctx.fillRect(x - 11 * s, y - 2 * s, 8 * s, 8 * s);
    ctx.fillRect(x + 3 * s, y - 2 * s, 8 * s, 8 * s);
    ctx.fillStyle = "#ffff55";
    ctx.fillRect(x - 2 * s, y - 14 * s, 4 * s, 4 * s);
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
    // 星空
    g.stars.forEach(function (s) {
      ctx.fillStyle = s.s === 2 ? "#8fa3d9" : "#3c4a75";
      ctx.fillRect(s.x, s.y, s.s, s.s + 1);
    });
    // 掉落 P
    g.enemies.forEach(function (e) {
      if (e.type === "pw") {
        ctx.fillStyle = "#4fd8ff";
        ctx.fillRect(e.x - 7, e.y - 7, 14, 14);
        ctx.fillStyle = "#0b0d16";
        ctx.fillRect(e.x - 4, e.y - 3, 8, 6);
        e.y += e.vy;
      }
    });
    g.enemies = g.enemies.filter(function (e) { return !(e.type === "pw" && e.y > H + 10); });
    // 敌机
    g.enemies.forEach(function (e) {
      if (e.type === "pw") return;
      ctx.fillStyle = e.type === "hover" ? "#c62828" : "#e05252";
      ctx.fillRect(e.x - 8, e.y - 6, 16, 10);
      ctx.fillRect(e.x - 3, e.y + 4, 6, 8);
      ctx.fillStyle = "#8a1f1f";
      ctx.fillRect(e.x - 10, e.y - 3, 4, 6);
      ctx.fillRect(e.x + 6, e.y - 3, 4, 6);
    });
    // Boss
    if (g.boss) {
      var b = g.boss;
      ctx.fillStyle = "#8a1f5c";
      ctx.fillRect(b.x - 30, b.y - 10, 60, 22);
      ctx.fillRect(b.x - 42, b.y, 16, 12);
      ctx.fillRect(b.x + 26, b.y, 16, 12);
      ctx.fillStyle = "#d946ef";
      ctx.fillRect(b.x - 8, b.y + 8, 16, 8);
      ctx.fillStyle = "#ffff55";
      ctx.fillRect(b.x - 20, b.y - 4, 8, 4);
      ctx.fillRect(b.x + 12, b.y - 4, 8, 4);
    }
    // 玩家
    var blink = g.inv > 0 && Math.floor(g.t / 4) % 2 === 0;
    if (!blink) drawShip(ctx, g.px, g.py, "#5ea832", 1);
    // 尾焰
    if (!g.over) {
      ctx.fillStyle = Math.random() < 0.5 ? "#f0b90b" : "#ff7043";
      ctx.fillRect(g.px - 2, g.py + 12, 4, 4 + Math.random() * 4);
    }
    // 子弹
    ctx.fillStyle = "#ffff55";
    g.shots.forEach(function (s) { ctx.fillRect(s.x - 1.5, s.y - 6, 3, 8); });
    ctx.fillStyle = "#ff5555";
    g.eshots.forEach(function (s) { ctx.fillRect(s.x - 2, s.y - 2, 4, 4); });
    // 粒子
    g.parts.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 24);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;
    // WARNING
    if (g.warn > 0 && Math.floor(g.warn / 8) % 2 === 0) {
      ctx.fillStyle = "#ff5555";
      ctx.font = '16px "MinecraftPixel", monospace';
      ctx.textAlign = "center";
      ctx.fillText("W A R N I N G", W / 2, H / 2 - 30);
      ctx.font = '8px "MinecraftPixel", monospace';
      ctx.fillText("LARGE ENEMY APPROACHING", W / 2, H / 2 - 12);
    }
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
      killBoss: function () { if (R && R.g && R.g.boss) { R.g.boss.hp = 0; bossDie(); } }
    };
  }

  function init() { if (isMC()) injectBtn(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
