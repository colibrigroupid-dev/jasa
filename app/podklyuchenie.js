/* JASA · страница согласия на подключение программы-помощника (MCP).
   Договор — KAK-CHASY/API-MCP.md §2.3, слова — KAK-CHASY/MCP-SLOVA.md §1 (dizajn-ux 15.11.2026).
   Данные — только GET /oauth/zapros по куке запроса и только как текст (textContent): имя программы пишет сама программа.
   Согласие даёт человек в Telegram, не кнопка на этой странице: здесь только ссылка на бота и ожидание ответа. */
(function () {
  'use strict';
  // Запасная защита от встраивания в чужой сайт (основная — заголовки сервера frame-ancestors 'none' и X-Frame-Options).
  if (window.top !== window.self) {
    document.documentElement.textContent = '';
    try { window.top.location = window.self.location.href; } catch (e) { /* чужой фрейм не пускает — страница остаётся пустой */ }
    return;
  }
  const BASE = '';   // страницу отдаёт api.jasa.asia (GET /oauth/authorize): ручка — тот же адрес, connect-src 'self'
  const I = window.JASA_I18N || null;
  const t = (ru) => (I ? I.t(ru) : ru);
  // vvod — человек ответил «да» в боте, бот прислал код; страница ждёт его ввода (порядок 16.11, находка bezopasnost В1:
  // «да» по чужой ссылке больше не отдаёт код чужому браузеру — код вводит сам человек на своей странице)
  const SOST = ['prosba', 'zhdem', 'vvod', 'gotovo', 'otkaz', 'vremya_vyshlo', 'pochta', 'vyklyucheno', 'nevernaya_ssylka'];
  const KONEC = { gotovo: 1, otkaz: 1, vremya_vyshlo: 1, vyklyucheno: 1, nevernaya_ssylka: 1, sboj: 1 };
  const SHAG_MS = window.__PK_SHAG_MS || 2000;          // опрос, пока ждём «да»
  const SHAG_SKRYT_MS = 6000;                            // вкладка скрыта (человек в Telegram) — реже
  const VSEGO_MS = window.__PK_VSEGO_MS || 12 * 60000;   // запрос живёт 10 минут; дольше не ждём
  const PLOHIE_SHEMY = /^(javascript|data|vbscript|file|blob|about):$/i;

  const $ = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));
  const main = $('#pk');
  const nachalo = Date.now();
  let z = null;            // последний ответ сервера
  let vid = 'zagruzka';    // что показано
  let tajmer = 0;
  let idet = false;
  let ushli = false;
  let pokazannyj = '';     // адрес программы, который человек видел на просьбе/ожидании; в ответе «gotovo» сервер его не повторяет

  // ---- данные: чистим до показа ----
  const BEZ_UPRAVL = /[\u0000-\u001F\u007F-\u009F\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;   // управляющие и переворот письма (подмена «имени» справа налево)
  const EST_UPRAVL = new RegExp(BEZ_UPRAVL.source);   // без флага g: test() не помнит прошлый вызов
  const chistyj = (v, max) => String(v == null ? '' : v).replace(BEZ_UPRAVL, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const imya = (v) => { const s = chistyj(v, 400); return s.length > 80 ? s.slice(0, 79).trim() + '…' : s; };   // обрезали — видно, что обрезали
  const host = (v) => { const h = chistyj(v, 200).toLowerCase(); return h.length <= 70 && /^[a-z0-9.-]+(:\d{1,5})?$/.test(h) ? h : ''; };   // обрезанный адрес «настоящим» не покажем — лучше никакого
  const ssylka = (v) => { const s = chistyj(v, 300); return /^https:\/\/t\.me\/[A-Za-z0-9_]{3,64}\?start=[A-Za-z0-9_-]{1,64}$/.test(s) ? s : ''; };
  function perehod(v, h) {   // h — адрес возврата, который страница показала человеку: уходим ровно туда и больше никуда (bezopasnost)
    const s = String(v == null ? '' : v).trim(); if (!s || s.length > 4000 || EST_UPRAVL.test(s)) return '';
    let u; try { u = new URL(s); } catch (e) { return ''; }
    if (PLOHIE_SHEMY.test(u.protocol)) return '';   // страховка; по договору сервер и так отдаёт только https
    if (u.protocol !== 'https:') return '';   // своих схем и адресов своей машины в первой версии нет (договор 38426a4)
    if (!h || u.host !== h || u.username || u.password) return '';
    return u.href;
  }
  function predel(p) {
    const n = p && p.po_umolchaniyu; const m = p && p.max;
    if (!Number.isInteger(n) || n < 0 || (Number.isInteger(m) && n > m) || n > 100000) return null;
    return n;
  }

  // ---- показ ----
  function pole(name, val) { $$('[data-pole="' + name + '"]').forEach((el) => { el.textContent = val; }); }
  function fraza(name, ru) { const v = t(ru); $$('[data-fraza="' + name + '"]').forEach((el) => { el.textContent = v; }); }   // перевод — i18n.js по словарю и шаблонам, сразу при вставке
  function zapolnit(d) {
    const im = imya(d.programma); const h = host(d.host); const n = predel(d.predel);
    pole('programma', '«' + (im || t('Без названия')) + '»');
    pole('host', h || '—');
    $$('.pk-host').forEach((el) => { el.hidden = !h; });
    if (n === null) fraza('posty', 'Делать посты — в пределах дневного предела, который вы выберете в Telegram; сверх — только после «да» в Telegram.');
    else if (n === 0) fraza('posty', 'Делать посты — каждая трата только после вашего «да» в Telegram.');
    else fraza('posty', 'Делать посты — не больше ' + n + ' кр в день без вашего нажатия; сверх — только после «да» в Telegram.');
    $$('[data-fraza="posty-tiho"]').forEach((el) => { el.hidden = n === null; });
    fraza('raskrytie', h
      ? 'Что JASA ответит этой программе — ваш баланс, названия брендов, тексты постов, — увидит и сохранит компания, которая делает программу (' + h + '), по своим правилам. JASA этим не управляет.'
      : 'Что JASA ответит этой программе — ваш баланс, названия брендов, тексты постов, — увидит и сохранит компания, которая делает программу, по своим правилам. JASA этим не управляет.');
    const s = ssylka(d.ssylka);
    $$('[data-ssylka]').forEach((a) => {
      if (s) { a.href = s; a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex'); } else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1'); }
    });
    $$('[data-net-ssylki]').forEach((p) => { p.hidden = !!s || (d.sostoyanie !== 'prosba' && d.sostoyanie !== 'zhdem'); });
  }
  function pokazat(s) {
    if (vid === s) return;
    vid = s;
    $$('.pk-ekran', main).forEach((el) => { el.hidden = el.dataset.s !== s; });
    main.setAttribute('aria-busy', s === 'zagruzka' ? 'true' : 'false');
    const h1 = $('.pk-ekran[data-s="' + s + '"] h1', main);
    document.title = (h1 ? h1.textContent : t('Подключение программы')) + ' · JASA';
    if (s === 'gotovo') ujti();
  }
  function svyaz(net) { const p = $('[data-svyaz]'); if (p) p.hidden = !net; }

  function ujti() {
    if (ushli) return;
    const u = perehod(z && z.perehod, pokazannyj);
    const a = $('[data-perehod]');
    if (!u) { if (a) a.hidden = true; return; }
    ushli = true;
    if (a) { a.href = u; setTimeout(() => { a.hidden = false; }, 2500); }   // своя схема программы может не открыться сама — ссылка остаётся
    setTimeout(() => { location.replace(u); }, 300);
  }

  // ---- опрос ----
  function dalee() {
    clearTimeout(tajmer);
    if (KONEC[vid]) return;
    if (Date.now() - nachalo > VSEGO_MS) { svyaz(false); pokazat('vremya_vyshlo'); return; }
    tajmer = setTimeout(oprosit, document.hidden ? SHAG_SKRYT_MS : SHAG_MS);
  }
  async function oprosit() {
    if (idet || KONEC[vid]) return;
    idet = true; clearTimeout(tajmer);
    let r = null; let d = null;
    try {
      r = await fetch(BASE + '/oauth/zapros', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
      d = await r.json().catch(() => null);
    } catch (e) { r = null; }
    idet = false;
    if (!r || r.status >= 500 || (!d && r.status !== 404)) { svyaz(true); dalee(); return; }   // нет связи — пробуем ещё, экран не меняем
    svyaz(false);
    if (!d || typeof d !== 'object') d = { sostoyanie: 'nevernaya_ssylka' };
    const s = SOST.includes(d.sostoyanie) ? d.sostoyanie : 'sboj';
    // человек уже нажал ссылку на бота, а сервер ещё не знает — экран ожидания не откатываем к просьбе
    const pokaz = s === 'prosba' && vid === 'zhdem' ? 'zhdem' : s;
    z = d;
    if (['prosba', 'zhdem', 'vvod', 'pochta'].includes(s) && (d.programma != null || d.host != null)) { zapolnit(d); const h = host(d.host); if (h) pokazannyj = h; }   // в конечных ответах данных программы нет — экран их не затирает
    if (s === 'vvod') { pokazat('zhdem'); kodPrishel(); } else pokazat(pokaz);
    dalee();
  }

  // ---- ввод кода из бота ----
  const pole_kod = () => $('#pk-kod');
  let kodIdet = false; let fokusBy = false;
  function kodPrishel() {   // сервер знает, что бот прислал код: подсказка и поле в фокусе (один раз)
    const a = $('[data-st-zhdem]'), b = $('[data-st-vvod]'); if (a) a.hidden = true; if (b) b.hidden = false;
    const f = pole_kod(); if (f && !fokusBy && !document.hidden) { fokusBy = true; try { f.focus({ preventScroll: false }); } catch (e) { /* без фокуса */ } }
  }
  function kodOshibka(ru) { const p = $('[data-kod-osh]'); if (!p) return; p.textContent = ru ? t(ru) : ''; p.hidden = !ru; const f = pole_kod(); if (f) f.setAttribute('aria-invalid', ru ? 'true' : 'false'); }
  async function otpravitKod() {
    const f = pole_kod(); const kn = $('[data-kod-otpr]'); if (!f || kodIdet || KONEC[vid]) return;
    const k = f.value.replace(/\D/g, '');
    if (!/^\d{6}$/.test(k)) { kodOshibka('Введите шесть цифр из Telegram.'); f.focus(); return; }
    kodIdet = true; if (kn) kn.setAttribute('aria-busy', 'true'); kodOshibka('');
    let r = null; let d = null;
    try {
      r = await fetch(BASE + '/oauth/zapros/kod', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ kod: k }) });
      d = await r.json().catch(() => null);
    } catch (e) { r = null; }
    kodIdet = false; if (kn) kn.removeAttribute('aria-busy');
    if (!r || !d || typeof d !== 'object') { kodOshibka('Не получилось проверить код. Попробуйте ещё раз.'); return; }
    if (d.sostoyanie === 'gotovo') { z = d; pokazat('gotovo'); return; }
    if (SOST.includes(d.sostoyanie) && KONEC[d.sostoyanie]) { z = d; pokazat(d.sostoyanie); return; }
    const o = d.oshibka;
    if (o === 'neverno') { const n = Number.isInteger(d.ostalos) && d.ostalos >= 0 && d.ostalos < 100 ? d.ostalos : null; kodOshibka(n === null ? 'Неверный код.' : 'Неверный код. Осталось попыток: ' + n); f.select(); return; }
    if (o === 'istek') { kodOshibka('Код истёк. Ответьте «да» в боте ещё раз — придёт новый.'); f.value = ''; return; }
    if (o === 'net_koda') { kodOshibka('Кода ещё нет: сначала ответьте «да» в Telegram.'); return; }
    if (o === 'popytki' || r.status === 429) { kodOshibka('Слишком много попыток. Начните подключение заново в программе.'); f.disabled = true; if (kn) kn.disabled = true; oprosit(); return; }
    kodOshibka('Не получилось проверить код. Попробуйте ещё раз.');
  }
  main.addEventListener('input', (e) => {
    if (e.target !== pole_kod()) return;
    const v = e.target.value.replace(/\D/g, '').slice(0, 6); if (v !== e.target.value) e.target.value = v;
    if (v.length < 6) { if (!$('[data-kod-osh]').hidden) kodOshibka(''); return; }
    otpravitKod();   // вставили или набрали шесть цифр — проверяем сразу
  });
  main.addEventListener('keydown', (e) => { if (e.target === pole_kod() && e.key === 'Enter') { e.preventDefault(); otpravitKod(); } });

  // ---- действия ----
  main.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-ssylka]');
    if (a && a.getAttribute('href') && vid === 'prosba') { pokazat('zhdem'); dalee(); }   // ссылка открывается сама (обычная ссылка, без ожидания — иначе браузер режет окно)
    if (e.target.closest && e.target.closest('[data-kod-otpr]')) { otpravitKod(); return; }
    const y = e.target.closest && e.target.closest('[data-yaz]');
    if (y && I && y.dataset.yaz !== I.ui) { I.set(y.dataset.yaz); location.reload(); }   // запрос живёт на сервере — перезагрузка его не теряет
  });
  $$('[data-yaz]').forEach((b) => { b.setAttribute('aria-pressed', String(!!I && b.dataset.yaz === I.ui)); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !KONEC[vid]) oprosit(); });   // вернулись из Telegram — сразу проверяем
  window.addEventListener('pageshow', (e) => { if (e.persisted && !KONEC[vid]) oprosit(); });
  document.title = t('Подключение программы') + ' · JASA';
  oprosit();
})();
