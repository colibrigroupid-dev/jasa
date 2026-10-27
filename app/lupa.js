/* JASA · Лупа: любое фото и видео по нажатию приближается, открытие и закрытие — эффектом воды (28.10.2026).
   Без зависимостей. Подключается одной строкой и на лендинге, и в кабинете: <script src="app/lupa.js" defer></script>.
   Не трогает картинки внутри ссылок и кнопок, мелкие значки (меньше 70 px) и всё с атрибутом data-no-lupa.
   API: JasaLupa.open({src, video, cap}) — открыть вручную (без исходного элемента). */
(function () {
  'use strict';
  if (window.JasaLupa) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ua = navigator.userAgent;
  // WebKit (Safari, все браузеры iOS, Telegram на iPhone) рисует SVG-фильтры на HTML-элементах медленно и с артефактами —
  // там вода делается размытием и «дыханием» масштаба, в остальных — настоящим смещением по шуму.
  const webkit = /iP(hone|ad|od)/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|Android|Edg/.test(ua));
  const MIN = 70;
  const EASE = 'cubic-bezier(.16,.84,.24,1)';

  const css = `
.lupa-z{cursor:zoom-in}
#lupa{position:fixed;inset:0;z-index:2147483000;display:none;touch-action:none;-webkit-tap-highlight-color:transparent}
#lupa.on{display:block}
#lupa .lp-bg{position:absolute;inset:0;background:rgba(8,10,18,0);-webkit-backdrop-filter:blur(0);backdrop-filter:blur(0);transition:background .55s ${EASE},backdrop-filter .55s ${EASE},-webkit-backdrop-filter .55s ${EASE};cursor:zoom-out}
#lupa.open .lp-bg{background:rgba(8,10,18,.9);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
#lupa .lp-m{position:absolute;left:0;top:0;transform-origin:50% 50%;border-radius:14px;box-shadow:0 30px 90px rgba(0,0,0,.55);will-change:transform,filter;background:#0b0d14;object-fit:contain;user-select:none;-webkit-user-drag:none}
#lupa img.lp-m{cursor:zoom-out}
#lupa .lp-ring{position:absolute;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;pointer-events:none;border:1.5px solid rgba(255,255,255,.75);box-shadow:0 0 24px rgba(160,210,255,.35),inset 0 0 18px rgba(160,210,255,.25)}
#lupa .lp-cap{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(720px,90vw);color:#fff;font:500 13px/1.45 system-ui,-apple-system,sans-serif;text-align:center;opacity:0;transition:opacity .4s .15s;text-shadow:0 1px 8px rgba(0,0,0,.6)}
#lupa.open .lp-cap{opacity:.85}
#lupa .lp-b{position:absolute;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font:400 26px/1 system-ui,sans-serif;cursor:pointer;opacity:0;transition:opacity .35s .1s,background .2s;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#lupa.open .lp-b{opacity:1}
#lupa .lp-b:hover{background:rgba(255,255,255,.24)}
#lupa .lp-b:focus-visible{outline:2px solid #fff;outline-offset:2px}
#lupa .lp-x{top:max(14px,env(safe-area-inset-top));right:14px}
#lupa .lp-prev{left:14px;top:50%;margin-top:-23px}
#lupa .lp-next{right:14px;top:50%;margin-top:-23px}
#lupa .lp-n{position:absolute;top:max(26px,calc(env(safe-area-inset-top) + 12px));left:18px;color:#fff;opacity:.6;font:500 12px/1 ui-monospace,Menlo,monospace}
@media (max-width:600px){#lupa .lp-prev,#lupa .lp-next{display:none}}`;

  let root, bg, cap, bx, bprev, bnext, num, disp, turb;
  let st = null;   // {el: исходный элемент или null, m: увеличенный элемент, group, i, busy}

  function build() {
    if (root) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<filter id="lupa-voda" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.011 0.026" numOctaves="2" seed="7" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.appendChild(svg);
    turb = svg.querySelector('feTurbulence'); disp = svg.querySelector('feDisplacementMap');
    root = document.createElement('div'); root.id = 'lupa';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Просмотр');
    root.innerHTML = '<div class="lp-bg"></div><div class="lp-cap"></div><div class="lp-n"></div>' +
      '<button class="lp-b lp-prev" aria-label="Предыдущее">‹</button><button class="lp-b lp-next" aria-label="Следующее">›</button>' +
      '<button class="lp-b lp-x" aria-label="Закрыть">×</button>';
    document.body.appendChild(root);
    bg = root.querySelector('.lp-bg'); cap = root.querySelector('.lp-cap'); num = root.querySelector('.lp-n');
    bx = root.querySelector('.lp-x'); bprev = root.querySelector('.lp-prev'); bnext = root.querySelector('.lp-next');
    bg.addEventListener('click', (e) => close(e.clientX, e.clientY));
    bx.addEventListener('click', () => close());
    bprev.addEventListener('click', () => step(-1));
    bnext.addEventListener('click', () => step(1));
    root.addEventListener('keydown', trapTab);
    let sx = 0, sy = 0, t0 = 0;
    root.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); }, { passive: true });
    root.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - t0 > 700) return;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) close();
    }, { passive: true });
  }

  // ---------- что можно приближать ----------
  function zoomable(el) {
    if (!el || !(el.tagName === 'IMG' || el.tagName === 'VIDEO')) return false;
    if (el.closest('#lupa, a[href], button, label, [data-no-lupa], [contenteditable]')) return false;
    if (el.tagName === 'IMG' && !(el.currentSrc || el.src)) return false;
    if (el.tagName === 'VIDEO' && !(el.currentSrc || el.src || el.querySelector('source'))) return false;
    const r = el.getBoundingClientRect();
    return r.width >= MIN && r.height >= MIN;
  }
  function groupOf(el) {
    return Array.from(document.querySelectorAll('img, video')).filter((x) => x === el || (zoomable(x) && x.offsetParent !== null));
  }
  function caption(el) {
    if (!el) return '';
    const box = el.closest('.img, .dcard, figure, .var, .still, .cover, .poster, .ph, .bthumb, .vid');
    const c = box && (box.dataset.cap || (box.querySelector('figcaption, .cap, small, .small, span') || {}).textContent);
    return String(c || el.getAttribute('alt') || el.getAttribute('title') || '').trim().slice(0, 300);
  }

  // ---------- геометрия ----------
  function natural(el) {
    if (el.tagName === 'VIDEO') return [el.videoWidth || 16, el.videoHeight || 9];
    return [el.naturalWidth || 4, el.naturalHeight || 5];
  }
  function fit(w, h) {
    const vw = innerWidth, vh = innerHeight;
    const mw = vw * (vw < 600 ? 0.96 : 0.9), mh = vh * (vw < 600 ? 0.78 : 0.84);
    const k = Math.min(mw / w, mh / h, w < 600 && h < 600 ? 2 : 3);
    const fw = Math.round(w * k), fh = Math.round(h * k);
    return { x: Math.round((vw - fw) / 2), y: Math.round((vh - fh) / 2 - (vw < 600 ? 10 : 0)), w: fw, h: fh };
  }
  function fromTransform(src, dst) {
    // равномерный масштаб от центра миниатюры: без растяжения, даже если миниатюра обрезана object-fit:cover
    const k = Math.max(src.width / dst.w, src.height / dst.h);
    const dx = src.left + src.width / 2 - (dst.x + dst.w / 2), dy = src.top + src.height / 2 - (dst.y + dst.h / 2);
    return `translate(${dx}px,${dy}px) scale(${k})`;
  }
  const inView = (r) => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && r.width > 0;

  // ---------- вода ----------
  let raf = 0;
  function water(m, mode, dur) {
    cancelAnimationFrame(raf);
    if (reduce) return;
    if (webkit) {
      const k = mode === 'in'
        ? [{ filter: 'blur(9px) saturate(1.25)' }, { filter: 'blur(3px) saturate(1.1)', offset: .45 }, { filter: 'blur(0) saturate(1)' }]
        : [{ filter: 'blur(0) saturate(1)' }, { filter: 'blur(10px) saturate(1.3)' }];
      m.animate(k, { duration: dur, easing: 'ease-out' });
      return;
    }
    m.style.filter = 'url(#lupa-voda)';
    const t0 = performance.now(), A = mode === 'in' ? 85 : 110;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      // открытие: сильная рябь гаснет с затухающими колебаниями; закрытие: рябь нарастает, как от брошенного камня
      const s = mode === 'in'
        ? A * Math.pow(1 - t, 2.2) * (0.55 + 0.45 * Math.cos(t * Math.PI * 5))
        : A * Math.pow(t, 1.4) * (0.75 + 0.25 * Math.sin(t * Math.PI * 4));
      disp.setAttribute('scale', s.toFixed(1));
      turb.setAttribute('baseFrequency', (0.011 + 0.006 * Math.sin(t * 6.3)).toFixed(4) + ' ' + (0.026 + 0.012 * Math.cos(t * 5.1)).toFixed(4));
      if (t < 1) raf = requestAnimationFrame(tick);
      else if (mode === 'in') { m.style.filter = ''; disp.setAttribute('scale', '0'); }
    };
    raf = requestAnimationFrame(tick);
    if (mode === 'in') setTimeout(() => { if (m.isConnected && st && st.m === m) { cancelAnimationFrame(raf); m.style.filter = ''; disp.setAttribute('scale', '0'); } }, dur + 60);
  }
  function rings(x, y, big) {
    if (reduce) return;
    const R = Math.hypot(innerWidth, innerHeight) / 48 * (big ? 1 : 0.6);
    [0, 140, 300].forEach((d, i) => {
      const r = document.createElement('div'); r.className = 'lp-ring';
      r.style.left = x + 'px'; r.style.top = y + 'px';
      root.appendChild(r);
      r.animate([{ transform: 'scale(.2)', opacity: 0.85 - i * 0.2 }, { transform: `scale(${R * (1 - i * 0.18)})`, opacity: 0 }],
        { duration: 1000 + i * 120, delay: d, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = () => r.remove();
    });
  }

  // ---------- открыть ----------
  function makeMedia(el, src, isVideo) {
    let m;
    if (isVideo) {
      m = document.createElement('video');
      m.src = src || el.currentSrc || el.src || (el.querySelector('source') || {}).src;
      m.controls = true; m.playsInline = true; m.loop = el ? el.loop : true; m.preload = 'auto';
      if (el && el.poster) m.poster = el.poster;
      if (el && el.currentTime) m.currentTime = el.currentTime;
      m.muted = false;
    } else {
      m = document.createElement('img');
      m.src = src || el.currentSrc || el.src; m.alt = (el && el.alt) || ''; m.decoding = 'async'; m.draggable = false;
      m.addEventListener('click', () => close());
    }
    m.className = 'lp-m';
    return m;
  }
  function place(m, box) {
    m.style.left = box.x + 'px'; m.style.top = box.y + 'px'; m.style.width = box.w + 'px'; m.style.height = box.h + 'px';
  }

  function open(el, opts) {
    opts = opts || {};
    build();
    if (st) return;   // двойной обработчик на одном нажатии — второй игнорируем
    const isVideo = el ? el.tagName === 'VIDEO' : !!opts.video;
    const group = el ? groupOf(el) : [];
    st = { el, group, i: Math.max(0, group.indexOf(el)), busy: true, focus: document.activeElement, cx: opts.x, cy: opts.y };
    root.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    show(el, opts.src, isVideo, opts.cap, 'in');
    void root.offsetWidth;            // фон и кнопки проявляются переходом; без ожидания кадра — нечему опоздать
    root.classList.add('open');
    bx.focus({ preventScroll: true });
    const many = group.length > 1;
    bprev.style.display = bnext.style.display = many ? '' : 'none';
    num.style.display = many ? '' : 'none';
  }

  function show(el, src, isVideo, capText, how) {
    const m = makeMedia(el, src, isVideo);
    const [nw, nh] = el ? natural(el) : [4, 5];
    const box = fit(nw, nh);
    place(m, box);
    root.insertBefore(m, cap);
    st.m = m; st.box = box;
    cap.textContent = capText || caption(el) || '';
    num.textContent = st.group.length > 1 ? (st.i + 1) + ' / ' + st.group.length : '';
    if (isVideo) {
      if (el && !el.paused) { st.resume = el; el.pause(); }
      const p = m.play(); if (p && p.catch) p.catch(() => { m.muted = true; m.play().catch(() => {}); });
      m.addEventListener('loadedmetadata', () => { if (!el) { const b = fit(m.videoWidth, m.videoHeight); place(m, b); st.box = b; } }, { once: true });
    } else if (!el) {
      const fix = () => { const b = fit(m.naturalWidth, m.naturalHeight); place(m, b); st.box = b; };
      m.complete ? fix() : m.addEventListener('load', fix, { once: true });
    }
    const r = el && el.getBoundingClientRect();
    const dur = reduce ? 1 : 640;
    let from;
    if (how === 'in' && r && inView(r)) from = fromTransform(r, box);
    else from = how === 'next' ? 'translateX(60px) scale(.94)' : how === 'prev' ? 'translateX(-60px) scale(.94)' : 'scale(.86)';
    const a = m.animate([{ transform: from, opacity: how === 'in' ? 0.35 : 0, borderRadius: '10px' }, { transform: 'none', opacity: 1, borderRadius: '14px' }],
      { duration: dur, easing: EASE });
    water(m, 'in', reduce ? 1 : 900);
    if (how === 'in') {
      const cx = st.cx != null ? st.cx : (r ? r.left + r.width / 2 : innerWidth / 2);
      const cy = st.cy != null ? st.cy : (r ? r.top + r.height / 2 : innerHeight / 2);
      rings(cx, cy, true);
    }
    const me = st;
    const done = () => { if (st === me) st.busy = false; };
    a.onfinish = done; setTimeout(done, dur + 80);   // страховка: в фоновой вкладке анимации могут не доиграть
  }

  // ---------- листать ----------
  function step(d) {
    if (!st || st.busy || st.group.length < 2) return;
    st.busy = true;
    const old = st.m;
    if (st.resume) { st.resume.play().catch(() => {}); st.resume = null; }
    if (old.tagName === 'VIDEO') old.pause();
    water(old, 'out', 380);
    old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${d > 0 ? -60 : 60}px) scale(.94)`, opacity: 0 }],
      { duration: 360, easing: 'ease-in', fill: 'forwards' }).onfinish = () => old.remove();
    setTimeout(() => old.remove(), 480);
    st.i = (st.i + d + st.group.length) % st.group.length;
    const el = st.group[st.i]; st.el = el;
    setTimeout(() => { if (st) show(el, null, el.tagName === 'VIDEO', null, d > 0 ? 'next' : 'prev'); }, 160);
  }

  // ---------- закрыть ----------
  function close(x, y) {
    if (!st || (st.busy && st.closing)) return;
    st.closing = true; st.busy = true;
    const { m, el } = st;
    if (m.tagName === 'VIDEO') {
      if (el && el.tagName === 'VIDEO' && !isNaN(m.currentTime)) { try { el.currentTime = m.currentTime; } catch (e) { /* поток без перемотки */ } }
      m.pause();
    }
    if (st.resume) { st.resume.play().catch(() => {}); st.resume = null; }
    const r = el && el.getBoundingClientRect();
    const to = r && inView(r) ? fromTransform(r, st.box) : 'scale(.82)';
    const dur = reduce ? 1 : 560;
    root.classList.remove('open');
    water(m, 'out', dur);
    const mx = st.box.x + st.box.w / 2, my = st.box.y + st.box.h / 2;
    rings(x != null ? x : mx, y != null ? y : my, false);
    const me = st;
    const finish = () => {
      if (st !== me) return;   // уже закрыто (сработал второй путь)
      cancelAnimationFrame(raf); disp.setAttribute('scale', '0');
      root.querySelectorAll('.lp-m, .lp-ring').forEach((n) => n.remove());
      root.classList.remove('on', 'open');
      document.documentElement.style.overflow = '';
      const f = st.focus; st = null;
      if (f && f.focus) f.focus({ preventScroll: true });
    };
    m.animate([{ transform: 'none', opacity: 1 }, { transform: to, opacity: r && inView(r) ? 0.2 : 0 }],
      { duration: dur, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).onfinish = finish;
    setTimeout(finish, dur + 120);   // слой не должен остаться поверх страницы, даже если анимация не доиграла
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    const f = [bprev, bnext, bx].filter((b) => b.style.display !== 'none');
    const i = f.indexOf(document.activeElement);
    e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  }

  // ---------- глобальные обработчики ----------
  document.addEventListener('click', (e) => {
    if (st || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const el = e.target.closest && e.target.closest('img, video');
    if (!zoomable(el)) return;
    if (el.tagName === 'VIDEO' && el.controls) {
      const r = el.getBoundingClientRect();
      if (e.clientY > r.bottom - 56) return;   // нажатие по панели плеера — пусть управляет плеером
    }
    e.preventDefault(); e.stopPropagation();
    open(el, { x: e.clientX, y: e.clientY });
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!st) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
  document.addEventListener('pointerover', (e) => {
    const el = e.target;
    if ((el.tagName === 'IMG' || el.tagName === 'VIDEO') && !el.classList.contains('lupa-z') && zoomable(el)) el.classList.add('lupa-z');
  }, { passive: true });
  addEventListener('resize', () => {
    if (!st || !st.m || st.closing) return;
    const m = st.m, w = m.naturalWidth || m.videoWidth || st.box.w, h = m.naturalHeight || m.videoHeight || st.box.h;
    st.box = fit(w, h); place(m, st.box);
  });

  window.JasaLupa = {
    open: (o) => open(null, typeof o === 'string' ? { src: o } : (o || {})),
    close: () => close(),
  };
})();
