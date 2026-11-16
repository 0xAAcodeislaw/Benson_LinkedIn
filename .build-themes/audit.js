(() => {
  if (!document.querySelector('.hero')) return { NOT_READY: document.title };
  const out = { overflow: [], contrast: [], tinyFont: [], brokenImg: [], toggle: null, clickTargets: [], theme: '', heroBg: '' };
  const seenC = new Set(), seenF = new Set(), seenT = new Set(), seenO = new Set();
  const lum = (c) => { const [r,g,b] = c.map(v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }); return 0.2126*r + 0.7152*g + 0.0722*b; };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(',').map(Number); return { rgb: p.slice(0,3), a: p.length>3 ? p[3] : 1 }; };
  const blend = (fg, bg) => fg.rgb.map((v,i) => v*fg.a + bg[i]*(1-fg.a));
  const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.99) return c.rgb; n = n.parentElement; } return [255,255,255]; };
  out.theme = document.documentElement.dataset.theme;
  const tgl = document.querySelector('.theme-toggle');
  out.toggle = tgl ? getComputedStyle(tgl).display : 'absent';
  const heroCard = document.querySelector('.hero');
  out.heroBg = heroCard ? getComputedStyle(heroCard).backgroundColor : null;
  document.querySelectorAll('img').forEach(i => { if (i.complete && i.naturalWidth === 0) out.brokenImg.push(i.src.slice(-30)); });
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.right > window.innerWidth + 1) {
      const k = el.tagName + '.' + (el.className||'') + '|' + Math.round(r.right - window.innerWidth);
      if (!seenO.has(k)) { seenO.add(k); out.overflow.push({ el: k, over: Math.round(r.right - window.innerWidth) }); }
    }
    if ((el.tagName === 'A' || el.tagName === 'BUTTON') && !el.closest('.nav') && r.height > 0 && r.height < 36) {
      const k = el.tagName + '.' + (el.className||'') + '|' + Math.round(r.height);
      if (!seenT.has(k)) { seenT.add(k); out.clickTargets.push({ el: k, h: Math.round(r.height) }); }
    }
    if (!el.textContent || !el.textContent.trim()) return;
    if (el.children.length && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const fg = parse(cs.color); if (!fg) return;
    const color = blend(fg, bgOf(el));
    const L1 = lum(color), L2 = lum(bgOf(el));
    const ratio = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) {
      const k = (el.className||el.tagName) + '|' + cs.color + '|' + Math.round(ratio*10);
      if (!seenC.has(k)) { seenC.add(k); out.contrast.push({ el: k, ratio: +ratio.toFixed(2), size: +size.toFixed(1), text: el.textContent.trim().slice(0,18) }); }
    }
    if (size < 9 && el.textContent.trim() && !el.closest('.visit-counter')) {
      const k = (el.className||el.tagName) + '|' + size + '|' + el.textContent.trim().slice(0,12);
      if (!seenF.has(k)) { seenF.add(k); out.tinyFont.push({ el: k, size: +size.toFixed(1) }); }
    }
  });
  return out;
})()
