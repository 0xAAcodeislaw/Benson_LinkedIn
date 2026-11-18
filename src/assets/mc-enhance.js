// Minecraft 主题专属增强：真·像素化头像 + 底部物品栏 hotbar + 方块装饰
// 只在检测到像素字体（Minecraft 版）时启用，其他 4 个风格完全不受影响。
(function () {
  "use strict";

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
})();
