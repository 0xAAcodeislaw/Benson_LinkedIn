// Minecraft 主题专属增强：真·像素化头像 + 底部物品栏 hotbar + 方块装饰
// 只在检测到像素字体（Minecraft 版）时启用，其他 4 个风格完全不受影响。
(function () {
  "use strict";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function isMinecraft() {
    // 主题 CSS 里定义了 @font-face MinecraftPixel；用 canvas 探测像素字体是否加载
    try {
      if (!document.fonts || !document.fonts.check) return false;
      return document.fonts.check('12px "MinecraftPixel"');
    } catch (e) {
      return false;
    }
  }

  // ---- 1. 真·像素化头像：把照片降采样到 32×32 再放大 ------------------------
  // CSS 的 image-rendering 只是插值方式，这里实际把图片重绘成 32×32 色块。
  function pixelateAvatar(img) {
    if (img.dataset.pixelated === "1") return;
    var src = img.currentSrc || img.src;
    if (!src) return;
    var work = new Image();
    work.crossOrigin = "anonymous";
    work.onload = function () {
      try {
        var SIZE = 32;
        var c = document.createElement("canvas");
        c.width = SIZE;
        c.height = SIZE;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        // 居中裁成正方形再缩小
        var s = Math.min(work.width, work.height);
        ctx.drawImage(work, (work.width - s) / 2, (work.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
        // 再放大回 128，用 nearest-neighbor 保持硬边
        var out = document.createElement("canvas");
        out.width = 128;
        out.height = 128;
        var octx = out.getContext("2d");
        octx.imageSmoothingEnabled = false;
        octx.drawImage(c, 0, 0, 128, 128);
        img.dataset.pixelated = "1";
        img.src = out.toDataURL("image/png");
      } catch (e) {
        /* 跨域或 canvas 受限时保持原图 */
      }
    };
    work.onerror = function () {};
    work.src = src;
  }

  // ---- 2. 底部物品栏 hotbar --------------------------------------------------
  // 9 个格子，对应页面 9 个主要区块；点击滚动到该区块，当前区块高亮为「选中框」。
  function buildHotbar() {
    if (document.querySelector(".mc-hotbar")) return;
    var defs = [
      { id: "facts", icon: "▣", label: "Quick facts" },
      { id: "about", icon: "✎", label: "About" },
      { id: "experience", icon: "⚒", label: "Experience" },
      { id: "education", icon: "▤", label: "Education" },
      { id: "credentials", icon: "★", label: "Certs" },
      { id: "projects", icon: "⬛", label: "Projects" },
      { id: "skills", icon: "⚔", label: "Skills" },
      { id: "languages", icon: "⚑", label: "Languages" },
      { id: "contact", icon: "✉", label: "Contact" },
    ].filter(function (d) {
      return document.getElementById(d.id);
    });

    var bar = document.createElement("div");
    bar.className = "mc-hotbar";
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "Quick jump");

    defs.forEach(function (d, i) {
      var slot = document.createElement("button");
      slot.type = "button";
      slot.className = "mc-slot";
      slot.dataset.target = d.id;
      slot.title = d.label;
      slot.setAttribute("aria-label", d.label);
      var icon = document.createElement("span");
      icon.className = "mc-slot-icon";
      icon.textContent = d.icon;
      var num = document.createElement("span");
      num.className = "mc-slot-num";
      num.textContent = String(i + 1);
      slot.appendChild(icon);
      slot.appendChild(num);
      slot.addEventListener("click", function () {
        var target = document.getElementById(d.id);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(d.id);
      });
      bar.appendChild(slot);
    });
    document.body.appendChild(bar);

    function setActive(id) {
      bar.querySelectorAll(".mc-slot").forEach(function (s) {
        s.classList.toggle("is-selected", s.dataset.target === id);
      });
    }

    // 滚动时把「当前区块」同步到物品栏选中框
    var ids = defs.map(function (d) { return d.id; });
    var ticking = false;
    var sync = function () {
      ticking = false;
      var current = ids[0];
      ids.forEach(function (id) {
        var sec = document.getElementById(id);
        if (sec && sec.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
      });
      setActive(current);
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(sync); }
    }, { passive: true });
    sync();
  }

  // ---- 3. 卡片标题加「草方块」图标 ------------------------------------------
  function addBlockIcons() {
    document.querySelectorAll(".card h2").forEach(function (h) {
      if (h.querySelector(".mc-block-icon")) return;
      var b = document.createElement("span");
      b.className = "mc-block-icon";
      b.setAttribute("aria-hidden", "true");
      b.textContent = "▩";
      h.insertBefore(b, h.firstChild);
    });
  }

  // ---- 启动 ----
  function init() {
    if (!isMinecraft()) return; // 非 Minecraft 主题：什么都不做
    var img = document.querySelector(".avatar");
    if (img) {
      if (img.complete && img.naturalWidth) pixelateAvatar(img);
      else img.addEventListener("load", function () { pixelateAvatar(img); }, { once: true });
    }
    buildHotbar();
    addBlockIcons();
    injectEasterEggButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // 字体异步加载完成时再试一次（首次 check 可能为 false）
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { init(); });
  }

  // =====================================================================
  // ---- 6. 彩蛋：挖矿闯关（10 关，1-9 关得像素靓照，第 10 关得电话） ----
  // =====================================================================
  // 玩法沿用 Minecraft 手感：
  //   点击 = 挖掘（硬度不同敲的次数不同）；WASD/方向键 = 移动光标；空格 = 挖掘。
  //   只能挖「暴露」的方块：表层，或紧挨着已挖开的洞。
  //   挖到品红「相机方块」📷 = 解锁一张像素靓照；第 10 关挖金色「电话方块」☎ = 电话号码。
  var PROGRESS_KEY = "mc_dig_lv";     // 已通到第几关（1~10）
  var SEEN_TUT_KEY = "mc_dig_seen";   // 是否看过教学
  var DONE_KEY = "mc_dig_done";       // 是否通关过第 10 关

  // ---- 音效引擎：Web Audio 合成，零资源文件；首次交互后自动解锁 ----
  var audio = { ctx: null, on: null };
  function soundOn() {
    if (audio.on === null) {
      try { audio.on = localStorage.getItem("mc_dig_sound") !== "0"; } catch (e) { audio.on = true; }
    }
    return audio.on;
  }
  function ac() {
    if (!soundOn()) return null;
    if (!audio.ctx) {
      try { audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audio.on = false; return null; }
    }
    if (audio.ctx.state === "suspended") { try { audio.ctx.resume(); } catch (e) {} }
    return audio.ctx;
  }
  function blip(freq, dur, type, vol, when) { // 像素风方波音符
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    var t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(vol || 0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1));
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + (dur || 0.1) + 0.02);
  }
  function noise(dur, vol, freq) { // 噪声 burst：敲击/碎裂质感
    var c = ac(); if (!c) return;
    var len = Math.max(1, Math.floor(c.sampleRate * (dur || 0.08)));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 900;
    var g = c.createGain(); g.gain.value = vol || 0.12;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
  }
  var SFX = {
    tap:    function () { noise(0.05, 0.09, 1200 + Math.random() * 400); }, // 随机音高避免单调
    crack:  function () { noise(0.04, 0.07, 2200); },
    break_: function () { noise(0.12, 0.15, 700); blip(90, 0.1, "square", 0.05); },
    gem:    function () { blip(880, 0.09, "square", 0.05); blip(1320, 0.12, "square", 0.05, 0.09); },
    shutter:function () { noise(0.03, 0.14, 4000); noise(0.05, 0.09, 1500); },
    ach:    function () { [523, 659, 784, 1047].forEach(function (f, i) { blip(f, 0.12, "square", 0.05, i * 0.09); }); },
    win:    function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { blip(f, 0.16, "square", 0.06, i * 0.11); }); },
    click:  function () { blip(660, 0.05, "square", 0.04); },
    tick:   function () { blip(1200, 0.04, "square", 0.03); }
  };

  // ---- 打击特效：粒子飞溅 / 掉落物飞入背包 / 涟漪 / 屏震（fixed 定位 + 自毁） ----
  function fxParticles(cellEl, color, n) {
    if (!cellEl) return;
    var rect = cellEl.getBoundingClientRect();
    for (var i = 0; i < (n || 6); i++) {
      var p = el("span", "mc-particle");
      p.style.left = rect.left + rect.width / 2 + "px";
      p.style.top = rect.top + rect.height / 2 + "px";
      p.style.background = color;
      var ang = Math.random() * Math.PI * 2;
      var dist = 18 + Math.random() * 28;
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", (Math.sin(ang) * dist - 22) + "px");
      document.body.appendChild(p);
      setTimeout(function (node) { return function () { node.remove(); }; }(p), 640);
    }
  }
  function fxFlyDrop(cellEl, color) {
    if (!cellEl || !G || !G.inv) return;
    var r = cellEl.getBoundingClientRect();
    var t = G.inv.getBoundingClientRect();
    var d = el("span", "mc-fly");
    d.style.left = r.left + r.width / 2 + "px";
    d.style.top = r.top + r.height / 2 + "px";
    d.style.background = color;
    d.style.setProperty("--tx", (t.left + t.width / 2 - r.left - r.width / 2) + "px");
    d.style.setProperty("--ty", (t.top + t.height / 2 - r.top - r.height / 2) + "px");
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 500);
    G.inv.classList.remove("is-pop");
    void G.inv.offsetWidth; // 重新触发弹跳动画
    G.inv.classList.add("is-pop");
  }
  function fxRipple(cellEl) {
    if (!cellEl) return;
    var s = el("span", "mc-ripple");
    cellEl.appendChild(s);
    setTimeout(function () { s.remove(); }, 320);
  }
  function fxShake() {
    if (!G || !G.frame) return;
    G.frame.classList.remove("is-shake");
    void G.frame.offsetWidth;
    G.frame.classList.add("is-shake");
  }
  // ---- 成就 toast：MC 风格右上角滑入 ----
  function toast(icon, title, desc) {
    var t = el("div", "mc-toast");
    t.appendChild(el("span", "mc-toast-icon", icon));
    var tx = el("div", "mc-toast-txt");
    tx.appendChild(el("div", "mc-toast-title", title));
    if (desc) tx.appendChild(el("div", "mc-toast-desc", desc));
    t.appendChild(tx);
    document.body.appendChild(t);
    SFX.ach();
    setTimeout(function () { t.classList.add("is-out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3150);
  }
  function achOnce(key, icon, title, desc) {
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch (e) { return; }
    toast(icon, title, desc);
  }

  var BLOCKS = {
    grass:     { hp: 1, drop: "Grass / 草方块",    cn: "草",    color: "#5ea832" },
    dirt:      { hp: 1, drop: "Dirt / 泥土",       cn: "泥土",  color: "#8f6b42" },
    stone:     { hp: 2, drop: "Stone / 石头",      cn: "石头",  color: "#8a8a8a" },
    coal:      { hp: 2, drop: "Coal / 煤矿",       cn: "煤矿",  color: "#565656" },
    deepslate: { hp: 3, drop: "Deepslate / 深板岩", cn: "深板岩", color: "#484850" },
    gem:       { hp: 2, drop: "Diamond / 钻石",     cn: "钻石",  color: "#4fd8ff" },
    camera:    { hp: 2, drop: "Camera / 相机方块",  cn: "相机",  color: "#d946ef" },
    phone:     { hp: 3, drop: "Phone / 电话方块",   cn: "电话",  color: "#f0b90b" }
  };

  var LEVELS = [
    { name: "草地试挖 · Grass Trial",      icon: "\u{1F331}", stars: 1, tip: "最简单的一关：全是软方块，点一下就碎。相机方块就埋在浅处。",   log: "矿工日志：今天是第一天，锄头还很新。",                              cols: 10, rows: 6,  goalMin: 2, goalMax: 3, rock: "soft" },
    { name: "泥土花园 · Dirt Garden",      icon: "\u{1F33E}", stars: 1, tip: "还是软土，但相机埋深了一层。垂直往下挖一条井最快。",           log: "矿工日志：泥土的味道，让人想起家乡的农场。",                        cols: 11, rows: 7,  goalMin: 3, goalMax: 4, rock: "soft" },
    { name: "初见岩石 · First Stone",      icon: "\u{1FAA8}", stars: 2, tip: "石头出现了！要敲 2 下才碎。先挖穿土层，再往石头层找。",         log: "矿工日志：镐子撞上石头的声音，意外地好听。",                        cols: 12, rows: 7,  goalMin: 3, goalMax: 5, rock: "mix"  },
    { name: "煤层 · Coal Seam",            icon: "\u26CF",    stars: 2, tip: "黑点的是煤矿，和石头一样敲 2 下。相机藏在中层。",             log: "矿工日志：煤灰糊了一脸，但收获满满。",                              cols: 12, rows: 8,  goalMin: 4, goalMax: 6, rock: "mix"  },
    { name: "深板岩边缘 · Deepslate Edge", icon: "\u{1F5C4}\uFE0F", stars: 2, tip: "最深的深板岩要敲 3 下。往下挖时留意：越深越硬。",     log: "矿工日志：这里的岩石硬得像教授的批改意见。",                        cols: 13, rows: 8,  goalMin: 5, goalMax: 6, rock: "mix"  },
    { name: "硬岩地带 · Hard Rock",        icon: "\u{1F6E0}\uFE0F", stars: 3, tip: "硬岩遍地。策略：选一列垂直打井，别到处乱挖。",         log: "矿工日志：镐子磨损得厉害，经济学的耐心也派上了用场。",              cols: 13, rows: 9,  goalMin: 5, goalMax: 7, rock: "hard" },
    { name: "幽深矿洞 · Deep Cave",        icon: "\u{1F576}\uFE0F", stars: 3, tip: "相机在下层，可能需要挖两条竖井。深板岩敲 3 下，要有耐心。", log: "矿工日志：越往深处越安静，只听得见自己的呼吸。",            cols: 14, rows: 9,  goalMin: 6, goalMax: 7, rock: "hard" },
    { name: "岩石迷宫 · Rock Maze",        icon: "\u{1F9EE}", stars: 3, tip: "地图更大、埋得更深。先下后横，路过煤矿顺手拿。",             log: "矿工日志：在这里迷路的矿工，都成了地图的一部分。",                  cols: 14, rows: 10, goalMin: 6, goalMax: 8, rock: "hard" },
    { name: "最后一张照片 · Last Photo",   icon: "\u{1F4F8}", stars: 3, tip: "第 9 张靓照就在下面！挖到它，下一关就是终极电话。",           log: "矿工日志：相册快满了，最后一页留给金色。",                          cols: 15, rows: 10, goalMin: 7, goalMax: 8, rock: "hard" },
    { name: "金色电话 · The Golden Phone", icon: "\u260E",    stars: 3, tip: "最后一关！金色电话方块埋在最底层。挖穿整个世界，拿到求职者的电话号码！", log: "矿工日志：传说最深处埋着一台会响的电话。",                  cols: 16, rows: 11, goalMin: 9, goalMax: 9, rock: "hard" }
  ];

  // 1-9 关的像素靓照风格：同一张头像，不同像素尺寸 + 滤镜（滤镜用 CSS，兼容所有浏览器）
  var PHOTO_STYLES = [
    { name: "Classic / 经典像素",  size: 32, filter: "" },
    { name: "Mini 8-bit / 迷你",   size: 8,  filter: "" },
    { name: "Golden Hour / 黄昏",  size: 16, filter: "sepia(.45) saturate(1.7) hue-rotate(-12deg)" },
    { name: "Night Vision / 夜视", size: 16, filter: "hue-rotate(175deg) saturate(1.4) brightness(1.15)" },
    { name: "Vintage / 复古胶片",  size: 24, filter: "sepia(.75) contrast(1.15) brightness(1.05)" },
    { name: "Negative / 负片",     size: 24, filter: "invert(1)" },
    { name: "Emerald / 翡翠",      size: 16, filter: "hue-rotate(90deg) saturate(1.9)" },
    { name: "Royal Gold / 鎏金",   size: 24, filter: "sepia(1) saturate(3.2) hue-rotate(-10deg) brightness(1.08)" },
    { name: "Blossom / 樱花",      size: 32, filter: "hue-rotate(300deg) saturate(1.6) brightness(1.1)" }
  ];

  function loadProgress() {
    var n = Number(localStorage.getItem(PROGRESS_KEY) || 1);
    return Math.min(10, Math.max(1, n));
  }
  function saveProgress(lv) {
    try { localStorage.setItem(PROGRESS_KEY, String(Math.min(10, lv))); } catch (e) {}
  }

  function readPhone() {
    try {
      var ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) {
        var p = JSON.parse(ld.textContent);
        if (p.telephone) return p.telephone;
      }
    } catch (e) {}
    var ph = document.querySelector('[data-contact-phone]');
    return ph ? ph.getAttribute('data-contact-phone') : "";
  }

  function injectEasterEggButton() {
    if (document.querySelector(".mc-easter-btn")) return;
    var tools = document.querySelector(".nav-tools");
    if (!tools) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mc-easter-btn";
    btn.title = "Easter egg: 10-level mining game / 彩蛋闯关小游戏";
    btn.setAttribute("aria-label", "Easter egg: mining game");
    btn.textContent = "\u26CF";
    var clicks10 = 0, clicksTimer = null;
    btn.addEventListener("click", function () { // 彩蛋：⛏ 连点 10 次 → 隐藏成就
      clicks10++;
      clearTimeout(clicksTimer);
      clicksTimer = setTimeout(function () { clicks10 = 0; }, 5000);
      if (clicks10 >= 10) {
        clicks10 = 0;
        toast("\u{1F9D1}\u200D\u{1F33E}", "Persistent Miner! / 坚持矿工！", "You clicked the pickaxe 10 times / 你把镐子点了十下");
      }
      openGame();
    });
    tools.appendChild(btn);
  }

  // 生成一张像素靓照：头像降采样到 size×size 再放大回 256（nearest 保硬边）
  function makePhoto(style, cb) {
    var srcImg = document.querySelector(".avatar");
    var src = srcImg ? (srcImg.currentSrc || srcImg.src) : "";
    if (!src) { cb(null); return; }
    var work = new Image();
    work.crossOrigin = "anonymous";
    work.onload = function () {
      try {
        var SIZE = style.size;
        var c = document.createElement("canvas");
        c.width = SIZE; c.height = SIZE;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        var s = Math.min(work.width, work.height);
        ctx.drawImage(work, (work.width - s) / 2, (work.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
        var out = document.createElement("canvas");
        out.width = 256; out.height = 256;
        var octx = out.getContext("2d");
        octx.imageSmoothingEnabled = false;
        octx.drawImage(c, 0, 0, 256, 256);
        cb(out.toDataURL("image/png"));
      } catch (e) { cb(null); }
    };
    work.onerror = function () { cb(null); };
    work.src = src;
  }

  // ---- 游戏外壳 ----
  var G = null; // 当前对局状态

  function openGame() {
    if (document.getElementById("mc-game")) return;

    var overlay = el("div", "mc-game-overlay");
    overlay.id = "mc-game";

    var frame = el("div", "mc-game-frame");

    // 标题行
    var titleRow = el("div", "mc-game-title");
    titleRow.appendChild(el("span", null, "\u26CF"));
    titleRow.appendChild(el("span", "mc-game-title-txt", "Mine for the photos & phone! / 挖矿闯关"));
    var sndBtn = el("button", "mc-snd-btn", soundOn() ? "\u{1F50A}" : "\u{1F507}");
    sndBtn.type = "button";
    sndBtn.title = "Sound on/off / 音效开关";
    sndBtn.setAttribute("aria-label", "Sound on/off");
    sndBtn.addEventListener("click", function () {
      audio.on = !soundOn();
      try { localStorage.setItem("mc_dig_sound", audio.on ? "1" : "0"); } catch (e) {}
      sndBtn.textContent = audio.on ? "\u{1F50A}" : "\u{1F507}";
      SFX.click();
    });
    titleRow.appendChild(sndBtn);

    var resetBtn = el("button", "mc-reset-btn", "\u21BB");
    resetBtn.type = "button";
    resetBtn.title = "Reset progress / 重置进度（从第 1 关重来）";
    var resetArmed = false, resetTimer = null;
    resetBtn.addEventListener("click", function () {
      if (!resetArmed) { // 二次确认，防误触清档
        resetArmed = true;
        resetBtn.textContent = "\u2713?";
        resetBtn.classList.add("is-armed");
        SFX.click();
        resetTimer = setTimeout(function () {
          resetArmed = false;
          resetBtn.textContent = "\u21BB";
          resetBtn.classList.remove("is-armed");
        }, 3000);
        return;
      }
      clearTimeout(resetTimer);
      saveProgress(1);
      try { localStorage.removeItem(SEEN_TUT_KEY); localStorage.removeItem(DONE_KEY); } catch (e) {}
      closeGame();
      openGame();
    });
    titleRow.appendChild(resetBtn);
    var closeBtn = el("button", "mc-game-close", "\u00D7");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.addEventListener("click", closeGame);
    titleRow.appendChild(closeBtn);

    // HUD：关卡徽章 + 照片进度点 + 背包 + 目标
    var hud = el("div", "mc-game-hud");
    var lvBadge = el("span", "mc-lv-badge", "Lv --");
    var dots = el("span", "mc-dots");
    var inv = el("span", "mc-game-inv", "Bag / 背包: --");
    var goal = el("span", "mc-game-goal", "");
    hud.appendChild(lvBadge);
    hud.appendChild(dots);
    hud.appendChild(inv);
    hud.appendChild(goal);

    // 总进度条（10 关全局）
    var totalbar = el("div", "mc-totalbar");
    var totalfill = el("div", "mc-totalbar-fill");
    totalbar.appendChild(totalfill);

    var grid = el("div", "mc-game-grid");

    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "Click = dig 点击挖掘 · WASD/arrows 移动 · Space 空格挖 · ESC close 关闭"));

    var panel = el("div", "mc-panel"); // 教学 / 关卡说明 / 照片卡 都盖在这里

    frame.appendChild(titleRow);
    frame.appendChild(hud);
    frame.appendChild(totalbar);
    frame.appendChild(grid);
    frame.appendChild(panel);
    frame.appendChild(help);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    G = {
      overlay: overlay, frame: frame, grid: grid, panel: panel,
      lvBadge: lvBadge, dots: dots, inv: inv, goal: goal, totalfill: totalfill,
      level: loadProgress(),
      cells: null, hpMap: null, cursor: { r: 0, c: 0 },
      closed: false, bag: {}, phone: readPhone(),
      onKey: null
    };

    function closeGame() {
      if (!G) return;
      G.closed = true;
      if (G.onKey) document.removeEventListener("keydown", G.onKey);
      if (G.cdIv) { clearInterval(G.cdIv); G.cdIv = null; }
      var o = document.getElementById("mc-game");
      if (o) o.remove();
      document.body.style.overflow = "";
      G = null;
    }
    G.closeGame = closeGame;
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeGame(); });

    // 首次玩 → 教学；否则直接关卡说明
    var seen = false;
    try { seen = !!localStorage.getItem(SEEN_TUT_KEY); } catch (e) {}
    if (!seen) showTutorial();
    else showLevelCard(G.level);
  }

  function updateHud() {
    if (!G) return;
    var def = LEVELS[G.level - 1];
    G.lvBadge.textContent = "Lv " + G.level + "/10 · " + def.name;
    // 照片进度点：9 张照片 + 1 个电话
    G.dots.textContent = "";
    for (var i = 1; i <= 10; i++) {
      var d = el("span", "mc-dot" + (i < G.level ? " is-on" : ""));
      d.textContent = i < 10 ? "\u25A0" : "\u260E";
      G.dots.appendChild(d);
    }
    var goalTxt = G.level < 10
      ? "Goal / 目标: dig the pink camera block \u{1F4F7} / 挖出品红相机方块"
      : "Goal / 目标: dig the golden phone \u260E / 挖出金色电话方块";
    G.goal.textContent = goalTxt;
    if (G.totalfill) G.totalfill.style.width = (G.level / 10 * 100) + "%";
  }

  // ---- 教学面板（含自动演示动画） ----
  function showTutorial() {
    if (!G) return;
    G.grid.style.display = "none";
    G.panel.classList.add("is-show");
    G.panel.textContent = "";

    var card = el("div", "mc-tut");
    card.appendChild(el("div", "mc-tut-head", "How to play · 怎么玩（看动画演示）"));

    // 演示小棋盘：4 列 × 3 行，固定地形：草/草/泥/石，草/泥/相机/石，…
    var tutGrid = el("div", "mc-tut-grid");
    var tutCells = [];
    var layout = [
      ["grass", "grass", "dirt", "stone"],
      ["dirt", "camera", "stone", "dirt"],
      ["stone", "dirt", "dirt", "stone"]
    ];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 4; c++) {
        var d = el("div", "mc-tut-cell mc-cell-" + layout[r][c]);
        tutGrid.appendChild(d);
        tutCells.push(d);
      }
    }
    card.appendChild(tutGrid);

    var bubble = el("div", "mc-tut-bubble", "\u25B6 演示开始…");
    card.appendChild(bubble);

    var steps = el("ul", "mc-tut-steps");
    [
      "① 点方块 = 挖。硬度不同敲的次数不同：草/泥 1 下、石头/煤矿/相机 2 下、深板岩/电话 3 下（点击: 1 hit for grass & dirt, 2 for stone/coal/camera, 3 for deepslate/phone）",
      "② 只能挖「露出来」的方块：最表层，或紧挨着已挖开的洞 —— 和 Minecraft 一样（Only exposed blocks can be dug, just like Minecraft）",
      "③ 键盘党：WASD/方向键移动黄色光标，空格挖掘（Keyboard: WASD/arrows to move cursor, Space to dig）",
      "④ 挖到品红相机方块 \u{1F4F7} = 得一张像素靓照，共 9 关 9 张；第 10 关挖出金色电话 \u260E = 求职者电话号码！"
    ].forEach(function (t) { steps.appendChild(el("li", null, t)); });
    card.appendChild(steps);

    var goBtn = el("button", "mc-tut-go", "看懂了，开始挖！ · GOT IT, LET'S DIG!");
    goBtn.type = "button";
    goBtn.addEventListener("click", function () {
      try { localStorage.setItem(SEEN_TUT_KEY, "1"); } catch (e) {}
      tutStop = true;
      showLevelCard(G.level);
    });
    var skipRow = el("div", "mc-tut-skiprow");
    goBtn.style.marginBottom = "8px";
    var skip = el("button", "mc-lc-tut", "\u8DF3\u8FC7\u6559\u5B66 \u00BB Skip");
    skip.type = "button";
    skip.addEventListener("click", function () {
      try { localStorage.setItem(SEEN_TUT_KEY, "1"); } catch (e) {}
      tutStop = true;
      showLevelCard(G.level);
    });
    skipRow.appendChild(goBtn);
    skipRow.appendChild(skip);
    card.appendChild(skipRow);
    G.panel.appendChild(card);

    // ---- 演示动画：光标移动 → 敲击 → 裂纹 → 碎裂 →（相机）金光 ----
    var tutStop = false;
    var seq = [
      { r: 0, c: 1, type: "grass",   hits: 1, say: "点草方块… 1 下就碎！ / Click grass… 1 hit!" },
      { r: 1, c: 1, type: "dirt",    hits: 1, say: "露出来的泥土也能直接挖 / Exposed dirt is diggable" },
      { r: 0, c: 3, type: "stone",   hits: 2, say: "石头要敲 2 下：裂纹→碎 / Stone needs 2 hits: crack → break" },
      { r: 1, c: 2, type: "camera",  hits: 2, say: "品红相机方块！挖到 = 得靓照 \u{1F4F7} / Pink camera = a photo!" }
    ];
    function cellAt(r, c) { return tutCells[r * 4 + c]; }
    function runStep(i) {
      if (tutStop || !G) return;
      if (i >= seq.length) { // 一轮结束，重置地形再来
        setTimeout(function () {
          if (tutStop || !G) return;
          tutCells.forEach(function (d, idx) {
            d.className = "mc-tut-cell mc-cell-" + layout[Math.floor(idx / 4)][idx % 4];
          });
          runStep(0);
        }, 1400);
        return;
      }
      var s = seq[i];
      var cell = cellAt(s.r, s.c);
      bubble.textContent = "\u25B6 " + s.say;
      cell.classList.add("is-tut-cursor");
      var hit = 0;
      function hitOnce() {
        if (tutStop || !G) return;
        hit++;
        if (s.hits > 1 && hit < s.hits) {
          cell.classList.add("is-cracking");
          setTimeout(hitOnce, 650);
        } else {
          cell.classList.remove("is-cracking");
          cell.classList.remove("is-tut-cursor");
          cell.classList.add("is-tut-break");
          if (s.type === "camera") cell.classList.add("is-tut-glow");
          setTimeout(function () { runStep(i + 1); }, 900);
        }
      }
      setTimeout(hitOnce, 600);
    }
    runStep(0);
  }

  // ---- 关卡说明卡（每关开场：目标 + 地形 + 硬度表 + 操作） ----
  function showLevelCard(lv) {
    if (!G) return;
    var def = LEVELS[lv - 1];
    G.panel.classList.add("is-show");
    G.panel.textContent = "";
    G.grid.style.display = "none";

    var card = el("div", "mc-level-card");
    card.appendChild(el("div", "mc-lc-num", "LEVEL " + lv + " / 10" +
      (lv < 10 ? " · 📸 靓照已收 " + (lv - 1) + "/9" : "")));
    card.appendChild(el("div", "mc-lc-name", def.icon + " " + def.name +
      " · " + "\u2605".repeat(def.stars)));
    card.appendChild(el("div", "mc-lc-tip", def.tip + " 小技巧：按住方块不放会连续挖！"));
    card.appendChild(el("div", "mc-lc-log", def.log));

    // 本关最佳纪录
    var best = null;
    try { best = Number(localStorage.getItem("mc_best_" + lv)) || null; } catch (e) {}
    if (best) card.appendChild(el("div", "mc-lc-stat", "\u{1F3C6} \u672C\u5173\u6700\u4F73\u7528\u65F6 " + best.toFixed(1) + "s"));

    // 目标方块大图 + 说明
    var goalRow = el("div", "mc-lc-goal");
    var goalBlock = el("div", "mc-lc-goal-block " + (lv < 10 ? "mc-cell-camera" : "mc-cell-phone"));
    goalRow.appendChild(goalBlock);
    var done10 = false;
    try { done10 = lv === 10 && !!localStorage.getItem(DONE_KEY); } catch (e) {}
    var goalTxt = lv < 10
      ? "挖到「相机方块」📷 得到第 " + lv + " 张像素靓照（埋在第 " + (def.goalMin + 1) + "~" + (def.goalMax + 1) + " 层）"
      : done10
        ? "✅ 已通关！重玩可再看一次电话号码 —— 按住方块连挖更快"
        : "挖穿最底层，找到「金色电话方块」☎ —— 得到求职者的电话号码！按住方块不放会连续挖";
    goalRow.appendChild(el("span", "mc-lc-goal-txt", goalTxt));
    card.appendChild(goalRow);

    // 关卡选择：已解锁的关可点击直接重玩
    card.appendChild(el("div", "mc-lc-sub", "\u9009\u62E9\u5173\u5361 · Level select\uFF08\u70B9\u5DF2\u89E3\u9501\u7684\u5173\u53EF\u91CD\u73A9\uFF09"));
    var selRow = el("div", "mc-lc-select");
    var unlocked = loadProgress();
    for (var i = 1; i <= 10; i++) {
      (function (num) {
        var b = el("button", "mc-lv-pick" + (num <= unlocked ? " is-open" : "") + (num === lv ? " is-cur" : ""));
        b.type = "button";
        b.textContent = num < 10 ? String(num) : "\u260E";
        if (num <= unlocked) {
          b.title = "Level " + num;
          b.addEventListener("click", function () { SFX.click(); showLevelCard(num); });
        } else {
          b.disabled = true;
          b.title = "\u901A\u5173\u524D\u9762\u7684\u5173\u5361\u89E3\u9501";
        }
        selRow.appendChild(b);
      })(i);
    }
    card.appendChild(selRow);

    // 硬度速查表
    card.appendChild(el("div", "mc-lc-sub", "方块硬度 · Block hardness（敲几下）"));
    var hardRow = el("div", "mc-lc-hard");
    Object.keys(BLOCKS).forEach(function (k) {
      if (k === "camera" || k === "phone") return;
      var item = el("span", "mc-lc-hard-item");
      var sw = el("i", "mc-lc-sw mc-cell-" + k);
      item.appendChild(sw);
      item.appendChild(el("span", null, BLOCKS[k].cn + " " + BLOCKS[k].hp));
      hardRow.appendChild(item);
    });
    card.appendChild(hardRow);

    card.appendChild(el("div", "mc-lc-ops",
      "操作：点击方块挖掘 · WASD/方向键移动光标 · 空格挖 · ESC 关闭\n" +
      "规则：只能挖暴露在表面、或紧挨空洞的方块（和 Minecraft 一样）"));

    var startBtn = el("button", "mc-lc-start", "\u26CF 开始挖掘 · START DIGGING");
    startBtn.type = "button";
    startBtn.addEventListener("click", function () { startLevel(lv); });
    card.appendChild(startBtn);

    // 看过教学但忘了？随时重看
    var tutLink = el("button", "mc-lc-tut", "\u25B6 重看玩法演示 · Replay tutorial");
    tutLink.type = "button";
    tutLink.addEventListener("click", function () {
      try { localStorage.removeItem(SEEN_TUT_KEY); } catch (e) {}
      showTutorial();
    });
    card.appendChild(tutLink);

    G.panel.appendChild(card);
    updateHud();
  }

  // ---- 开局：生成世界 ----
  function startLevel(lv) {
    if (!G) return;
    var def = LEVELS[lv - 1];
    G.level = lv;
    G.panel.classList.remove("is-show");
    G.grid.style.display = "";
    G.grid.style.gridTemplateColumns = "repeat(" + def.cols + ", 1fr)";
    G.cursor = { r: 0, c: 0 };
    G.bag = {};

    var cells = [], hpMap = [];
    for (var r = 0; r < def.rows; r++) {
      var row = [], rowHp = [];
      for (var c = 0; c < def.cols; c++) {
        var t;
        if (r === 0) t = "grass";
        else if (r <= 2) t = "dirt";
        else if (def.rock === "soft") t = Math.random() < 0.15 ? "coal" : (Math.random() < 0.06 ? "gem" : "stone");
        else if (def.rock === "mix") {
          if (r <= def.rows * 0.55) t = Math.random() < 0.18 ? "coal" : (Math.random() < 0.06 ? "gem" : "stone");
          else t = Math.random() < 0.15 ? "coal" : "deepslate";
        } else { // hard
          if (r <= 3) t = Math.random() < 0.18 ? "coal" : (Math.random() < 0.06 ? "gem" : "stone");
          else t = Math.random() < 0.18 ? "coal" : (Math.random() < 0.04 ? "gem" : "deepslate");
        }
        row.push(t);
        rowHp.push(BLOCKS[t].hp);
      }
      cells.push(row);
      hpMap.push(rowHp);
    }
    // 目标方块：goalMin~goalMax 行内随机列（避开最左最右 2 列，保证可达）
    var gr = def.goalMin + Math.floor(Math.random() * (def.goalMax - def.goalMin + 1));
    var gc = 2 + Math.floor(Math.random() * (def.cols - 4));
    var goalType = lv < 10 ? "camera" : "phone";
    cells[gr][gc] = goalType;
    hpMap[gr][gc] = BLOCKS[goalType].hp;
    G.goalPos = { r: gr, c: gc };

    G.cells = cells;
    G.hpMap = hpMap;
    updateHud();
    render(true); // 开局逐格落下入场

    // 3-2-1 倒计时（按住/点击可跳过）
    G.counting = true;
    G.t0 = 0;
    var cd = el("div", "mc-countdown", "3");
    SFX.tick();
    G.frame.appendChild(cd);
    var n = 3;
    G.cdIv = setInterval(function () {
      n--;
      if (n <= 0) {
        clearInterval(G.cdIv); G.cdIv = null;
        cd.remove();
        G.counting = false;
        G.t0 = Date.now();
        SFX.click();
      } else { cd.textContent = String(n); SFX.tick(); }
    }, 350);

    if (!G.onKey) {
      G.onKey = function (e) {
        if (!G || G.closed) return;
        if (G.panel.classList.contains("is-show")) {
          if (e.key === "Escape") G.closeGame();
          return;
        }
        var k = e.key.toLowerCase();
        var map = { w: [-1, 0], a: [0, -1], s: [1, 0], d: [0, 1], arrowup: [-1, 0], arrowleft: [0, -1], arrowdown: [1, 0], arrowright: [0, 1] };
        if (map[k]) { e.preventDefault(); moveCursor(map[k][0], map[k][1]); }
        else if (k === " " || k === "enter") { e.preventDefault(); digCell(G.cursor.r, G.cursor.c); } // 空格按住 = 系统自带重复
        else if (k === "escape") { G.closeGame(); }
      };
      document.addEventListener("keydown", G.onKey);
    }
    attachGridInput(G);
  }

  function render(dropIn) {
    if (!G || !G.cells) return;
    var def = LEVELS[G.level - 1];
    var frag = document.createDocumentFragment(); // 一次挂载，减少 176 次回流
    var gp = G.goalPos || {};
    for (var r = 0; r < def.rows; r++) {
      for (var c = 0; c < def.cols; c++) {
        var type = G.cells[r][c];
        // air 也渲染（洞穴底色），光标移到洞上黄环依然可见
        var cracked = type !== "air" && G.hpMap[r][c] < BLOCKS[type].hp;
        var isGoal = type === "camera" || type === "phone";
        // 热感：光标逼近目标 3 格内，目标闪烁加速（找方块更爽）
        var hot = isGoal && Math.max(Math.abs(gp.r - r), Math.abs(gp.c - c)) <= 3;
        var d = document.createElement("div");
        d.className = "mc-cell mc-cell-" + type +
          (cracked ? " is-cracking" : "") +
          (G.cursor.r === r && G.cursor.c === c ? " is-cursor" : "") +
          (type === "air" || exposed(r, c) ? "" : " is-buried") +
          (hot ? " is-hot" : "");
        if (cracked) d.dataset.hits = String(G.hpMap[r][c]); // 剩余敲击数徽章
        if (dropIn) { d.classList.add("is-drop"); d.style.animationDelay = ((r + c) * 16) + "ms"; }
        d.dataset.r = String(r);
        d.dataset.c = String(c);
        frag.appendChild(d);
      }
    }
    G.grid.textContent = "";
    G.grid.appendChild(frag);
    var parts = [];
    Object.keys(G.bag).forEach(function (k) { parts.push(k + " x" + G.bag[k]); });
    G.inv.textContent = "Bag / 背包: " + (parts.length ? parts.join(" \u00B7 ") : "--");
  }

  // 只能挖「暴露面」：表层或与已挖空方块相邻 —— 沿用 MC 的挖掘习惯
  function exposed(r, c) {
    if (r === 0) return true;
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var d = 0; d < 4; d++) {
      var nr = r + dirs[d][0], nc = c + dirs[d][1];
      if (nr >= 0 && nr < LEVELS[G.level - 1].rows && nc >= 0 && nc < LEVELS[G.level - 1].cols && G.cells[nr][nc] === "air") return true;
    }
    return false;
  }

  // 挖掘输入：按下即挖一下，按住不放 = 每 280ms 连挖（Minecraft 手感）
  // 用 pointerdown（鼠标/触屏统一），不用 click 避免连点双倍伤害
  function attachGridInput(G) {
    var holdTimer = null;
    function stopHold() { if (holdTimer) { clearInterval(holdTimer); holdTimer = null; } }
    G.grid.addEventListener("pointerdown", function (e) {
      if (!G || G.closed || G.panel.classList.contains("is-show")) return;
      if (G.counting) { // 倒计时中点击 = 跳过，直接开挖
        G.counting = false;
        if (G.cdIv) { clearInterval(G.cdIv); G.cdIv = null; }
        var cd = G.frame.querySelector(".mc-countdown");
        if (cd) cd.remove();
        if (!G.t0) G.t0 = Date.now();
      }
      var t = e.target.closest(".mc-cell");
      if (!t) return;
      var r = Number(t.dataset.r), c = Number(t.dataset.c);
      digCell(r, c);
      stopHold();
      holdTimer = setInterval(function () {
        if (!G || G.closed || G.panel.classList.contains("is-show") || !G.cells || G.cells[r][c] === "air") { stopHold(); return; }
        digCell(r, c);
      }, 240); // 略快于 280ms，连挖更顺
      achOnce("mc_ach_hold", "\u{1F576}\uFE0F", "Hold to mine! / 学会连挖！", "Hold to keep digging / 按住不放持续挖");
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      G.grid.addEventListener(ev, stopHold);
    });
    G.grid.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // 长按别弹菜单
  }

  // 金色波纹（电话方块挖穿时从原地扩散）
  function fxGoldRipple(cellEl) {
    if (!cellEl) return;
    var r = cellEl.getBoundingClientRect();
    for (var i = 0; i < 3; i++) {
      (function (idx) {
        setTimeout(function () {
          var s = el("span", "mc-gold-ripple");
          s.style.left = r.left + r.width / 2 + "px";
          s.style.top = r.top + r.height / 2 + "px";
          document.body.appendChild(s);
          setTimeout(function () { s.remove(); }, 900);
        }, idx * 220);
      })(i);
    }
  }
  // 胜利彩带：顶部随机撒落像素彩纸
  function fxConfetti() {
    var colors = ["#5ea832", "#f0b90b", "#d946ef", "#4fd8ff", "#ffff55", "#ff7043"];
    for (var i = 0; i < 24; i++) {
      (function (idx) {
        setTimeout(function () {
          var p = el("span", "mc-confetti");
          p.style.left = (Math.random() * 96) + "vw";
          p.style.background = colors[idx % colors.length];
          p.style.animationDuration = (0.9 + Math.random() * 0.9) + "s";
          document.body.appendChild(p);
          setTimeout(function () { p.remove(); }, 1900);
        }, idx * 55);
      })(i);
    }
  }
  // 快门白闪
  function fxFlash() {
    var f = el("div", "mc-flash");
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 240);
  }

  function digCell(r, c) {
    if (!G || G.closed || !G.cells || G.panel.classList.contains("is-show") || G.counting) return;
    if (!exposed(r, c)) return;
    var type = G.cells[r][c];
    if (type === "air") return;
    var cellEl = G.grid.querySelector('.mc-cell[data-r="' + r + '"][data-c="' + c + '"]');
    G.hpMap[r][c] -= 1;
    achOnce("mc_ach_dig", "\u26CF", "First dig! / 第一次挖掘！", "Welcome to the mine / 欢迎来挖矿"); // 成就：首次挖掘
    try { localStorage.setItem("mc_digs", String(Number(localStorage.getItem("mc_digs") || 0) + 1)); } catch (e) {} // 总挖掘数
    if (G.hpMap[r][c] > 0) {
      // 裂纹：就地更新徽章与裂纹，不全量重渲染（涟漪不被打断）
      SFX.crack();
      fxRipple(cellEl);
      if (cellEl) { cellEl.classList.add("is-cracking"); cellEl.dataset.hits = String(G.hpMap[r][c]); }
      return;
    }
    var drop = BLOCKS[type].drop;
    var color = BLOCKS[type].color;
    G.cells[r][c] = "air";
    G.bag[drop] = (G.bag[drop] || 0) + 1;
    SFX.break_();
    fxParticles(cellEl, color, type === "deepslate" || type === "phone" ? 10 : 6);
    fxFlyDrop(cellEl, color);
    if (type === "deepslate" || type === "phone") fxShake();
    if (type === "gem") { // 钻石彩蛋方块
      SFX.gem();
      toast("\u{1F48E}", "DIAMONDS! / 挖到钻石！", "Shiny bonus find / 意外的宝贝");
      try { localStorage.setItem("mc_gems", String(Number(localStorage.getItem("mc_gems") || 0) + 1)); } catch (e) {}
    }
    render();
    if (type === "camera" || type === "phone") {
      var won = type === "phone";
      if (won) {
        fxGoldRipple(cellEl);
        saveProgress(10); // 终关通关后停在 10，可重玩
        try { localStorage.setItem(DONE_KEY, "1"); } catch (e) {}
        showPhoneCard();
      } else {
        fxFlash();
        SFX.shutter();
        saveProgress(G.level + 1);
        showPhotoCard(G.level);
      }
    }
  }

  function moveCursor(dr, dc) {
    if (!G || !G.cells || G.counting) return;
    var def = LEVELS[G.level - 1];
    var nr = Math.max(0, Math.min(def.rows - 1, G.cursor.r + dr));
    var nc = Math.max(0, Math.min(def.cols - 1, G.cursor.c + dc));
    if (nr !== G.cursor.r || nc !== G.cursor.c) { G.cursor.r = nr; G.cursor.c = nc; render(); }
  }

  // ---- 照片卡：拍立得风格 ----
  function showPhotoCard(lv) {
    if (!G) return;
    G.grid.style.display = "none";
    G.panel.classList.add("is-show");
    G.panel.textContent = "";
    var style = PHOTO_STYLES[lv - 1];

    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-title", "\u{1F4F8} New photo! / 新靓照到手！"));
    card.appendChild(el("div", "mc-ach-desc", "Level " + lv + " clear · 第 " + lv + " 关通关"));

    var polaroid = el("div", "mc-polaroid");
    var img = document.createElement("img");
    img.alt = "Pixel photo " + lv;
    img.className = "mc-photo-img";
    polaroid.appendChild(img);
    polaroid.appendChild(el("span", "mc-new-tag", "NEW!")); // 角标
    card.appendChild(polaroid);

    makePhoto(style, function (url) {
      if (url) {
        img.src = url;
        if (style.filter) img.style.filter = style.filter;
      } else {
        img.replaceWith(el("div", "mc-photo-fallback", "\u{1F4F8}"));
      }
    });
    card.appendChild(el("div", "mc-photo-cap", "Photo " + lv + "/9 · " + style.name));

    // 结算：用时 / 最佳纪录 / 星级
    var secs = (Date.now() - (G.t0 || Date.now())) / 1000;
    try { localStorage.setItem("mc_time_ms", String(Number(localStorage.getItem("mc_time_ms") || 0) + Math.round(secs * 1000))); } catch (e) {}
    var bestKey = "mc_best_" + lv;
    var prevBest = null;
    try { prevBest = Number(localStorage.getItem(bestKey)) || null; } catch (e) {}
    var isRecord = !prevBest || secs < prevBest;
    if (isRecord) { try { localStorage.setItem(bestKey, String(secs)); } catch (e) {} }
    var stars = secs < 15 ? 3 : (secs < 30 ? 2 : 1);
    var statRow = el("div", "mc-lc-stat",
      "\u23F1 " + secs.toFixed(1) + "s · " + "\u2605".repeat(stars) +
      " · \u6700\u4F73 " + (isRecord ? secs.toFixed(1) : prevBest.toFixed(1)) + "s" +
      (isRecord ? " \u{1F389}NEW RECORD!" : ""));
    card.appendChild(statRow);

    // 进度点
    var dots = el("div", "mc-dots mc-dots-big");
    for (var i = 1; i <= 10; i++) {
      var d = el("span", "mc-dot" + (i <= lv ? " is-on" : ""));
      d.textContent = i < 10 ? "\u25A0" : "\u260E";
      dots.appendChild(d);
    }
    card.appendChild(dots);

    // 本关收获统计
    var haul = [];
    Object.keys(G.bag).forEach(function (k) { haul.push(k.split(" /")[0] + " x" + G.bag[k]); });
    card.appendChild(el("div", "mc-lc-stat", "\u{1F392} \u672C\u5173\u6536\u83B7\uFF1A" + (haul.length ? haul.join(" \u00B7 ") : "--")));

    var btnRow = el("div", "mc-photo-btns");
    var next = el("button", "mc-win-close", lv < 9 ? "下一关 Level " + (lv + 1) + " \u2192" : "最终关：金色电话 \u260E");
    next.type = "button";
    next.addEventListener("click", function () { showLevelCard(lv + 1); });
    btnRow.appendChild(next);
    var later = el("button", "mc-photo-later", "先收着，稍后再来 · Close");
    later.type = "button";
    later.addEventListener("click", function () { G && G.closeGame(); });
    btnRow.appendChild(later);
    card.appendChild(btnRow);

    card.appendChild(el("div", "mc-ach-desc mc-win-hint",
      lv < 9
        ? "再挖 " + (9 - lv) + " 张，最后一关挖出电话号码！"
        : "靓照集齐 9 张！最后一关：挖出金色电话 \u260E"));

    G.panel.appendChild(card);
    updateHud();
  }

  // ---- 终极奖励：电话号码 ----
  function showPhoneCard() {
    if (!G) return;
    G.grid.style.display = "none";
    G.panel.classList.add("is-show");
    G.panel.textContent = "";
    fxConfetti();
    SFX.win();

    var card = el("div", "mc-photo-card");
    card.appendChild(el("div", "mc-ach-icon", "\u260E"));
    card.appendChild(el("div", "mc-ach-title", "ALL 10 LEVELS CLEAR! / 十关全通！"));
    card.appendChild(el("div", "mc-ach-desc", "You dug out the phone! / 你挖到了求职者的电话："));

    var phoneRow = el("div", "mc-win-phone");
    phoneRow.appendChild(el("span", "mc-win-num", G.phone || "benson.codeislaw.qzz.io"));
    var copy = el("button", "mc-win-copy", "Copy / \u590D\u5236");
    copy.type = "button";
    copy.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(G.phone);
      copy.textContent = "OK \u2713";
      setTimeout(function () { copy.textContent = "Copy / \u590D\u5236"; }, 1600);
    });
    phoneRow.appendChild(copy);
    card.appendChild(phoneRow);

    var dots = el("div", "mc-dots mc-dots-big");
    for (var i = 1; i <= 10; i++) {
      var d = el("span", "mc-dot is-on");
      d.textContent = i < 10 ? "\u25A0" : "\u260E";
      dots.appendChild(d);
    }
    card.appendChild(dots);

    // 矿工生涯统计行
    var totDigs = 0, totGems = 0, totMs = 0;
    try {
      totDigs = Number(localStorage.getItem("mc_digs") || 0);
      totGems = Number(localStorage.getItem("mc_gems") || 0);
      totMs = Number(localStorage.getItem("mc_time_ms") || 0);
    } catch (e) {}
    card.appendChild(el("div", "mc-lc-stat",
      "\u{1F4CA} \u603B\u6316\u6398 " + totDigs + " \u00B7 \u{1F48E} \u94BB\u77F3 " + totGems +
      " \u00B7 \u23F1 \u603B\u7528\u65F6 " + (totMs / 1000).toFixed(1) + "s"));

    // 9 张靓照缩略图墙
    var wall = el("div", "mc-photo-wall");
    PHOTO_STYLES.forEach(function (st, idx) {
      var box = el("div", "mc-photo-thumb");
      box.title = st.name; // 悬停显示风格名
      var im = document.createElement("img");
      im.alt = "Photo " + (idx + 1);
      makePhoto(st, function (url) {
        if (url) { im.src = url; if (st.filter) im.style.filter = st.filter; }
      });
      box.appendChild(im);
      wall.appendChild(box);
    });
    card.appendChild(el("div", "mc-lc-sub", "\u{1F4F8} Collected photos / 靓照图鉴 9/9"));
    card.appendChild(wall);

    card.appendChild(el("div", "mc-ach-desc mc-win-hint",
      "That phone was buried 10 levels deep \u2014 in real life, just call me :) / 游戏里挖了十层才到的电话 \u2014\u2014 现实中直接打更快 :)"));

    var btnRow2 = el("div", "mc-photo-btns");
    var contact = el("button", "mc-win-close", "\u{1F4C4} \u67E5\u770B\u8054\u7CFB\u65B9\u5F0F · Contact");
    contact.type = "button";
    contact.addEventListener("click", function () {
      var id = G && G.closeGame;
      if (id) id();
      setTimeout(function () {
        var sec = document.getElementById("contact");
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
    btnRow2.appendChild(contact);
    var again = el("button", "mc-photo-later", "\u{1F501} \u518D\u6316\u4E00\u904D · Again");
    again.type = "button";
    again.addEventListener("click", function () { if (G) showLevelCard(10); });
    btnRow2.appendChild(again);
    card.appendChild(btnRow2);

    var close = el("button", "mc-win-close", "Close / \u5173\u95ED");
    close.type = "button";
    close.addEventListener("click", function () { G && G.closeGame(); });
    card.appendChild(close);

    G.panel.appendChild(card);
    updateHud();
  }

})();
