// 页面模板：所有 HTML 结构集中在此。对 content.json 的缺失字段做防御式处理，
// 删掉可选区块（认证/奖项/精选项目等）不会导致构建失败。
import { ICONS, logo, projectThumb } from "./icons.mjs";

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const has = (v) => Array.isArray(v) && v.length > 0;

// ---- 小组件 --------------------------------------------------------------
const btn = (cls, href, icon, label, { external = true, download = false } = {}) =>
  `<a class="btn ${cls}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ""}${
    download ? " download" : ""
  }>${icon}<span>${esc(label)}</span></a>`;

const chips = (items, small = false) =>
  has(items)
    ? `<div class="chips${small ? " chips-sm" : ""}">${items.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`
    : "";

// ---- 头部 ----------------------------------------------------------------
function header(lang, loc, profile, locales, langLinks, navItems) {
  const langSwitch = locales
    .map(
      (l) =>
        `<a href="/${l}/"${l === lang ? ' class="active" aria-current="true"' : ""} lang="${l}" hreflang="${l}">${langLinks[l]}</a>`
    )
    .join("");

  const sectionNav = has(navItems)
    ? `<nav class="section-nav" aria-label="${esc(loc.a11y.sections)}">${navItems
        .map((it) => {
          const text = it.short
            ? `<span class="nav-full">${esc(it.label)}</span><span class="nav-short">${esc(it.short)}</span>`
            : esc(it.label);
          return `<a href="#${it.id}" data-nav="${it.id}"${
            it.short ? ` aria-label="${esc(it.label)}"` : ""
          }>${text}</a>`;
        })
        .join("")}</nav>`
    : "";

  return `<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="/${lang}/" aria-label="${esc(profile.name)}">${esc(profile.initials)}</a>
    ${sectionNav}
    <div class="nav-tools">
      <button type="button" class="theme-toggle" data-theme-toggle aria-label="${esc(loc.a11y.themeToggle)}" title="${esc(loc.a11y.themeToggle)}">
        <span class="theme-icon theme-sun">${ICONS.sun}</span>
        <span class="theme-icon theme-moon">${ICONS.moon}</span>
      </button>
      <nav class="lang-switch" aria-label="${esc(loc.a11y.language)}">${langSwitch}</nav>
    </div>
  </div>
</header>`;
}

// ---- 个人信息卡 ----------------------------------------------------------
function hero(lang, loc, profile) {
  const av = loc.hero.availability || {};
  const availItems = [
    av.type ? `<li>${ICONS.briefcase}${esc(av.type)}</li>` : "",
    av.start ? `<li>${ICONS.calendar}${esc(av.start)}</li>` : "",
    av.workAuth ? `<li>${ICONS.shield}${esc(av.workAuth)}</li>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<section class="card hero">
      <div class="banner" aria-hidden="true"></div>
      <div class="hero-body">
        <img class="avatar" src="/avatar" alt="${esc(profile.name)}" width="152" height="152" fetchpriority="high" decoding="async">
        <h1>${esc(profile.name)}</h1>
        <p class="headline">${esc(loc.hero.headline)}</p>
        <p class="muted location">${ICONS.pin} ${esc(loc.hero.location)}</p>
        <p class="print-contact">${esc(profile.email)} · ${esc((profile.github || "").replace(/^https?:\/\//, ""))} · ${esc((profile.linkedin || "").replace(/^https?:\/\//, ""))}</p>
        <p class="otw"><span class="dot" aria-hidden="true"></span><strong>${esc(loc.hero.openToWork)}</strong><span class="otw-sep" aria-hidden="true">·</span><span>${esc(loc.hero.openToWorkDetail)}</span></p>
        ${availItems ? `<ul class="availability">${availItems}</ul>` : ""}
        <div class="actions">
          ${btn("btn-primary", `/assets/resume-${lang}.pdf`, ICONS.download, loc.hero.btnResume, { external: false, download: true })}
          ${btn("btn-outline", `mailto:${profile.email}`, ICONS.mail, loc.hero.btnEmail, { external: false })}
          ${btn("btn-outline", profile.github, ICONS.github, loc.hero.btnGithub)}
          ${btn("btn-outline", profile.linkedin, ICONS.linkedin, loc.hero.btnLinkedin)}
        </div>
      </div>
    </section>`;
}

// ---- 外观 token（后台可改主色 / 字号 / 圆角）----
function themeStyle(site) {
  const t = (site && site.theme) || {};
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : null);
  const num = (v, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
  };
  const light = [];
  const dark = [];
  if (hex(t.accentLight)) light.push(`--blue:${hex(t.accentLight)}`);
  if (hex(t.accentDark)) dark.push(`--blue:${hex(t.accentDark)}`);
  if (num(t.baseFontSize, 12, 18) !== null) light.push(`--fs-base:${num(t.baseFontSize, 12, 18)}px`);
  if (num(t.radius, 0, 20) !== null) light.push(`--radius:${num(t.radius, 0, 20)}px`);
  if (!light.length && !dark.length) return "";
  return `<style id="theme-vars">${light.length ? `:root{${light.join(";")}}` : ""}${
    dark.length ? `:root[data-theme="dark"]{${dark.join(";")}}` : ""
  }</style>`;
}

