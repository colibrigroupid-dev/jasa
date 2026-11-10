/* JASA · кабинет · прототип 27.10.2026. Без сборки, без библиотек. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const col = (c, d) => (/^#[0-9a-fA-F]{3,8}$/.test(String(c || '')) ? c : d);
  const arr = (a) => (Array.isArray(a) ? a : []);
  const main = $('#main');
  let headSig = '';   // подпись шапки: перерисовываем, только если что-то изменилось

  // ---------- состояние ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jasa:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jasa:' + k, JSON.stringify(v)); } catch (e) { /* приватное окно */ } },
  };
  const S = {
    credits: store.get('credits', 0),   // до ответа сервера — последнее известное или 0, не «300»
    brend: store.get('brend', null),
    useBrend: store.get('useBrend', true),
    feed: store.get('feed', []),
    tip: 'post',
    aspect: store.get('aspect', 'auto'),   // размер картинки из настроек: auto | 4:5 | 1:1 | 9:16 | 16:9
    hud: store.get('hud', 'auto'),         // художник варианта 1: auto | gpt | nb | seedream (человеку — «Художник 1/2/3»)
    kartOpis: store.get('kartOpis', ''),   // своё описание картинки (пусто — промптер решает сам по посту)
    yazyk: 'ru',   // ниже подставляется выбранный при первом запуске
    job: store.get('job', null),
    fkZapomnit: !!store.get('fkZapomnit', false),
    nisha: store.get('nisha', ''),
    brandFakty: store.get('brandFakty', null),
    status: { key: false, images: false },
    accepted: store.get('accepted', {}),
    spentJobs: store.get('spentJobs', {}),
    pollToken: 0,
    session: store.get('session', null),
    brandId: store.get('brandId', null),
    brandName: store.get('brandName', null),
    me: null,
    ceny: { image: 12, zadanie: { post: 21, afisha: 21, karusel: 21, rils: 6, plan: 6, dna: 6 }, zadanie_3: { post: 45, afisha: 45, karusel: 45, rils: 6, plan: 6, dna: 6 }, depo_prochitat: 2 },   // запас до ответа /api/ceny: одна картинка 21, три — 45 (09.11: было 45 и 45 — «Тарифы» показывали «пост с картинкой до 45»)
    recepty: [],
    stil: store.get('stil', []),
    lastError: '',
  };
  function spend(k, ostatok) { S.credits = typeof ostatok === 'number' ? ostatok : Math.max(0, Math.round((S.credits - (k || 0)) * 10) / 10); store.set('credits', S.credits); drawCredits(); }
  function drawCredits() { drawHead(); $('#cred').textContent = Math.floor(+S.credits || 0); $('#cred').title = S.credits + ' кр'; $('#credbar').style.width = Math.min(100, S.credits / 3) + '%'; const ta = document.getElementById('ask'); if (ta) ta.dispatchEvent(new Event('input')); }
  drawCredits();

  // ---------- Telegram Mini App ----------
  const TG = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData ? window.Telegram.WebApp : null;
  const API_BASE = /^(jasa\.asia|www\.jasa\.asia)$/.test(location.hostname) ? 'https://api.jasa.asia' : '';
  if (TG) {
    try { TG.ready(); TG.expand(); document.documentElement.classList.add('tg'); if (TG.setHeaderColor) TG.setHeaderColor('#F5F1E8'); if (TG.setBackgroundColor) TG.setBackgroundColor('#F5F1E8'); } catch (e) { /* старый клиент */ }
  }

  // открытые листы: «Назад» Telegram сначала закрывает верхний, потом уводит с экрана
  const overlays = [];
  const INERT_SEL = '#main, .rail, #tabbar, #mhead, #composer, #fab';
  const syncOverlays = () => { const on = overlays.length > 0; $$(INERT_SEL).forEach((e) => { if (on) e.setAttribute('inert', ''); else e.removeAttribute('inert'); }); if (TG && TG.BackButton) { try { (on || backNeeded()) ? TG.BackButton.show() : TG.BackButton.hide(); } catch (e) { /* старый клиент */ } } };
  const backNeeded = () => { const h = (location.hash || '#/sozdat').replace('#/', '').split('?')[0]; return !!routes[h] && !ROOT_TABS.includes(h); };
  if (TG) { try { if (TG.disableVerticalSwipes) TG.disableVerticalSwipes(); if (TG.BackButton) TG.BackButton.onClick(() => { if (overlays.length) { overlays[overlays.length - 1].close(); return; } if (history.length > 1) history.back(); else location.hash = '#/sozdat'; }); } catch (e) { /* старый клиент */ } }
  // лёгкий отклик на касание: в Telegram — родной, в браузере на Android — короткая вибрация
  const hap = (k) => { try { const H = TG && TG.HapticFeedback; if (H) { if (k === 'success' || k === 'error') H.notificationOccurred(k); else if (k === 'sel') H.selectionChanged(); else H.impactOccurred(k || 'light'); } else if (navigator.vibrate && k !== 'sel') navigator.vibrate(k === 'medium' ? 15 : 8); } catch (e) { /* без отклика */ } };
  // клавиатура: на iOS окно не сжимается, поэтому высоту клавиатуры считаем сами и поднимаем поле
  (function kbWatch() {
    const vv = window.visualViewport; const root = document.documentElement;
    const typing = () => /^(TEXTAREA|INPUT|SELECT)$/.test((document.activeElement || {}).tagName || '');
    let base = window.innerHeight;   // высота окна без клавиатуры: на Android окно само сжимается, на iOS нет
    const upd = () => {
      if (!typing()) base = Math.max(window.innerHeight, base > window.innerHeight + 120 ? 0 : base);
      const shrink = base - window.innerHeight;
      const kbIos = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
      root.style.setProperty('--kb', kbIos + 'px');
      root.classList.toggle('kb-open', typing() && (kbIos > 120 || shrink > 120));
    };
    if (vv) { vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd); }
    window.addEventListener('resize', upd);
    document.addEventListener('focusin', () => setTimeout(upd, 60)); document.addEventListener('focusout', () => setTimeout(() => { if (!typing()) base = window.innerHeight; upd(); }, 60));
  })();

  // ---------- API ----------
  async function api(path, body, extra) {   // extra — дополнительные заголовки (X-Login-Key при входе с компьютера, B-06 09.11)
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    if (TG) headers['X-Tg-Init'] = TG.initData;
    else if (S.session) headers['X-Session'] = S.session;
    const r = await fetch(API_BASE + path, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
    if (r.status === 429) throw new Error('Слишком много запросов — подождите минуту и попробуйте снова');
    const j = await r.json().catch(() => ({ error: 'Сервис временно недоступен, попробуйте через минуту' }));
    if (!r.ok) throw new Error(j.error || ('Сервис временно недоступен (' + r.status + ')'));
    setTimeout(drawHead, 0);   // бренд или кредиты могли смениться: шапка догоняет
    return j;
  }
  api('/api/status').then((s) => { S.status = s; }).catch(() => {});
  api('/api/ceny').then((c) => { S.ceny = c; drawHead(); if ((location.hash || '').startsWith('#/tarify') && routes.tarify) routes.tarify(true); ['ask', 'script'].forEach((id) => { const ta = document.getElementById(id); if (ta) ta.dispatchEvent(new Event('input')); }); }).catch(() => {});
  api('/api/recepty').then((r) => { S.recepty = arr(r.recepty); const box = $('#recepty'); if (box) box.innerHTML = receptyHtml(); }).catch(() => {});
  // цена до запуска = тем же расчётом, что резерв на сервере (Plumar: «цена под кнопкой совпадает со счётом»)
  const LANG_LABEL = { ru: 'Русский', kz: 'Қазақша', en: 'English' };
  // язык текстов выбирается один раз при первом запуске, дальше его можно сменить только в Кабинете
  const langGuess = () => { const c = String((TG && TG.initDataUnsafe && TG.initDataUnsafe.user && TG.initDataUnsafe.user.language_code) || navigator.language || 'ru').slice(0, 2).toLowerCase(); return c === 'kk' ? 'kz' : (c === 'en' ? 'en' : 'ru'); };
  const yazykCookie = () => { const m = /(?:^|; )jasa_yazyk=(ru|kz|en)/.exec(document.cookie || ''); return m ? m[1] : null; };
  S.yazyk = store.get('yazyk', null) || yazykCookie() || langGuess();
  if (yazykCookie()) S.yazykChosen = true;
  // выбор языка — первое действие нового пользователя: сервер выдаёт пробные кредиты, поэтому баланс перечитываем
  // после /api/yazyk баланс мог вырасти на пробные: перечитать профиль и, если открыт Кабинет, перерисовать его цифры
  function posleYazyka() { return loadMe().then(() => { if (/^#\/kabinet/.test(location.hash) && typeof kabinet === 'function') kabinet(); }); }
  const setLang = (l) => { S.yazyk = l; S.yazykChosen = true; store.set('yazyk', l); try { document.cookie = 'jasa_yazyk=' + l + '; max-age=31536000; path=/; SameSite=Lax'; } catch (e) { /* без cookie */ } api('/api/yazyk', { yazyk: l }).then(posleYazyka).catch(() => {}); };   // и в профиль на сервере: бот и Mini App знают
  const S_KART = () => (store.get('kartinki', 1) === 3 ? 3 : 1);   // сколько картинок рисовать сразу: 1 по умолчанию, 3 — по выбору (+24 кр)
  const priceOf = (tip) => { const z = (S_KART() === 3 && S.ceny.zadanie_3) || S.ceny.zadanie; return (z && z[tip]) || 3; };
  // 10.11: что даёт день подписки — фраза и число только с сервера (podpiska.chto считается там из числа кредитов и цены поста).
  // Старый сервер фразы не шлёт: тогда говорим без числа, чтобы не пообещать лишнего.
  const postSl = (x) => { const a = x % 10, b = x % 100; return a === 1 && b !== 11 ? 'пост' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'поста' : 'постов'; };
  const postovHvatit = () => Math.floor(dostupno('post') / (+((S.ceny.zadanie || {}).post) || 21));   // на сколько постов с одной картинкой хватает сейчас
  const denStroka = (pod) => (pod && typeof pod.chto === 'string' && pod.chto && +pod.v_den > 0 ? Math.round(+pod.v_den) + ' кредитов каждое утро: ' + pod.chto : 'Кредиты каждое утро на посты и картинки');
  // 10.11: на что идут дневные кредиты подписки — список с сервера; null — сервер старый, дневные идут на всё
  const podIdyot = () => (Array.isArray(S.ceny && S.ceny.podpiska_idyot) ? S.ceny.podpiska_idyot : null);
  const vnePodpiski = (tip) => { const k = S.me && S.me.koshelki, sp = podIdyot(); return !!(k && sp && !sp.includes(tip) && (+k.den || 0) > 0); };
  const dostupno = (tip) => { const k = S.me && S.me.koshelki; return vnePodpiski(tip) ? (+k.dar || 0) + (+k.lichnye || 0) : (+S.credits || 0); };
  const priceLabel = (tip, extra) => 'до ' + (priceOf(tip) + (extra || 0)) + ' кр';
  const LINK_RE = /https?:\/\/\S*(instagram\.com|tiktok\.com|youtu|vk\.com)\S*/;
  function loadMe() { return api('/api/me').then((m) => { S.me = m; if (m.yazyk && !store.get('yazyk', null)) { S.yazyk = m.yazyk; S.yazykChosen = true; store.set('yazyk', m.yazyk); } else if (!m.guest && !m.yazyk && store.get('yazyk', null)) { api('/api/yazyk', { yazyk: store.get('yazyk', 'ru') }).then(posleYazyka).catch(() => {}); } S.credits = m.kredity; store.set('credits', S.credits); drawCredits(); { const sc = document.getElementById('script'); if (sc) sc.dispatchEvent(new Event('input')); } const n = $('#acctname'); if (n) n.textContent = m.guest ? 'Гость' : (m.name || 'Вы'); const sub = n && n.nextElementSibling; if (sub) sub.textContent = m.guest ? 'войти через Telegram →' : 'первая волна · ' + (m.username ? '@' + m.username : 'Telegram'); return m; }).catch(() => null); }
  S.meP = loadMe();

  // ---------- тема ----------
  // Вечером (19:00–07:00 по часам устройства) всегда тёмный слой, днём — светлый или как в Telegram.
  // Ручной выбор действует до ближайшей смены дня и вечера, потом снова включается авто.
  const EVE_FROM = 19, EVE_TO = 7;
  const isEvening = (d) => { const h = (d || new Date()).getHours(); return h >= EVE_FROM || h < EVE_TO; };
  const nextSwitch = () => { const d = new Date(); const t = new Date(d); t.setMinutes(0, 0, 0); t.setHours(isEvening(d) && d.getHours() >= EVE_FROM ? 24 + EVE_TO : (isEvening(d) ? EVE_TO : EVE_FROM)); return t.getTime(); };
  const autoTheme = () => (isEvening() || (TG && TG.colorScheme === 'dark')) ? 'dark' : 'light';
  function currentTheme() { const m = store.get('themeManual', null); return m && m.until > Date.now() ? m.t : autoTheme(); }
  function applyTheme() { const t = currentTheme(); document.documentElement.dataset.theme = t; const mc = $('meta[name=theme-color]'); if (mc) mc.content = t === 'dark' ? '#12151E' : '#F4EFE4'; if (TG) { try { const c = t === 'dark' ? '#12151E' : '#F4EFE4'; TG.setHeaderColor && TG.setHeaderColor(c); TG.setBackgroundColor && TG.setBackgroundColor(c); TG.setBottomBarColor && TG.setBottomBarColor(t === 'dark' ? '#1B2029' : '#FFFDF8'); } catch (e) { /* старый клиент */ } } }
  applyTheme();
  setInterval(applyTheme, 60000);   // вкладка открыта на закате — слой переключается сам
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyTheme(); });
  $('#theme').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('themeManual', { t, until: nextSwitch() }); applyTheme();
  });

  // ---------- маршруты ----------
  const routes = { sozdat, trendy, brend, kanaly, scenariy, biblioteka, tarify, kabinet };
  // Лестница: в первый раз в меню только «Создать». Остальные разделы человек открывает сам — через «Ещё разделы»
  // или приглашение после результата — и они остаются в меню навсегда.
  const NAV = [
    { r: 'sozdat', i: 'i-spark', n: 'Создать', d: 'Пост, рилс, афиша, карусель' },
    { r: 'idei', i: 'i-idea', n: 'Идеи', tag: 'новое', d: 'Готовые работы: посмотрите и сделайте такой же' },
    { r: 'brend', i: 'i-dna', n: 'Мой бренд', s: 'Бренд', d: 'Чтобы тексты звучали как вы' },
    { r: 'kanaly', i: 'i-chan', n: 'Мои каналы', s: 'Каналы', d: 'Где вы публикуетесь' },
    { r: 'trendy', i: 'i-trend', n: 'Тренды', tag: 'KZ', d: 'Что сейчас заходит' },
    { r: 'izuchit', i: 'i-lupa', n: 'Изучить', tag: 'Рилс', d: 'Разобрать чужой ролик по ссылке' },
    { r: 'biblioteka', i: 'i-lib', n: 'Библиотека', s: 'Архив', d: 'Ваши посты и картинки-образцы для стиля' },
    { r: 'multiki', i: 'i-multik', n: 'Мультики', tag: 'Урок', d: 'Мультик к уроку, шаг за шагом' },
    { r: 'prezentacii', i: 'i-slides', n: 'Презентации', s: 'Слайды', tag: 'PPTX', d: 'Защита, курсовая, питч, КП' },
    { r: 'scenariy', i: 'i-film', n: 'Кино', tag: 'Studio', d: 'Разбор сценария фильма или сериала' },
    { r: 'kak', i: 'i-help', n: 'Как это работает', s: 'Уроки', tag: 'Уроки', d: 'Уроки с примерами: что написать и что получится' },
    { r: 'partnery', i: 'i-share', n: 'Партнёрам', tag: '10 %', d: 'Приглашайте и получайте 10 % и 5 % с оплат' },
    { r: 'tarify', i: 'i-tarif', n: 'Цены', d: 'Ваш месяц в тенге и пакеты' },
    { r: 'kabinet', i: 'i-user', n: 'Кабинет', d: 'Вход, баланс, история' },
  ];
  S.open = store.get('open', null) || ['sozdat'].concat(S.feed.length ? ['brend'] : []);
  S.made = +store.get('made', S.feed.filter((x) => x.state === 'done').length) || 0;
  function openSec(r) { if (routes[r] && !S.open.includes(r)) { S.open.push(r); store.set('open', S.open); drawNav(); } }
  const navLink = (x) => `<a href="#/${x.r}" data-r="${x.r}"><svg><use href="#${x.i}"/></svg>${x.n}${x.tag ? `<span class="tag">${x.tag}</span>` : ''}</a>`;
  function drawNav() {
    const vis = NAV.filter((x) => S.open.includes(x.r)), rest = NAV.filter((x) => !S.open.includes(x.r));
    $('#nav').innerHTML = vis.map(navLink).join('') + (rest.length ? `<button class="navmore" type="button" data-more><svg><use href="#i-grid"/></svg>Ещё разделы<span class="tag">${rest.length}</span></button>` : '');
    const cur = (location.hash || '#/sozdat').replace('#/', '').split('?')[0];
    let tb = vis.filter((x) => x.r !== 'kabinet').slice(0, 4);
    const act = vis.find((x) => x.r === cur && x.r !== 'kabinet');
    if (act && !tb.includes(act)) tb = tb.slice(0, 3).concat(act);   // открытый раздел не пропадает из вкладок
    $('#tabbar').innerHTML = tb.map((x) => `<a href="#/${x.r}" data-r="${x.r}"><span class="pl"><svg><use href="#${x.i}"/></svg></span><span class="lb">${x.s || x.n}</span></a>`).join('') + `<button type="button" data-more><span class="pl"><svg><use href="#i-grid"/></svg></span><span class="lb">Ещё</span></button>`;
    markNav();
  }
  const ROOT_TABS = ['sozdat', 'brend', 'kanaly', 'trendy'];
  function markNav() {
    const h = (location.hash || '#/sozdat').replace('#/', '').split('?')[0], cur = routes[h] ? h : 'sozdat';
    $$('#nav a, #tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.r === cur));
    const more = $('#tabbar [data-more]'); if (more) more.classList.toggle('on', !$$('#tabbar a').some((a) => a.dataset.r === cur));   // раздел из «Ещё» — подсвечен «Ещё»
  }
  // нижний лист: на телефоне выезжает снизу, на компьютере — карточка по центру
  function bsheet(html, onClose) {
    const m = document.createElement('div'); m.className = 'bs';
    m.innerHTML = `<div class="bs-scrim"></div><div class="bs-panel" role="dialog" aria-modal="true" tabindex="-1">${'<div class="bs-grab"></div>'}${html}</div>`;
    const back = document.activeElement;
    document.body.appendChild(m);
    const panel = $('.bs-panel', m); const hd = $('.bs-head h3', m);
    if (hd) { hd.id = 'bst' + Date.now(); panel.setAttribute('aria-labelledby', hd.id); }
    const ov = { close: null }; overlays.push(ov); syncOverlays();
    const close = () => { if (!m.isConnected || m.classList.contains('out')) return; m.classList.add('out'); document.removeEventListener('keydown', onKey); const k = overlays.indexOf(ov); if (k > -1) overlays.splice(k, 1); syncOverlays(); setTimeout(() => m.remove(), 190); if (back && back.focus && back.isConnected && !/^(TEXTAREA|INPUT)$/.test(back.tagName)) { try { back.focus({ preventScroll: true }); } catch (e) { /* без фокуса */ } } if (onClose) onClose(); };
    ov.close = close;
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button,a[href],input,select,textarea,[tabindex="0"]', panel).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => panel.focus({ preventScroll: true }), 30);
    $('.bs-scrim', m).addEventListener('click', close);
    m.addEventListener('click', (e) => { if (e.target.closest('[data-bs-close]')) close(); });
    let y0 = null;   // потянуть за верх листа вниз — закрыть
    panel.addEventListener('touchstart', (e) => { y0 = panel.scrollTop <= 0 && e.target.closest('.bs-grab,.bs-head') ? e.touches[0].clientY : null; }, { passive: true });
    panel.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 > 80) { y0 = null; close(); } }, { passive: true });
    return { el: m, close };
  }
  const bsHead = (t) => `<div class="bs-head"><h3>${t}</h3><button type="button" class="bs-x" data-bs-close aria-label="Закрыть"><svg class="ic"><use href="#i-x"/></svg></button></div>`;
  function moreSheet() {
    const b = bsheet(`${bsHead('Разделы')}<div class="morelist">${NAV.map((x) => `<a href="#/${x.r}" class="${S.open.includes(x.r) ? 'is' : ''}"><svg><use href="#${x.i}"/></svg><span><b>${x.n}</b><small>${x.d}</small></span>${S.open.includes(x.r) ? '' : '<em>новое</em>'}</a>`).join('')}</div><button type="button" class="bs-link" data-theme-switch>Сменить тему</button>`);
    b.el.addEventListener('click', (e) => { if (e.target.closest('a')) b.close(); const t = e.target.closest('[data-theme-switch]'); if (t) { $('#theme').click(); b.close(); } });
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { e.preventDefault(); moreSheet(); } });
  if (S.brandId) S.open.includes('brend') || S.open.push('brend');   // бренд уже есть — его раздел сразу в меню
  drawNav();
  function drawHead() {
    const h = $('#mhead'); if (!h) return;
    const name = S.brandName || (S.brend && S.brend.name) || '';
    const slot = (S.brandId || S.brend) && name ? `<a class="mh-proj" id="mproj" href="#/brend"><span class="av">${esc(name.trim().charAt(0).toUpperCase())}</span><span class="n">${esc(name)}</span></a>` : `<a class="mh-proj" id="mproj" href="#/sozdat"><span class="av logo"></span><span class="n">JASA</span></a>`;
    const c = Math.floor(+S.credits || 0);
    const guest = S.me && S.me.guest, ph = guest ? postovHvatit() : 0;   // S.me приходит после запуска, поэтому цены и кошельки к этому мигу уже объявлены
    const sig = slot + c + (guest ? 'g' + ph : ''); if (headSig === sig) return; headSig = sig;
    h.innerHTML = slot + `<span class="sp"></span><a class="mh-cr ${c < 10 ? 'low' : ''} ${guest ? 'gost' : ''}" id="mcred" href="#/kabinet" title="${guest ? 'Подарок: ' + Math.floor(S.ceny.gost_den || 50) + ' кредитов в день без входа. Пост с картинкой — до ' + priceOf('post') + ' кр' : 'Ваши кредиты'}">${guest && ph >= 1 ? ph + ' ' + postSl(ph) + ' · 0 ₸' : c + ' кр' + (guest ? '<small>сегодня</small>' : '')}</a>${guest ? '<a class="mh-in" href="#/kabinet">Войти</a>' : ''}<button type="button" class="mh-help" id="mhelp" aria-label="Помощь"><svg class="ic"><use href="#i-help"/></svg></button>`;
  }
  document.addEventListener('click', (e) => { if (e.target.closest('#mhelp')) { const f = $('#fab'); if (f) f.click(); } });
  // Первый вход: один экран «Выберите язык», пока не выбран — приложение не показываем. Язык влияет на тексты результатов, кнопки пока русские.
  function langAsk() {
    if (store.get('yazyk', null) || S.yazykChosen || $('#langfirst')) return;
    Promise.race([S.meP, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (store.get('yazyk', null) || S.yazykChosen || $('#langfirst')) return;
      const m = document.createElement('div'); m.id = 'langfirst'; m.className = 'lf'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'lft');
      m.innerHTML = `<div class="lf-in"><span class="logo"><span class="mark"></span>JASA</span><h1 id="lft">Выберите язык</h1><p class="lf-sub">Тілді таңдаңыз · Choose a language</p><div class="lf-btns">${Object.entries(LANG_LABEL).map(([k, v]) => `<button type="button" data-l="${k}">${v}<small>${({ ru: 'тексты и меню по-русски', kz: 'мәтіндер қазақша, мәзір әзірге орысша', en: 'texts in English, menu in Russian for now' })[k]}</small></button>`).join('')}</div></div>`;
      const lock = { close() { /* выбор обязателен: закрыть нельзя */ } };
      document.body.appendChild(m); document.documentElement.classList.add('lf-open'); overlays.push(lock); syncOverlays();
      const first = $('button', m); if (first) first.focus({ preventScroll: true });
      m.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; hap('medium'); setLang(b.dataset.l); m.remove(); document.documentElement.classList.remove('lf-open'); const k = overlays.indexOf(lock); if (k > -1) overlays.splice(k, 1); syncOverlays(); });
    });
  }
  function route() {
    const h = (location.hash || '#/sozdat').replace('#/', '').split('?')[0];
    const fn = routes[h] || sozdat;
    openSec(routes[h] ? h : 'sozdat');
    drawNav(); drawHead();
    overlays.slice().forEach((o) => o.close()); syncOverlays();
    if (S.voiceAbort) S.voiceAbort();
    setTimeout(langAsk, 350);
    S.pollToken++;
    main.onclick = null;
    main.innerHTML = '';
    fn();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);

  function topbar(title, right, cls) {
    return `<div class="topbar ${cls || ''}"><div class="crumbs"><span>JASA</span><span>·</span><b>${esc(title)}</b></div><div>${right || ''}</div></div>`;
  }

  // =====================================================================
  // СОЗДАТЬ
  // =====================================================================
  const TIPS = { post: 'Пост', rils: 'Рилс', afisha: 'Афиша', karusel: 'Карусель', plan: 'План на неделю' };
  // три примера: короткая подпись на кнопке, полное задание уходит в работу
  const EXAMPLES = [
    ['post', 'Кофейня: скидка 20 % до пятницы', 'Пост для кофейни в Алматы: новое сезонное меню с тыквенным латте, скидка 20 % до пятницы'],
    ['post', 'Акция на Kaspi на выходные', 'Пост для магазина на Kaspi: акция на выходные, скидка 15 % на зимние куртки, рассрочка 0-0-12'],
    ['rils', 'Рилс: 3 ошибки новичка в зале', 'Рилс для фитнес-тренера: 3 ошибки новичков в зале, 20 секунд, с хуком'],
  ];
  const TIPS_MAIN = ['post', 'rils', 'afisha'];
  const TIPS_SHORT = { post: 'Пост', rils: 'Рилс', afisha: 'Афиша', karusel: 'Карусель', plan: 'План' };

  // 10.11 · «Сегодня»: три повода на сегодня по делу человека. Расчёт и данные — segodnya.js (JASA_SG), здесь только экран.
  const SG = window.JASA_SG || null;
  const SG_ZNAK = { kofe: '☕', pekarnya: '🥐', barber: '💈', salon: '💅', fitnes: '🧘', magazin: '🛍', cvety: '💐', ucheba: '📚', deti: '🧸', uslugi: '🛠', drugoe: '✨' };
  const SG_MES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const SG_MES3 = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const SG_DN2 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const SG_IDEI = { kofe: 'kofejnya', fitnes: 'studiya' };   // ниша «Сегодня» → ниша раздела «Идеи», если коды разные
  const sgNisha = () => { const D = SG && SG.dannye(); const id = String(S.nisha || ''); return D && D.nishi.find((x) => x.id === id) || null; };
  const sgKorotko = (n) => String(n.n || '').split(',')[0].trim();   // «Кофейня, кафе» → «Кофейня»
  const nishaIdei = () => { const id = String(S.nisha || ''); return id ? (SG_IDEI[id] || id) : ''; };
  const sgFoto = () => {   // картинки настоящих работ этой ниши из «Идей» — на карточки; список помним, чтобы блок рисовался сразу
    const k = nishaIdei(); const vse = store.get('ideiFoto', null) || {};
    return k ? arr(vse[k]).filter((f) => /^idei-[\w.\-]+\.(webp|jpg|png)$/.test(String(f))) : [];
  };
  let sgFotoZapros = null;
  const sgFotoObnovit = (cb) => {
    if (!sgFotoZapros) sgFotoZapros = fetch('idei.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j || !Array.isArray(j.idei)) return false;
      const m = {}; j.idei.forEach((i) => { if (i && i.nisha && i.img && i.yazyk !== 'kz' && i.yazyk !== 'en') (m[i.nisha] = m[i.nisha] || []).push(String(i.img)); });
      const bylo = JSON.stringify(store.get('ideiFoto', null) || {}); store.set('ideiFoto', m); return JSON.stringify(m) !== bylo;
    }).catch(() => false);
    sgFotoZapros.then((izm) => { if (izm && cb) cb(); });
  };

  function sozdat() {
    const first = !S.feed.length;
    const recOpen = store.get('recOpen', false);
    const ico = (n) => `<svg class="ic"><use href="#${n}"/></svg>`;
    main.innerHTML = topbar('Создать', S.made || S.brandId ? brandPill() : '', 'only-desk') + `
      <section class="hero ${first ? 'first' : 'compact'} ${SG ? 'sgon' : ''}">
        <div class="hero-top"><h1>${first ? 'Что <em>сделать</em>?' : 'Что ещё <em>сделать</em>?'}</h1>${first ? '<a class="stik" id="stik" href="#/tarify" title="Цены" hidden></a>' : ''}</div>
        ${SG ? '<div class="sg" id="sg"></div>' : (first ? '<p>Скажите или напишите. Получите текст и картинку — или сразу три варианта.</p>' : '')}
        <div class="examples" id="examples"><span id="exzapas"></span><button class="more-ideas" id="ideas" type="button" aria-expanded="${recOpen}"><span>Готовые идеи</span><em>${S.recepty.length || ''}</em>${ico('i-chevr')}</button><button class="more-ideas" type="button" data-idei><span>Идеи с картинками</span><em>новое</em>${ico('i-chevr')}</button></div>
      </section>
      <section class="recwrap ${recOpen ? '' : 'hide'}" id="recwrap"><div class="rechead"><span class="caps">Заполните пару полей, остальное сделаем сами</span><span class="dim small">цена до запуска</span></div><div class="recepty" id="recepty">${receptyHtml()}</div></section>
      <div class="feed" id="feed"></div>
      <div class="composer ${first ? '' : 'has-feed'}" id="composer">
        <div class="box">
          ${stilPill()}${kartPill()}
          <textarea id="ask" rows="1" placeholder="${first ? 'Скажите или напишите, что нужно' : 'Что дальше?'}" enterkeyhint="send"></textarea>
          <div class="cmp-dop" id="cdop" hidden></div>
          <div class="cmp-warn" id="cwarn">${ico('i-warn')}<span id="cwarntx"></span></div>
          <div class="cmp-act">
            <button type="button" class="cmp-mode" id="mode" aria-haspopup="dialog" title="Формат, картинка, стиль">${ico('i-sliders')}<span id="modetx">${TIPS_SHORT[S.tip]} · до ${priceOf(S.tip)} кр</span></button>
            <div class="chips" id="tips">${Object.entries(TIPS).map(([k, v]) => `<button class="chip ${k === S.tip ? 'on' : ''} ${TIPS_MAIN.includes(k) || k === S.tip || store.get('tipsAll', false) ? '' : 'hide'}" data-tip="${k}">${v}<small class="cp">${priceOf(k)}</small></button>`).join('')}${store.get('tipsAll', false) ? '' : '<button class="chip ghost" id="tipsmore" type="button" title="Карусель, план на неделю, презентация">ещё</button>'}<button class="chip ${store.get('tipsAll', false) ? '' : 'hide'}" data-prez type="button" title="Отдельный мастер: слайды, речь и тайминг, выгрузка PPTX и PDF">Презентация →</button></div>
            <button type="button" class="chip ${S_KART() === 3 ? 'on' : ''} ${['post', 'afisha', 'karusel'].includes(S.tip) ? '' : 'hide'}" id="kart3" aria-pressed="${S_KART() === 3}" title="Сразу три варианта картинки от трёх художников вместо одной. Остальные можно дорисовать потом по 12 кр">×3 картинки</button>
            <span class="sp"></span>
            <button type="button" class="cmp-mic" id="mic" aria-label="Сказать голосом">${ico('i-mic')}</button>
            <button type="button" class="cmp-go" id="go">Сделать <small id="price"></small></button>
          </div>
          <div class="cmp-rec"><button type="button" class="cmp-mic" id="recx" aria-label="Отменить запись">${ico('i-x')}</button><span class="t" id="rect">0:00</span><div class="cmp-wave">${Array.from({ length: 22 }, () => '<i></i>').join('')}</div><button type="button" class="cmp-stop" id="recstop" aria-label="Закончить запись"><i></i></button></div>
          <div class="cmp-hint">Говорите · 1 кр</div>
        </div>
      </div>`;
    const ta = $('#ask'), comp = $('#composer');
    // тип задания и цена меняются только здесь, чтобы цена не отставала от типа
    const priceNow = () => { const link = LINK_RE.test(ta.value) ? (S.ceny.transcribe || 1) : 0; const d = dostupno(S.tip); return { link, p: priceOf(S.tip) + link, d, vne: vnePodpiski(S.tip), n: Math.floor(d / (priceOf(S.tip) + link)) }; };
    const drawPrice = () => {
      const { link, p, n, d, vne } = priceNow(); const has = !!ta.value.trim(); const low = n < 1;
      comp.classList.toggle('has', has); comp.classList.toggle('low', low);
      $('#price').innerHTML = `<span class="du">до </span>${p} кр`;
      $('#cwarntx').textContent = vne ? `С подписки ${(TIPS_SHORT[S.tip] || 'это').toLowerCase()} не идёт: нужно до ${p} личных кр, у вас ${Math.floor(d)}` : `Не хватает: нужно до ${p} кр, у вас ${Math.floor(d)}`;
      $('#go').firstChild.textContent = low ? 'Пополнить ' : 'Сделать ';
      $('#go').classList.toggle('low', low);
      $('#price').style.display = low ? 'none' : '';
      $$('#tips .chip[data-tip] .cp').forEach((c) => { c.textContent = priceOf(c.parentElement.dataset.tip); });
      $$('#sg [data-sgp]').forEach((c) => { c.textContent = 'до ' + priceOf(c.dataset.sgp) + ' кр'; });
      const st = $('#stik');   // наклейка: на сколько постов с картинкой хватает прямо сейчас — в постах, не в кредитах
      if (st) {
        const p1 = +((S.ceny.zadanie || {}).post) || 21, k = postovHvatit(), gost = S.me ? !!S.me.guest : !(S.session || TG);
        st.innerHTML = k >= 1 ? `<b>${k} ${postSl(k)}</b><small>${gost ? 'сегодня бесплатно' : 'с картинкой на счету'}</small>` : `<b>${p1} кр</b><small>пост с картинкой</small>`;
        st.hidden = false;
      }
      $('#modetx').textContent = TIPS_SHORT[S.tip] + ' · до ' + priceOf(S.tip) + ' кр';
      $('#go').title = link ? 'С разбором ссылки-примера. Больше этой суммы не спишем' : 'Больше этой суммы не спишем. Текст по факту, картинки только готовые. Голос стоит 1 кр отдельно';
    };
    const setTip = (tip) => { S.tip = TIPS[tip] ? tip : 'post'; $$('#tips .chip').forEach((c) => c.classList.toggle('on', c.dataset.tip === S.tip)); const k3 = $('#kart3'); if (k3) k3.classList.toggle('hide', !['post', 'afisha', 'karusel'].includes(S.tip)); drawPrice(); };
    $('#kart3').addEventListener('click', () => { const v = S_KART() === 3 ? 1 : 3; store.set('kartinki', v); $('#kart3').classList.toggle('on', v === 3); $('#kart3').setAttribute('aria-pressed', v === 3); drawPrice(); });
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; if (!ta.value.trim()) { const dp = $('#cdop'); if (dp) dp.hidden = true; $$('#sg .sg-card.on').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }); } drawPrice(); };
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !$('html').classList.contains('mob')) { e.preventDefault(); go(); } });
    $('#tips').addEventListener('click', (e) => {
      if (e.target.closest('#tipsmore')) { store.set('tipsAll', true); $$('#tips .chip.hide').forEach((c) => c.classList.remove('hide')); e.target.closest('#tipsmore').remove(); return; }
      const b = e.target.closest('.chip'); if (!b) return;
      if (b.hasAttribute('data-prez')) { toPrez(); return; }
      setTip(b.dataset.tip); ta.focus();
    });
    const toPrez = () => { sessionStorage.setItem('jasa:prez', JSON.stringify({ tema: ta.value.trim() })); location.hash = '#/prezentacii'; };
    $('#ideas').addEventListener('click', (e) => { const on = $('#recwrap').classList.toggle('hide') === false; store.set('recOpen', on); e.currentTarget.setAttribute('aria-expanded', on); if (on) hap('light'); });
    $('#recepty').addEventListener('click', (e) => { const b = e.target.closest('[data-rec]'); if (!b) return; const r = S.recepty.find((x) => x.id === b.dataset.rec); if (r) receptForm(r, (tip, text, opts) => { setTip(tip); ta.value = text; grow(); send(Object.assign({ recept: r.id }, opts)); }); });
    const sp = $('#stilpill'); if (sp) sp.addEventListener('click', () => { S.stil = []; store.set('stil', S.stil); sp.remove(); toast('Стиль снят'); });
    const kp = $('#kartpill'); if (kp) kp.addEventListener('click', () => { S.kartOpis = ''; store.set('kartOpis', ''); kp.remove(); toast('Картинку подберём сами'); });
    // примеры только подставляют текст: кредиты списываются кнопкой «Сделать»
    $('#examples').addEventListener('click', (e) => { if (e.target.closest('[data-idei]')) { hap('light'); location.hash = '#/idei'; return; } const b = e.target.closest('button[data-text]'); if (!b) return; hap('light'); setTip(b.dataset.tip); ta.value = b.dataset.text; grow(); });
    const exZapas = () => { const z = $('#exzapas'); if (z && first && !z.innerHTML) z.outerHTML = '<span class="caps">Попробуйте</span>' + EXAMPLES.map(([t, l, e]) => `<button type="button" data-tip="${t}" data-text="${esc(e)}"><span>${esc(l)}</span>${ico('i-chevr')}</button>`).join(''); };
    // ---- «Сегодня» ----
    const sgBox = $('#sg'); let sgVybor = false, sgKart = [], sgNet = false;
    const sgDraw = (anim) => { try { sgDraw0(anim); } catch (e) { sgKart = []; sgNet = true; if (sgBox) sgBox.innerHTML = ''; exZapas(); } };
    const sgDraw0 = (anim) => {
      if (!sgBox) return;
      const D = SG.dannye();
      if (!D) { sgBox.innerHTML = sgNet ? '' : '<div class="sg-cards sk" aria-hidden="true"><i></i><i></i><i></i></div>'; return; }
      const den = SG.segodnya(); const n = sgNisha();
      const sprosit = sgVybor || (first && !n && !store.get('nishaSkip', false));
      try { sgKart = SG.calc(D, den, n ? n.id : 'drugoe'); } catch (e) { sgKart = []; }
      if (sgKart.length !== 3) { sgBox.innerHTML = ''; exZapas(); return; }
      const wd = (new Date(den.g, den.m - 1, den.d).getDay() + 6) % 7;
      const foto = sgFoto(); let nf = 0;
      const dm = (nomer) => { const t = new Date(nomer * 864e5); return [t.getUTCDate(), SG_MES3[t.getUTCMonth()]]; };
      const vis = (c) => {
        if (c.vid !== 'povod' && nf < foto.length) { const f = foto[(den.d + nf++) % foto.length]; return `<img src="${esc(f)}" alt="" width="800" height="993" decoding="async"><span class="sg-pr">пример</span>`; }
        if (c.vid === 'povod') { const [d1, m1] = dm(c.s), [d2, m2] = dm(c.po); return c.do ? `<span class="sg-gl">${d1}<small>${m1}</small></span>` : (c.po > c.dn ? `<span class="sg-gl"><small class="pre">до</small>${d2}<small>${m2}</small></span>` : '<span class="sg-gl w">сегодня</span>'); }
        if (c.vid === 'den') return `<span class="sg-gl">${SG_DN2[wd]}</span>`;
        return `<span class="sg-gl ic">${ico('i-idea')}</span>`;
      };
      const metka = (c) => { const m = c.vid === 'povod' && c.n === c.z ? (c.do ? 'Через ' + c.do + ' дн.' : 'Уже идёт') : c.metka; return c.vid === 'povod' && c.do === 1 ? m.replace('Через 1 дн.', 'Завтра') : m; };
      const tipN = (t) => TIPS_SHORT[t] || 'Пост';
      sgBox.className = 'sg' + (sprosit ? ' ask' : '') + (first ? '' : ' compact') + (anim ? ' anim' : '');
      sgBox.innerHTML = `<div class="sg-head"><span class="sg-list" aria-hidden="true"><i>${SG_MES3[den.m - 1]}</i><b>${den.d}</b></span><span class="sg-tx"><b>Сегодня, ${SG.DNI[wd].toLowerCase()}</b><span>${den.d} ${SG_MES[den.m - 1]}${sprosit ? '' : ` · <button type="button" class="sg-kto" id="sgkto" title="Сменить дело">${esc(n ? n.dlya : 'выбрать дело')}${ico('i-chevr')}</button>`}</span></span></div>
        ${sprosit ? `<div class="sg-q"><b>Чем занимаетесь?</b><span>Покажем три повода для поста на сегодня</span></div>
        <div class="sg-nishi" role="group" aria-label="Чем занимаетесь">${D.nishi.map((x) => `<button type="button" class="sg-n ${n && n.id === x.id ? 'on' : ''}" data-n="${esc(x.id)}" aria-pressed="${!!(n && n.id === x.id)}"><i aria-hidden="true">${SG_ZNAK[x.id] || '•'}</i><span>${esc(sgKorotko(x))}</span></button>`).join('')}<button type="button" class="sg-n skip" data-n="">${sgVybor ? 'Оставить как есть' : 'Пропустить'}</button></div>` : ''}
        <div class="sg-cards" id="sgcards">${sgKart.map((c, i) => `<button type="button" class="sg-card v-${esc(c.vid)}" data-i="${i}" aria-pressed="false" title="${esc(c.q)}"><span class="sg-vis">${vis(c)}<span class="sg-met">${esc(metka(c))}</span></span><span class="sg-body"><b class="sg-z">${esc(c.z)}</b><span class="sg-qq${c.p ? ' pp' : ''}">${esc(c.p || c.q)}</span><span class="sg-go"><b>${esc(tipN(c.tip))}</b><em data-sgp="${esc(TIPS[c.tip] ? c.tip : 'post')}">до ${priceOf(TIPS[c.tip] ? c.tip : 'post')} кр</em>${ico('i-chevr')}</span></span></button>`).join('')}</div>`;
    };
    if (sgBox) {
      sgDraw(true);
      SG.obnovit((izm) => { if (!sgBox.isConnected) return; if (!SG.dannye()) { sgNet = true; sgBox.innerHTML = ''; exZapas(); return; } if (!sgKart.length || (izm && !ta.value && !sgVybor)) sgDraw(true); });
      sgFotoObnovit(() => { if (sgBox.isConnected && !ta.value && !sgVybor) sgDraw(false); });
      sgBox.addEventListener('click', (e) => {
        const nb = e.target.closest('.sg-n');
        if (nb) { hap('medium'); if (nb.dataset.n) { S.nisha = nb.dataset.n; store.set('nisha', S.nisha); } else if (!sgVybor) store.set('nishaSkip', true); sgVybor = false; sgDraw(true); const k = $('#sgkto'); if (k) k.focus({ preventScroll: true }); return; }
        if (e.target.closest('#sgkto')) { hap('light'); sgVybor = true; sgDraw(false); const on = $('.sg-n.on', sgBox) || $('.sg-n', sgBox); if (on) on.focus({ preventScroll: true }); return; }
        const cb = e.target.closest('.sg-card'); const c = cb && sgKart[+cb.dataset.i]; if (!c) return;
        hap('light'); setTip(c.tip); ta.value = c.q; grow();
        $$('.sg-card', sgBox).forEach((x) => { x.classList.toggle('on', x === cb); x.setAttribute('aria-pressed', x === cb); });
        const dp = $('#cdop'); if (dp) { dp.textContent = c.d ? 'Допишите: ' + c.d + ' — ' + (TIPS_SHORT[S.tip] || 'пост').toLowerCase() + ' выйдет точнее' : ''; dp.hidden = !c.d; }
        ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (er) { /* старый браузер */ }
      });
    } else exZapas();
    const go = () => { const { n } = priceNow(); if (ta.value.trim() && n < 1) { hap('error'); sessionStorage.setItem('jasa:draft', JSON.stringify({ tip: S.tip, text: ta.value })); location.hash = '#/kabinet'; return; } hap('medium'); send(); };
    $('#go').addEventListener('click', go);
    $('#mode').addEventListener('click', () => { hap('light'); settings(); });
    // лист «Настройки результата»: тип, бренд, стиль, цена
    function settings() {
      const hasBrand = !!(S.brandId || S.brend); const bname = S.brandName || (S.brend && S.brend.name) || 'Мой бренд';
      const sum = () => { const { p, n, d, vne } = priceNow(); const low = n < 1; const el = $('#bssum'); el.classList.toggle('low', low); el.textContent = low ? (vne ? `С подписки ${(TIPS_SHORT[S.tip] || 'это').toLowerCase()} не идёт: нужно до ${p} личных кр, у вас ${Math.floor(d)}` : `Не хватает: нужно до ${p} кр, у вас ${Math.floor(d)}`) : `До ${p} кр · хватит на ${n}${vne ? ' · с личных кредитов' : ''}`; };
      const html = `${bsHead('Настройки')}
        <div class="bs-lab">Формат</div>
        <div class="bs-tiles">${Object.entries(TIPS).map(([k, v]) => `<button type="button" class="bs-tile ${k === S.tip ? 'on' : ''}" data-tip="${k}" aria-pressed="${k === S.tip}">${v}<small>до ${priceOf(k)} кр</small></button>`).join('')}<button type="button" class="bs-tile" data-prez>Слайды<small>мастер →</small></button></div>
        <details class="bs-more" ${S.aspect !== 'auto' || S.hud !== 'auto' || S.kartOpis || S_KART() === 3 ? 'open' : ''}><summary>Картинка: размер, кто рисует, своё описание</summary>
        <div class="bs-lab">Размер картинки</div>
        <div class="bs-tiles kart">${[['auto', 'Авто', 'подберём под формат'], ['4:5', '4:5', 'лента Instagram'], ['1:1', '1:1', 'квадрат'], ['9:16', '9:16', 'сторис · TikTok'], ['16:9', '16:9', 'широкая']].map(([k, v, d]) => `<button type="button" class="bs-tile ${S.aspect === k ? 'on' : ''}" data-aspect="${k}" aria-pressed="${S.aspect === k}">${v}<small>${d}</small></button>`).join('')}</div>
        <div class="bs-lab">Кто рисует</div>
        <div class="bs-tiles kart">${[['auto', 'Авто', 'фото для поста, надписи для афиши'], ['gpt', 'Надписи и графика', 'афиши, текст на картинке'], ['nb', 'Фото и люди', 'кадры как с камеры'], ['seedream', 'Арт и стиль', 'иллюстрации'], ['vse', 'Все три сразу', '+24 кр · три варианта']].map(([k, v, d]) => { const on = k === 'vse' ? S_KART() === 3 : (S_KART() !== 3 && S.hud === k); return `<button type="button" class="bs-tile ${on ? 'on' : ''}" data-hud="${k}" aria-pressed="${on}">${v}<small>${d}</small></button>`; }).join('')}</div>
        <p class="small dim" style="margin:-4px 0 10px">Другие варианты картинки можно дорисовать потом — по 12 кр.</p>
        <div class="bs-lab">Что на картинке</div>
        <div class="bs-tiles kart"><button type="button" class="bs-tile ${S.kartOpis ? '' : 'on'}" data-kmode="auto" aria-pressed="${!S.kartOpis}">Авто<small>подберём по тексту поста</small></button><button type="button" class="bs-tile ${S.kartOpis ? 'on' : ''}" data-kmode="svoe" aria-pressed="${!!S.kartOpis}">Своё описание<small>скажите или напишите</small></button></div>
        <div id="kopis" class="${S.kartOpis ? '' : 'hide'}">${opisBlock('kopista', S.kartOpis)}</div>
        </details>
        ${fkEst() ? `<details class="bs-more" ${FK.some(([k]) => fkVse()[k]) ? 'open' : ''}><summary>Адрес и как записаться</summary>
        ${FK.map(([k, l, ph]) => `<label class="bs-lab" for="fk-${k}">${l}</label><input class="bs-inp" id="fk-${k}" data-fk="${k}" maxlength="120" autocomplete="off" placeholder="${esc(fkBrend()[k] ? 'Из бренда: ' + fkBrend()[k].slice(0, 70) : ph)}" value="${esc(fkVse()[k] || '')}">`).join('')}
        ${hasBrand && S.useBrend && S.me && !S.me.guest ? `<div class="bs-row"><span class="tx"><b>Запомнить в бренде</b><small>Запишем только в пустые поля карты</small></span><button type="button" class="bs-sw ${S.fkZapomnit ? 'on' : ''}" id="fkz" role="switch" aria-checked="${!!S.fkZapomnit}" aria-label="Запомнить адрес и запись в бренде"></button></div>` : ''}
        <p class="small dim" style="margin:-4px 0 10px">${FK.some(([k]) => fkBrend()[k]) ? 'Подставим в пост как есть. Пустое поле возьмём из карты бренда. Чего нет и там, в тексте останется как [уточнить].' : 'Подставим в пост как есть. Пустое поле в тексте останется как [уточнить] — его можно дописать перед публикацией.'}</p>
        </details>` : ''}
        <div class="bs-lab">Стиль</div>
        ${hasBrand ? `<div class="bs-row"><span class="av">${esc(bname.trim().charAt(0).toUpperCase())}</span><span class="tx"><b>${esc(bname)}</b><small>Писать в моём стиле</small></span><button type="button" class="bs-sw ${S.useBrend ? 'on' : ''}" id="bssw" role="switch" aria-checked="${S.useBrend}" aria-label="Писать в стиле бренда"></button></div>` : `<a class="bs-row" href="#/brend" data-bs-close><span class="tx"><b>Настроить бренд</b><small>Тексты станут точнее</small></span>${ico('i-chevr')}</a>`}
        ${S.stil.length ? `<div class="bs-row"><span class="tx"><b>Стиль по ${S.stil.length} ${S.stil.length === 1 ? 'картинке' : 'картинкам'} из моих примеров</b></span><button type="button" class="btn sm quiet" id="bsstil">Снять</button></div>` : ''}
        <div class="bs-sum" id="bssum"></div>
        <button type="button" class="bs-done" data-bs-close>Готово</button>`;
      const b = bsheet(html, () => { drawPrice(); const kp0 = $('#kartpill'); if (S.kartOpis && !kp0) $('#ask').insertAdjacentHTML('beforebegin', kartPill()); if (!S.kartOpis && kp0) kp0.remove(); const kp1 = $('#kartpill'); if (kp1) kp1.onclick = () => { S.kartOpis = ''; store.set('kartOpis', ''); kp1.remove(); }; }); sum();
      opisWire(b.el, 'kopista', () => $('#ask').value, (v) => { S.kartOpis = v.trim(); store.set('kartOpis', S.kartOpis); });
      b.el.addEventListener('input', (e) => { const i = e.target.closest('[data-fk]'); if (!i) return; fkVse()[i.dataset.fk] = fkChist(i.value); store.set('fakty', S.fakty); });
      b.el.addEventListener('click', (e) => {
        const fz = e.target.closest('#fkz'); if (fz) { hap('sel'); S.fkZapomnit = !S.fkZapomnit; store.set('fkZapomnit', S.fkZapomnit); fz.classList.toggle('on', S.fkZapomnit); fz.setAttribute('aria-checked', S.fkZapomnit); return; }
        const km = e.target.closest('.bs-tile[data-kmode]');
        if (km) { hap('sel'); const svoe = km.dataset.kmode === 'svoe'; $$('.bs-tile[data-kmode]', b.el).forEach((x) => { x.classList.toggle('on', x === km); x.setAttribute('aria-pressed', x === km); }); $('#kopis', b.el).classList.toggle('hide', !svoe); if (svoe) { $('#kopista', b.el).focus(); } else { S.kartOpis = ''; store.set('kartOpis', ''); $('#kopista', b.el).value = ''; } return; }
        const t = e.target.closest('.bs-tile[data-tip]');
        if (t) { hap('sel'); setTip(t.dataset.tip); $$('.bs-tile[data-tip]', b.el).forEach((x) => { x.classList.toggle('on', x === t); x.setAttribute('aria-pressed', x === t); }); sum(); return; }
        if (e.target.closest('[data-prez]')) { b.close(); toPrez(); return; }
        const ta2 = e.target.closest('.bs-tile[data-aspect]');
        if (ta2) { hap('sel'); S.aspect = ta2.dataset.aspect; store.set('aspect', S.aspect); $$('.bs-tile[data-aspect]', b.el).forEach((x) => { x.classList.toggle('on', x === ta2); x.setAttribute('aria-pressed', x === ta2); }); return; }
        const th = e.target.closest('.bs-tile[data-hud]');
        if (th) {
          hap('sel');
          if (th.dataset.hud === 'vse') store.set('kartinki', 3); else { store.set('kartinki', 1); S.hud = th.dataset.hud; store.set('hud', S.hud); }
          $$('.bs-tile[data-hud]', b.el).forEach((x) => { x.classList.toggle('on', x === th); x.setAttribute('aria-pressed', x === th); });
          const k3 = $('#kart3'); if (k3) { k3.classList.toggle('on', S_KART() === 3); k3.setAttribute('aria-pressed', S_KART() === 3); }
          $$('.bs-tile[data-tip]', b.el).forEach((x) => { const sm = x.querySelector('small'); if (sm) sm.textContent = 'до ' + priceOf(x.dataset.tip) + ' кр'; });
          sum(); return;
        }
        const sw = e.target.closest('#bssw'); if (sw) { hap('sel'); S.useBrend = !S.useBrend; store.set('useBrend', S.useBrend); sw.classList.toggle('on', S.useBrend); sw.setAttribute('aria-checked', S.useBrend); return; }
        if (e.target.closest('#bsstil')) { S.stil = []; store.set('stil', S.stil); const sp2 = $('#stilpill'); if (sp2) sp2.remove(); b.close(); toast('Стиль снят'); }
      });
    }
    // голос: нажали и говорите, нажали ещё раз и текст в поле
    const recTimer = { t: 0, h: null };
    voice($('#mic'), (t) => { ta.value = (ta.value ? ta.value + ' ' : '') + t; grow(); }, {
      stopBtn: $('#recstop'), cancelBtn: $('#recx'),
      on(v) {
        comp.classList.toggle('rec-on', v); clearInterval(recTimer.h);
        if (v) { hap('medium'); recTimer.t = Date.now(); $('#rect').textContent = '0:00'; recTimer.h = setInterval(() => { if (!$('#rect')) { clearInterval(recTimer.h); return; } const sec = Math.floor((Date.now() - recTimer.t) / 1000); $('#rect').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }, 500); } else hap('light');
      },
    });
    if (window.ResizeObserver) { if (S.cmpRO) S.cmpRO.disconnect(); S.cmpRO = new ResizeObserver(() => document.documentElement.style.setProperty('--cmp-h', comp.offsetHeight + 'px')); S.cmpRO.observe(comp); }
    drawPrice();
    const dr = sessionStorage.getItem('jasa:draft');   // вернулись из Кабинета: задание на месте
    if (dr) { sessionStorage.removeItem('jasa:draft'); try { const d = JSON.parse(dr); setTip(d.tip); ta.value = d.text || ''; grow(); } catch (e) { /* битый черновик */ } }
    const pre = sessionStorage.getItem('jasa:prefill');
    if (pre) { const p = JSON.parse(pre); sessionStorage.removeItem('jasa:prefill'); setTip(p.tip); ta.value = p.text; grow(); if (p.auto) send({ ploshchadka: p.ploshchadka, recept: p.recept, pravka: true, besplatno: p.besplatno, poyasnenie: p.poyasnenie }); }
    S.feed.slice().reverse().slice(0, 8).forEach((item) => $('#feed').appendChild(sheet(item)));
    $('#brandpill') && $('#brandpill').addEventListener('click', () => { S.useBrend = !S.useBrend; store.set('useBrend', S.useBrend); route(); });

    async function send(opts) {
      opts = opts && !(opts instanceof Event) ? opts : {};
      let text = ta.value.trim();
      if (!text) { ta.focus(); toast('Напишите или скажите, что нужно, — или выберите пример выше'); return; }
      // как у Plumar One: перед рекламой — три вопроса (для кого, где покажем, цель); можно пропустить
      if (!opts.reklama && !opts.pravka && /реклам|жарнама/i.test(text) && ['post', 'rils', 'afisha', 'karusel'].includes(S.tip)) {
        reklamaVoprosy((dop) => { if (dop) { ta.value = text + dop.tekst; grow(); } send(Object.assign({}, opts, { reklama: true, ploshchadka: dop && dop.ploshchadka })); });
        return;
      }
      let primer = null; const link = (text.match(LINK_RE) || [])[0];
      if (link) {
        toast('Разбираю ролик-пример…');
        try { const r = await api('/api/transcribe', { url: link }); primer = r.text; spend(1, r.ostatok); text = text.replace(link, '').trim() || 'пост в подаче этого примера'; } catch (e) { toast('Не вышло разобрать пример: ' + e.message); }
      }
      const item = { id: Date.now(), tip: S.tip, tema: text, yazyk: S.yazyk, state: 'working', primer, recept: opts.recept || '', besplatno: !!opts.besplatno };
      const el = sheet(item);
      $('#feed').prepend(el);
      ta.value = ''; grow(); ta.blur();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const res = await api('/api/ask', { tip: item.tip, tema: text, kartinok: S_KART(), aspect: S.aspect === 'auto' ? undefined : S.aspect, hudozhnik: S.hud === 'auto' ? undefined : S.hud, kartinka_opisanie: S.kartOpis || undefined, yazyk: S.yazyk, fakty: fkTelo(), zapomnit: fkTelo() && S.fkZapomnit && S.useBrend && S.brandId ? true : undefined, brand_id: S.useBrend ? (S.brandId || null) : 'net', brend: S.useBrend && !S.brandId && S.brend ? S.brend : null, ploshchadka: opts.ploshchadka || (item.tip === 'rils' ? 'Instagram Reels / TikTok' : 'Instagram'), primer, depo: S.stil.length ? S.stil : undefined, besplatno: opts.besplatno || undefined });
        Object.assign(item, { state: 'done', result: res.result, kredity: res.kredity, imgJob: res.img_job, promty: res.promty, brand: res.brand || null, zid: res.zid || '', besplatno: !!res.besplatno });
        spend(res.kredity, res.ostatok);
        S.made += 1; store.set('made', S.made);
      } catch (e) {
        Object.assign(item, { state: 'error', error: e.message }); S.lastError = e.message;
      }
      S.feed.push(item); S.feed = S.feed.slice(-20); store.set('feed', S.feed);
      comp.classList.add('has-feed');   // поле сворачивается, как только появился первый результат
      const done = sheet(item);
      el.replaceWith(done);
      if (item.state === 'done') { const inv = invite(); if (inv) done.after(inv); }
    }
  }

  // Приглашение открыть следующий раздел — одно за раз, после результата, без давления.
  function invite() {
    let c = null;
    const me = S.me || {}; const podAkt = me.podpiska && me.podpiska.aktivna;
    if (S.made >= 3 && !me.guest && !me.platit && !podAkt && S.made >= +store.get('skip_den', 0)) {
      // третий результат — момент предложить «Каждый день»: счёт выставляется здесь же, без похода в тарифы
      const el = document.createElement('div'); el.className = 'invite rv den';
      const p = (me.ceny_oplaty || {}).podpiska || { tenge: 3990, v_den: 45 };
      el.innerHTML = `<div><b>Понравилось? Делайте так каждый день</b><p>«Каждый день» — ${esc(denStroka(p))}. ${podIdyot() ? 'Идут на посты, афиши, карусели и картинки. ' : ''}${esc(tng(p.tenge))} за 30 дней, оплата в Kaspi.</p></div><div class="ib"><button class="btn sm accent" type="button" data-den>Выставить счёт</button><button class="btn sm quiet" type="button" data-skip>Не сейчас</button></div>`;
      el.querySelector('[data-skip]').addEventListener('click', () => { store.set('skip_den', S.made + 3); el.remove(); });
      el.querySelector('[data-den]').addEventListener('click', async (e) => { e.target.disabled = true; try { const r = await api('/api/schet', { tip: 'podpiska' }); toast('Счёт ' + r.schet.id + ' выставлен — он в кабинете'); location.hash = '#/kabinet'; } catch (er) { toast(er.message); e.target.disabled = false; } });
      return el;
    }
    if (S.made >= 1 && !S.brandId && S.made >= +store.get('skip_brend', 0)) {
      c = { k: 'brend', h: 'Настройте бренд', p: 'Три вопроса, полминуты. Тексты станут вашими.', b: 'Начать' };
    } else if (S.made >= 3 && !S.open.includes('kanaly') && S.made >= +store.get('skip_kanaly', 0)) {
      c = { k: 'kanaly', h: 'Добавьте каналы', p: 'Формат и длина подстроятся под площадку.', b: 'Добавить' };
    }
    if (!c) return null;
    const el = document.createElement('div'); el.className = 'invite rv';
    el.innerHTML = `<div><b>${c.h}</b><p>${c.p}</p></div><div class="ib"><a class="btn sm accent" href="#/${c.k}">${c.b}</a><button class="btn sm quiet" type="button">Не сейчас</button></div>`;
    el.querySelector('button').addEventListener('click', () => { store.set('skip_' + c.k, S.made + 3); el.remove(); });   // «Не сейчас» — спросим через 3 результата
    return el;
  }

  function receptyHtml() {
    if (!S.recepty.length) return '<span class="dim small">Загружаю идеи…</span>';
    const ib = document.querySelector('#ideas em'); if (ib) ib.textContent = S.recepty.length || '';
    return S.recepty.map((r) => `<button class="rec" data-rec="${esc(r.id)}"><span class="kind">${esc(TIPS[r.tip] || r.tip)}</span><b>${esc(r.nazvanie)}</b><small>${esc(r.dlya)}</small>${r.rezultat ? `<small class="rz">${esc(r.rezultat)}</small>` : ''}<span class="rp">${esc(priceLabel(r.tip))}</span></button>`).join('');
  }
  function receptForm(r, onGo) {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<form class="mbox" autocomplete="off"><button type="button" class="lbx mx" aria-label="Закрыть">×</button><span class="caps">${esc(TIPS[r.tip] || r.tip)} · рецепт</span><h3 style="margin:6px 0 4px">${esc(r.nazvanie)}</h3><p class="small muted" style="margin-bottom:6px">${esc(r.opisanie)}</p>${r.rezultat ? `<p class="small" style="margin-bottom:14px"><b>Получите:</b> ${esc(r.rezultat)}</p>` : ''}${r.tip === 'afisha' ? '<p class="small dim" style="margin:-6px 0 14px">Проверьте дату, цену и написание на картинке перед печатью.</p>' : ''}
      ${r.polya.map((p, i) => `<div class="field"><label for="rf${i}">${esc(p.label)}</label><input id="rf${i}" data-k="${esc(p.k)}" placeholder="${esc(p.ph)}"></div>`).join('')}
      ${r.reklama ? reklamaHtml() : ''}
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px"><button class="btn accent" type="submit">Сделать · ${esc(priceLabel(r.tip))}</button><span class="dim small">пустое поле агент не выдумает — пометит «[уточнить]»</span></div></form>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.mx')) close(); });
    document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc1); } });
    $('input', m).focus();
    const btn = $('[type=submit]', m);
    m.addEventListener('click', (e) => { const c = e.target.closest('.rq .chip'); if (!c) return; e.preventDefault(); const was = c.classList.contains('on'); $$('.chip', c.parentElement).forEach((x) => x.classList.remove('on')); if (!was) c.classList.add('on'); });
    m.addEventListener('input', () => { const link = $$('input[data-k]', m).some((i) => LINK_RE.test(i.value)) ? (S.ceny.transcribe || 1) : 0; btn.textContent = 'Сделать · ' + priceLabel(r.tip, link); });
    $('form', m).addEventListener('submit', (e) => {
      e.preventDefault();
      const v = {}; $$('input[data-k]', m).forEach((i) => { v[i.dataset.k] = i.value.trim(); });
      if (!Object.values(v).some(Boolean)) { toast('Заполните хотя бы одно поле'); return; }
      let text = r.shablon.replace(/\{([a-z_]+)\}/g, (_, k) => v[k] || '[уточнить]');
      const dop = r.reklama ? reklamaSobrat(m) : null;
      if (dop) text += dop.tekst;
      close(); onGo(r.tip, text, { reklama: true, ploshchadka: dop && dop.ploshchadka });
    });
  }
  // Три вопроса перед рекламой (Plumar One: «что продаём, для кого, где покажем»). Ответы — в задание, площадка — в формат.
  const RQ = [
    ['kogo', 'Для кого', ['женщины 25–45', 'мужчины', 'молодые мамы', 'школьники и родители', 'студенты и молодёжь', 'семьи', 'бизнес и ИП', 'люди 45+', 'туристы и гости города']],
    ['gde', 'Где покажем', ['лента Instagram', 'сторис Instagram', 'Reels / TikTok', 'Telegram-канал', 'рассылка WhatsApp', 'статус WhatsApp', 'карточка Kaspi Магазина', '2GIS', 'офлайн: печать, баннер, экран']],
    ['cel', 'Что человек должен сделать', ['купить сейчас', 'написать в WhatsApp', 'записаться или оставить заявку', 'прийти на событие', 'узнать о нас']],
  ];
  const PLOSHCHADKA = { 'лента Instagram': 'Instagram, пост 4:5', 'сторис Instagram': 'сторис Instagram, 9:16, до 15 с, текст в безопасной зоне', 'Reels / TikTok': 'Instagram Reels / TikTok, вертикально 9:16', 'Telegram-канал': 'Telegram-канал', 'рассылка WhatsApp': 'рассылка WhatsApp, коротко, один призыв', 'статус WhatsApp': 'статус WhatsApp, вертикально 9:16, коротко', 'карточка Kaspi Магазина': 'карточка Kaspi Магазина: фото 1:1 или 3:4 на чистом фоне, без лишнего текста на фото', '2GIS': 'карточка 2GIS: фото и акция', 'офлайн: печать, баннер, экран': 'офлайн: печать, баннер, экран' };
  function reklamaHtml() {
    return `<div class="rqbox"><span class="caps">Чтобы реклама попала в цель</span>${RQ.map(([k, l, opts]) => `<div class="rq" data-q="${k}"><label>${l}</label><div class="chips">${opts.map((o) => `<button type="button" class="chip">${esc(o)}</button>`).join('')}</div></div>`).join('')}<p class="dim small">Можно пропустить.</p></div>`;
  }
  function reklamaSobrat(root) {
    const ot = {}; RQ.forEach(([k]) => { const c = $(`.rq[data-q="${k}"] .chip.on`, root); if (c) ot[k] = c.textContent; });
    if (!Object.keys(ot).length) return null;
    const yaz = { ru: '', kz: 'Язык текста: казахский, грамотный, не дословный перевод.', en: 'Язык текста: английский.' }[S.yazyk] || '';
    let t = '\n' + [ot.kogo && 'Для кого: ' + ot.kogo + (ot.kogo === 'школьники и родители' ? ' (обращаться к родителям, не к детям)' : ''), ot.gde && 'Где покажем: ' + ot.gde, ot.cel && 'Чего ждём от людей: ' + ot.cel].filter(Boolean).join('. ') + '.' + (ot.cel ? ' Призыв — под эту цель.' : '') + (ot.gde ? ' Длина и формат — под площадку.' : '') + (yaz ? ' ' + yaz : '');
    // ст. 6 п. 2 Закона РК «О рекламе»: офлайн — обязательно на казахском, русский по желанию; к интернету не применяется
    if (ot.gde === 'офлайн: печать, баннер, экран') t += ' Офлайн-реклама в РК: обязателен текст на казахском, русский — по желанию, перевод без искажения смысла; казахский текст проверить перед печатью.';
    if (['лента Instagram', 'сторис Instagram', 'Reels / TikTok'].includes(ot.gde)) t += ' Если это реклама по заказу у блогера — в начале подписи пометка «реклама / жарнама».';
    return { tekst: t, ploshchadka: PLOSHCHADKA[ot.gde] };
  }
  function reklamaVoprosy(cb) {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<form class="mbox"><button type="button" class="lbx mx" aria-label="Закрыть">×</button><h3 style="margin:0 0 4px">Это реклама?</h3><p class="small muted" style="margin-bottom:12px">Ответьте в пару касаний. Цена не меняется.</p>${reklamaHtml()}<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn accent" type="submit">Сделать</button><button class="btn quiet" type="button" data-skip>Пропустить</button></div></form>`;
    document.body.appendChild(m);
    const done = (dop) => { m.remove(); cb(dop); };
    m.addEventListener('click', (e) => {
      const c = e.target.closest('.rq .chip'); if (c) { e.preventDefault(); const was = c.classList.contains('on'); $$('.chip', c.parentElement).forEach((x) => x.classList.remove('on')); if (!was) c.classList.add('on'); return; }
      if (e.target.closest('[data-skip]') || e.target === m || e.target.closest('.mx')) done(null);
    });
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', esc2); if (m.isConnected) done(null); } });
    $('form', m).addEventListener('submit', (e) => { e.preventDefault(); done(reklamaSobrat(m)); });
  }
  // «Подходит / не то» (Plumar One собирает этим датасет): «не то» сразу ведёт к правке словами
  const FB_PRICHINY = [['yazyk', 'Не тот язык'], ['dlinno', 'Слишком длинно'], ['korotko', 'Слишком коротко'], ['ton', 'Не тот тон'], ['ne-my', 'Не похоже на нас'], ['kartinka', 'Картинка не та'], ['cena', 'Ошибка в цене или контактах'], ['fakty', 'Ошибка в фактах'], ['drugoe', 'Другое']];
  function fbBlock(item) {
    if (item.fb === 'ok') return '<div class="fb rv"><span class="dim small">Спасибо.</span></div>';
    if (item.fb === 'no') return '<div class="fb rv"><span class="dim small">Принято, учтём.</span></div>';
    return `<div class="fb rv"><span class="small muted">Подошло?</span><button class="btn sm quiet fb-ok" type="button"><svg class="ic" style="width:18px;height:18px"><use href="#i-up"/></svg>Подходит</button><button class="btn sm quiet fb-no" type="button"><svg class="ic" style="width:18px;height:18px"><use href="#i-down"/></svg>Не то</button></div>`;
  }
  function fbPanel(item) {
    return `<div class="fbpanel"><span class="small"><b>Что не так?</b></span><div class="chips">${FB_PRICHINY.map(([k, l]) => `<button type="button" class="chip" data-p="${k}">${l}</button>`).join('')}</div><input class="fbtext" placeholder="Или напишите, что поправить"><div class="fbsverka"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm accent fb-redo" type="button" data-plat="Переделать · ${esc(priceLabel(item.tip))}" data-besp="Проверим и переделаем бесплатно, если ошиблись мы">Переделать · ${esc(priceLabel(item.tip))}</button><button class="btn sm ghost fb-mark" type="button">Просто сообщить</button></div></div>`;
  }
  async function fbSend(item, ocenka, el) {
    const p = $$('.fbpanel .chip.on', el).map((c) => c.dataset.p); const t = (($('.fbtext', el) || {}).value || '').trim();
    try { await api('/api/otzyv', { ocenka, tip: item.tip, recept: item.recept || '', sheet: String(item.id), prichiny: p, tekst: t, tema: item.tema }); } catch (e) { /* отзыв не критичен */ }
    item.fb = ocenka; store.set('feed', S.feed);
    return { p, t };
  }
  function fbPeredelat(item, p, t, besplatno) {
    const prichiny = FB_PRICHINY.filter(([k]) => p.includes(k)).map(([, l]) => l.toLowerCase());
    // при ошибке в фактах/цене старый текст не подсовываем — модель повторила бы ту же выдумку (правка Грока)
    const fakty = p.some((k) => ['fakty', 'cena'].includes(k));
    const proshloe = fakty ? '' : String((item.result && (item.result.text || item.result.hook || item.result.headline || item.result.caption || item.result.goal)) || '').slice(0, 600);
    // бесплатная переделка: тему и тип сервер берёт из записи результата, здесь — только подпись листа
    const tekst = besplatno ? item.tema + ' · переделка без ошибки' : item.tema + '\n\nПравка к прошлому варианту: ' + [prichiny.join(', '), t].filter(Boolean).join('; ') + (proshloe ? '.\nПрошлый вариант (начало): ' + proshloe : '') + (fakty ? '. Цены, даты и контакты — строго как в задании.' : '');
    sessionStorage.setItem('jasa:prefill', JSON.stringify({ tip: item.tip, text: tekst, auto: true, recept: item.recept || '', besplatno: besplatno || '', poyasnenie: besplatno ? t : '' }));
    if ((location.hash || '#/sozdat').startsWith('#/sozdat')) route(); else location.hash = '#/sozdat';
  }
  // Решение Александра 28.10: ошибка в фактах или цене по нашей вине — первая переделка бесплатно. Чья ошибка — сверяет сервер.
  async function fbSverka(item, el, btn) {
    const box = $('.fbsverka', el); btn.disabled = true; btn.textContent = 'Сверяю задание и результат…';
    const { p, t } = await fbSend(item, 'no', el);
    let r; try { r = await api('/api/pravka/sverit', { zid: item.zid, prichiny: p }); } catch (e) { r = { nasha: false, pochemu: e.message }; }
    if (r.nasha) {
      // право выбора: переделать бесплатно или вернуть кредиты за этот результат
      box.innerHTML = `<div class="ok-box"><b>Вы правы, ошибка наша.</b> ${arr(r.gde).map(esc).join(' · ')}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm accent pv-redo" type="button">Переделать бесплатно · около минуты</button>${r.kredity ? `<button class="btn sm quiet pv-back" type="button">Вернуть ${esc(r.kredity)} кр за этот результат</button>` : ''}</div>${r.vozvrat_pochemu ? `<div class="dim small" style="margin-top:6px">${esc(r.vozvrat_pochemu)} <a href="https://t.me/jasa_asia" target="_blank" rel="noopener">Написать нам</a></div>` : ''}</div>`;
      btn.remove();
      $('.pv-redo', box).onclick = (ev) => { ev.stopPropagation(); fbPeredelat(item, p, t, r.token); };
      const back = $('.pv-back', box);
      if (back) back.onclick = async (ev) => {
        ev.stopPropagation(); back.disabled = true;
        try { const v = await api('/api/pravka/vernut', { token: r.token }); spend(0, v.ostatok); box.innerHTML = `<div class="ok-box">Вернули ${esc(v.kredity)} кр на баланс. Извините за ошибку.</div>`; } catch (e2) { toast(e2.message); back.disabled = false; }
      };
      return;
    }
    box.innerHTML = `<div class="warn small">${esc(r.pochemu || 'Мы сверили результат с вашим заданием — расхождений нет.')} <a href="https://t.me/jasa_asia" target="_blank" rel="noopener">Написать нам</a></div>`;
    btn.disabled = false; btn.dataset.mode = 'plat'; btn.dataset.p = JSON.stringify(p); btn.dataset.t = t; btn.textContent = btn.dataset.plat;
  }
  function kartPill() {
    if (!S.kartOpis) return '';
    return `<button class="pill on stilpill" id="kartpill" type="button" title="Убрать своё описание картинки"><span class="dot"></span>Картинка: своё описание ×</button>`;
  }
  // общий блок «своё описание»: поле + голос + «Улучшить с ИИ» — в настройках и в листе «Своя картинка»
  function opisBlock(id, value, ph) {
    const c = (S.ceny && S.ceny.opisanie) || 1;
    return `<textarea class="ed-ta opis" id="${id}" rows="3" placeholder="${esc(ph || 'Например: мастер стрижёт девушку у окна, за окном первый снег, тёплый свет')}">${esc(value || '')}</textarea>
      <div class="ed-act"><button type="button" class="btn sm" id="${id}mic"><svg class="ic"><use href="#i-mic"/></svg>Сказать · 1 кр</button><button type="button" class="btn sm" id="${id}ai">Улучшить с ИИ · ${esc(c)} кр</button></div>
      <p class="small dim" id="${id}sovet"></p>`;
  }
  function opisWire(root, id, tema, onChange) {
    const ta = $('#' + id, root); if (!ta) return;
    ta.addEventListener('input', () => onChange && onChange(ta.value));
    voice($('#' + id + 'mic', root), (t) => { ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + t; ta.dispatchEvent(new Event('input')); });
    $('#' + id + 'ai', root).addEventListener('click', async (e) => {
      const btn = e.currentTarget; if (ta.value.trim().length < 5) { toast('Сначала скажите или напишите, что на картинке'); return; }
      const o = btn.textContent; btn.disabled = true; btn.textContent = 'Улучшаю…';
      try { const r = await api('/api/opisanie_uluchshit', { opisanie: ta.value, tema: typeof tema === 'function' ? tema() : tema, tip: S.tip }); ta.value = r.opisanie; ta.dispatchEvent(new Event('input')); $('#' + id + 'sovet', root).textContent = r.sovet || ''; spend(r.kredity, r.ostatok); hap('success'); }
      catch (err) { toast(err.message); hap('error'); }
      btn.disabled = false; btn.textContent = o;
    });
  }
  function stilPill() {
    if (!S.stil.length) return '';
    return `<button class="pill on stilpill" id="stilpill" type="button" title="Снять стиль"><span class="dot"></span>Стиль: ${S.stil.length} ${S.stil.length === 1 ? 'картинка' : 'картинки'} ×</button>`;
  }

  function brandPill() {
    if (!S.brandId && !S.brend) return `<a class="pill" href="#/brend">Бренд не настроен →</a>`;
    return `<button class="pill ${S.useBrend ? 'on' : ''}" id="brandpill" title="Тексты пишутся голосом вашего бренда"><span class="dot"></span>${esc(S.brandName || (S.brend && S.brend.name) || 'Мой бренд')}${S.useBrend ? '' : ' · выкл'}</button>`;
  }

  // лист результата
  function sheet(item) {
    const el = document.createElement('article');
    el.className = 'sheet';
    const head = `<div class="head"><span class="kind">${TIPS[item.tip] || item.tip}</span>${item.yazyk === 'kz' ? '<span class="pill">қазақша</span>' : (item.yazyk === 'en' ? '<span class="pill">English</span>' : '')}<span class="meta">${item.besplatno ? 'бесплатно — ошибка JASA' : (item.kredity ? item.kredity + ' кр' : '')}</span></div><div class="q">${esc(item.tema)}</div>`;
    if (item.state === 'working') {
      const ags = { post: ['Читаю задание', 'Пишу текст', 'Проверяю цены'], rils: ['Читаю задание', 'Придумываю крючок', 'Раскладываю по кадрам'], afisha: ['Читаю задание', 'Собираю афишу', 'Пишу подписи'], karusel: ['Читаю задание', 'Делю на слайды', 'Пишу тексты'], plan: ['Читаю задание', 'Раскладываю по дням', 'Придумываю темы'] }[item.tip] || ['Читаю задание', 'Пишу текст'];
      const skolko = ['rils', 'plan'].includes(item.tip) ? '20–40 секунд' : (S_KART() === 3 ? 'около минуты' : '30–60 секунд');
      el.innerHTML = head + `<div class="working"><span class="spin"></span><div class="agents">${ags.map((a) => `<span>${a}</span>`).join('')}</div></div><p class="small dim wait-hint">Обычно ${skolko}. Результат останется здесь и в Библиотеке — можно пока листать дальше.</p>`;
      let i = 0; const sp = $$('.agents span', el);
      const tick = setInterval(() => { if (!el.isConnected) { clearInterval(tick); return; } sp.forEach((s, k) => s.classList.toggle('on', k <= i)); if (i < sp.length - 1) i++; else clearInterval(tick); }, 1400);   // последний шаг горит, пока сервер не ответил: «готово» раньше времени не показываем
      return el;
    }
    if (item.state === 'error') { el.innerHTML = head + `<div class="warn"><b>Не получилось:</b> ${esc(item.error)}</div>`; return el; }
    const r = item.result || {};
    const R = { post: renderPost, rils: renderRils, afisha: renderAfisha, karusel: renderKarusel, plan: renderPlan }[item.tip] || renderRaw;
    el.innerHTML = head + R(r, item) + fbBlock(item);
    $$('.rv', el).forEach((n, i) => { n.style.animationDelay = Math.min(i * 90, 1200) + 'ms'; });
    if (item.imgJob && !item.imgItems) pollImages(item, el);
    if (item.videoJob) pollVideo(item, el);
    el.addEventListener('click', (e) => {
      const h = e.target.closest('.hooks button'); if (h) { $$('.hooks button', el).forEach((b) => b.classList.toggle('on', b === h)); return; }
      const d = e.target.closest('.draw'); if (d) { drawImage(d, item); return; }
      if (e.target.closest('[data-pub]')) { if (utStop(item, el, postText(item))) return; hap('light'); publish(item, el); return; }
      if (e.target.closest('[data-edit]')) { hap('light'); editor(item, el); return; }
      if (e.target.closest('[data-svoya]')) { hap('light'); svoyaKartinka(item, el); return; }
      const fin = e.target.closest('[data-fin]'); if (fin) { if (utStop(item, el, (item.final || {}).text)) return; hap('light'); finalAct(fin.dataset.fin, item, fin); return; }
      const wl = e.target.closest('.withlogo'); if (wl) { withLogo(wl); return; }
      const vg = e.target.closest('.vgo'); if (vg) { startVideo(vg, item, el); return; }
      if (e.target.closest('.fb-ok')) { fbSend(item, 'ok', el).then(() => { $('.fb', el).outerHTML = fbBlock(item); }); return; }
      if (e.target.closest('.fb-no')) { const fb = $('.fb', el); if (!$('.fbpanel', el)) fb.insertAdjacentHTML('beforeend', fbPanel(item)); $('.fbtext', el).focus(); return; }
      const fp = e.target.closest('.fbpanel .chip'); if (fp) { fp.classList.toggle('on'); const rb = $('.fb-redo', el); const nasha = $$('.fbpanel .chip.on', el).some((c) => ['fakty', 'cena'].includes(c.dataset.p)) && item.zid && !item.besplatno; rb.textContent = nasha ? rb.dataset.besp : rb.dataset.plat; rb.dataset.mode = nasha ? 'sverka' : ''; return; }
      const rb = e.target.closest('.fb-redo');
      if (rb && rb.dataset.mode === 'sverka') { fbSverka(item, el, rb); return; }
      if (rb && rb.dataset.mode === 'plat') { fbPeredelat(item, JSON.parse(rb.dataset.p || '[]'), rb.dataset.t || ''); return; }
      if (e.target.closest('.fb-mark')) { fbSend(item, 'no', el).then(() => { $('.fb', el).outerHTML = fbBlock(item); }); return; }
      if (e.target.closest('.fb-redo')) {
        fbSend(item, 'no', el).then(({ p, t }) => {
          fbPeredelat(item, p, t);
        });
        return;
      }
      const ch = e.target.closest('.vidpanel .chip'); if (ch) { const k = ch.dataset.res ? 'data-res' : 'data-ratio'; $$('.chip[' + k + ']', ch.parentElement).forEach((c) => c.classList.toggle('on', c === ch)); const vb = $('.vgo', ch.closest('.vidpanel')); if (vb) vb.textContent = 'Снять · 5 с · ' + ({ '480p': 59, '720p': 131, '1080p': 321 }[($('.chip.on[data-res]', ch.closest('.vidpanel')) || {}).dataset.res || '720p']) + ' кр'; return; }
      const c = e.target.closest('[data-copy]'); if (c) { copyText(c.dataset.copy === 'self' ? c.closest('.sheet').innerText : $(c.dataset.copy, el).innerText, c); if (utN(postText(item))) setTimeout(() => toast('Скопировано. В тексте остались [уточнить] — заполните перед публикацией'), 1200); }
    });
    return el;
  }
  async function pollImages(item, el) {
    const token = S.pollToken;
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      if (token !== S.pollToken) return;
      let j; try { j = await api('/api/img/' + item.imgJob); } catch (e) { continue; }
      if (j.done) {
        item.imgItems = arr(j.items); item.imgError = j.error; item.imgJob = null; if (typeof j.ostatok === 'number') spend(0, j.ostatok);
        store.set('feed', S.feed); const fresh = sheet(item); if (el.isConnected) el.replaceWith(fresh); return;
      }
    }
  }
  const warnBlock = (w) => (w && w.length ? `<div class="warn rv"><b>Проверьте:</b> ${w.map(esc).join(' · ')}</div>` : '');
  // 10.11: «[уточнить]» — место, где сервис не знал факта (адрес, запись, цена). Подсвечиваем и не даём опубликовать как есть.
  // 10.11: адрес, запись и часы — данные для поста, чтобы «[уточнить]» не появлялось. Живут на устройстве; сервер получает их как fakty.
  const FK = [['adres', 'Адрес', 'Алматы, Абая 10'], ['kontakt', 'Как записаться или заказать', 'WhatsApp +7 700 000 00 00'], ['chasy', 'Часы работы', 'Каждый день 8:00–22:00']];
  const fkEst = () => !!(S.ceny && S.ceny.fakty);   // сервер объявил, что принимает fakty
  const fkChist = (v) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  const fkBrend = () => (S.useBrend && S.brandId && S.me && !S.me.guest && S.brandFakty) || {};   // что уже записано в карте бренда
  const fkVse = () => { if (!S.fakty) S.fakty = store.get('fakty', {}) || {}; return S.fakty; };
  const fkTelo = () => { if (!fkEst()) return undefined; const f = fkVse(), o = {}; FK.forEach(([k]) => { const v = fkChist(f[k]); if (v) o[k] = v; }); return Object.keys(o).length ? o : undefined; };
  const UT = /\[уточнить[^\]]*\]/g;
  const utN = (t) => (String(t || '').match(UT) || []).length;
  const utMark = (t) => esc(t).replace(UT, '<mark class="ut">$&</mark>');
  const utHint = (t) => { const n = utN(t); return n ? `<button type="button" class="ut-hint rv" data-edit>В тексте ${n} ${n === 1 ? 'место' : n < 5 ? 'места' : 'мест'} без данных: адрес, запись или цена. Заполнить</button>` : ''; };
  const utStop = (item, el, t) => { const n = utN(t); if (!n) return false; hap('medium'); toast('Сначала заполните [уточнить] — ' + n + ' ' + (n === 1 ? 'место' : n < 5 ? 'места' : 'мест') + ' в тексте'); editor(item, el); return true; };
  const actionsBlock = (extra) => `<div class="actions rv"><button class="btn sm" data-copy="self"><svg class="ic" style="width:18px;height:18px"><use href="#i-copy"/></svg>Скопировать</button>${extra || ''}<span class="dim small aimark" style="margin-left:auto;align-self:center">Метка ИИ добавится сама (закон РК № 230-VIII, ст. 21)</span></div>`;
  const imgCard = (im, cls, i) => `<div class="img ${cls || ''} rv" data-i="${i == null ? '' : i}" data-prompt="${esc(im.prompt)}" data-aspect="${esc(im.aspect || '4:5')}"><div class="ph"></div>${im.url ? `<img src="${esc(im.url)}" alt="">` : '<button class="btn sm accent draw">Нарисовать · 12 кр</button>'}<div class="cap">${esc(im.caption || im.text || '')}</div></div>`;

  function threeImgs(item) {
    const its = arr(item.imgItems);
    const logo = item.brand && item.brand.logo;
    if (its.length) return `<div class="caps rv" style="margin-top:16px">Выберите картинку${logo ? ' · лого поставим без искажений' : ''}</div><div class="imgs three">${its.map((it) => it.url ? `<div class="img rv"><img src="${esc(API_BASE + it.url)}" alt="" loading="lazy" crossorigin="anonymous"><div class="cap">вариант ${esc(it.variant)}${it.svoya ? ' · по вашему описанию' : ''}</div>${logo ? `<button class="btn sm accent withlogo" data-src="${esc(API_BASE + it.url)}" data-logo="${esc(API_BASE + logo.url)}" data-ugol="${esc(logo.ugol)}" style="position:absolute;top:8px;right:8px">С лого</button>` : ''}</div>` : it.dorisovat ? `<div class="img dor rv" data-v="${esc(it.variant)}" data-kod="${esc(it.kod || '')}" data-prompt="${esc(it.prompt || '')}" data-aspect="${esc(it.aspect || '4:5')}"><div class="ph"></div><button class="btn sm accent draw" type="button">Нарисовать · 12 кр</button><div class="cap">вариант ${esc(it.variant)} · другой художник</div></div>` : `<div class="img rv"><div class="ph"></div><div class="cap">вариант ${esc(it.variant)}: ${esc(it.error || 'не вышло')}</div></div>`).join('')}</div>`;
    if (item.imgJob) return `<div class="working rv" style="margin-top:16px"><span class="spin"></span><span>Рисую, 1–2 минуты…</span></div>`;
    if (item.imgError) return `<div class="warn rv">Картинки: ${esc(item.imgError)}</div>`;
    return '';
  }
  function tgPreview(r, item) {
    const hooks = arr(r.hooks); const text = ((hooks[0] ? hooks[0] + '\n\n' : '') + (r.text || '')).trim();
    const its = arr(item.imgItems).filter((x) => x.url);
    return `<details class="more rv" ${document.documentElement.classList.contains('mob') ? '' : 'open'}><summary>Вид в Telegram</summary><div class="tgwrap"><div class="tgmsg"><div class="tgname">JASA</div><div class="tgtext">${esc(text).slice(0, 900)}${text.length > 900 ? '…' : ''}\n\n<span class="dim">— создано с помощью ИИ · JASA</span></div></div>${its.length ? `<div class="tgmsg tgalbum">${its.map((x) => `<img src="${esc(API_BASE + x.url)}" alt="" loading="lazy" decoding="async" crossorigin="anonymous">`).join('')}<div class="tgtext small">Три варианта картинки к посту — выберите свой.</div></div>` : ''}<div class="dim small" style="margin-top:8px">В боте можно отвечать голосом: наговорите правку, и пост переделается.</div></div></details>`;
  }
  const editBtn = (item) => `${item && !item.final ? '<button class="btn sm accent" type="button" data-pub>Опубликовать</button>' : ''}<button class="btn sm" type="button" data-edit>Редактировать</button><button class="btn sm quiet" type="button" data-svoya>Своя картинка</button>`;
  // «Опубликовать» без редактора: выбранная первая строка + первая готовая картинка → блок «Готово к публикации» с кнопками отправки
  function publish(item, el) {
    const hi = $$('.hooks button', el).findIndex((b) => b.classList.contains('on')); if (hi > -1) item.hook = hi;
    const pics = arr(item.imgItems).filter((x) => x.url);
    item.final = { text: postText(item), image: (pics[0] && pics[0].url) || '', ts: Date.now() }; store.set('feed', S.feed);
    const fresh = sheet(item); if (el.isConnected) el.replaceWith(fresh); fresh.scrollIntoView({ behavior: 'smooth', block: 'start' }); hap('success');
  }
  // «Своя картинка»: описание голосом или текстом → «Улучшить с ИИ» → выбранный художник рисует (12 кр + промпт ≤ 1)
  function svoyaKartinka(item, el) {
    const cena = (S.ceny && S.ceny.kartinka_svoya) || 13;
    let hud = S.hud !== 'auto' ? S.hud : (item.tip === 'afisha' ? 'gpt' : 'nb'); let aspect = S.aspect !== 'auto' ? S.aspect : '4:5';
    const html = `${bsHead('Своя картинка')}
      <p class="small muted">Скажите или напишите, что должно быть на картинке. «Улучшить с ИИ» сделает из этого ясное описание кадра — вы его увидите и сможете поправить.</p>
      ${opisBlock('svta', S.kartOpis)}
      <div class="bs-lab">Художник</div>
      <div class="bs-tiles kart">${[['gpt', 'Художник 1', 'текст и графика'], ['nb', 'Художник 2', 'фото, люди'], ['seedream', 'Художник 3', 'стиль, арт']].map(([k, v, d]) => `<button type="button" class="bs-tile ${hud === k ? 'on' : ''}" data-sh="${k}">${v}<small>${d}</small></button>`).join('')}</div>
      <div class="bs-lab">Размер</div>
      <div class="bs-tiles kart">${[['4:5', '4:5', 'лента'], ['1:1', '1:1', 'квадрат'], ['9:16', '9:16', 'сторис'], ['16:9', '16:9', 'широкая']].map(([k, v, d]) => `<button type="button" class="bs-tile ${aspect === k ? 'on' : ''}" data-sa="${k}">${v}<small>${d}</small></button>`).join('')}</div>
      <button type="button" class="bs-done" id="svgo">Нарисовать · до ${esc(cena)} кр</button>`;
    const b = bsheet(html);
    opisWire(b.el, 'svta', item.tema);
    b.el.addEventListener('click', async (e) => {
      const sh = e.target.closest('.bs-tile[data-sh]'); if (sh) { hap('sel'); hud = sh.dataset.sh; $$('.bs-tile[data-sh]', b.el).forEach((x) => x.classList.toggle('on', x === sh)); return; }
      const sa = e.target.closest('.bs-tile[data-sa]'); if (sa) { hap('sel'); aspect = sa.dataset.sa; $$('.bs-tile[data-sa]', b.el).forEach((x) => x.classList.toggle('on', x === sa)); return; }
      if (e.target.closest('#svgo')) {
        const ta = $('#svta', b.el); if (ta.value.trim().length < 5) { toast('Опишите, что должно быть на картинке'); return; }
        const btn = $('#svgo', b.el); btn.disabled = true; btn.textContent = 'Рисую, около минуты…';
        try {
          const nk = (item.result && item.result.na_kartinke) || {}, pb = (item.promty && item.promty.banner) || {};   // текст объявления остаётся и на своей картинке, в том числе после переделки и у старых результатов
          const bn = { zagolovok: pb.zagolovok || nk.zagolovok || (item.result && (item.result.headline || (item.result.cover && item.result.cover.text))) || '', podzagolovok: pb.podzagolovok || nk.stroka || '' };
          const r = await api('/api/kartinka_svoya', { opisanie: ta.value, hudozhnik: hud, aspect, zid: item.zid || '', brand_id: item.brand ? item.brand.id : null, zagolovok: bn.zagolovok || '', podzagolovok: bn.podzagolovok || '' });
          spend(r.kredity, r.ostatok);
          const its = arr(item.imgItems); const n = its.reduce((m, x) => Math.max(m, +x.variant || 0), 0) + 1;
          its.push({ variant: n, kod: r.kod, url: r.image, svoya: true }); item.imgItems = its; store.set('feed', S.feed);
          b.close(); hap('success'); const fresh = sheet(item); if (el.isConnected) el.replaceWith(fresh); fresh.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) { toast(err.message); hap('error'); btn.disabled = false; btn.textContent = `Нарисовать · до ${cena} кр`; }
      }
    });
  }
  function postText(item) {
    const r = item.result || {};
    if (item.tip === 'afisha') return [r.headline, r.sub, r.details].filter((x) => typeof x === 'string' && x.trim()).join('\n');
    if (item.tip === 'karusel') { const tg2 = arr(r.hashtags); return [arr(r.slides).map((s, i) => (i + 1) + '. ' + [s.headline, s.text].filter(Boolean).join(' — ')).join('\n'), r.caption].filter(Boolean).join('\n\n').trim() + (tg2.length ? '\n\n' + tg2.map((t) => '#' + t).join(' ') : ''); }
    const hooks = arr(r.hooks); const h = (item.hook != null && hooks[item.hook]) || hooks[0] || '';
    const tags = arr(r.hashtags);
    return ((h ? h + '\n\n' : '') + (r.text || '')).trim() + (tags.length ? '\n\n' + tags.map((t) => '#' + t).join(' ') : '');
  }
  const copyPlain = (t) => { if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Скопировано')).catch(() => toast('Не удалось скопировать')); else toast('Не удалось скопировать'); };
  // редактор готового поста: человек правит текст сам, «Проверить» — вычитка за 3 кр, одна картинка на выбор → финал
  function editor(item, el) {
    const hi = $$('.hooks button', el).findIndex((b) => b.classList.contains('on')); if (hi > -1) item.hook = hi;
    const text0 = (item.final && item.final.text) || postText(item);
    const pics = arr(item.imgItems).filter((x) => x.url);
    let pick = (item.final && item.final.image) || (pics[0] && pics[0].url) || '';
    const cena = (S.ceny && S.ceny.uluchshit) || 3;
    const html = `${bsHead('Редактор')}
      <p class="small muted ed-hint" id="edhint"></p>
      <textarea class="ed-ta" id="edta" rows="10" spellcheck="true">${esc(text0)}</textarea>
      <div class="ed-warn small" id="edwarn"></div>
      ${pics.length ? `<div class="bs-lab">Картинка к посту</div><div class="ed-pics">${pics.map((p) => `<button type="button" class="ed-pic ${pick === p.url ? 'on' : ''}" data-pic="${esc(p.url)}" aria-label="вариант ${esc(p.variant)}"><img src="${esc(API_BASE + p.url)}" alt=""></button>`).join('')}</div>` : ''}
      <div class="ed-act"><button type="button" class="btn sm" id="edcheck">Проверить и улучшить · ${esc(cena)} кр</button><button type="button" class="btn sm quiet" id="edcopy">Скопировать</button></div>
      <button type="button" class="bs-done" id="eddone">Готово</button>`;
    const b = bsheet(html);
    const ta = $('#edta', b.el);
    const left = () => (ta.value.match(/\[уточнить[^\]]*\]/g) || []).length;
    const hint = () => { const n = left(); $('#edhint', b.el).textContent = n ? `Осталось заполнить: ${n} × [уточнить]. Пишите прямо в тексте — адрес, даты, условия. Потом «Проверить»: вычитаем, факты не трогаем.` : 'Поправьте, что не так, прямо в тексте. Потом «Проверить»: вычитаем орфографию и согласование, факты не трогаем.'; };
    ta.addEventListener('input', hint); hint();
    setTimeout(() => { const i = ta.value.indexOf('[уточнить'); if (i > -1) { ta.focus(); ta.setSelectionRange(i, i); } }, 250);
    b.el.addEventListener('click', async (e) => {
      const pb = e.target.closest('.ed-pic'); if (pb) { hap('sel'); pick = pb.dataset.pic; $$('.ed-pic', b.el).forEach((x) => x.classList.toggle('on', x === pb)); return; }
      if (e.target.closest('#edcopy')) { copyPlain(ta.value); return; }
      if (e.target.closest('#edcheck')) {
        const btn = $('#edcheck', b.el); btn.disabled = true; btn.textContent = 'Проверяю…';
        try { const r = await api('/api/uluchshit', { tekst: ta.value, tema: item.tema, tip: item.tip }); ta.value = r.text; spend(r.kredity, r.ostatok); $('#edwarn', b.el).innerHTML = r.warnings && r.warnings.length ? '<b>Проверьте:</b> ' + r.warnings.map(esc).join(' · ') : '<b>Проверено.</b> Ошибок не нашли.'; hint(); hap('success'); }
        catch (err) { toast(err.message); hap('error'); }
        btn.disabled = false; btn.textContent = `Проверить и улучшить · ${cena} кр`; return;
      }
      if (e.target.closest('#eddone')) {
        item.final = { text: ta.value.trim(), image: pick, ts: Date.now() }; store.set('feed', S.feed); b.close();
        const fresh = sheet(item); if (el.isConnected) el.replaceWith(fresh); fresh.scrollIntoView({ behavior: 'smooth', block: 'start' }); hap('success');
      }
    });
  }
  function finalBlock(item) {
    const f = item.final; if (!f) return '';
    // одна главная кнопка по месту: в Telegram — себе в чат, на телефоне — системное «Поделиться», на компьютере — скопировать
    const canShare = !!navigator.share; const prim = TG ? 'sebe' : (canShare ? 'share' : 'copy');
    const vtoroj = !TG && S.me && !S.me.guest ? 'sebe' : null;   // вошедший в браузере: «Себе в Telegram» второй видимой кнопкой
    const L = { sebe: 'Себе в Telegram', share: 'Поделиться…', tg: 'В Telegram', wa: 'В WhatsApp', copy: 'Скопировать' };
    const rest = ['sebe', 'share', 'tg', 'wa', 'copy'].filter((k) => k !== prim && k !== vtoroj && (k !== 'share' || canShare));
    return `<div class="final rv"><div class="caps">Готово к публикации</div>
      <div class="final-body">${f.image ? `<img src="${esc(API_BASE + f.image)}" alt="">` : ''}<div class="posttext">${utMark(f.text)}</div></div>${utHint(f.text)}
      <div class="final-act">
        <button type="button" class="btn accent" data-fin="${prim}">${L[prim]}</button>${vtoroj ? `<button type="button" class="btn" data-fin="${vtoroj}">${L[vtoroj]}</button>` : ''}
        <button type="button" class="btn quiet" data-edit>Изменить</button>
      </div>
      <details class="final-more"><summary>Ещё способы отправить</summary><div class="final-act">${rest.map((k) => `<button type="button" class="btn sm" data-fin="${k}">${L[k]}</button>`).join('')}</div></details>
      <p class="small dim" style="margin-top:10px">Instagram и TikTok — через «Поделиться…»: картинка и текст уйдут в приложение вместе. «Себе в Telegram» — чтобы переслать в любую группу или канал.</p></div>`;
  }
  async function finalAct(k, item, btn) {
    const f = item.final || {}; const text = (f.text || '') + AI_MARK; const url = f.image ? (API_BASE || location.origin) + f.image : '';
    if (k === 'copy') return copyPlain(text);
    if (k === 'tg') { const u = 'https://t.me/share/url?url=' + encodeURIComponent(url || 'https://jasa.asia') + '&text=' + encodeURIComponent(text); if (TG && TG.openTelegramLink) TG.openTelegramLink(u); else window.open(u, '_blank', 'noopener'); return; }
    if (k === 'wa') { const u = 'https://wa.me/?text=' + encodeURIComponent(text + (url ? '\n' + url : '')); if (TG && TG.openLink) TG.openLink(u); else window.open(u, '_blank', 'noopener'); return; }
    if (k === 'share') {
      try {
        let files;
        if (url && navigator.canShare) { const bl = await (await fetch(url)).blob(); const fl = new File([bl], 'jasa.' + ((bl.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')), { type: bl.type }); if (navigator.canShare({ files: [fl] })) files = [fl]; }
        if (navigator.share) { await navigator.share(Object.assign({ text }, files ? { files } : {})); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      copyPlain(text); toast('Текст скопирован — вставьте в приложение, картинку сохраните с экрана'); return;
    }
    if (k === 'sebe') {
      if (!S.me || S.me.guest) { toast('Отправка себе в Telegram — после входа'); location.hash = '#/kabinet'; return; }
      const o = btn.textContent; btn.disabled = true; btn.textContent = 'Отправляю…';
      try { const r = await api('/api/otpravit_sebe', { tekst: f.text || '', image: f.image || '' }); toast(r.foto ? 'Ушло в Telegram: картинка и текст. Перешлите, куда нужно' : 'Текст ушёл в Telegram'); hap('success'); }
      catch (e) { toast(e.message); hap('error'); }
      btn.disabled = false; btn.textContent = o;
    }
  }
  function renderPost(r, item) {
    return `${finalBlock(item)}${threeImgs(item)}
      <div class="hooks rv">${(r.hooks || []).map((h, i) => `<button class="${i === (item.hook || 0) ? 'on' : ''}">${esc(h)}</button>`).join('')}</div>
      <div class="posttext rv" id="pt">${utMark(r.text || r._raw || '')}</div>${utHint(r.text)}
      <div class="tags rv">${(r.hashtags || []).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>
      ${tgPreview(r, item)}
      <dl class="kv rv"><dt>Когда</dt><dd>${esc(r.best_time || '—')}</dd></dl>
      ${r.kz_version ? `<details class="more rv"><summary>Қазақша нұсқа</summary><div class="kzbox">${esc(r.kz_version)}</div></details>` : ''}
      ${warnBlock(r.warnings)}${actionsBlock(editBtn(item))}`;
  }
  function renderRils(r, item) {
    return `<div class="rils"><div>
      <div class="rv"><span class="caps">Хук · первые 2 секунды</span><p style="font-weight:600;color:var(--ink);margin-top:4px">${esc(r.hook || '')}</p></div>
      <div class="tl" style="margin-top:16px">${(r.scenes || []).map((s) => `<div class="sc rv"><div class="t">${esc(s.t)}</div><div><div class="k">${esc(s.kadr)}</div><div class="sub">${esc(s.text)}</div><div class="v">${esc(s.voice || '')}${s.sfx ? ` <span class="dim">· ${esc(s.sfx)}</span>` : ''}</div></div></div>`).join('')}</div>
      <dl class="kv rv"><dt>Длина</dt><dd>${esc(r.duration || '')} с</dd><dt>Музыка</dt><dd>${esc(r.music || '')}</dd><dt>Призыв</dt><dd>${esc(r.cta || '')}</dd><dt>Почему</dt><dd>${esc(r.why_works || '')}</dd></dl>
      ${r.cover ? `<div class="imgs">${imgCard({ prompt: r.cover.prompt, aspect: '9:16', caption: 'Обложка: ' + (r.cover.text || ''), url: r.cover.url }, 'v')}</div>` : ''}
      ${warnBlock(r.warnings)}
      ${videoPanel(item)}
      ${actionsBlock()}
    </div><div class="phone rv"><div class="scr"><div class="h">${esc((r.cover && r.cover.text) || r.title || '')}</div><div class="s">${esc(r.duration || '')} с · 9:16</div></div></div></div>`;
  }
  function renderAfisha(r, item) {
    const V = (r.variants || []).map((v, i) => { const p = arr(v.palette).map((c) => col(c, '#15192A')); if (!p.length) p.push('#15192A', '#FF4D1F'); return `<div class="var rv"><div class="pv" style="background:linear-gradient(160deg,${p[0]},${p[1] || p[0]})">${v.url ? `<img src="${esc(v.url)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0">` : ''}<div class="hl">${esc(r.headline)}</div><div><div class="sb">${esc(r.sub)}</div><div class="sb" style="margin-top:6px;opacity:.7">${esc(r.details || '')}</div></div></div><div class="nm"><b>${esc(v.name)}</b>${esc(v.composition)}<div class="sw">${p.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div style="margin-top:10px">${v.url ? '' : `<button class="btn sm accent draw" data-prompt="${esc(v.prompt)}" data-aspect="4:5">Нарисовать фон · 12 кр</button>`}</div></div></div>`; }).join('');
    return `${finalBlock(item)}<div class="variants">${V}</div>${threeImgs(item)}<dl class="kv rv"><dt>Форматы</dt><dd>${(r.formats || []).map(esc).join(' · ')}</dd>${r.kz_headline ? `<dt>Қазақша</dt><dd>${esc(r.kz_headline)}</dd>` : ''}</dl>${warnBlock(r.warnings)}${actionsBlock(editBtn(item))}`;
  }
  function renderKarusel(r, item) {
    return `${finalBlock(item)}<div class="slides">${(r.slides || []).map((s) => `<div class="slide rv"><span class="n">${esc(s.n)} / ${(r.slides || []).length}</span><div><b>${esc(s.headline)}</b><p>${esc(s.text)}</p></div></div>`).join('')}</div>
      <div class="posttext rv" style="margin-top:16px">${utMark(r.caption || '')}</div>${utHint(r.caption)}<div class="tags rv">${(r.hashtags || []).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>${threeImgs(item)}${warnBlock(r.warnings)}${actionsBlock(editBtn(item))}`;
  }
  function renderPlan(r) {
    return `<p class="rv muted">${esc(r.goal || '')}</p><div class="days">${(r.days || []).map((d) => `<div class="day rv"><div class="d">${esc(d.day)}</div><div class="f">${esc(d.format)}</div><div><b>${esc(d.topic)}</b><p>${esc(d.hook)}</p><p class="dim small">${esc(d.why)}</p></div></div>`).join('')}</div>
      <p class="rv small muted" style="margin-top:14px">${esc(r.rhythm || '')}</p>${actionsBlock('<button class="btn sm accent">Сделать все 7</button>')}`;
  }
  function videoPanel(item) {
    if (item.video && item.video.url) return `<div class="vid rv"><video src="${esc(API_BASE + item.video.url)}" controls playsinline loop muted autoplay style="width:100%;max-width:340px;border-radius:14px;display:block;margin-top:16px"></video><div class="dim small" style="margin-top:6px">${esc(item.video.resolution)} · ${esc(item.video.duration)} с · ${esc(item.video.kredity)} кр · создано с помощью ИИ</div></div>`;
    if (item.videoJob) return `<div class="working rv" style="margin-top:16px"><span class="spin"></span><span>Снимаю ролик (${esc(item.video && item.video.resolution)}), до 5 минут…</span></div>`;
    const pr = (item.promty && item.promty.video) || (item.result && item.result.scenes ? { prompt: [item.result.hook, ...arr(item.result.scenes).map((s) => (s.t || '') + ': ' + (s.kadr || '')), 'Sound: synchronous natural noises, no music. Photorealistic, warm light, Kazakhstani people.'].filter(Boolean).join(' ') } : null);
    return `<div class="vidpanel rv" style="margin-top:18px;padding:14px 16px;border-radius:var(--r-sm);background:var(--surface-2)">
      <span class="caps">Снять ролик</span>
      <div class="chips" style="margin:8px 0">${['480p', '720p', '1080p'].map((q, i) => `<button class="chip ${i === 1 ? 'on' : ''}" data-res="${q}">${q} · ${{ '480p': 59, '720p': 131, '1080p': 321 }[q]} кр</button>`).join('')}</div>
      <div class="chips" style="margin:0 0 8px">${['9:16', '16:9', '1:1'].map((q, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-ratio="${q}">${q}</button>`).join('')}</div>
      <label class="small dim">Фото героя, продукта или места (до 4 файлов) <input type="file" class="vrefs" accept="image/*,video/mp4" multiple style="display:block;margin:6px 0"></label>
      <textarea class="vprompt" rows="3" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;background:var(--field);color:var(--ink)" placeholder="Описание ролика уже готово, можно поправить">${esc(pr && pr.prompt || '')}</textarea>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap"><button class="btn sm accent vgo">Снять · 5 с</button><span class="dim small">звук: шумы без музыки, 5 секунд</span></div>
    </div>`;
  }
  async function startVideo(btn, item, el) {
    const panel = btn.closest('.vidpanel');
    const res = ($('.chip.on[data-res]', panel) || {}).dataset.res || '720p';
    const ratio = ($('.chip.on[data-ratio]', panel) || {}).dataset.ratio || '9:16';
    const prompt = $('.vprompt', panel).value.trim(); if (prompt.length < 10) { toast('Опишите ролик'); return; }
    // как у Plumar One: до списания честно сказать, что в 5 секундах слишком много событий
    if (panel.dataset.riskOk !== prompt) {
      let rk = null; try { rk = await api('/api/video/risk', { prompt, duration: 5, resolution: res }); } catch (e) { rk = null; }
      if (rk && rk.uroven === 'vysoko') {
        const box = $('.vrisk', panel) || panel.insertAdjacentElement('beforeend', Object.assign(document.createElement('div'), { className: 'vrisk warn' }));
        box.innerHTML = `<b>Перед съёмкой:</b> ${esc(rk.soobshchenie)}${rk.chasti > 1 ? ` Можно разбить на ${rk.chasti} ролика по 5 с — всего ${rk.chasti * rk.kredity} кр вместо ${rk.kredity}.` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${rk.mozhno_glavnoe ? '<button class="btn sm accent vmain" type="button">Оставить главное · бесплатно</button>' : ''}<button class="btn sm quiet vasis" type="button">Снять как есть · ${esc(rk.kredity)} кр</button></div>`;
        if ($('.vmain', box)) $('.vmain', box).onclick = () => { $('.vprompt', panel).value = rk.glavnoe; panel.dataset.riskOk = rk.glavnoe.trim(); box.remove(); toast('Оставил первое событие — проверьте текст и нажмите «Снять»'); };
        $('.vasis', box).onclick = () => { panel.dataset.riskOk = prompt; box.remove(); startVideo(btn, item, el); };
        return;
      }
    }
    const files = Array.from(($('.vrefs', panel) || {}).files || []).slice(0, 4);
    btn.disabled = true; btn.textContent = 'Отправляю…';
    try {
      const refs = []; for (const f of files) { if (f.size > 9e6) throw new Error('Файл больше 9 МБ: ' + f.name); refs.push({ b64: await toB64(f), mime: f.type }); }
      const r = await api('/api/video', { prompt, resolution: res, ratio, duration: 5, refs });
      item.videoJob = r.id; item.video = { resolution: res, duration: 5, kredity: r.kredity }; store.set('feed', S.feed);
      const fresh = sheet(item); el.replaceWith(fresh); pollVideo(item, fresh);
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Снять · 5 с'; }
  }
  async function pollVideo(item, el) {
    const token = S.pollToken;
    for (let i = 0; i < 240; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      if (token !== S.pollToken) return;
      let j; try { j = await api('/api/video/' + item.videoJob); } catch (e) { continue; }
      if (j.done) {
        item.videoJob = null; if (j.url) item.video.url = j.url; else { item.video = null; toast('Видео: ' + (j.error || 'не вышло')); }
        if (typeof j.ostatok === 'number') spend(0, j.ostatok); store.set('feed', S.feed);
        const fresh = sheet(item); if (el.isConnected) el.replaceWith(fresh); return;
      }
    }
  }
  function renderRaw(r) { return `<pre class="posttext rv">${esc(JSON.stringify(r, null, 2))}</pre>`; }

  async function drawImage(btn, item) {
    const card = btn.closest('.img, .var');
    const prompt = btn.dataset.prompt || (card && card.dataset.prompt);
    const aspect = btn.dataset.aspect || (card && card.dataset.aspect) || '1:1';
    btn.disabled = true; btn.textContent = 'Рисую…';
    try {
      const kod = btn.dataset.kod || (card && card.dataset.kod) || undefined;
      const r = await api('/api/kartinka', { prompt, aspect, kod });
      spend(r.kredity, r.ostatok);
      const img = document.createElement('img'); img.src = r.image; img.alt = '';
      (card.querySelector('.pv') || card).prepend(img); btn.remove();
      if (card.dataset.v && item && item.imgItems) { const it = item.imgItems[+card.dataset.v - 1]; if (it) { it.url = r.image; delete it.dorisovat; } store.set('feed', S.feed); }
      const i = card.dataset.i; if (item && item.result) { if (i !== '' && arr(item.result.images)[i]) item.result.images[i].url = r.image; else if (item.tip === 'rils' && item.result.cover) item.result.cover.url = r.image; else if (item.tip === 'afisha') { const k = $$('.var', btn.closest('.sheet')).indexOf(card); if (arr(item.result.variants)[k]) item.result.variants[k].url = r.image; } store.set('feed', S.feed); }
    } catch (e) { btn.disabled = false; btn.textContent = 'Нарисовать · 12 кр'; toast(e.message); }
  }
  // лого бренда — оригинальный файл поверх готовой картинки (модель лого не рисует)
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('картинка не загрузилась')); im.src = src; });
  function trimAlpha(im) {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let t = c.height, l = c.width, r = 0, b = 0;
    for (let y = 0; y < c.height; y += 2) for (let xx = 0; xx < c.width; xx += 2) { if (d[(y * c.width + xx) * 4 + 3] > 12) { if (y < t) t = y; if (y > b) b = y; if (xx < l) l = xx; if (xx > r) r = xx; } }
    if (r <= l || b <= t) return c;
    const o = document.createElement('canvas'); o.width = r - l + 1; o.height = b - t + 1; o.getContext('2d').drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height); return o;
  }
  async function compose(src, logoSrc, ugol) {
    const [im, lg] = await Promise.all([loadImg(src), loadImg(logoSrc)]);
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const L = trimAlpha(lg); const w = Math.round(c.width * (L.width / L.height > 2 ? 0.30 : 0.16)); const h = Math.round(w * L.height / L.width); const pad = Math.round(c.width * 0.04);
    const u = String(ugol || '').toLowerCase(); const left = /лев/.test(u); const top = /верх/.test(u);
    x.drawImage(L, left ? pad : c.width - w - pad, top ? pad : c.height - h - pad, w, h);
    return c.toDataURL('image/jpeg', 0.92);
  }
  async function withLogo(btn) {
    btn.disabled = true; btn.textContent = 'Ставлю…';
    try {
      const url = await compose(btn.dataset.src, btn.dataset.logo, btn.dataset.ugol);
      const card = btn.closest('.img'); const im = card.querySelector('img'); im.src = url;
      btn.textContent = 'Скачать'; btn.disabled = false; btn.classList.remove('withlogo'); btn.onclick = (e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = url; a.download = 'jasa-s-logo.jpg'; a.click(); };
    } catch (e) { toast('Лого: ' + e.message); btn.disabled = false; btn.textContent = 'С лого'; }
  }
  const AI_MARK = '\n\nСоздано с помощью ИИ · JASA';
  // Просмотр фото и видео — общий модуль lupa.js (эффект воды); нажатия по картинкам он ловит сам.
  function lightbox(src, cap) { if (window.JasaLupa) window.JasaLupa.open({ src, cap: cap || 'Полный размер · создано с помощью ИИ' }); else window.open(src, '_blank'); }
  function copyText(t, btn) { navigator.clipboard && navigator.clipboard.writeText(t + AI_MARK).then(() => { const o = btn.textContent; btn.textContent = 'Скопировано'; setTimeout(() => (btn.textContent = o), 1200); }); }
  // Внутри Telegram системные confirm()/prompt() не показываются — спрашиваем через Telegram или свой лист
  function askConfirm(msg) {
    return new Promise((res) => {
      try { if (TG && TG.showConfirm) { TG.showConfirm(String(msg).slice(0, 250), (ok) => res(!!ok)); return; } } catch (e) { /* старый клиент — ниже */ }
      res(window.confirm(msg));
    });
  }
  function askPrompt(msg, def, max) {
    if (!TG) { const v = window.prompt(msg, def || ''); return Promise.resolve(v == null ? null : v.trim() || null); }
    return new Promise((res) => {
      let done = false;
      const b = bsheet(`${bsHead(msg)}<input class="bs-inp" id="bsinp" value="${esc(def || '')}" maxlength="${max || 200}" autocomplete="off"><button type="button" class="bs-done" id="bsok">Готово</button>`, () => { if (!done) { done = true; res(null); } });
      const inp = $('#bsinp', b.el); setTimeout(() => inp.focus(), 60);
      const ok = () => { if (done) return; done = true; const v = inp.value.trim(); b.close(); res(v || null); };
      $('#bsok', b.el).onclick = ok; inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } };
    });
  }
  function toast(msg) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    if (/не |ошиб|законч|нужно|нет |исчерпан|войдите/i.test(String(msg))) S.lastError = String(msg);
    t.textContent = msg; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => (t.style.opacity = 0), 4000);
  }

  // голос: запись → сервер (распознавание речи); если записи нет — распознавание браузера
  function voice(btn, onText, ui) {
    let mr = null, sr = null, chunks = [], cancelled = false, starting = false, tm = null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const stop = () => { if (mr && mr.state !== 'inactive') mr.stop(); else if (sr) { try { sr.stop(); } catch (e) { /* уже остановлен */ } } };
    const abort = () => { cancelled = true; stop(); };
    if (ui) { ui.stopBtn.addEventListener('click', stop); ui.cancelBtn.addEventListener('click', abort); }
    const off = () => { clearTimeout(tm); btn.classList.remove('zapis'); if (S.voiceAbort === abort) S.voiceAbort = null; if (ui) { try { ui.on(false); } catch (e) { /* экран уже сменился */ } } };
    btn.addEventListener('click', async () => {
      if (mr || sr) { stop(); return; }
      if (starting) return;   // ждём доступ к микрофону: второй тап не запускает вторую запись
      cancelled = false;
      if (!(navigator.mediaDevices && window.MediaRecorder)) {
        if (!SR) { toast('Голос работает в Chrome, Safari и Telegram'); return; }
        sr = new SR(); sr.lang = { kz: 'kk-KZ', en: 'en-US' }[S.yazyk] || 'ru-RU';
        sr.onresult = (e) => { if (!cancelled) onText(Array.from(e.results).map((r) => r[0].transcript).join(' ')); };
        sr.onend = () => { sr = null; off(); };
        btn.classList.add('zapis'); S.voiceAbort = abort; if (ui) { try { ui.on(true); } catch (e) { /* экран уже сменился */ } } sr.start(); return;
      }
      starting = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!btn.isConnected) { stream.getTracks().forEach((t) => t.stop()); return; }   // успели уйти с экрана, пока давали доступ
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); mr = rec; chunks = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop()); off();
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); mr = null;
          if (cancelled || !btn.isConnected) { cancelled = false; return; }
          if (blob.size < 2000) { toast('Слишком коротко'); return; }
          toast('Расшифровываю…');
          try {
            const b64 = await toB64(blob);
            const r = await api('/api/transcribe', { audio: { b64, mime: blob.type.split(';')[0] }, lang: { kz: 'kk', en: 'en' }[S.yazyk] || 'ru' });
            spend(1, r.ostatok); onText(r.text || '');
          } catch (e) { toast(e.message); }
        };
        btn.classList.add('zapis'); S.voiceAbort = abort; if (ui) { try { ui.on(true); } catch (e) { /* экран уже сменился */ } } rec.start();
        tm = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 90000);
      } catch (e) { try { if (mr && mr.stream) mr.stream.getTracks().forEach((t) => t.stop()); } catch (e2) { /* уже остановлен */ } mr = null; off(); toast('Нет доступа к микрофону'); } finally { starting = false; }
    });
  }
  const toB64 = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });

  // =====================================================================
  // ТРЕНДЫ (пока курация, не живой сбор)
  // =====================================================================
  const TRENDS = [
    { t: '«Что было бы, если…» в твоей нише', fire: 'рилс', g: 'linear-gradient(160deg,#15192A,#3B4A8C)', p: 'Один вопрос на экране, ответ раскрывается за 15 секунд. Заходит у экспертов и магазинов.', tip: 'rils', q: 'Рилс «что было бы, если бы ты сделал это раньше» для моей ниши' },
    { t: 'POV: ты пришёл в Алматы первый раз', fire: 'рилс', g: 'linear-gradient(160deg,#FF4D1F,#FFB38A)', p: 'Съёмка от первого лица, 3 локации, субтитры по слову. Кафе, салоны, туры.', tip: 'rils', q: 'POV-рилс: первый раз у нас, три момента, которые удивляют' },
    { t: 'Цены «тогда и сейчас» на Kaspi', fire: 'карусель', g: 'linear-gradient(160deg,#0E6B55,#19B98B)', p: 'Карусель с честным сравнением. Доверие растёт, когда показываешь цифры.', tip: 'karusel', q: 'Карусель «тогда и сейчас»: что изменилось в ценах и качестве за год' },
    { t: 'День из жизни за 20 секунд', fire: 'рилс', g: 'linear-gradient(160deg,#5B3A8C,#15192A)', p: 'Без лица, руки и процесс. Мастера, пекарни, швейные, автосервисы.', tip: 'rils', q: 'Рилс «день из жизни» без лица: руки, процесс, результат, 20 секунд' },
    { t: 'Ответ на хейт с юмором', fire: 'рилс', g: 'linear-gradient(160deg,#B8231A,#FF4D1F)', p: 'Комментарий на экран — и спокойный ответ с фактами.', tip: 'rils', q: 'Рилс-ответ на типичный негативный комментарий в моей нише, с фактами и юмором' },
    { t: 'Афиша-календарь на ноябрь', fire: 'сезон', g: 'linear-gradient(160deg,#C98B1F,#F2B705)', p: 'Один пост со всеми событиями месяца — такие сохраняют.', tip: 'afisha', q: 'Афиша-календарь событий на ноябрь для моего бизнеса' },
  ];
  function trendy() {
    main.innerHTML = topbar('Тренды') + `
      <section style="margin-bottom:26px;max-width:760px"><h2>Что сейчас заходит</h2><p class="muted" style="margin-top:10px">Форматы для Казахстана. Нажмите, и сделаем такой же про вас.</p></section>
      <div class="grid3">${TRENDS.map((t, i) => `<article class="trend rv" style="animation-delay:${i * 70}ms"><div class="cover" style="background:${t.g}"><span class="fire">${t.fire}</span>${esc(t.t)}</div><div class="body"><p>${esc(t.p)}</p><button class="btn sm accent" data-i="${i}">Сделать так же</button></div></article>`).join('')}</div>`;
    main.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const t = TRENDS[+b.dataset.i]; sessionStorage.setItem('jasa:prefill', JSON.stringify({ tip: t.tip, text: t.q })); location.hash = '#/sozdat'; });
  }

  // =====================================================================
  // МОЙ БРЕНД (ДНК)
  // =====================================================================
  function brend() {
    main.innerHTML = topbar('Мой бренд') + `
      <section style="margin-bottom:26px;max-width:760px"><h2>Как звучит ваш бренд</h2><p class="muted" style="margin-top:10px">Вставьте 3–5 своих постов или коротко опишите, кто вы и для кого. Мы определим голос, темы и цвета, и посты будут звучать как ваши.</p></section>
      <div class="two">
        <div class="card">
          <div class="field"><label>Ссылка на ваш Instagram или Telegram-канал</label><input id="handle" placeholder="https://instagram.com/… или t.me/…" value="${esc((S.brend && S.brend.handle) || '')}"></div>
          <div class="warn" style="margin:-4px 0 14px"><b>Анализ аккаунта:</b> по ссылке платформа пройдёт по всем вашим постам, темам, охватам и комментариям и соберёт голос бренда автоматически. Автопубликация — скоро: сначала Telegram, потом Instagram; для неё вы дадите доступ к аккаунту. Пока вставьте 3–5 постов ниже.</div>
          <div class="field"><label>Ваши посты или описание</label><textarea id="posts" placeholder="Вставьте 3–5 постов целиком или напишите: кто вы, что продаёте, кому, как любите говорить с людьми">${esc((S.brend && S.brend.source) || '')}</textarea></div>
          <div style="display:flex;gap:8px;align-items:center"><button class="btn accent" id="mkdna">Собрать голос бренда · до 6 кр</button><button class="icobtn" id="mic2" title="Рассказать голосом"><svg><use href="#i-mic"/></svg></button><span class="dim small">Instagram/Telegram подключим на следующем шаге</span></div>
        </div>
        <div class="card dna" id="dnaout">${S.brend ? dnaHtml(S.brend) : '<p class="muted">Здесь появится голос бренда: как вы говорите, темы, палитра, чего не писать.</p>'}</div>
      </div>`;
    voice($('#mic2'), (t) => { const p = $('#posts'); p.value = (p.value ? p.value + '\n' : '') + t; });
    $('#mkdna').addEventListener('click', async () => {
      const src = $('#posts').value.trim(); if (src.length < 40) { toast('Напишите хотя бы пару предложений'); return; }
      const b = $('#mkdna'); b.disabled = true; b.textContent = 'Изучаю…';
      $('#dnaout').innerHTML = '<div class="working"><span class="spin"></span><span>Читаю ваши тексты и собираю голос бренда</span></div>';
      try {
        const r = await api('/api/ask', { tip: 'dna', tema: src });
        S.brend = Object.assign({}, r.result, { handle: $('#handle').value.trim(), source: src.slice(0, 6000) });
        store.set('brend', S.brend); spend(r.kredity, r.ostatok);
        $('#dnaout').innerHTML = dnaHtml(S.brend);
      } catch (e) { $('#dnaout').innerHTML = `<div class="warn"><b>Не получилось:</b> ${esc(e.message)}</div>`; }
      b.disabled = false; b.textContent = 'Собрать голос бренда · до 6 кр';
    });
  }
  function dnaHtml(d) {
    return `<div class="rv"><span class="caps">Бренд</span><h3>${esc(d.name || '')}</h3></div>
      <div class="rv sum">${esc(d.summary || '')}</div>
      <div class="rv voice"><span class="caps">Голос</span><ul>${(d.voice || []).map((v) => `<li>${esc(v)}</li>`).join('')}</ul></div>
      <div class="rv"><span class="caps">Темы</span><div class="tags">${(d.themes || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div></div>
      <div class="rv"><span class="caps">Никогда</span><ul>${(d.never || []).map((v) => `<li>${esc(v)}</li>`).join('')}</ul></div>
      <div class="rv"><span class="caps">Палитра · ${esc(d.visual || '')}</span><div class="pal" style="margin-top:8px">${arr(d.palette).map((c) => `<i style="background:${col(c, '#ccc')}"></i>`).join('')}</div></div>
      <div class="rv"><span class="caps">Аудитория</span><p class="small">${esc(d.audience || '')}</p></div>`;
  }

  // =====================================================================
  // КАНАЛЫ (макет)
  // =====================================================================
  // Мои каналы — профиль страниц, где человек публикует. Хранится в карте бренда (папка «Каналы и страницы»),
  // поэтому копирайтер и план публикаций видят площадки сами. Автопостинг — отдельным шагом, без макетов и чужих цифр.
  const PLOSHCHADKI = ['Telegram', 'Instagram', 'TikTok', 'VK', 'YouTube', 'Threads', 'WhatsApp', 'Сайт'];
  const CHASTOTA = ['каждый день', '3–4 раза в неделю', 'раз в неделю', 'по событиям'];
  async function kanaly() {
    main.innerHTML = topbar('Мои каналы') + '<div id="kn"><div class="working"><span class="spin"></span><span>Открываю…</span></div></div>';
    let d;
    try { d = await api('/api/brend'); } catch (e) { $('#kn').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    const box = $('#kn'); if (!box) return;
    const head = '<section style="max-width:680px;margin-bottom:22px"><h2>Где вы публикуетесь?</h2><p class="muted" style="margin-top:10px">Добавьте каналы, и тексты подстроятся под площадку.</p></section>';
    if (d.guest) { box.innerHTML = head + '<a class="btn accent" href="#/kabinet">Войти через Telegram</a><p class="dim small" style="margin-top:10px">Нужен вход, чтобы каналы сохранились.</p>'; return; }
    const b = d.brands.find((x) => x.id === d.active) || d.brands[0];
    if (!b) { box.innerHTML = head + '<div class="card" style="max-width:680px"><b>Сначала назовите бренд</b><p class="small muted" style="margin:6px 0 12px">Каналы привязаны к бренду. Если ведёте нескольких клиентов, у каждого свои.</p><a class="btn accent sm" href="#/brend">Назвать бренд</a></div>'; return; }
    const lines = () => String(((b.sections.kanaly || {}).fields || {}).spisok || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const save = async (list) => {
      const r = await api('/api/brend/sohranit', { bid: b.id, kod: 'kanaly', polya: { spisok: list.join('\n') } });
      Object.assign(b, r.brand); draw();
    };
    function draw() {
      const L = lines();
      box.innerHTML = head + `<div class="kgrid"><div>
        <span class="caps">${esc(b.name)} · ${L.length ? L.length + ' ' + (L.length === 1 ? 'канал' : L.length < 5 ? 'канала' : 'каналов') : 'пока пусто'}</span>
        <div class="klist">${L.map((l, i) => { const [pl, adr, ...rest] = l.split(' · '); return `<div class="chan"><div class="ico">${esc((pl || '?').slice(0, 2).toUpperCase())}</div><div><b>${esc(adr || pl)}</b><small>${esc([pl].concat(rest).join(' · '))}</small></div><button class="btn sm ghost" data-del="${i}" title="Убрать">×</button></div>`; }).join('') || '<p class="dim small" style="margin:10px 0">Каналов пока нет.</p>'}</div>
        <p class="dim small" style="margin-top:14px">Автопубликация — скоро: сначала Telegram, потом Instagram.</p>
      </div><form class="card" id="kf" autocomplete="off"><span class="caps">Добавить канал</span>
        <div class="field" style="margin-top:12px"><label for="kp">Площадка</label><select id="kp">${PLOSHCHADKI.map((x) => `<option>${x}</option>`).join('')}</select></div>
        <div class="field"><label for="ka">Адрес</label><input id="ka" placeholder="@moj_kanal или ссылка" required></div>
        <div class="field"><label for="ko">О чём и для кого</label><input id="ko" placeholder="новинки меню, для студентов"></div>
        <div class="field"><label for="kc">Как часто публикуете</label><select id="kc">${CHASTOTA.map((x) => `<option>${x}</option>`).join('')}</select></div>
        <button class="btn accent" type="submit">Добавить</button></form></div>`;
      $$('[data-del]', box).forEach((x) => x.addEventListener('click', async () => { const L2 = lines(); L2.splice(+x.dataset.del, 1); try { await save(L2); } catch (e) { toast(e.message); } }));
      $('#kf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const adr = $('#ka').value.trim().replace(/\s*·\s*/g, ' '); if (!adr) return;
        const o = $('#ko').value.trim().replace(/\s*·\s*/g, ', ');
        const line = [$('#kp').value, adr, o, $('#kc').value].filter(Boolean).join(' · ');
        try { await save(lines().concat(line).slice(0, 20)); toast('Канал добавлен'); } catch (er) { toast(er.message); }
      });
    }
    draw();
  }

  // =====================================================================
  // СЦЕНАРИЙ · агенты
  // =====================================================================
  const MODES = ['Оценить честно', 'Найти ошибки', 'Поднять балл', 'На фестиваль', 'Под Казахстан', 'Под Азию', 'Под стриминг', 'Сократить на 10 минут'];
  function scenariy() {
    const j = S.job;
    const kinoP = S.ceny && S.ceny.kino && +S.ceny.kino.razbor ? S.ceny.kino : null;   // 10.11: «Кино» пакетами — одна цена за разбор (№215); null — сервер ещё со старой лестницей
    main.innerHTML = topbar('Кино', j && j.done ? '' : (kinoP ? `<span class="pill" title="Одна цена за разбор. Не соберём отчёт — вернём всё">разбор · ${esc(kinoP.razbor)} кр</span>` : '<span class="pill" title="Резерв зависит от длины текста, списываем по факту, лишнее возвращаем">разбор от 100 кр</span>')) + `<div id="sc"></div>`;
    if (j && j.id && !j.done) { pollJob(j.id); return; }
    if (j && j.done && j.showrunner) { renderReport(j); return; }
    renderIntake();
  }
  function renderIntake() {
    $('#sc').innerHTML = `
      <div class="steps"><span class="on">1 · Сценарий</span><span>2 · Четыре вопроса</span><span>3 · Разбор</span><span>4 · Отчёт</span></div>
      <section style="margin-bottom:22px;max-width:760px"><h2>Загрузите сценарий</h2><p class="muted" style="margin-top:10px">Выпишем, что нельзя трогать, и разберём структуру, героев, диалоги, рынок и риски. Без вашего «да» ничего не меняется.</p></section>
      <div class="two"><div class="card">
        <div class="field"><label>Текст сценария (Fountain, Markdown или обычный текст) или файл</label><textarea id="script" style="min-height:260px;font-family:var(--mono);font-size:13px" placeholder="НАТ. СТЕПЬ — ДЕНЬ&#10;&#10;…"></textarea></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="file" id="file" accept=".txt,.fountain,.md" class="hide"><button class="btn sm quiet" id="pick">Выбрать файл</button><button class="btn sm quiet" id="sample">Взять пример: «Тонкий лёд»</button><span class="dim small" id="cnt"></span></div>
      </div><div class="card">
        <span class="caps">Четыре вопроса, можно отвечать голосом</span>
        <div class="qs" style="margin-top:12px">
          ${[['О чём это и для кого?', 'q1', 'Подростковый триллер о правилах на льду, для 12–16'], ['Где это будут смотреть?', 'q2', 'YouTube и TikTok, потом школы'], ['Что в сценарии нельзя трогать?', 'q3', 'Голос диктора и честность про страх'], ['Кто автор и кому принадлежат права?', 'q4', 'Автор — я, права мои']].map(([l, id, ph], i) => `<div class="q4"><span class="n">${i + 1}</span><div><label for="${id}">${l}</label><div class="inrow"><input id="${id}" placeholder="${ph}"><button class="icobtn mic" data-for="${id}" title="Голосом"><svg><use href="#i-mic"/></svg></button></div></div></div>`).join('')}
        </div>
        <span class="caps" style="display:block;margin-top:18px">Что сделать</span>
        <div class="modes" id="modes">${MODES.map((m, i) => `<button class="chip ${i === 0 ? 'on' : ''}">${m}</button>`).join('')}</div>
        <div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn accent" id="run">Разобрать сценарий</button><span class="dim small" id="scres">Держим до 100 кр, спишем по факту — обычно 80–90 % от этой суммы, лишнее вернём. Займёт 5–15 минут, можно уйти с экрана</span><span class="dim small hide" id="scpovtor"></span></div>
      </div></div>`;
    // резерв разбора по длине: ступени из /api/ceny.razbor [[до минут, кр], …, [null, кр]] (сервер держит ровно столько, факт не выше); запасной — 100
    const rezervRazbora = (text) => { const min = text.trim() ? text.trim().split(/\s+/).length / 180 : 0; const st = Array.isArray(S.ceny && S.ceny.razbor) ? S.ceny.razbor : null; if (!st) return 100; const r = st.find((x) => x[0] == null || min <= +x[0]); return r ? +r[1] || 100 : 100; };
    const ta = $('#script'); const cnt = () => { $('#cnt').textContent = ta.value ? Math.round(ta.value.split(/\s+/).length / 180 * 10) / 10 + ' стр · ' + ta.value.length + ' зн' : ''; const n = rezervRazbora(ta.value); const r = $('#scres'); const kp = S.ceny && S.ceny.kino && +S.ceny.kino.razbor ? S.ceny.kino : null; if (kp) { const cena = S.kinoPovtor ? kp.povtor : kp.razbor; const pl = $('.topbar .pill'); if (pl) { pl.textContent = (S.kinoPovtor ? 'новая версия · ' : 'разбор · ') + cena + ' кр'; pl.title = 'Одна цена за разбор. Не соберём отчёт — вернём всё'; } $('#run').textContent = (S.kinoPovtor ? 'Разобрать новую версию · ' : 'Разобрать сценарий · ') + cena + ' кр'; if (r) r.textContent = 'Одна цена за разбор. Не соберём отчёт — вернём все ' + cena + ' кр. Займёт 5–15 минут, можно уйти с экрана'; const lich = S.me && S.me.koshelki ? (+S.me.koshelki.dar || 0) + (+S.me.koshelki.lichnye || 0) : null; const pv = $('#scpovtor'); if (pv) { const malo = lich != null && lich < cena; pv.classList.toggle('hide', !malo); pv.innerHTML = malo ? 'Не хватает ' + Math.ceil(cena - lich) + ' кр' + ((+S.me.koshelki.den || 0) > 0 ? ': дневные кредиты подписки на разбор не идут' : '') + '. <a href="#/kabinet">Пополнить</a>' : ''; } return; } if (r) r.textContent = `Держим до ${n} кр, спишем по факту — обычно 80–90 % от этой суммы, лишнее вернём. Займёт 5–15 минут, можно уйти с экрана`; };
    ta.addEventListener('input', cnt); cnt();   // цена на кнопке видна сразу, до первого символа
    $('#pick').addEventListener('click', () => $('#file').click());
    $('#file').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { ta.value = t; cnt(); }); });
    $('#sample').addEventListener('click', () => fetch('primer-tonkiy-led.fountain?v=2').then((r) => r.text()).then((t) => { ta.value = t; cnt(); $('#q1').value = 'Подростковый триллер-инструкция о правилах на тонком льду, 12–16 лет'; $('#q2').value = 'YouTube и TikTok, потом показы в школах Казахстана'; $('#q3').value = 'Голос диктора, который говорит с подростком как с равным, и честность про страх'; $('#q4').value = 'Автор — студия «3%», права у студии'; }));
    $$('.mic').forEach((b) => voice(b, (t) => { const i = $('#' + b.dataset.for); i.value = (i.value ? i.value + ' ' : '') + t; }));
    $('#modes').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('#modes .chip').forEach((c) => c.classList.toggle('on', c === b)); });
    $('#run').addEventListener('click', async () => {
      const text = ta.value.trim(); if (text.length < 300) { toast('Вставьте сценарий, хотя бы несколько сцен'); return; }
      const pasport = { o_chem: $('#q1').value, gde: $('#q2').value, ne_trogat: $('#q3').value, avtor_prava: $('#q4').value };
      const rezhim = $('#modes .chip.on').textContent;
      $('#run').disabled = true;
      try {
        const telo = { text, pasport, rezhim }; if (S.kinoPovtor) telo.povtor_ot = S.kinoPovtor;   // новая версия своего оплаченного разбора — по цене повтора
        const r = await api('/api/scenariy/razbor', telo);
        S.kinoPovtor = null;
        S.job = { id: r.id, done: false }; store.set('job', S.job);
        pollJob(r.id);
      } catch (e) { toast(e.message); $('#run').disabled = false; }
    });
  }
  // ---------- Живая карта команды: слои, передача находок, вопросы соседу, лента ----------
  const SLOJ_IMYA = { 1: 'ядро', 2: 'скелет', 3: 'ткань', 4: 'рынок и риски', 5: 'синтез', 6: 'ходы' };
  function glavnoe(r) {
    if (!r || typeof r !== 'object') return '';
    for (const [k, v] of Object.entries(r)) {
      if (k.startsWith('_') || !Array.isArray(v)) continue;
      const x = v.find((y) => y && typeof y === 'object');
      if (!x) continue;
      const t = x.sut || x.chto || x.pochemu || x.povorot || x.risk || x.kommentarij || x.nazvanie || x.slabo || '';
      if (t) return (x.scena ? 'сц. ' + x.scena + ': ' : '') + t;
    }
    return r.itog || r.kontrakt || r.zhanr || '';
  }
  function nahodok(r) {
    if (!r || typeof r !== 'object') return 0;
    let n = 0; for (const [k, v] of Object.entries(r)) if (!k.startsWith('_') && Array.isArray(v)) n += v.filter((x) => x && typeof x === 'object').length;
    return n;
  }
  const slov = (n) => n % 10 === 1 && n % 100 !== 11 ? 'находка' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'находки' : 'находок');
  function feedPush(st, k, name, text, kind) { st.feed.push({ k, name, text: String(text || '').slice(0, 220), kind: kind || '', t: Math.round((Date.now() - st.t0) / 1000) }); }
  function soobshcheniya(j, st, k, a) {
    const r = (j.results || {})[k] || {};
    if (k === 'serdce') feedPush(st, k, a.name, 'передал всей команде зеницу: ' + arr(j.zenica).length + ' пунктов, которые нельзя трогать', 'all');
    else if (k === 'showrunner') feedPush(st, k, a.name, `собрал речь команды: ${arr(r.pravki).length} правок, ${arr(r.protivorechiya).length} споров разобрано, ${arr(r.voprosy_avtoru).length} вопросов вам`, 'all');
    else { const n = nahodok(r); feedPush(st, k, a.name, (n ? n + ' ' + slov(n) + ' → следующему слою. ' : 'передал выводы. ') + glavnoe(r)); }
    const vs = r.vopros_sosedu;
    if (vs && vs.vopros) { const komuImya = (j.agents[vs.komu] || {}).name || vs.komu; feedPush(st, k, a.name, 'спрашивает ' + komuImya + ': «' + vs.vopros + '»', 'q'); st.q.push([k, vs.komu]); }
  }
  function teamBoard(j, st) {
    const box = $('#flow'); if (!box) return;
    const ags = Object.entries(j.agents || {});
    if (!st.built) {
      const sloi = {}; ags.forEach(([k, a]) => { (sloi[a.sloj || 0] = sloi[a.sloj || 0] || []).push([k, a]); });
      const L = Object.keys(sloi).map(Number).sort((x, y) => x - y);
      $('#flowcols').innerHTML = L.map((l, i) => `<div class="fcol"><span class="fl">${l ? l + ' · ' : ''}${esc(SLOJ_IMYA[l] || '')}</span>${i === 0 ? '<div class="fnode" data-k="chitatel" data-s="готово"><i></i><b>Читатель</b><small>карта сцен · код</small><span class="fn">сцены и минуты</span></div>' : ''}${sloi[l].map(([k, a]) => `<div class="fnode${k === 'kritik' ? ' blind' : ''}" data-k="${esc(k)}" data-s="${esc(a.state)}"><i></i><b>${esc(a.name)}</b><small>${esc(a.role)}</small><span class="fn"></span></div>`).join('')}</div>`).join('');
      st.built = true; st.sloj = Object.fromEntries(ags.map(([k, a]) => [k, a.sloj || 0])); st.sloi = L;
      feedPush(st, 'chitatel', 'Читатель', j.chitatel ? `разметил ${j.chitatel.scen} сцен и героев — карта ушла всей команде` : 'размечает сцены', 'all');
    }
    ags.forEach(([k, a]) => {
      const n = box.querySelector(`.fnode[data-k="${k}"]`); if (!n) return;
      n.dataset.s = a.state;
      const c = nahodok((j.results || {})[k]);
      n.querySelector('.fn').textContent = a.state === 'работает' ? (k === 'kritik' ? 'читает вслепую…' : 'читает доску и пишет…')
        : (a.state === 'готово' || a.state === 'частично') ? (c ? c + ' ' + slov(c) : 'готово') + (a.sec ? ' · ' + a.sec + ' с' : '')
          : a.state === 'ошибка' ? 'не ответил' : 'ждёт свой слой';
      const was = st.prev[k];
      if (was !== a.state) {
        st.prev[k] = a.state;
        if (a.state === 'работает') feedPush(st, k, a.name, k === 'kritik' ? 'начал вслепую: видит только сценарий и ваши ответы' : st.sloj[k] === 1 ? 'читает сценарий и ваши ответы' : 'получил доску прошлых слоёв, начал работу');
        if (a.state === 'готово' || a.state === 'частично') soobshcheniya(j, st, k, a);
        if (a.state === 'ошибка') feedPush(st, k, a.name, 'не ответил — команда идёт дальше без него', 'err');
      }
    });
    drawEdges(st, j);
    const f = $('#tfeed');
    if (f) f.innerHTML = st.feed.slice().reverse().slice(0, 40).map((m) => `<li class="${m.kind}"><span class="av" data-sl="${st.sloj[m.k] || 0}">${esc(m.name.slice(0, 1))}</span><div><b>${esc(m.name)}</b> <span class="dim">+${m.t} с</span><p>${esc(m.text)}</p></div></li>`).join('');
  }
  function drawEdges(st, j) {
    const box = $('#flow'); if (!box || !st.sloi) return;
    const svg = box.querySelector('.flow-svg'); const B = box.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${B.width} ${B.height}`);
    const node = (k) => box.querySelector(`.fnode[data-k="${k}"]`);
    const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - B.left, r: r.right - B.left, t: r.top - B.top, b: r.bottom - B.top, cx: (r.left + r.right) / 2 - B.left, cy: (r.top + r.bottom) / 2 - B.top }; };
    const ks = (l) => Object.keys(st.sloj).filter((k) => st.sloj[k] === l);
    const pairs = [['chitatel', ks(st.sloi[0])[0]]];
    st.sloi.forEach((l, i) => { const nx = st.sloi[i + 1]; if (nx == null) return; ks(l).forEach((a) => { if (a === 'kritik') return; ks(nx).forEach((b) => { if (b !== 'kritik') pairs.push([a, b]); }); }); });
    if (st.sloj.kritik && st.sloj.showrunner) pairs.push(['kritik', 'showrunner']);   // слепая оценка Критика идёт прямо в синтез и формулу балла
    const path = (s, t) => {
      if (t.l >= s.r - 4) { const dx = Math.max(24, (t.l - s.r) / 2); return `M${s.r},${s.cy} C${s.r + dx},${s.cy} ${t.l - dx},${t.cy} ${t.l},${t.cy}`; }
      const dy = Math.max(16, (t.t - s.b) / 2); return `M${s.cx},${s.b} C${s.cx},${s.b + dy} ${t.cx},${t.t - dy} ${t.cx},${t.t}`;
    };
    const stt = (k) => (node(k) || {}).dataset ? node(k).dataset.s : '';
    let html = '';
    pairs.forEach(([a, b]) => {
      const na = node(a), nb = node(b); if (!na || !nb) return;
      const sa = stt(a), sb = stt(b);
      const cls = sb === 'работает' && (sa === 'готово' || sa === 'частично') ? 'flowing' : (sa === 'готово' || sa === 'частично') && (sb === 'готово' || sb === 'частично') ? 'done' : 'idle';
      html += `<path class="e ${cls}" d="${path(rect(na), rect(nb))}"/>`;
    });
    st.q.forEach(([a, b]) => {
      const na = node(a), nb = node(b); if (!na || !nb) return;
      const s = rect(na), t = rect(nb);
      if (Math.abs(s.cx - t.cx) < 30) {   // соседи по одному слою — дуга сбоку, слева от столбца
        const bx = Math.max(4, Math.min(s.l, t.l) - 34);   // на узком экране дуга не уходит за край
        html += `<path class="e ask" d="M${s.l},${s.cy} C${bx},${s.cy} ${bx},${t.cy} ${t.l},${t.cy}" marker-end="url(#ah)"/>`;
      } else {
        const top = Math.min(s.t, t.t) - 28;
        html += `<path class="e ask" d="M${s.cx},${s.t} Q${(s.cx + t.cx) / 2},${top} ${t.cx},${t.t}" marker-end="url(#ah)"/>`;
      }
    });
    svg.innerHTML = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahd"/></marker></defs>' + html;
  }
  function pollJob(id) {
    let first = true; let fails = 0; const token = S.pollToken;
    const st = { built: false, prev: {}, feed: [], t0: Date.now(), q: [] };
    const onResize = () => { if ($('#flow')) drawEdges(st); else removeEventListener('resize', onResize); };
    addEventListener('resize', onResize);
    const tick = async () => {
      if (token !== S.pollToken || !$('#sc')) return;
      let j; try { j = await api('/api/scenariy/razbor/' + id); } catch (e) { if (token !== S.pollToken || !$('#sc')) return; fails++; if (fails < 5 && !/нет такой/.test(e.message)) { setTimeout(tick, 3000); return; } $('#sc').innerHTML = `<div class="warn"><b>Задача потеряна:</b> ${esc(e.message)}</div><p style="margin-top:12px"><button class="btn sm" id="again">Начать заново</button></p>`; $('#again').onclick = () => { S.job = null; store.set('job', null); route(); }; return; }
      if (token !== S.pollToken || !$('#sc')) return;
      if (first) { first = false; $('#sc').innerHTML = `<div class="steps"><span class="done">1 · Сценарий</span><span class="done">2 · Четыре вопроса</span><span class="on">3 · Разбор</span><span>4 · Отчёт</span></div>
        <section style="margin-bottom:18px"><h2>Команда работает по слоям</h2><p class="dim small" style="margin-top:6px">Каждый следующий слой получает находки предыдущих. Критик оценивает вслепую. Линии показывают, кто кому передаёт.</p><div class="chitatel" id="chit" style="margin-top:10px"></div></section>
        <div class="flow" id="flow"><svg class="flow-svg" aria-hidden="true"></svg><div class="flow-cols" id="flowcols"></div></div>
        <div class="tfeed-wrap"><span class="caps">Лента команды</span><ol class="tfeed" id="tfeed"></ol></div><p class="dim small" style="margin-top:14px" id="jmeta"></p>`; }
      if (j.chitatel) $('#chit').innerHTML = `<span>Читатель: <b>${j.chitatel.scen}</b> сцен</span><span><b>${j.chitatel.stranic}</b> стр ≈ <b>${j.chitatel.minut}</b> мин</span><span>героев: <b>${j.chitatel.geroi.length}</b></span><span>режим: <b>${esc(j.rezhim)}</b></span>`;
      teamBoard(j, st);
      $('#jmeta').textContent = 'потрачено ' + j.kredity + ' кр';
      if (j.done) { S.job = j; store.set('job', j); if (!S.spentJobs[j.id]) { S.spentJobs[j.id] = 1; store.set('spentJobs', S.spentJobs); spend(j.kredity, j.ostatok); loadMe(); /* 09.11: ostatok задачи мог устареть — шапку сверяем с /api/me */ } setTimeout(() => { if (token === S.pollToken) renderReport(j); }, 900); return; }
      setTimeout(tick, 1500);
    };
    tick();
  }
  // метка сцены в отчёте: номер («3», «3–5»), либо короткое имя блока из «не размечено (блок «…», фраза «…»)»; нет ни того ни другого — ''.
  // Те же помощники использует otchet.js (через window.JASA) — одна копия, чтобы правила не разошлись.
  const dotfix2 = (x) => String(x == null ? '' : x).replace(/\.{2,}/g, (m, off, str) => (m.length === 2 && !(/\d/.test(str[off - 1] || '') && /\d/.test(str[off + 2] || '')) ? '.' : m));   // «китом..» → «китом.»; «…» и «3..5» не трогаем
  const slej2 = (a, b) => { a = String(a || '').trim(); b = String(b || '').trim(); return b ? (a ? a.replace(/\.+$/, '') + '. ' : '') + b : a; };
  const urezat = (x, n) => (x.length > n ? x.slice(0, n - 1).replace(/[\s,;:.\-–—]+\S*$/, '').replace(/[\s,;:.\-–—]+$/, '') + '…' : x);
  const blokName = (x) => {
    let s0 = String(x == null ? '' : x).trim(); if (!s0 || /^[—–-]$/.test(s0)) return '';
    s0 = s0.replace(/^сц(ена|\.)?\s*/i, '').trim();
    const mb = s0.match(/блок[а-я]*\s*[«"]([^»"]+)[»"]/i);
    if (/^не размечен|^\(/i.test(s0)) return mb ? urezat(mb[1].trim(), 30) : '';   // фразу реплики вместо блока не берём
    if (s0.length > 30) return mb ? urezat(mb[1].trim(), 30) : urezat(s0, 30);
    return s0;
  };
  const scTxt = (x, tail) => { const l = blokName(x); return l ? (/^\d/.test(l) ? 'Сц. ' + l : l) + (tail || '') : ''; };
  function renderReport(j) {
    const sr = j.showrunner || {}; const R = j.results || {};
    // «P15» в тексте правок → подсказка с сутью замечания (реестр j.problemy)
    const pid = (v) => { const m = String(v == null ? '' : v).match(/^\s*[PРpр]?\s*(\d{1,3})\s*$/); return m ? 'P' + m[1] : ''; };   // «P15», «Р15» (кириллица), «p15», 15 → P15
    const REG = {}; arr(j.problemy).forEach((x) => { const k = x && pid(x.id); if (k) REG[k] = x; });
    const kto = (x) => ((j.agents && j.agents[x.kto] && j.agents[x.kto].name) || x.kto || 'помощник');
    const pref = (txt) => esc(dotfix2(txt)).replace(/\b[PР](\d{1,3})\b/g, (m, n) => { const x = REG['P' + n]; return x ? `<abbr class="pref" tabindex="0" role="button" data-tip="${esc('P' + n + ' · ' + kto(x) + ': ' + x.sut)}" title="${esc(kto(x) + ': ' + x.sut)}">${m}</abbr>` : m; });
    const ry = arr(R.rynochnik && R.rynochnik.leyery); const best = Math.max(...ry.map((l) => +l.ball || 0), 0);
    const kr = R.kritik || {}; const zen = arr(R.serdce && R.serdce.zenica);
    const B = j.ball || {}; const ball = B.tekst != null ? +B.tekst : (+sr.ball || +kr.obshchiy || 0);
    const CH = { syuzhet: 'сюжет', geroi: 'герой', dialog: 'диалог', premisa: 'премиса', mir: 'мир', polza: 'польза' };
    const RP = { kz: 'Казахстан', asia: 'Азия', stream: 'стриминги', eu: 'фестивали', vse: 'среднее по рынкам' };
    const otbr = Object.values(j.proverka || {}).reduce((a, x) => a + (+x.otbrosheno || 0), 0);
    const chasti = Object.entries(B.chasti || {}).filter(([, v]) => v != null).map(([k, v]) => `<span class="${arr(B.potolok).includes(k) ? 'low' : ''}">${CH[k]} <b>${esc(v)}</b></span>`).join('');
    const cenaObl0 = Math.round((S.ceny && S.ceny.image) || 12);
    const obloshkaHtml = j.oblozhka && j.oblozhka.image
      ? `<div class="obl rv"><img src="${esc(API_BASE + j.oblozhka.image)}" alt="Обложка по смыслу сценария" loading="lazy" crossorigin="anonymous"><span class="dim small">Обложка по смыслу сценария — первая страница «Уникального» PDF</span></div>` : '';
    const plashka = main.querySelector('.pill[title^="Резерв"]'); if (plashka) plashka.remove();   // цена разбора на отчёте не нужна (отчёт мог открыться сразу после разбора)
    const imyaSc = String((j.pasport && j.pasport.o_chem) || 'Ваш сценарий').split(/[:.!?]/)[0].trim();
    const vPdf = 'Оценка, зеница ока, правки, рынки, карта ошибок' + (Object.keys(REG).length ? ' и реестр замечаний P' + Math.min(...Object.keys(REG).map((k) => +k.slice(1))) + '–P' + Math.max(...Object.keys(REG).map((k) => +k.slice(1))) : '') + '. Обложка типографская, входит в разбор.';
    const estObl = j.oblozhka && j.oblozhka.image;
    const dataRu = j.started ? new Date(j.started * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
    $('#sc').innerHTML = `<div class="otch-head" style="display:flex;gap:12px 18px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;margin:-6px 0 18px">
        <div style="min-width:0;flex:1 1 300px"><div class="dim small">Разбор${dataRu ? ' от ' + esc(dataRu) : ''} · балл ${esc(ball.toFixed(1).replace('.', ','))}</div><div style="font:600 clamp(1.2rem,1rem + .8vw,1.55rem)/1.25 var(--disp,inherit);margin-top:4px" title="${esc((j.pasport && j.pasport.o_chem) || '')}">${esc(imyaSc.length > 90 ? imyaSc.slice(0, 90).replace(/\s\S*$/, '') + '…' : imyaSc)}</div></div>
        <div style="display:flex;gap:8px;align-items:center"><details class="oh-skachat" style="position:relative"><summary class="btn sm" style="list-style:none;cursor:pointer">Скачать ▾</summary><div class="card" style="position:absolute;right:0;z-index:6;margin-top:6px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:260px"><button class="btn sm quiet" id="otchet" type="button" title="${esc(vPdf)}" style="justify-content:flex-start">PDF отчёта</button><button class="btn sm quiet" id="otchet-u" type="button" style="justify-content:flex-start" title="${estObl ? 'Первая страница — картинка по смыслу сценария, уже готова' : 'Первая страница — картинка по смыслу сценария, платите один раз'}">${estObl ? 'PDF с обложкой' : 'PDF с обложкой · ' + cenaObl0 + ' кр'}</button></div></details><button class="btn sm quiet" id="newrun" type="button">Новый разбор</button></div>
      </div>
      <div id="uluch-akcii" style="margin:0 0 22px"></div>
      <div class="report">
        ${obloshkaHtml}${otbr ? `<p class="dim small rv">Проверка по тексту: ${otbr} ${otbr === 1 ? 'находка без настоящей цитаты убрана' : 'находки без настоящих цитат убраны'}.</p>` : ''}${Object.keys(j.errors || {}).length ? `<div class="warn rv"><b>Отчёт неполный:</b> ${Object.entries(j.errors).map(([k, v]) => esc((j.agents[k] && j.agents[k].name) || k) + ' — ' + esc(v)).join(' · ')}</div>` : ''}
        <div class="card score rv"><div class="ring" style="--v:${ball * 10}"><b>${ball.toFixed(1)}<small>/10</small></b><em>текст</em></div><div><span class="caps" title="${esc(j.kredity + ' кр · ' + (j.sec || '') + ' с' + (j.zoloto ? ' · золотой v' + j.zoloto : ''))}">Режим · ${esc(j.rezhim)}</span>
          ${B.rynok != null ? `<div class="rynok">${B.rynok_luchshij ? 'Лучший рынок' : 'Рынок'} · ${esc(B.rynok_imya || RP[B.rynok_po] || B.rynok_po)}: <b>${esc(B.rynok)}</b>/10</div>` : ''}
          ${chasti ? `<div class="chasti">${chasti}</div>` : ''}${B.razbros && Object.keys(B.razbros).length ? `<p class="dim small" style="margin:6px 0 0">Критик оценивал дважды независимо, в балл — среднее; наибольший разброс ${esc(Math.max(...Object.values(B.razbros)))}.</p>` : ''}${arr(B.potolok).length ? `<p class="small" style="margin:6px 0 0"><b>Потолок 7:</b> ${arr(B.potolok).map((k) => CH[k]).join(', ')} ниже 5 — остальное это не перекрывает.</p>` : ''}<h2 style="margin:6px 0 10px;font-size:var(--fs-title)">${esc((j.pasport && j.pasport.o_chem) || 'Ваш сценарий')}</h2><p>${esc(sr.odnim_abzacem || '')}</p></div></div>
        <div class="zen rv"><span class="caps" style="opacity:.6;color:inherit">Зеница ока · не трогаем</span><h3>Что делает этот сценарий вашим</h3><ol>${zen.map((z) => `<li><b>${esc(z.chto)}</b><span>${esc(z.gde)} — ${esc(z.pochemu)}</span></li>`).join('')}</ol>${R.serdce && R.serdce.chelovechnost ? `<div class="chel">${esc(R.serdce.chelovechnost)}</div>` : ''}${R.serdce && R.serdce.rashozhdenie_s_avtorom ? `<p class="small" style="margin-top:10px;opacity:.85"><b>Сверка с вами:</b> ${esc(R.serdce.rashozhdenie_s_avtorom)}</p>` : ''}</div>
        ${arr(sr.chto_rabotaet).length ? `<div class="card rv"><span class="caps">Что работает · это беречь</span><ul class="good">${arr(sr.chto_rabotaet).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <div class="card rv"><span class="caps">Предикт по рынкам</span><div class="layers" style="margin-top:14px">${ry.map((l) => `<div class="lay"><span>${esc(l.nazvanie)}</span><div class="bar"><i class="${+l.ball === best ? 'top' : ''}" data-w="${(+l.ball || 0) * 10}"></i></div><span class="n">${esc(l.ball)}</span><details><summary>почему и что изменить</summary>${esc(l.pochemu)}<ul>${arr(l.izmenit).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><span class="dim">${arr(l.referensy).map(esc).join(' · ')}</span></details></div>`).join('')}</div>
          ${R.rynochnik && R.rynochnik.kz_osobo ? `<dl class="kv"><dt>Госфонд</dt><dd>${esc(R.rynochnik.kz_osobo.gosfond)}</dd><dt>Код</dt><dd>${esc(R.rynochnik.kz_osobo.kod)}</dd><dt>Язык</dt><dd>${esc(R.rynochnik.kz_osobo.yazyk)}</dd><dt>Рейтинг</dt><dd>${esc(R.rynochnik.kz_osobo.reyting)}</dd></dl>` : ''}
          ${R.rynochnik && R.rynochnik.luchshiy ? `<p class="small" style="margin-top:12px"><b>Лучший лейер:</b> ${esc(R.rynochnik.luchshiy)}</p>` : ''}</div>
        <div class="card rv"><span class="caps">Топ правок · принимайте каждую отдельно</span><div class="fixes" style="margin-top:12px">${arr(sr.pravki).map((p) => `<div class="fix ${p.vazhnost === 'вторая' ? 'second' : ''}"><span class="n">${esc(p.n)}</span><div><b>${scTxt(p.scena, ' · ') ? esc(scTxt(p.scena, ' · ')) : ''}${pref(p.chto)}</b>${p.vazhnost ? ` <span class="tagv">${esc(p.vazhnost)}</span>` : ''}<p>${pref(p.zachem)}</p><div class="ef ${p.konflikt && p.konflikt !== 'нет' ? 'q' : ''}">${esc(p.effekt)}${p.konflikt !== 'нет' ? ' · ' + (p.konflikt === 'не проверено' ? 'конфликт не проверен' : 'задевает ' + esc(p.konflikt)) + ' — вопрос автору' : ''}</div></div><div class="ok"><button ${p.konflikt !== 'нет' ? 'disabled title="Задевает зеницу ока или не проверено — сначала ответ автора"' : ''} class="yes ${S.accepted[j.id + ':' + p.n] === 1 ? 'on' : ''}" data-k="${esc(j.id + ':' + p.n)}" data-v="1" title="Принять"><svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-check"/></svg></button><button class="no ${S.accepted[j.id + ':' + p.n] === 0 ? 'on' : ''}" data-k="${esc(j.id + ':' + p.n)}" data-v="0" title="Отклонить"><svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-x"/></svg></button></div></div>`).join('')}</div>
          ${arr(sr.protivorechiya).length ? `<div class="contra"><span class="caps">Где помощники не согласны</span>${arr(sr.protivorechiya).map((c) => `<p class="small"><b>${esc(c.kto)}</b> — ${esc(c.sut)}<br><span class="dim">Решение: ${pref(slej2(c.reshenie, c.pochemu))}</span></p>`).join('')}</div>` : ''}
          ${arr(sr.voprosy_avtoru).length ? `<div class="warn" style="margin-top:14px"><b>Вопросы автору:</b> ${arr(sr.voprosy_avtoru).map(esc).join(' · ')}</div>` : ''}
          <p class="dim small" style="margin-top:12px">Отметьте правки ✓ или ✕ — затем «Улучшить сценарий» вверху соберёт версию 2.</p></div>
        <div class="card rv"><span class="caps">Критик · три голоса</span><div class="voice3" style="margin-top:12px">${['otborshchik', 'redaktor', 'zritel'].map((k, i) => kr[k] ? `<div class="v3"><small>${['Отборщик', 'Редактор', 'Зритель'][i]}</small><b>${esc(kr[k].ball)}</b><p>${esc(kr[k].slovo)}</p></div>` : '').join('')}</div>${kr.odno ? `<p class="small" style="margin-top:12px"><b>Одно, что поменял бы критик:</b> ${esc(kr.odno)}</p>` : ''}</div>
        <div class="card rv"><span class="caps">Логик · карта ошибок</span><div style="margin-top:8px">${j.errors && j.errors.logik ? `<p class="warn">Логик не ответил: ${esc(j.errors.logik)}</p>` : ''}${arr(R.logik && R.logik.oshibki).map((o) => `<div class="err"><span class="s">${esc(scTxt(o.scena) || '—')}</span><div><b>${esc(o.tip)} · ${esc(o.sereznost)}</b><br>${esc(o.sut)}<br><i>${(o.kak || []).map(esc).join(' / ')}</i></div></div>`).join('') || (j.errors && j.errors.logik ? '' : '<p class="muted small">Ошибок не найдено.</p>')}</div></div>
        <div class="card rv"><span class="caps">Жанрист · референсы</span><p class="small muted" style="margin:8px 0 12px">${esc((R.zhanrist && (R.zhanrist.zhanr + ' · ' + R.zhanrist.podzhanr + ' · ' + (R.zhanrist.ton || []).join(', '))) || '')}</p><div class="refs">${arr(R.zhanrist && R.zhanrist.referensy).map((r) => `<div class="ref"><b>${esc(r.nazvanie)}</b><small>${esc(r.god)} · ${esc(r.strana)}</small><p>${esc(r.chem_pohozh)}</p><p class="dim">${esc(r.kak_proshel)}</p></div>`).join('')}</div></div>
        ${R.scenovik ? `<div class="card rv"><span class="caps">Сценовик · каждая сцена</span><p class="small muted" style="margin-top:8px">${esc(R.scenovik.itog || '')}</p>${arr(R.scenovik.bez_povorota).map((z) => `<p class="small" style="margin-top:8px"><b>${esc(scTxt(z.scena) || 'Общее')} · без поворота</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}${arr(R.scenovik.vhod_vyhod).map((z) => `<p class="small" style="margin-top:8px"><b>${esc(scTxt(z.scena) || 'Общее')}</b> · ${esc(z.sovet)}</p>`).join('')}</div>` : ''}
        <div class="card rv"><span class="caps">Миксер · а что если</span><div class="mix" style="margin-top:12px">${arr(R.mikser && R.mikser.varianty).map((v) => `<div class="mixv">${v.k_pravke && v.k_pravke !== '—' ? `<small class="dim">к правке ${esc(v.k_pravke)}</small>` : ''}<b>${esc(v.nazvanie)}</b><p>${esc(v.sut)}</p><p class="dim">сохраняется: ${esc(v.sohranyaetsya)} · риск: ${esc(v.risk)}</p></div>`).join('')}</div></div>
        <div class="two"><div class="card rv"><span class="caps">Персонажник</span>${arr(R.personazhnik && R.personazhnik.geroi).map((g) => `<p class="small" style="margin-top:10px"><b>${esc(g.imya)}</b> — ${esc(g.zhelanie)} / нужда: ${esc(g.nuzhda)}<br><span class="dim">${esc(g.arka)} · ${esc(g.slabo)}</span></p>`).join('')}<p class="small muted" style="margin-top:10px">${esc((R.personazhnik && R.personazhnik.test_imen) || '')}</p></div>
        <div class="card rv"><span class="caps">Страж · риски и рейтинг</span><p class="small" style="margin-top:8px"><b>${esc((R.strazh && R.strazh.reyting) || '')}</b></p>${arr(R.strazh && R.strazh.riski).map((r) => `<p class="small" style="margin-top:8px"><b>${esc(scTxt(r.scena) || 'Общее')}</b> · ${esc(r.risk)}<br><span class="dim">${esc(r.smyagchit)}</span></p>`).join('')}
          ${arr(R.strazh && R.strazh.fakty).length ? `<span class="caps" style="display:block;margin-top:18px">Факты и советы · проверка</span>${arr(R.strazh.fakty).map((f) => `<p class="small" style="margin-top:8px"><b>${esc(scTxt(f.scena) || 'Общее')}</b> · «${esc(f.citata)}»<br><span class="${/сверить/.test(f.status) ? '' : 'dim'}">${esc(f.status)}</span> <span class="dim">${esc(f.kommentarij)}</span></p>`).join('')}` : ''}
          <span class="caps" style="display:block;margin-top:18px">Продюсер</span><p class="small" style="margin-top:6px"><b>${esc((R.prodyuser && R.prodyuser.kategoriya) || '')}</b> · ${R.prodyuser && R.prodyuser.ii_proizvodstvo ? `кадров ${esc(R.prodyuser.ii_proizvodstvo.kadrov)}, видео ${esc(R.prodyuser.ii_proizvodstvo.video_sekund)} с · ${esc(R.prodyuser.ii_proizvodstvo.zamechanie)}` : ''}</p></div></div>
        ${R.yazykoved ? `<div class="card rv"><span class="caps">Языковед · речь RU/KZ</span><p class="small" style="margin-top:8px">${esc(R.yazykoved.dvuyazychie || '')}</p>${arr(R.yazykoved.zamechaniya).map((z) => `<p class="small" style="margin-top:8px"><b>${esc(scTxt(z.scena) || 'Общее')}</b> · ${esc(z.chto)}: «${esc(z.replika)}» <span class="dim">→ ${esc(z.kak)}</span></p>`).join('')}</div>` : ''}
        ${R.arhitektor ? `<div class="card rv"><span class="caps">Архитектор · структура</span><p class="small" style="margin-top:8px">${esc(R.arhitektor.hronometrazh || '')}</p>${arr(R.arhitektor.zatyanuto).map((z) => `<p class="small" style="margin-top:8px"><b>Затянуто${scTxt(z.scena) ? ' · ' + esc(scTxt(z.scena)) : ''}</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}${arr(R.arhitektor.skomkano).map((z) => `<p class="small" style="margin-top:8px"><b>Скомкано${scTxt(z.scena) ? ' · ' + esc(scTxt(z.scena)) : ''}</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}</div>` : ''}
        ${(() => { const st2 = { feed: [], t0: Date.now(), q: [], sloj: Object.fromEntries(Object.entries(j.agents || {}).map(([k, a]) => [k, a.sloj || 0])) };
          Object.entries(j.agents || {}).sort((a, b) => (a[1].sloj || 0) - (b[1].sloj || 0)).forEach(([k, a]) => { if (a.state === 'готово' || a.state === 'частично') soobshcheniya(j, st2, k, a); });
          return st2.feed.length ? `<details class="card rv team-log"><summary><span class="caps">Как работала команда · ${st2.feed.length} передач</span></summary><ol class="tfeed">${st2.feed.map((m) => `<li class="${m.kind}"><span class="av" data-sl="${st2.sloj[m.k] || 0}">${esc(m.name.slice(0, 1))}</span><div><b>${esc(m.name)}</b> <span class="dim">слой ${esc(st2.sloj[m.k] || '')}</span><p>${esc(m.text)}</p></div></li>`).join('')}</ol></details>` : ''; })()}
        ${arr(sr.plan_v2).length ? `<div class="card rv"><span class="caps">План версии 2</span><ol style="margin:10px 0 0;padding-left:20px">${arr(sr.plan_v2).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>${sr.rezhim_otvet ? `<p class="small muted" style="margin-top:12px">${esc(sr.rezhim_otvet)}</p>` : ''}</div>` : ''}
      </div>`;
    $$('.rv', $('#sc')).forEach((n, i) => (n.style.animationDelay = Math.min(i * 120, 1500) + 'ms'));
    setTimeout(() => $$('.lay .bar i').forEach((i) => (i.style.width = i.dataset.w + '%')), 300);
    if (window.JASA_ULUCHSHIT) window.JASA_ULUCHSHIT.knopka(j, $('#uluch-akcii'));   // «Улучшить сценарий» — модуль uluchshit.js, цена по хронометражу
    $('#sc').addEventListener('click', (e) => { const a = e.target.closest('abbr.pref'); if (a && a.dataset.tip) toast(a.dataset.tip.slice(0, 260)); });
    $('#newrun').addEventListener('click', () => { S.kinoPovtor = null; S.job = null; store.set('job', null); renderIntake(); });
    const kp2 = S.ceny && S.ceny.kino && +S.ceny.kino.povtor ? S.ceny.kino : null;
    const svezhij = kp2 && j.started && (Date.now() / 1000 - (+j.started || 0)) < (+kp2.povtor_dnej || 30) * 86400 && (!j.paket || j.paket === 'razbor' || j.paket === 'povtor');
    if (svezhij && $('#newrun')) {
      const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'btn sm'; pb.id = 'povtor'; pb.textContent = 'Новая версия · ' + kp2.povtor + ' кр'; pb.title = 'Повторный разбор после правок — дешевле, пока этому разбору меньше ' + (kp2.povtor_dnej || 30) + ' дней';
      $('#newrun').before(pb);
      pb.addEventListener('click', () => { S.kinoPovtor = j.id; S.job = null; store.set('job', null); renderIntake(); toast('Вставьте новую версию сценария — разберём за ' + kp2.povtor + ' кр'); });
    }
    $('#otchet').addEventListener('click', (e) => { if (window.JASA_OTCHET) window.JASA_OTCHET.skachat(j, e.currentTarget, { standart: true }); else toast('Обновите страницу — модуль отчёта не загрузился'); });
    const ou = $('#otchet-u'); if (ou) ou.addEventListener('click', async (e) => {   // «Уникальный»: обложка один раз (12 кр), дальше PDF с ней бесплатно
      const b = e.currentTarget;
      if (!window.JASA_OTCHET) { toast('Обновите страницу — модуль отчёта не загрузился'); return; }
      if (!(j.oblozhka && j.oblozhka.image)) {
        if (S.me && S.me.guest) { toast('PDF с обложкой — после входа через Telegram'); location.hash = '#/kabinet'; return; }
        const o = b.textContent; b.disabled = true; b.innerHTML = '<span class="spin"></span> Рисую обложку, до минуты…';
        try { const r = await api('/api/scenariy/oblozhka', { id: j.id }); j.oblozhka = { image: r.image }; S.job = j; store.set('job', j); if (r.kredity) spend(r.kredity, r.ostatok); hap('success'); }
        catch (er) { toast(er.message); b.disabled = false; b.textContent = o; hap('error'); return; }
        renderReport(j); const nb = $('#otchet-u'); if (nb) window.JASA_OTCHET.skachat(j, nb, {}); return;
      }
      window.JASA_OTCHET.skachat(j, b, {});
    });
    $('#sc').addEventListener('click', (e) => { const b = e.target.closest('.ok button'); if (!b) return; S.accepted[b.dataset.k] = +b.dataset.v; store.set('accepted', S.accepted); $$('.ok button', b.parentElement).forEach((x) => x.classList.toggle('on', x === b)); });
  }

  // =====================================================================
  // БИБЛИОТЕКА, ТАРИФЫ
  // =====================================================================
  function biblioteka() {
    main.innerHTML = topbar('Библиотека', '<a class="pill" href="#/kabinet">Кабинет →</a> <a class="pill" href="#/tarify">Цены →</a>') + `
      <section style="max-width:760px"><h2>Мои посты</h2><p class="muted" style="margin-top:10px">Последние тексты, картинки и ролики — хранятся в этом браузере${S.me && !S.me.guest ? '; то, что отправляли себе в Telegram, лежит и там' : ''}.</p></section>
      <div class="feed" style="margin-top:22px;margin-bottom:34px" id="lib"></div>
      <section class="depo" id="depo">
        <div class="dhead"><div><span class="caps">Мои примеры</span><h2 style="margin:6px 0 8px">Картинки-образцы</h2><p class="muted small" style="max-width:640px">Загрузите 3–5 картинок, на которые хотите быть похожими по настроению. JASA разберёт свет, план и цвета и передаст их художникам в следующий пост — сюжет не копируется. Чужие лица и логотипы не загружайте.</p></div></div>
        <div class="drop" id="drop"><input type="file" id="dfile" accept="image/*" multiple class="hide"><b>Перетащите картинки или нажмите, чтобы выбрать</b><span class="dim small">JPEG, PNG, WebP · цвета бесплатно · <label class="chk"><input type="checkbox" id="dread" checked> разобрать картинку · до ${esc(S.ceny.depo_prochitat || 2)} кр</label></span></div>
        <div class="dtools"><input id="dq" placeholder="Поиск своими словами: ночь, крупный план, тёплый свет, еда…"><span class="dim small" id="dcnt"></span><button class="btn sm accent ${S.stil.length ? '' : 'hide'}" id="dgo">Сделать пост в этом стиле →</button></div>
        <div class="dgrid" id="dgrid"></div>
      </section>`;
    depoInit();
    S.feed.slice().reverse().forEach((i) => $('#lib').appendChild(sheet(i)));
    if (!S.feed.length) $('#lib').innerHTML = '<p class="muted">Пока пусто.</p>';
  }
  // ---------- Депо: загрузка, палитра в браузере, чтение кадра, поиск, «взять стиль» ----------
  let DEPO = [];
  const authGen = () => (TG ? 'tg' : 'ses:' + (S.session || ''));   // смена аккаунта = другое поколение
  function depoInit() {
    const drop = $('#drop'); const fi = $('#dfile');
    if (!S.me || S.me.guest) {
      if (!TG && !S.session) { drop.innerHTML = '<b>Примеры сохраняются после входа через Telegram</b><span class="dim small">картинки хранятся за вами и видны и в Telegram, и на компьютере</span><a class="btn sm accent" href="#/kabinet" style="margin-top:8px">Войти</a>'; return; }
    }
    drop.addEventListener('click', (e) => { if (!e.target.closest('label')) fi.click(); });
    fi.addEventListener('change', () => { depoUpload(Array.from(fi.files)); fi.value = ''; });
    ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('on'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('on'); }));
    drop.addEventListener('drop', (e) => depoUpload(Array.from(e.dataTransfer.files || [])));
    if (!depoInit.paste) { depoInit.paste = true; document.addEventListener('paste', (e) => { if (!$('#depo') || !$('#drop input[type=file]')) return; const f = Array.from((e.clipboardData && e.clipboardData.files) || []); if (f.length) depoUpload(f); }); }
    $('#dq').addEventListener('input', depoDraw);
    $('#dgo').addEventListener('click', () => { sessionStorage.setItem('jasa:prefill', JSON.stringify({ tip: 'post', text: '' })); location.hash = '#/sozdat'; });
    $('#dgrid').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) { const im = e.target.closest('.dcard img'); if (im) lightbox(im.src, im.closest('.dcard').dataset.cap); return; }
      const id = b.closest('.dcard').dataset.id;
      if (b.dataset.act === 'stil') {
        S.stil = S.stil.includes(id) ? S.stil.filter((x) => x !== id) : S.stil.concat(id).slice(-3);
        store.set('stil', S.stil); depoDraw(); $('#dgo').classList.toggle('hide', !S.stil.length);
        toast(S.stil.length ? 'Стиль: ' + S.stil.length + ' из 3 картинок — уйдёт художникам в следующий пост' : 'Стиль снят');
      } else if (b.dataset.act === 'del') {
        b.disabled = true;
        try { await api('/api/depo/udalit', { id }); DEPO = DEPO.filter((x) => x.id !== id); S.stil = S.stil.filter((x) => x !== id); store.set('stil', S.stil); depoDraw(); } catch (er) { toast(er.message); b.disabled = false; }
      } else if (b.dataset.act === 'hex') { navigator.clipboard && navigator.clipboard.writeText(b.dataset.hex); toast('Цвет ' + b.dataset.hex + ' скопирован'); }
    });
    const gen = authGen(); DEPO = [];
    api('/api/depo').then((r) => { if (gen !== authGen() || !$('#dgrid')) return; DEPO = arr(r.items); const est = new Set(DEPO.map((x) => x.id)); S.stil = S.stil.filter((id) => est.has(id)); store.set('stil', S.stil); $('#dgo').classList.toggle('hide', !S.stil.length); depoDraw(); }).catch((e) => { if ($('#dgrid')) $('#dgrid').innerHTML = `<p class="warn small">${esc(e.message)}</p>`; });
  }
  function depoDraw() {
    const g = $('#dgrid'); if (!g) return;
    const q = ($('#dq').value || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    const hit = (x) => !words.length || words.every((w) => [x.podpis, x.krupnost, x.svet, x.optika, x.nastroenie, x.zhanr, x.mesto, x.vremya].concat(arr(x.tegi)).join(' ').toLowerCase().includes(w));
    const list = DEPO.filter(hit);
    $('#dcnt').textContent = DEPO.length ? (q ? list.length + ' из ' + DEPO.length : DEPO.length + ' кадров') : '';
    if (!DEPO.length) { g.innerHTML = '<p class="muted small">Пока пусто. Начните с 3–5 картинок, которые хотите повторить по настроению.</p>'; return; }
    g.innerHTML = list.map((x) => `<article class="dcard ${S.stil.includes(x.id) ? 'sel' : ''}" data-id="${esc(x.id)}" data-cap="${esc(x.podpis || '')}"><img src="${esc(API_BASE + x.url)}" alt="${esc(x.podpis || 'картинка-образец')}" loading="lazy">
      <div class="dpal">${arr(x.palitra).map((c) => `<button data-act="hex" data-hex="${esc(c)}" title="${esc(c)} — скопировать" style="background:${col(c, '#ccc')}"></button>`).join('')}</div>
      <div class="dbody">${x.podpis ? `<p class="small">${esc(x.podpis)}</p>` : ''}${x.krupnost ? `<p class="dim small">${[x.krupnost, x.svet, x.optika, x.nastroenie].filter(Boolean).map(esc).join(' · ')}</p>` : '<p class="dim small">только цвета</p>'}
      <div class="dact"><button class="btn sm ${S.stil.includes(x.id) ? 'accent' : 'quiet'}" data-act="stil">${S.stil.includes(x.id) ? 'В стиле ✓' : 'Сделать в таком стиле'}</button><button class="btn sm ghost" data-act="del" title="Удалить из примеров">Удалить</button></div></div></article>`).join('') || '<p class="muted small">Ничего не нашлось — попробуйте другое слово.</p>';
  }
  async function depoUpload(files) {
    const imgs = files.filter((f) => /^image\//.test(f.type)).slice(0, 10);
    if (!imgs.length) { toast('Нужны картинки'); return; }
    const prochitat = $('#dread') ? $('#dread').checked : true;
    const gen = authGen();
    for (const f of imgs) {
      if (gen !== authGen() || !$('#dgrid')) { toast('Загрузка остановлена: вы сменили аккаунт или экран'); return; }
      const ph = document.createElement('article'); ph.className = 'dcard wait'; ph.innerHTML = `<div class="working"><span class="spin"></span><span class="small">${prochitat ? 'Читаю кадр…' : 'Сохраняю…'}</span></div>`;
      $('#dgrid').prepend(ph);
      try {
        const { b64, palitra } = await shrink(f);
        if (gen !== authGen()) { ph.remove(); toast('Загрузка остановлена: сменился аккаунт'); return; }
        const r = await api('/api/depo', { image: { b64, mime: 'image/jpeg' }, palitra, prochitat, istochnik: f.name });
        if (gen === authGen()) { DEPO.unshift(r); if (typeof r.ostatok === 'number') spend(0, r.ostatok); }
      } catch (e) { toast('Депо: ' + e.message); }
      ph.remove(); if ($('#dgrid')) depoDraw();
    }
  }
  // ужать до 1600 px JPEG и достать 5 цветов (квантование по кубам 4×4×4 — бесплатно, в браузере)
  function shrink(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const im = new Image();
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('картинка не открылась')); };
      im.onload = () => {
        const k = Math.min(1, 1600 / Math.max(im.width, im.height)); const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        const small = document.createElement('canvas'); small.width = 64; small.height = Math.max(1, Math.round(64 * c.height / c.width)); const sx = small.getContext('2d'); sx.drawImage(c, 0, 0, small.width, small.height);
        const d = sx.getImageData(0, 0, small.width, small.height).data; const bins = {};
        for (let i = 0; i < d.length; i += 4) { const key = (d[i] >> 6) + ',' + (d[i + 1] >> 6) + ',' + (d[i + 2] >> 6); const b = bins[key] || (bins[key] = [0, 0, 0, 0]); b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; }
        const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
        const palitra = Object.values(bins).sort((a, b) => b[3] - a[3]).slice(0, 5).map((b) => '#' + hex(b[0] / b[3]) + hex(b[1] / b[3]) + hex(b[2] / b[3]));
        let q = 0.86, data = c.toDataURL('image/jpeg', q);
        while (data.length > 3_000_000 && q > 0.5) { q -= 0.12; data = c.toDataURL('image/jpeg', q); }
        res({ b64: data.split(',')[1], palitra });
      };
      im.src = url;
    });
  }

  // =====================================================================
  // ЛИЧНЫЙ КАБИНЕТ (вход с компьютера через Telegram)
  // =====================================================================
  // пакет, выбранный в «Тарифах»: подсвечен, пока человек дошёл до «Пополнить» (с входом — до 5 минут)
  const podsvet = () => (S.podsvetPaket && S.podsvetDo > Date.now() ? S.podsvetPaket : null);
  const KAB_SKELET = '<div class="two"><div class="card skel"><i></i><i></i><i class="w60"></i></div><div class="card skel"><i></i><i class="w60"></i></div></div><div class="card skel" style="margin-top:22px"><i class="w60"></i></div>';
  // ---------- оплата: три кошелька, «Купить», счета ----------
  const tng = (n) => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  function koshelkiHtml(m) {
    const k = m.koshelki || {}; const pod = m.podpiska;
    const row = (name, v, hint) => `<div class="kosh"><span>${name}</span><b class="mono">${esc(Math.floor(+v || 0))}</b><small class="dim">${hint}</small></div>`;
    return `<div class="koshelki">
      ${pod && pod.aktivna ? row('Дневные', k.den, 'сгорают в конце дня · подписка до ' + esc(pod.do)) : ''}
      ${+k.dar > 0 ? row('Подарочные', k.dar, m.probnye === 'vydany' ? 'пробные от JASA' : 'от JASA') : ''}
      ${row('Личные', k.lichnye, 'оплаченные, не сгорают')}
    </div>`;
  }
  function kupitHtml(m) {
    const c = m.ceny_oplaty || {}; const p = c.podpiska || { tenge: 3990, dnej: 30, v_den: 45 }; const pod = m.podpiska;
    const pak = Object.entries(c.pakety || { 500: 5990, 2000: 19990, 10000: 89990 });
    return `<div class="card" id="popolnit"><span class="caps">Купить</span>
      <div class="kupit-pod ${pod && pod.aktivna ? 'on' : ''}"><div><b>«Каждый день»</b><p class="small muted">${esc(denStroka(p))}. ${podIdyot() ? 'Идут на посты, афиши, карусели и картинки; видео, презентации и кино — с личных кредитов. ' : ''}${esc(p.dnej)} дней.</p></div>
        <button class="btn sm accent" data-kupit="podpiska">${pod && pod.aktivna ? 'Продлить' : 'Выставить счёт'} · ${tng(p.tenge)}</button></div>
      <span class="caps" style="display:block;margin-top:14px">Пакеты · не сгорают</span>
      <div class="chips pakety">${pak.map(([n, t]) => `<button class="chip ${podsvet() === n || podsvet() === n.replace(/(\d)(?=(\d{3})$)/, '$1 ') ? 'on' : ''}" data-kupit="paket" data-paket="${esc(n)}">${esc(n)} кр · ${tng(t)} <small class="dim">${(t / n).toFixed(1).replace('.', ',')} ₸/кр</small></button>`).join('')}</div>
      <div class="summa"><input id="summa" type="number" min="${esc((c.summa || {}).min || 1000)}" step="100" placeholder="Своя сумма, ₸" inputmode="numeric"><button class="btn sm quiet" data-kupit="summa">Счёт на сумму</button><small class="dim">по ${esc((c.summa || {}).tenge_za_kr || 14)} ₸ за кредит — пакеты выгоднее</small></div>
      <p class="small dim" style="margin-top:10px">Счёт оплачивается в Kaspi, кредиты зачисляются после подтверждения. Один чек — одно зачисление.</p></div>`;
  }
  function schetaHtml(m) {
    const sc = arr(m.scheta); if (!sc.length) return '';
    const rk = m.rekvizity || {};
    const rekv = rk.gotovo ? `<div class="rekv">${['poluchatel', 'kaspi', 'iban', 'bin'].filter((k) => rk[k]).map((k) => `<span>${({ poluchatel: 'Получатель', kaspi: 'Kaspi', iban: 'IBAN', bin: 'БИН' })[k]}: <b data-copy="${esc(rk[k])}" title="Скопировать">${esc(rk[k])}</b></span>`).join('')}</div>` : `<p class="small muted" style="margin-top:8px">${esc(rk.tekst || '')}</p>`;
    return `<div class="card" style="margin-top:22px"><span class="caps">Счета</span>
      ${sc.map((s) => `<div class="schet ${s.status}" id="schet-${esc(s.id)}"><div><b class="mono" data-copy="${esc(s.id)}" title="Скопировать номер">${esc(s.id)}</b><span class="st">${esc(s.status_imya)}</span><p class="small">${esc(s.podpis)}</p>${s.status === 'vystavlen' ? `<p class="small dim">назначение платежа: <b data-copy="${esc(s.naznachenie)}">${esc(s.naznachenie)}</b> · до ${esc(s.do)}</p>` : `<p class="small dim">${esc(s.ts)}${s.payment_id ? ' · чек ' + esc(s.payment_id) : ''}</p>`}</div>
        <div class="sr"><b class="mono">${tng(s.tenge)}</b>${s.status === 'vystavlen' ? `<button class="btn sm ghost" data-otmena="${esc(s.id)}">Отменить</button>` : ''}</div></div>`).join('')}
      ${sc.some((s) => s.status === 'vystavlen') ? rekv : ''}</div>`;
  }
  function kabinet() {
    main.innerHTML = topbar('Кабинет') + '<div id="kab">' + KAB_SKELET + '</div>';
    if (S.me) drawKab(S.me);   // последний известный профиль сразу, свежий — следом
    loadMe().then((m) => { if (m || !S.me) drawKab(m); });
  }
  function drawKab(m) {
    const k = $('#kab'); if (!k) return;
    const langCard = () => '<div class="card" style="margin-top:22px"><span class="caps">Язык</span><div class="bs-seg" id="langseg" style="margin-top:10px;max-width:420px">' + Object.entries(LANG_LABEL).map(([key, v]) => `<button type="button" data-l="${key}" class="${key === S.yazyk ? 'on' : ''}" aria-pressed="${key === S.yazyk}">${v}</button>`).join('') + '</div><p class="small dim" style="margin-top:8px">Язык текстов. Меню пока на русском.</p></div>';
    const langBind = () => { const sg = $('#langseg'); if (sg) sg.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; setLang(b.dataset.l); $$('#langseg button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); hap('sel'); }); };
    if (!m) { k.innerHTML = '<div class="warn">Сервер не отвечает. Попробуйте через минуту.</div>'; return; }
    if (m.guest && !TG) {
      k.innerHTML = `<section style="max-width:760px;margin-bottom:26px"><h2>Войдите в аккаунт</h2><p class="muted" style="margin-top:10px">Без паролей, через Telegram. Посты, бренд и кредиты будут и в приложении, и на компьютере.</p></section>
        ${podsvet() ? `<p class="skoro" style="margin:0 0 16px">Пакет ${esc(S.podsvetPaket)} кр — войдите через Telegram, и мы откроем «Пополнить» с ним.</p>` : ''}
        <div class="two"><div class="card" id="logincard"><span class="caps">Вход</span><div style="margin-top:12px"><button class="btn accent" id="login">Войти через Telegram</button></div><div id="loginbox" style="margin-top:16px"></div></div>
        <div class="card"><span class="caps">Пока вы гость</span><p class="small muted" style="margin-top:8px">Сегодня у вас ${esc(Math.floor(m.kredity))} кр. Без входа — 50 кредитов в день, после входа — ${esc(m.trial)} пробных разово: три поста с тремя картинками или шесть с одной.</p></div></div>`;
      k.insertAdjacentHTML('beforeend', langCard()); langBind();
      $('#login').addEventListener('click', startLogin);
      return;
    }
    const ist = arr(m.istoriya);
    k.innerHTML = `<div class="two">
      <div class="card"><span class="caps">Профиль</span><h3 style="margin:6px 0 4px">${esc(m.name || 'Вы')}</h3><p class="small muted">${m.username ? '@' + esc(m.username) : 'Telegram'}${m.since ? ' · с ' + esc(dataRu(m.since)) : ''}${TG ? ' · в Telegram' : ' · на компьютере'}</p>
        <div class="balans"><b>${esc(m.kredity)}</b><span class="muted">кредитов</span></div>
        ${koshelkiHtml(m)}
        <p class="small dim" style="margin-top:8px">потрачено ${esc(m.spent || 0)} · пробных было ${esc(m.trial)}</p>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm" href="#/sozdat">Создать</a><a class="btn sm quiet" href="#/brend">Мой бренд</a>${TG ? '' : '<button class="btn sm ghost" id="logout">Выйти</button>'}</div></div>
      ${kupitHtml(m)}
      </div>
      ${schetaHtml(m)}
      ${langCard()}
      <div class="card" style="margin-top:22px"><span class="caps">История</span>${ist.length ? `<div style="margin-top:10px">${ist.map((h) => `<div class="err" style="grid-template-columns:120px 60px 1fr"><span class="dim small">${esc(h.ts)}</span><span class="mono small" style="color:${h.vozvrat ? 'var(--ok)' : 'var(--accent-text)'}">${h.besplatno ? 'бесплатно' : (h.vozvrat ? '+' : '−') + esc(h.kr)}</span><span class="small">${esc(h.chto)}</span></div>`).join('')}</div>` : '<p class="small muted" style="margin-top:8px">Пока пусто. Создайте первый пост.</p>'}</div>`;
    langBind();
    const lo = $('#logout'); if (lo) lo.addEventListener('click', async () => { try { await api('/api/logout', {}); } catch (e) { /* и так выйдем */ } S.session = null; store.set('session', null); S.me = null; S.stil = []; store.set('stil', []); toast('Вы вышли'); loadMe(); kabinet(); });
    k.onclick = async (e) => {
      const ot = e.target.closest('[data-otmena]');
      if (ot) { ot.disabled = true; try { await api('/api/schet/otmena', { id: ot.dataset.otmena }); toast('Счёт отменён'); await loadMe(); drawKab(S.me); } catch (er) { toast(er.message); ot.disabled = false; } return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast('Скопировано'); } catch (er) { toast(cp.dataset.copy); } return; }
      const b = e.target.closest('[data-kupit]'); if (!b) return;
      const body = { tip: b.dataset.kupit };
      if (body.tip === 'paket') body.paket = b.dataset.paket;
      if (body.tip === 'summa') { const v = parseInt(($('#summa') || {}).value, 10); if (!(v >= 1000)) { toast('Своя сумма — от 1 000 ₸'); return; } body.tenge = v; }
      b.disabled = true;
      try { const r = await api('/api/schet', body); toast('Счёт ' + r.schet.id + ' выставлен'); await loadMe(); drawKab(S.me); const sc = document.getElementById('schet-' + r.schet.id); if (sc) sc.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      catch (er) { toast(er.message); b.disabled = false; }
    };   // onclick: повторная отрисовка не удваивает заявку
    if (podsvet()) { const pc = $('#popolnit'); if (pc) { pc.classList.add('podsvet'); if (S.podsvetSkroll) { S.podsvetSkroll = false; pc.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } }
  }
  // 1 минуту · 2 минуты · 5 минут
  const dataRu = (x) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(x || '')); if (!m) return x; const M = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']; return +m[3] + ' ' + M[+m[2] - 1] + ' ' + m[1]; };
  function plural(n, one, few, many) { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many; }
  async function startLogin() {
    const box = $('#loginbox'); const btn = $('#login'); btn.disabled = true;
    const token = S.pollToken;
    let st; try { st = await api('/api/login/start', {}); } catch (e) { toast(e.message); btn.disabled = false; return; }
    if (token !== S.pollToken || !$('#loginbox')) return;
    const minut = Math.max(1, Math.round((+st.ttl || 300) / 60));
    const cifry = st.sverka ? esc(st.sverka) : '····';
    const phone = document.documentElement.classList.contains('mob');   // на телефоне QR бесполезен: открываем Telegram сразу
    box.innerHTML = phone
      ? `<a class="btn accent login-open" href="${esc(st.url)}" target="_blank" rel="noopener">Открыть Telegram и подтвердить</a><p class="small" style="margin-top:12px">В боте проверьте цифры <b class="mono login-cifry">${cifry}</b> и нажмите «Да, это я». Потом вернитесь сюда.</p><p class="small dim" id="loginst">Код действует ${minut} ${plural(minut, 'минуту', 'минуты', 'минут')} · жду подтверждения…</p>`
      : `<div class="qr" id="qr"></div><ol class="login-shagi"><li>Наведите камеру на QR или <a href="${esc(st.url)}" target="_blank" rel="noopener">откройте бота</a></li><li>Проверьте, что в боте те же цифры: <b class="mono login-cifry">${cifry}</b></li><li>Нажмите «Да, это я»</li></ol><p class="small dim" id="loginst">Код действует ${minut} ${plural(minut, 'минуту', 'минуты', 'минут')} · жду подтверждения…</p>`;
    if (!phone) { try { new QRCode($('#qr'), { text: st.url, width: 180, height: 180, colorDark: '#15192A', colorLight: '#FFFDF8' }); } catch (e) { $('#qr').innerHTML = `<a class="btn quiet" href="${esc(st.url)}" target="_blank" rel="noopener">Открыть бота</a>`; } }
    for (let i = 0; i < 160; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (token !== S.pollToken || !$('#loginst')) return;
      let r; try { r = await api('/api/login/status?code=' + st.code, null, st.klyuch ? { 'X-Login-Key': st.klyuch } : null); } catch (e) { continue; }   // ключ устройства: токен получает только страница, начавшая вход
      if (r.state === 'ok') { S.session = r.token; store.set('session', r.token); toast('Вход выполнен' + (r.name ? ', ' + r.name : '')); await loadMe(); kabinet(); return; }
      if (r.state === 'expired') { $('#loginst').textContent = 'Код устарел, нажмите ещё раз.'; loginSnova(); return; }
      if (r.state === 'otkaz') { $('#loginst').textContent = 'Вход отклонён в боте. Если это были не вы — ничего делать не нужно.'; loginSnova(); return; }
    }
    $('#loginst').textContent = 'Код устарел, нажмите ещё раз.'; loginSnova();
    // ссылка со старым кодом на телефоне больше не годится — убираем её, и кнопка «Войти через Telegram» возвращается
    function loginSnova() { const o = $('.login-open'); if (o) o.remove(); btn.disabled = false; }
  }
  // Цены — один список тарифов для кабинета и лендинга (site/index.html, секция #ceny): строки, цены и числа постов сверяет test_tarify_sovpadenie.py.
  /*TARIFY*/const TARIFY = [
    {"n": "Бесплатно", "p": "0 ₸", "per": "", "kto": "Попробовать", "li": ["2 поста с картинкой в день без входа", "после входа — ещё 6 постов в подарок", "внутри: 50 кредитов в день, после входа 135 пробных разово"], "knopka": "Попробовать бесплатно"},
    {"n": "Каждый день", "p": "3 990 ₸", "per": "за 30 дней", "kto": "Кафе, салон, магазин", "li": ["{chto} каждый день", "посты, афиши, карусели, картинки", "внутри: {v_den} кредитов каждое утро, не копятся"], "li_zapas": ["пост с картинкой каждый день", "посты, афиши, карусели, картинки", "дневные кредиты не копятся"], "knopka": "Оформить", "podpiska": true, "hot": true},
    {"n": "Студент", "p": "1 990 ₸", "per": "разово", "kto": "Учусь", "li": ["защита диплома со слайдами и речью — 99 кредитов", "и ещё 4 поста с картинкой", "внутри: 200 кредитов, не сгорают"], "knopka": "Выбрать", "paket": "200"},
    {"n": "Pro", "p": "24 990 ₸", "per": "разово", "kto": "SMM, агентство", "li": ["119 постов с картинкой — или 55 с тремя вариантами", "до 10 брендов клиентов", "внутри: 2 500 кредитов, не сгорают"], "knopka": "Выбрать", "paket": "2500"}
  ];/*/TARIFY*/
  // «Ваш месяц» по аудиториям (№273): что человеку обычно нужно за месяц. Числа — гипотеза до интервью; цены действий и пакетов берутся с сервера.
  // tip — действие с ценой из /api/ceny (post, afisha, karusel, rils, plan, image); kr — действие с постоянной ценой (сверяет test_tarify_sovpadenie).
  /*MESYAC*/const MESYAC = [
    {"kod": "kafe", "chip": "Кафе, салон, студия", "kto": "кофейня у дома", "nishi": ["kofe", "pekarnya", "barber", "salon", "fitnes", "cvety", "uslugi"], "mes": [{"n": 12, "tip": "post", "t": "постов с картинкой", "s": "3 в неделю"}, {"n": 2, "tip": "afisha", "t": "афиши к акциям"}, {"n": 4, "tip": "plan", "t": "плана на неделю"}], "alt": "podpiska"},
    {"kod": "shop", "chip": "Магазин в Instagram", "kto": "магазин подарков", "nishi": ["magazin"], "mes": [{"n": 8, "tip": "post", "t": "постов с картинкой", "s": "2 в неделю"}, {"n": 4, "tip": "karusel", "t": "карусели товара"}, {"n": 8, "tip": "image", "t": "картинок товара"}, {"n": 4, "tip": "plan", "t": "плана на неделю"}]},
    {"kod": "smm", "chip": "Веду соцсети клиентов", "kto": "SMM, пять клиентов", "nishi": [], "delit": 5, "mes": [{"n": 60, "tip": "post", "t": "постов с картинкой", "s": "12 на клиента"}, {"n": 10, "tip": "afisha", "t": "афиш", "s": "2 на клиента"}, {"n": 20, "tip": "plan", "t": "планов на неделю"}], "rek": "2500"},
    {"kod": "uch", "chip": "Учебный центр", "kto": "курсы и репетиторы", "nishi": ["ucheba", "deti"], "mes": [{"n": 12, "tip": "post", "t": "постов с картинкой", "s": "3 в неделю"}, {"n": 8, "tip": "afisha", "t": "афиш набора", "s": "4 на казахском, 4 на русском"}, {"n": 4, "tip": "rils", "t": "сценария рилсов"}]},
    {"kod": "stud", "chip": "Учусь", "kto": "студент перед защитой", "nishi": [], "mes": [{"n": 1, "kr": 99, "t": "Защита диплома: слайды и речь"}, {"n": 4, "tip": "post", "t": "поста с картинкой"}], "rek": "200", "razovo": true}
  ];/*/MESYAC*/
  const PAKETY_ZAPAS = { 500: 5990, 2000: 19990, 10000: 89990 };   // если сервер ещё не ответил; свои цены он присылает в /api/ceny.oplata и /api/me
  function tarify(povtor) {
    if (!S.me && !povtor) loadMe().then(() => { if ((location.hash || '').startsWith('#/tarify')) tarify(true); });   // цены пакетов приходят с сервера: дорисуем, когда ответит
    const opl = (S.ceny && S.ceny.oplata) || (S.me && S.me.ceny_oplaty) || {};
    const pak = Object.assign({}, opl.pakety && Object.keys(opl.pakety).length ? opl.pakety : PAKETY_ZAPAS); let imena = opl.nazvaniya || {}; const pod = opl.podpiska || null;
    let klyuchi = Object.keys(pak).map(Number).filter((k) => k > 0 && +pak[k] > 0).sort((x, y) => x - y);
    if (!klyuchi.length) { Object.keys(pak).forEach((k) => delete pak[k]); Object.assign(pak, PAKETY_ZAPAS); imena = {}; klyuchi = Object.keys(pak).map(Number).sort((x, y) => x - y); }
    const zd = S.ceny.zadanie || {}, cena = (tip) => (tip === 'image' ? +S.ceny.image || 12 : +zd[tip] || (tip === 'rils' || tip === 'plan' ? 6 : 21));
    const p1 = cena('post'), p3 = +((S.ceny.zadanie_3 || {}).post) || 45;
    const sp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const okr = (x) => Math.round(x / 100) * 100;   // «≈ 3 800 ₸»: расчёт, а не цена покупки — округляем до сотен
    const vybor = (kr, rek) => { const bez = klyuchi.filter((k) => !imena[k]), obych = bez.length ? bez : klyuchi;   // сам подбираю только среди обычных пакетов: именные («Студент», Pro) — по своей аудитории
      const r = rek && pak[rek] != null ? +rek : (obych.find((k) => k >= kr) || obych[obych.length - 1]); return { kr: r, tenge: +pak[r], imya: imena[r] || '' }; };
    const naSkolko = (m) => (m < 1.25 ? 'на месяц' : m < 1.75 ? 'на полтора месяца' : m < 2.5 ? 'на два месяца' : m < 3.5 ? 'на три месяца' : m >= 12 ? 'больше чем на год' : 'на ' + Math.floor(m) + (Math.floor(m) < 5 ? ' месяца' : ' месяцев'));
    const svoj = Object.assign({ post: 3, af: 2, rl: 4 }, store.get('cenySvoj', null) || {});
    ['post', 'af', 'rl'].forEach((k) => { svoj[k] = Math.max(0, Math.min(k === 'post' ? 14 : 40, Math.floor(+svoj[k]) || 0)); });
    const nishaId = String(S.nisha || '');
    let kto = store.get('cenyKto', '') || (nishaId === 'drugoe' ? 'svoj' : (MESYAC.find((m) => m.nishi.includes(nishaId)) || MESYAC[0]).kod);
    if (kto !== 'svoj' && !MESYAC.some((m) => m.kod === kto)) kto = nishaId === 'drugoe' ? 'svoj' : (MESYAC.find((m) => m.nishi.includes(nishaId)) || MESYAC[0]).kod;   // в памяти чужое — берём по делу человека
    const D = SG && SG.dannye(), moya = D && D.nishi.find((x) => x.id === nishaId);
    if (SG && !D && nishaId && !povtor) SG.obnovit(() => { if ((location.hash || '').startsWith('#/tarify')) tarify(true); });   // имя дела — из povody.json

    const panel = () => {
      const m = MESYAC.find((x) => x.kod === kto);
      const stroki = m ? m.mes.map((x) => ({ t: x.n === 1 ? x.t : x.n + ' ' + x.t, s: x.s || '', kr: x.n * (x.kr || cena(x.tip)) }))
        : [{ t: svoj.post * 4 + ' ' + postSl(svoj.post * 4) + ' с картинкой', s: svoj.post + ' в неделю', kr: svoj.post * 4 * p1 }, { t: 'Афиши и карусели: ' + svoj.af, s: '', kr: svoj.af * cena('afisha') }, { t: 'Сценарии рилсов и планы: ' + svoj.rl, s: '', kr: svoj.rl * cena('rils') }].filter((x) => x.kr > 0);
      const kr = stroki.reduce((a, x) => a + x.kr, 0), v = vybor(kr, m && m.rek), za = v.tenge / v.kr;
      const mesyac = okr(kr * za), itog = m && m.razovo ? tng(v.tenge) : '≈ ' + tng(m && m.delit ? okr(kr * za / m.delit) : mesyac);
      const itogS = m && m.razovo ? 'разово' : m && m.delit ? 'на клиента в месяц' : 'в месяц';
      const zagol = 'Ваш месяц' + (m ? ': ' + (moya && m.nishi.includes(nishaId) ? sgKorotko(moya).toLowerCase() : m.kto) : '');
      const rekZ = kr <= 0 ? 'Пока нечего считать' : v.imya ? '«' + v.imya + '» — ' + tng(v.tenge) : 'Пакет на ' + Math.floor(v.kr / p1) + ' ' + postSl(Math.floor(v.kr / p1)) + ' — ' + tng(v.tenge);
      const hvatit = kr > 0 && v.kr >= kr ? sp(v.kr) + ' кредитов не сгорают: хватит ' + (m && m.razovo ? 'на всё из списка' : naSkolko(v.kr / kr)) + '.' : kr > v.kr ? 'Самого большого пакета на такой месяц не хватит — возьмите два или напишите нам, подберём.' : 'Выберите, сколько постов нужно в неделю.';
      const alt = m && m.alt === 'podpiska' && pod ? ' Постите каждый день — тогда «Каждый день» за ' + tng(pod.tenge) + '.' : '';
      const schet = (k, n, podp) => `<div class="cn-st"><span>${podp}</span><span class="cn-pm"><button type="button" data-sv="${k}" data-d="-1" aria-label="Меньше">−</button><b>${n}</b><button type="button" data-sv="${k}" data-d="1" aria-label="Больше">+</button></span></div>`;
      return `<div class="cn-mes"><h3>${esc(zagol)}</h3>
          ${m ? '' : schet('post', svoj.post, 'Постов с картинкой в неделю') + schet('af', svoj.af, 'Афиш и каруселей в месяц') + schet('rl', svoj.rl, 'Сценариев рилсов и планов в месяц')}
          <ul>${stroki.map((x) => `<li><span>${esc(x.t)}</span><span>${esc(x.s)}</span></li>`).join('')}</ul>
          <div class="cn-itog"><b>${esc(itog)}</b><span>${esc(itogS)}</span></div></div>
        <div class="cn-rek"><span class="caps">Что взять</span><b>${esc(rekZ)}</b><p>${esc(hvatit + alt)}</p>
          ${kr > 0 ? `<button type="button" class="btn accent" data-paket="${v.kr}">${esc((v.imya ? 'Взять «' + v.imya + '»' : 'Взять пакет') + ' · ' + tng(v.tenge))}</button>
          <small>внутри: ${sp(kr)} из ${sp(v.kr)} кредитов · цена каждого действия видна на кнопке до запуска</small>` : ''}</div>`;
    };
    // сетка №213: цена — с сервера; пакетный тариф виден, только если сервер такой пакет продаёт
    const vidno = TARIFY.filter((t) => !t.paket || pak[t.paket] != null);
    const liT = (t) => (!t.podpiska ? t.li : pod && typeof pod.chto === 'string' && pod.chto && +pod.v_den > 0 ? t.li.map((x) => x.split('{chto}').join(pod.chto).split('{v_den}').join(String(Math.round(+pod.v_den)))) : (t.li_zapas || []));   // «Каждый день»: фраза и число с сервера
    const cenaT = (t) => (t.paket && pak[t.paket] != null ? tng(pak[t.paket]) : t.podpiska && pod && pod.tenge ? tng(pod.tenge) : t.p);
    const prochie = klyuchi.filter((k) => !TARIFY.some((t) => t.paket === String(k)));
    const bazaKr = pak[500] ? 500 : klyuchi[0], za500 = +pak[bazaKr] / bazaKr;
    const kT = (kr) => { const t = kr * za500; return '≈ ' + tng(t >= 1000 ? okr(t) : Math.round(t / 10) * 10); };
    const dejstviya = [['Пост с картинкой', p1], ['Пост с тремя вариантами картинки', p3], ['Афиша или карусель', cena('afisha')], ['Сценарий рилса или план на неделю', cena('rils')], ['Ещё одна картинка', cena('image')]].concat(S.ceny.video && S.ceny.video['720p'] ? [['Видео 5 секунд', +S.ceny.video['720p']]] : [], S.ceny.kino && S.ceny.kino.razbor ? [['Разбор сценария кино', +S.ceny.kino.razbor]] : []);
    const gostPostov = Math.floor((+S.ceny.gost_den || 50) / p1);
    main.innerHTML = `<div class="cn">
      <div class="cn-top"><h1>Цены</h1><span class="stik cn-stik"><b>${gostPostov} ${postSl(gostPostov)} в день</b><small>без входа — бесплатно</small></span></div>
      <p class="cn-lead">Выберите, кто вы, — покажем ваш месяц в тенге.</p>
      <div class="cn-kto" role="group" aria-label="Кто вы">${MESYAC.map((m) => `<button type="button" class="chip ${m.kod === kto ? 'on' : ''}" data-kto="${m.kod}" aria-pressed="${m.kod === kto}">${esc(m.chip)}</button>`).join('')}<button type="button" class="chip ${kto === 'svoj' ? 'on' : ''}" data-kto="svoj" aria-pressed="${kto === 'svoj'}">Другое: посчитать самому</button></div>
      <div class="cn-pan" id="cnpan">${panel()}</div>
      <h2 class="cn-h2">Все варианты</h2>
      <div class="tiers">${vidno.map((t) => `<div class="tier ${t.hot ? 'hot' : ''}"><span class="caps">${esc(t.kto)}</span><h3>${esc(t.n)}</h3><div class="price">${esc(cenaT(t))}${t.per ? `<small> ${esc(t.per)}</small>` : ''}</div><ul>${liT(t).map((l) => `<li>${esc(l)}</li>`).join('')}</ul><button type="button" class="btn ${t.hot ? 'accent' : 'quiet'}" data-tarif="${esc(t.n)}">${esc(t.knopka)}</button></div>`).join('')}</div>
      ${prochie.length ? `<p class="muted cn-pak">Пакеты кредитов, не сгорают: ${esc(prochie.map((k) => Math.floor(k / p1) + ' ' + postSl(Math.floor(k / p1)) + ' (' + sp(k) + ' кр) — ' + tng(pak[k])).join(' · '))}. Купить — в Кабинете.</p>` : ''}
      <details class="cn-det"><summary>Сколько стоит одно действие</summary><ul>${dejstviya.map(([t, kr]) => `<li><span>${esc(t)}</span><span>до ${kr} кр · ${esc(kT(kr))}</span></li>`).join('')}</ul><p class="small muted">В тенге — по пакету на ${sp(bazaKr)} кредитов. Цена стоит на кнопке до запуска; больше этой суммы не спишем.</p></details>
      <p class="muted cn-kak">Как платить сейчас: в Кабинете выставляете счёт, переводите в Kaspi по реквизитам, мы подтверждаем вручную — и кредиты на балансе.</p></div>`;
    main.onclick = (e) => {
      const ch = e.target.closest('[data-kto]');
      if (ch) { hap('sel'); kto = ch.dataset.kto; store.set('cenyKto', kto); $$('[data-kto]', main).forEach((x) => { x.classList.toggle('on', x === ch); x.setAttribute('aria-pressed', x === ch); }); $('#cnpan').innerHTML = panel(); return; }
      const sv = e.target.closest('[data-sv]');
      if (sv) { hap('sel'); const k = sv.dataset.sv, lim = k === 'post' ? 14 : 40; svoj[k] = Math.max(0, Math.min(lim, (+svoj[k] || 0) + (+sv.dataset.d))); store.set('cenySvoj', svoj); $('#cnpan').innerHTML = panel(); const f = $(`[data-sv="${k}"][data-d="${sv.dataset.d}"]`, main); if (f) f.focus({ preventScroll: true }); return; }
      const pk = e.target.closest('[data-paket]');
      if (pk) { hap('medium'); S.podsvetPaket = pk.dataset.paket; S.podsvetDo = Date.now() + 300000; S.podsvetSkroll = true; location.hash = '#/kabinet'; return; }   // Кабинет → «Пополнить» с подсвеченным пакетом
      const b = e.target.closest('[data-tarif]'); if (!b) return;
      const t = TARIFY.find((x) => x.n === b.dataset.tarif); if (!t) return;
      if (t.podpiska) { location.hash = '#/kabinet'; return; }   // «Каждый день» оформляется в Кабинете
      if (!t.paket) { location.hash = '#/sozdat'; return; }
      S.podsvetPaket = t.paket; S.podsvetDo = Date.now() + 300000; S.podsvetSkroll = true; location.hash = '#/kabinet';
    };
  }

  // =====================================================================
  // ПОМОЩНИК (по образцу Plumar Support): частое — правилами и бесплатно, остальное — моделью
  // =====================================================================
  (function pomoshnik() {
    const fab = document.createElement('button'); fab.className = 'fab'; fab.id = 'fab'; fab.title = 'Помощник'; fab.setAttribute('aria-label', 'Помощник');
    fab.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/></svg>';
    const pan = document.createElement('aside'); pan.className = 'pom'; pan.id = 'pom'; pan.setAttribute('aria-label', 'Помощник JASA');
    pan.innerHTML = `<div class="ph"><b>Помощник</b><span class="dim small">бесплатно</span><button class="lbx px" aria-label="Закрыть">×</button></div>
      <div class="pmsgs" id="pmsgs"><div class="pm a">Спросите про кредиты, цены или ошибки. Если не смогу, позову человека.</div></div>
      <div class="pchips" id="pchips">${['Сколько у меня кредитов?', 'Почему не получилось?', 'Сколько стоит видео?', 'Как войти с компьютера?', 'Как пополнить?'].map((q) => `<button class="chip">${q}</button>`).join('')}</div>
      <form class="pin" id="pform"><input id="pq" placeholder="Ваш вопрос…" autocomplete="off"><button class="icobtn go" title="Спросить"><svg><use href="#i-send"/></svg></button></form>`;
    document.body.appendChild(fab); document.body.appendChild(pan);
    const pomOv = { close: () => open(false) };
    const open = (v) => { pan.classList.toggle('on', v); fab.classList.toggle('on', v); const k = overlays.indexOf(pomOv); if (v && k < 0) overlays.push(pomOv); if (!v && k > -1) overlays.splice(k, 1); syncOverlays(); if (v) setTimeout(() => $('#pq').focus(), 50); };
    fab.addEventListener('click', () => open(!pan.classList.contains('on')));
    $('.px', pan).addEventListener('click', () => open(false));
    const msgs = $('#pmsgs');
    const add = (cls, html) => { const d = document.createElement('div'); d.className = 'pm ' + cls; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
    async function ask(q) {
      add('u', esc(q)); const w = add('a', '<span class="spin"></span>');
      const oshibka = /почему|не получ|ошибк|не работ|не выш/i.test(q) ? S.lastError : '';
      try {
        const r = await api('/api/pomoshch', { q, oshibka, ekran: (location.hash || '#/sozdat').slice(2) });
        w.innerHTML = esc(r.text).replace(/\n/g, '<br>') + (arr(r.knopki).length ? '<div class="pk">' + arr(r.knopki).map(([t, h]) => /^#\//.test(h) ? `<a class="btn sm quiet" href="${esc(h)}" data-close>${esc(t)}</a>` : `<a class="btn sm quiet" href="${esc(h)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('') + '</div>' : '') + (r.ist === 'model' ? '<div class="dim small" style="margin-top:6px">ответ ИИ · бесплатно, до 15 вопросов в день</div>' : '');
      } catch (e) { w.textContent = 'Помощник недоступен: ' + e.message; }
      msgs.scrollTop = msgs.scrollHeight;
    }
    msgs.addEventListener('click', (e) => { if (e.target.closest('[data-close]') && window.innerWidth < 760) open(false); });
    $('#pchips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) ask(b.textContent); });
    $('#pform').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#pq').value.trim(); if (!q) return; $('#pq').value = ''; ask(q); });
  })();

  // 09.11 (B-20, bezopasnost): адреса файлов из ответов сервера — только свои. Относительный путь → хост API;
  // абсолютный — только с хостом api.jasa.asia / jasa.asia / стенда; всё чужое → '' (ни пикселя, ни референера).
  const SVOI_HOSTY = /^(api\.jasa\.asia|jasa\.asia|www\.jasa\.asia|localhost|127\.0\.0\.1)$/;
  function absUrl(u) {
    u = String(u || ''); if (!u) return '';
    if (/^\/(?!\/)/.test(u)) return (API_BASE || location.origin) + u;
    try { const x = new URL(u); if (/^https?:$/.test(x.protocol) && SVOI_HOSTY.test(x.hostname)) return x.href; } catch (e) { /* не адрес */ }
    return '';
  }
  window.JASA = { openSec, api, esc, toast, voice, spend, $, $$, arr, lightbox, routes, route, S, store, topbar, toB64, compose, trimAlpha, loadImg, API_BASE, TG: !!TG, loadMe, shrink, confirm: askConfirm, prompt: askPrompt, bsheet, bsHead, blokName, dotfix: dotfix2, slej: slej2, absUrl, nishaIdei };
  window.addEventListener('jasa:ready', route);
  if (!window.JASA_DEFER) route();
})();
