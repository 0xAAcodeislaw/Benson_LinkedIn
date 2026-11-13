// 交互：主题切换、区块导航高亮、滚动淡入、邮箱复制。
// 所有增强都是渐进式的：脚本失败时页面内容与导航仍完全可用。

(function () {
  "use strict";

  /* ---- 主题切换 ---- */
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      toggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
    });
    toggle.setAttribute("aria-pressed", root.dataset.theme === "dark" ? "true" : "false");
  }

  /* ---- 区块导航高亮 ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll(".section-nav a[data-nav]"));
  if (links.length) {
    var sections = links
      .map(function (link) {
        return document.getElementById(link.dataset.nav);
      })
      .filter(Boolean);

    var setActive = function (id) {
      links.forEach(function (link) {
        var on = link.dataset.nav === id;
        link.classList.toggle("active", on);
        if (on) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    var ticking = false;
    var update = function () {
      ticking = false;
      // 与 CSS 的 scroll-margin-top 对齐，锚点跳转后能立刻高亮正确区块
      var probe = sections[0];
      var margin = probe ? parseFloat(window.getComputedStyle(probe).scrollMarginTop) || 64 : 64;
      var offset = margin + 4;
      var current = sections[0];
      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= offset) current = section;
      });
      // 滚动到底部时强制高亮最后一块
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        current = sections[sections.length - 1];
      }
      if (current) setActive(current.id);
    };

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* ---- 滚动淡入（只对首屏之外的卡片启用，避免闪动） ---- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    var targets = Array.prototype.slice
      .call(document.querySelectorAll(".card"))
      .filter(function (el) {
        return el.getBoundingClientRect().top > window.innerHeight * 0.92;
      });

    targets.forEach(function (el) {
      el.classList.add("reveal");
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---- 回到顶部（移动端） ---- */
  var toTop = document.querySelector("[data-to-top]");
  if (toTop) {
    var updateToTop = function () {
      toTop.classList.toggle("is-visible", window.scrollY > 600);
    };
    window.addEventListener("scroll", updateToTop, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
    updateToTop();
  }

  /* ---- 打印视图：/en/?print=1 自动打开打印对话框（可存为 PDF） ---- */
  if (/[?&]print=1\b/.test(location.search)) {
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        window.print();
      }, 400);
    });
  }

  /* ---- 邮箱复制 ---- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    var original = btn.dataset.label;
    var done = function () {
      btn.textContent = btn.dataset.copiedLabel || "Copied!";
      window.setTimeout(function () {
        btn.textContent = original;
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(btn.dataset.copy).then(done, function () {});
    }
  });
})();