// ---- 访问统计（token 为空时输出空字符串，零开销）----
function analyticsScript(site) {
  const token = site && site.analyticsToken ? String(site.analyticsToken).trim() : "";
  // 只接受 32 位十六进制，避免后台误填导致注入异常
  if (!/^[a-fA-F0-9]{32}$/.test(token)) return "";
  return `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`;
}

// ---- 各区块 ----
function aboutSection(loc) {
  // 没有段落时整块不渲染（导航项也会自动隐藏）
  if (!has(loc.about)) return "";
  return `<section class="card" id="about">
      <h2>${esc(loc.sections.about)}</h2>
      ${loc.about.map((p) => `<p class="para">${esc(p)}</p>`).join("")}
    </section>`;
}

function experienceSection(loc) {
  const entries = loc.experience
    .map(
      (e, i) => `
      <li class="entry">
        ${logo(e.company, i)}
        <div class="entry-body">
          <h3>${esc(e.role)}</h3>
          <p class="muted">${esc(e.company)} · ${esc(e.period)}</p>
          <p class="muted small">${ICONS.pin} ${esc(e.location)}</p>
          ${has(e.points) ? `<ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          ${chips(e.tech, true)}
        </div>
      </li>`
    )
    .join("");

  return `<section class="card" id="experience">
      <h2>${esc(loc.sections.experience)}</h2>
      <ul class="entries">${entries}</ul>
    </section>`;
}

function educationSection(loc) {
  const edu = loc.education;
  const details = [...(edu.details || [])];
  if (edu.gpa && !details.some((d) => d.toLowerCase().includes("gpa") || d.includes("均分") || d.toLowerCase().includes("moyenne"))) {
    details.unshift(`${loc.sections.gpa}: ${edu.gpa}`);
  }
  if (has(edu.honours)) details.push(...edu.honours);

  return `<section class="card" id="education">
      <h2>${esc(loc.sections.education)}</h2>
      <ul class="entries">
        <li class="entry">
          ${logo(edu.school, 1)}
          <div class="entry-body">
            <h3>${esc(edu.degree)}</h3>
            <p class="muted">${esc(edu.school)} · ${esc(edu.period)}</p>
            <p class="muted small">${ICONS.pin} ${esc(edu.location)}</p>
            ${has(details) ? `<ul>${details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
            ${has(edu.coursework) ? `<div class="coursework">${chips(edu.coursework)}</div>` : ""}
          </div>
        </li>
      </ul>
    </section>`;
}

function credentialsSection(loc) {
  const certs = loc.certifications || [];
  const awards = loc.awards || [];
  if (!has(certs) && !has(awards)) return "";

  const certList = has(certs)
    ? `<h3 class="subhead">${esc(loc.sections.certifications)}</h3>
      <ul class="cred-list">${certs
        .map(
          (c) => `<li>
            <span class="cred-icon">${ICONS.certificate}</span>
            <div>
              <p class="cred-name">${
                c.link
                  ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.name)}</a>`
                  : esc(c.name)
              }</p>
              <p class="muted small">${esc(c.issuer)}${c.date ? ` · ${esc(c.date)}` : ""}</p>
            </div>
          </li>`
        )
        .join("")}</ul>`
    : "";

  const awardList = has(awards)
    ? `<h3 class="subhead">${esc(loc.sections.awards)}</h3>
      <ul class="cred-list">${awards
        .map(
          (a) => `<li>
            <span class="cred-icon">${ICONS.award}</span>
            <div>
              <p class="cred-name">${esc(a.name)}</p>
              <p class="muted small">${esc(a.issuer)}${a.date ? ` · ${esc(a.date)}` : ""}</p>
            </div>
          </li>`
        )
        .join("")}</ul>`
    : "";

  return `<section class="card" id="credentials">
      <h2>${esc(loc.sections.credentials)}</h2>
      ${certList}${awardList}
    </section>`;
}

function volunteeringSection(loc) {
  const items = loc.volunteering || [];
  if (!has(items)) return "";
  const entries = items
    .map(
      (e, i) => `
      <li class="entry">
        ${logo(e.org, i + 3)}
        <div class="entry-body">
          <h3>${esc(e.role)}</h3>
          <p class="muted">${esc(e.org)}${e.period ? ` · ${esc(e.period)}` : ""}</p>
          ${e.location ? `<p class="muted small">${ICONS.pin} ${esc(e.location)}</p>` : ""}
          ${has(e.points) ? `<ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        </div>
      </li>`
    )
    .join("");

  return `<section class="card" id="volunteering">
      <h2>${esc(loc.sections.volunteering)}</h2>
      <ul class="entries">${entries}</ul>
    </section>`;
}

