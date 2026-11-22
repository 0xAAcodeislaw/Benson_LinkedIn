// Minecraft 主题彩蛋：游戏中心 —— 顶栏单入口 🎮，点开选择器面板再细分
// 聚合 5 款游戏：挖矿/扫雷/方块/接龙/雷电（各游戏脚本自注入按钮 → 本脚本隐藏并代理启动）
(function () {
  "use strict";
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function isMC() { try { return !!(document.fonts && document.fonts.check && document.fonts.check('12px "MinecraftPixel"')); } catch (e) { return false; } }

  // 五款游戏清单（proxy: 点击卡片时调用对应入口按钮，等价真人点击）
  var GAMES = [
    { id: "mine",     btn: ".mc-easter-btn", icon: "\u26CF",     name: "\u6316\u77FF\u95EF\u5173",   sub: "20 \u5173 \u00B7 \u5956\u52B1\uFF1A\u7535\u8BDD",   key: "mc_dig_lv",  max: 20 },
    { id: "ms",       btn: ".ms-btn",        icon: "\u{1F4A3}",  name: "\u626B\u96F7",               sub: "10 \u5173 \u00B7 \u5956\u52B1\uFF1A\u90AE\u7BB1",   key: "{{SECRET_12gud4k4}}",  max: 10 },
    { id: "tetris",   btn: ".tt-btn",        icon: "\u25A6",     name: "\u4FC4\u7F57\u65AF\u65B9\u5757", sub: "10 \u5173 \u00B7 \u5956\u52B1\uFF1A\u90AE\u7BB1", key: "{{SECRET_741qvxs8}}", max: 10 },
    { id: "solitaire",btn: ".sl-btn",        icon: "\u{1F0CF}",  name: "\u7EB8\u724C\u63A5\u9F99",   sub: "10 \u5173 \u00B7 \u5956\u52B1\uFF1A\u90AE\u7BB1",   key: "{{SECRET_k8vnc2mq}}",  max: 10 },
    { id: "raiden",   btn: ".rd-btn",        icon: "\u2708\uFE0F", name: "\u96F7\u7535 RAIDEN",     sub: "10 \u5173 \u00B7 \u5956\u52B1\uFF1ALinkedIn", key: "{{SECRET_o9w4t1zb}}",  max: 10 }
  ];

  function lvOf(key, max) {
    var n = Number(localStorage.getItem(key) || 1);
    return Math.min(max, Math.max(1, n));
  }

  function injectHub() {
    if (document.querySelector(".mc-hub-btn")) return;
    var tools = document.querySelector(".nav-tools");
    if (!tools) return;
    var b = el("button", "mc-hub-btn", "\u{1F3AE}");
    b.type = "button";
    b.title = "Game Center / \u6E38\u620F\u4E2D\u5FC3";
    b.setAttribute("aria-label", "Game Center");
    b.addEventListener("click", openHub);
    tools.appendChild(b);
  }

  // 隐藏五游戏各自的原始入口按钮（由游戏中心统一代理）
  function hideRawButtons() {
    GAMES.forEach(function (g) {
      var b = document.querySelector(g.btn);
      if (b) b.classList.add("mc-hub-hidden");
    });
  }

  function openHub() {
    if (document.getElementById("mc-hub")) return;
    hideRawButtons();
    var ov = el("div", "mc-game-overlay mc-hub-overlay");
    ov.id = "mc-hub";
    var frame = el("div", "mc-game-frame mc-hub-frame");
    var title = el("div", "mc-game-title");
    title.appendChild(el("span", null, "\u{1F3AE}"));
    title.appendChild(el("span", "mc-game-title-txt", "GAME CENTER / \u6E38\u620F\u4E2D\u5FC3"));
    var x = el("button", "mc-game-close", "\u00D7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    x.addEventListener("click", function () { closeHub(); });
    title.appendChild(x);
    frame.appendChild(title);

    var grid = el("div", "mc-hub-grid");
    GAMES.forEach(function (g) {
      var lv = lvOf(g.key, g.max);
      var cleared = lv >= g.max;
      var card = el("button", "mc-hub-card" + (cleared ? " is-clear" : ""));
      card.type = "button";
      card.innerHTML =
        '<span class="mc-hub-icon">' + g.icon + '</span>' +
        '<span class="mc-hub-name">' + g.name + '</span>' +
        '<span class="mc-hub-sub">' + g.sub + '</span>' +
        '<span class="mc-hub-prog' + (cleared ? ' is-clear' : '') + '">' + (cleared ? "\u{1F3C6} \u5168\u901A\u5173" : "\u8FDB\u5EA6 Lv " + lv + "/" + g.max) + '</span>';
      card.addEventListener("click", function () {
        closeHub();
        setTimeout(function () {
          var btn = document.querySelector(g.btn);
          if (btn) btn.click();
        }, 60);
      });
      grid.appendChild(card);
    });
    frame.appendChild(grid);
    var hint = el("div", "mc-game-help");
    hint.appendChild(el("span", null, "\u26CF=\u7535\u8BDD \u00B7 \u{1F4A3}\u25A6\u{1F0CF}=\u90AE\u7BB1 \u00B7 \u2708\uFE0F=LinkedIn \u2014 \u96C6\u9F50\u5168\u90E8\u5956\u52B1\uFF01"));
    frame.appendChild(hint);
    ov.appendChild(frame);
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    ov.addEventListener("click", function (e) { if (e.target === ov) closeHub(); });
    document.addEventListener("keydown", hubKey);
  }

  function hubKey(e) { if (e.key === "Escape" && document.getElementById("mc-hub")) closeHub(); }
  function closeHub() {
    var o = document.getElementById("mc-hub");
    if (o) o.remove();
    document.removeEventListener("keydown", hubKey);
    document.body.style.overflow = "";
  }

  function init() {
    if (!isMC()) return;
    // 等五游戏脚本全部注入完成再上中心入口（它们的按钮就位 = 可代理）
    var tries = 0;
    (function waitGames() {
      var ready = GAMES.filter(function (g) { return document.querySelector(g.btn); }).length;
      if (ready >= GAMES.length) {
        hideRawButtons();
        injectHub();
        return;
      }
      if (tries++ < 60) setTimeout(waitGames, 300);
      else { hideRawButtons(); injectHub(); } // 兜底：超时也上中心（卡片点击时若按钮未注入，60ms 延迟内仍可代理）
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  setTimeout(init, 3500);
})();
