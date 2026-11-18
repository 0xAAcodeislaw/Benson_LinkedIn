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
        var el = document.getElementById(d.id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
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
        var el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
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

  // ---- 6. 彩蛋：Minecraft 挖矿小游戏 --------------------------------------
  // 顶栏 ⛏ 按钮 → 全屏挖矿覆盖层。沿用 MC 操作：
  //   点击 = 挖掘（不同方块硬度不同）；WASD/方向键 = 移动光标；空格 = 挖掘。
  // 挖到底部的金色「电话方块」→ 解锁求职者电话号码。
  var COLS = 14, ROWS = 10;
  var BLOCKS = {
    grass:     { hp: 1, face: "#5ea832", side: "#4a7d28", drop: "Grass / 草方块" },
    dirt:      { hp: 1, face: "#8f6b42", side: "#6b5230", drop: "Dirt / 泥土" },
    stone:     { hp: 2, face: "#8a8a8a", side: "#5f5f5f", drop: "Stone / 石头" },
    coal:      { hp: 2, face: "#565656", side: "#333333", drop: "Coal / 煤矿" },
    deepslate: { hp: 3, face: "#484850", side: "#2e2e36", drop: "Deepslate / 深板岩" },
    phone:     { hp: 3, face: "#f0b90b", side: "#c99a08", drop: "Phone! / 电话方块" }
  };

  function readPhone() {
    try {
      var ld = document.querySelector('script[type="application/ld+json"]');
      if (ld) {
        var p = JSON.parse(ld.textContent);
        if (p.telephone) return p.telephone;
      }
    } catch (e) {}
    // 回落：从联系卡片找
    var el2 = document.querySelector('[data-contact-phone]');
    return el2 ? el2.getAttribute('data-contact-phone') : "";
  }

  function injectEasterEggButton() {
    if (document.querySelector(".mc-easter-btn")) return;
    var tools = document.querySelector(".nav-tools");
    if (!tools) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mc-easter-btn";
    btn.title = "Easter egg: mining mini-game / 彩蛋小游戏";
    btn.setAttribute("aria-label", "Easter egg: mining mini-game");
    btn.textContent = "\u26CF";
    btn.addEventListener("click", openGame);
    tools.appendChild(btn);
  }

  function openGame() {
    if (document.getElementById("mc-game")) return;
    var phone = readPhone();

    var overlay = document.createElement("div");
    overlay.className = "mc-game-overlay";
    overlay.id = "mc-game";

    var frame = el("div", "mc-game-frame");
    var titleRow = el("div", "mc-game-title");
    titleRow.appendChild(el("span", null, "\u26CF"));
    titleRow.appendChild(el("span", null, "Dig for the phone! / 挖出电话方块"));
    var closeBtn = el("button", "mc-game-close", "\u00D7");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.addEventListener("click", closeGame);
    titleRow.appendChild(closeBtn);

    var hud = el("div", "mc-game-hud");
    var inv = el("span", "mc-game-inv", "Bag / 背包: --");
    var goal = el("span", "mc-game-goal", "Goal / 目标: find the golden phone / 挖出金色电话方块");
    hud.appendChild(inv);
    hud.appendChild(goal);

    var grid = el("div", "mc-game-grid");

    var help = el("div", "mc-game-help");
    help.appendChild(el("span", null, "Click to dig / 点击挖掘 \u00B7 WASD move / 移动光标 \u00B7 Space dig / 空格挖 \u00B7 ESC close / 关闭"));

    frame.appendChild(titleRow);
    frame.appendChild(hud);
    frame.appendChild(grid);
    frame.appendChild(help);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    // ---- 世界生成 ----
    var cells = [], hpMap = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [], rowHp = [];
      for (var c = 0; c < COLS; c++) {
        var t;
        if (r === 0) t = "grass";
        else if (r <= 2) t = "dirt";
        else if (r <= 5) t = Math.random() < 0.18 ? "coal" : "stone";
        else t = Math.random() < 0.15 ? "coal" : "deepslate";
        row.push(t);
        rowHp.push(BLOCKS[t].hp);
      }
      cells.push(row);
      hpMap.push(rowHp);
    }
    // 金色电话方块：埋在最底层随机列
    var phoneCol = 3 + Math.floor(Math.random() * (COLS - 6));
    cells[ROWS - 1][phoneCol] = "phone";

    var inv = {};
    var cursor = { r: 0, c: 0 };
    var closed = false;

    function render() {
      grid.textContent = "";
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var type = cells[r][c];
          var d = document.createElement("div");
          var can = exposed(r, c);
          d.className = "mc-cell mc-cell-" + type +
            (hpMap[r][c] < BLOCKS[type].hp ? " is-cracking" : "") +
            (cursor.r === r && cursor.c === c ? " is-cursor" : "") +
            (can ? "" : " is-buried");
          d.dataset.r = String(r);
          d.dataset.c = String(c);
          grid.appendChild(d);
        }
      }
      var parts = [];
      Object.keys(inv).forEach(function (k) { parts.push(k + " x" + inv[k]); });
      inv.textContent = "Bag / 背包: " + (parts.length ? parts.join(" \u00B7 ") : "--");
    }

    // 只能挖「暴露面」：表层或与已挖空方块相邻 —— 沿用 MC 的挖掘习惯
    function exposed(r, c) {
      if (r === 0) return true;
      var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (var d = 0; d < 4; d++) {
        var nr = r + dirs[d][0], nc = c + dirs[d][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && cells[nr][nc] === "air") return true;
      }
      return false;
    }

    function digCell(r, c) {
      if (closed) return;
      if (!exposed(r, c)) return;
      var type = cells[r][c];
      if (type === "air") return;
      hpMap[r][c] -= 1;
      if (hpMap[r][c] > 0) { render(); return; }
      var drop = BLOCKS[type].drop;
      cells[r][c] = "air";
      inv[drop] = (inv[drop] || 0) + 1;
      render();
      if (type === "phone") {
        closed = true;
        document.removeEventListener("keydown", onKey);
        winPanel(phone);
      }
    }

    function moveCursor(dr, dc) {
      var nr = Math.max(0, Math.min(ROWS - 1, cursor.r + dr));
      var nc = Math.max(0, Math.min(COLS - 1, cursor.c + dc));
      if (nr !== cursor.r || nc !== cursor.c) { cursor.r = nr; cursor.c = nc; render(); }
    }

    function onKey(e) {
      if (closed) return;
      var k = e.key.toLowerCase();
      var map = { w: [-1, 0], a: [0, -1], s: [1, 0], d: [0, 1], arrowup: [-1, 0], arrowleft: [0, -1], arrowdown: [1, 0], arrowright: [0, 1] };
      if (map[k]) { e.preventDefault(); moveCursor(map[k][0], map[k][1]); }
      else if (k === " " || k === "enter") { e.preventDefault(); digCell(cursor.r, cursor.c); }
      else if (k === "escape") { closeGame(); }
    }
    document.addEventListener("keydown", onKey);

    grid.addEventListener("click", function (e) {
      var t = e.target.closest(".mc-cell");
      if (!t) return;
      digCell(Number(t.dataset.r), Number(t.dataset.c));
    });

    function closeGame() {
      closed = true;
      document.removeEventListener("keydown", onKey);
      var o = document.getElementById("mc-game");
      if (o) o.remove();
      document.body.style.overflow = "";
    }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeGame(); });

    render();
  }

  // ---- 7. 胜利面板：解锁电话号码 ----
  function winPanel(phone) {
    var overlay = el("div", "mc-game-overlay mc-win-overlay");
    var frame = el("div", "mc-game-frame mc-win-frame");
    frame.appendChild(el("div", "mc-ach-icon", "\u260F"));
    frame.appendChild(el("div", "mc-ach-title", "Achievement get! / 成就达成！"));
    frame.appendChild(el("div", "mc-ach-desc", "You found the phone block! / 你挖到了电话方块\uFF1A"));

    var phoneRow = el("div", "mc-win-phone");
    phoneRow.appendChild(el("span", "mc-win-num", phone || "benson.codeislaw.qzz.io"));
    var copy = el("button", "mc-win-copy", "Copy / \u590D\u5236");
    copy.type = "button";
    copy.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(phone);
      copy.textContent = "OK \u2713";
      setTimeout(function () { copy.textContent = "Copy / \u590D\u5236"; }, 1600);
    });
    phoneRow.appendChild(copy);
    frame.appendChild(phoneRow);

    frame.appendChild(el("div", "mc-ach-desc mc-win-hint", "That phone was buried in the game \u2014 in real life, just call me :) / 游戏里埋的电话 \u2014\u2014 现实中直接打更快 :)"));

    var close = el("button", "mc-win-close", "Close / \u5173\u95ED");
    close.type = "button";
    close.addEventListener("click", function () {
      overlay.remove();
      document.body.style.overflow = "";
    });
    frame.appendChild(close);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
  }


})();