function publicationsSection(loc) {
  const items = loc.publications || [];
  if (!has(items)) return "";
  const entries = items
    .map(
      (p) => `
      <li class="entry project">
        <div class="entry-body">
          <h3>${
            p.link
              ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title)} ${ICONS.external}</a>`
              : esc(p.title)
          }</h3>
          <p class="muted">${esc(p.venue || "")}${p.date ? ` · ${esc(p.date)}` : ""}</p>
          ${p.description ? `<p>${esc(p.description)}</p>` : ""}
        </div>
      </li>`
    )
    .join("");

  return `<section class="card" id="publications">
      <h2>${esc(loc.sections.publications)}</h2>
      <ul class="entries">${entries}</ul>
    </section>`;
}

function interestsSection(loc) {
  const items = loc.interests || [];
  if (!has(items)) return "";
  return `<section class="card" id="interests">
      <h2>${esc(loc.sections.interests)}</h2>
      ${chips(items)}
    </section>`;
}

function projectsSection(loc) {
  const all = loc.projects || [];
  if (!has(all)) return "";

  const featured = all.filter((p) => p.featured);
  const rest = all.filter((p) => !p.featured);

  const featuredCards = has(featured)
    ? `<ul class="project-grid">${featured
        .map(
          (p, i) => `<li class="project-card">
          ${
            p.image
              ? `<img class="project-thumb" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="168" height="120">`
              : projectThumb(p.name, i)
          }
          <div class="project-info">
            <h3><a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)} ${ICONS.external}</a></h3>
            ${(p.role || p.period) ? `<p class="muted small project-meta">${esc([p.role, p.period].filter(Boolean).join(" · "))}</p>` : ""}
            ${p.metric ? `<p class="project-metric">${esc(p.metric)}</p>` : ""}
            <p>${esc(p.description)}</p>
            ${chips(p.tech)}
          </div>
        </li>`
        )
        .join("")}</ul>`
    : "";

  const restList = has(rest)
    ? `<ul class="entries">${rest
        .map(
          (p) => `<li class="entry project">
          <div class="entry-body">
            <h3><a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)} ${ICONS.external}</a></h3>
            ${(p.role || p.period) ? `<p class="muted small project-meta">${esc([p.role, p.period].filter(Boolean).join(" · "))}</p>` : ""}
            ${p.metric ? `<p class="project-metric">${esc(p.metric)}</p>` : ""}
            <p>${esc(p.description)}</p>
            ${chips(p.tech)}
          </div>
        </li>`
        )
        .join("")}</ul>`
    : "";

  return `<section class="card" id="projects">
      <h2>${esc(loc.sections.projects)}</h2>
      ${featuredCards}
      ${has(featured) && has(rest) ? `<h3 class="subhead">${esc(loc.sections.moreProjects)}</h3>` : ""}
      ${restList}
    </section>`;
}

function skillsSection(loc) {
  const groups = loc.skills
    .map(
      (g) => `<div class="skill-group">
        <h3>${esc(g.group)}</h3>
        ${chips(g.items)}
      </div>`
    )
    .join("");

  return `<section class="card" id="skills">
      <h2>${esc(loc.sections.skills)}</h2>
      ${groups}
    </section>`;
}

// ---- 侧栏 ----------------------------------------------------------------
function quickFacts(loc) {
  const facts = loc.quickFacts || [];
  if (!has(facts)) return "";
  return `<section class="card quick-facts" id="facts">
      <h2>${esc(loc.sections.quickFacts)}</h2>
      <dl class="facts">
        ${facts.map((f) => `<div class="fact"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}
      </dl>
    </section>`;
}

function languagesCard(loc) {
  const rows = loc.languagesList
    .map(
      (l) => `<div class="lang-row">
        <div class="lang-head">
          <span>${esc(l.name)}${l.cefr ? ` <span class="cefr">${esc(l.cefr)}</span>` : ""}</span>
          <span class="muted small">${esc(l.level)}</span>
        </div>
        <div class="bar" role="img" aria-label="${esc(l.name)}: ${esc(l.level)}"><span style="width:${Number(l.pct) || 0}%"></span></div>
      </div>`
    )
    .join("");

  return `<section class="card" id="languages">
      <h2>${esc(loc.sections.languages)}</h2>
      ${rows}
    </section>`;
}

function contactCard(loc, profile) {
  return `<section class="card" id="contact">
      <h2>${esc(loc.sections.contact)}</h2>
      <ul class="contact-list">
        <li>${ICONS.mail}<a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a><button type="button" class="copy-btn" data-copy="${esc(profile.email)}" data-label="${esc(loc.contact.copy)}" data-copied-label="${esc(loc.contact.copied)}">${esc(loc.contact.copy)}</button></li>
        <li>${ICONS.github}<a href="${esc(profile.github)}" target="_blank" rel="noopener">${esc(loc.contact.githubLabel)}</a></li>
        <li>${ICONS.linkedin}<a href="${esc(profile.linkedin)}" target="_blank" rel="noopener">${esc(loc.contact.linkedinLabel)}</a></li>
      </ul>
    </section>`;
}

// ---- 页面 ----------------------------------------------------------------
export function buildPage({ lang, loc, site, profile, locales, langLinks }) {
  const s = loc.sections;
  const base = `/${lang}/`;

  const navItems = [
    // About 区块有内容时才显示（当前为空，整块不渲染）
    { id: "about", label: s.about, on: has(loc.about) },
    { id: "experience", label: s.experience, short: s.experienceShort, on: has(loc.experience) },
    { id: "education", label: s.education, on: !!loc.education },
    { id: "volunteering", label: s.volunteering, on: has(loc.volunteering) },
    { id: "credentials", label: s.credentials, short: s.credentialsShort, on: has(loc.certifications) || has(loc.awards) },
    { id: "projects", label: s.projects, on: has(loc.projects) },
    { id: "publications", label: s.publications, on: has(loc.publications) },
    { id: "skills", label: s.skills, short: s.skillsShort, on: has(loc.skills) },
  ].filter((i) => i.on);

  const structured = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: `${site.url}/${lang}/`,
    email: `mailto:${profile.email}`,
    jobTitle: loc.hero.headline,
    description: loc.meta.description,
    image: `${site.url}/assets/og-${lang}.png`,
    sameAs: [profile.github, profile.linkedin].filter(Boolean),
    telephone: profile.phone || undefined,
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: loc.education?.school,
      address: { "@type": "PostalAddress", addressLocality: "Ottawa", addressRegion: "ON", addressCountry: "CA" },
    },
    knowsLanguage: (loc.languagesList || []).map((l) => ({ "@type": "Language", name: l.name })),
    knowsAbout: (loc.skills || []).flatMap((g) => g.items),
    address: { "@type": "PostalAddress", addressLocality: "Ottawa", addressRegion: "ON", addressCountry: "CA" },
  };
  if (has(loc.certifications)) {
    structured.hasCredential = loc.certifications.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.name,
      credentialCategory: "certificate",
      recognizedBy: { "@type": "Organization", name: c.issuer },
    }));
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(loc.meta.title)}</title>
  <meta name="description" content="${esc(loc.meta.description)}">
  <meta name="author" content="${esc(site.author)}">
  <meta name="color-scheme" content="light dark">
  <script>
  (function () {
    var saved = null;
    try { saved = localStorage.getItem("theme"); } catch (e) {}
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  })();
  </script>
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${esc(loc.meta.title)}">
  <meta property="og:description" content="${esc(loc.meta.description)}">
  <meta property="og:url" content="${esc(site.url)}${base}">
  <meta property="og:site_name" content="${esc(profile.name)}">
  <meta property="og:image" content="${esc(site.url)}/assets/og-${lang}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(profile.name)} — ${esc(loc.hero.headline)}">
  <meta property="og:locale" content="${lang === "zh" ? "zh_CN" : lang === "fr" ? "fr_CA" : "en_CA"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(loc.meta.title)}">
  <meta name="twitter:description" content="${esc(loc.meta.description)}">
  <meta name="twitter:image" content="${esc(site.url)}/assets/og-${lang}.png">
  ${locales.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(site.url)}/${l}/">`).join("\n  ")}
  <link rel="alternate" hreflang="x-default" href="${esc(site.url)}/">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="canonical" href="${esc(site.url)}${base}">
  <link rel="preload" as="image" href="/avatar" fetchpriority="high">
  <link rel="stylesheet" href="/assets/style.css">
  ${site.themeFile ? `<link rel="stylesheet" href="/assets/${site.themeFile}">` : ""}
  ${themeStyle(site)}
  <script src="/assets/main.js" defer></script>
  ${site && site.themeFlag === "minecraft" ? '<script src="/assets/mc-enhance.js" defer></script>' : ""}
  <script type="application/ld+json">
${JSON.stringify(structured, null, 2)}
  </script>
</head>
<body>
<a class="skip-link" href="#main">${esc(loc.a11y.skip)}</a>
${header(lang, loc, profile, locales, langLinks, navItems)}

<main class="layout" id="main">
  <div class="col-main">
    ${hero(lang, loc, profile)}
    ${aboutSection(loc)}
    ${experienceSection(loc)}
    ${educationSection(loc)}
    ${volunteeringSection(loc)}
    ${credentialsSection(loc)}
    ${projectsSection(loc)}
    ${publicationsSection(loc)}
    ${skillsSection(loc)}
    ${interestsSection(loc)}
    <p class="footer">${esc(loc.footer)}</p>
  </div>

  <aside class="col-side">
    ${quickFacts(loc)}
    ${languagesCard(loc)}
    ${contactCard(loc, profile)}
  </aside>
</main>
<div class="visit-counter" data-visits title="${esc(loc.a11y.visitsTitle)}">
  <span class="visit-icon" aria-hidden="true">${ICONS.pin}</span>
  <span class="visit-num" data-visits-num>—</span>
  <span class="visit-label">${esc(loc.sections.visitsLabel)}</span>
</div>
<button class="to-top" type="button" data-to-top aria-label="${esc(loc.a11y.toTop)}" title="${esc(loc.a11y.toTop)}">${ICONS.arrowUp}</button>
${analyticsScript(site)}
</body>
</html>`;
}

export function buildNotFound({ profile, locales, content }) {
  // 404 文案来自各语言的 notFound 字段，可在后台修改
  const loc = (content && content.locales) || {};
  const lines = locales
    .map((l) => ({
      lang: l,
      text: (loc[l] && loc[l].notFound && loc[l].notFound.text) || "",
    }))
    .filter((x) => x.text);
  const title =
    (loc[locales[0]] && loc[locales[0]].notFound && loc[locales[0]].notFound.title) || "404";
  const back = "Back to homepage / 返回首页 / Retour à l'accueil";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="color-scheme" content="light dark">
  <script>
  (function () {
    var saved = null;
    try { saved = localStorage.getItem("theme"); } catch (e) {}
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  })();
  </script>
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="stylesheet" href="/assets/style.css">
  ${(content && content.site && content.site.themeFile) ? `<link rel="stylesheet" href="/assets/${content.site.themeFile}">` : ""}
</head>
<body class="nf-body">
  <main class="card nf-card">
    <span class="brand nf-brand">${esc(profile.initials)}</span>
    <h1>404</h1>
    ${lines.map((l) => `<p class="nf-line" lang="${l.lang}">${esc(l.text)}</p>`).join("")}
    <a class="btn btn-primary" href="/">${esc(back)}</a>
  </main>
</body>
</html>`;
}
