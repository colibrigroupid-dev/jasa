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
  const SOST = ['prosba', 'zhdem', 'gotovo', 'otkaz', 'vremya_vyshlo', 'pochta', 'vyklyucheno', 'nevernaya_ssylka'];
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

  // ---- данные: чистим до показа ----
  const BEZ_UPRAVL = /[\u0000-\u001F\u007F-\u009F؜​-‏‪-‮⁠-⁩﻿]/g;   // управляющие и переворот письма (подмена «имени» справа налево)
  const EST_UPRAVL = new RegExp(BEZ_UPRAVL.source);   // без флага g: test() не помнит прошлый вызов
  const chistyj = (v, max) => String(v == null ? '' : v).replace(BEZ_UPRAVL, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const imya = (v) => { const s = chistyj(v, 400); return s.length > 80 ? s.slice(0, 79).trim() + '…' : s; };   // обрезали — видно, что обрезали
  const host = (v) => { const h = chistyj(v, 200).toLowerCase(); return h.length <= 70 && /^[a-z0-9.-]+(:\d{1,5})?$/.test(h) ? h : ''; };   // обрезанный адрес «настоящим» не покажем — лучше никакого
  const kod = (v) => { const k = chistyj(v, 12); return /^\d{4,8}$/.test(k) ? k : ''; };
  const ssylka = (v) => { const s = chistyj(v, 300); return /^https:\/\/t\.me\/[A-Za-z0-9_]{3,64}\?start=[A-Za-z0-9_-]{1,64}$/.test(s) ? s : ''; };
  function perehod(v) {
    const s = String(v == null ? '' : v).trim(); if (!s || s.length > 4000 || EST_UPRAVL.test(s)) return '';
    let u; try { u = new URL(s); } catch (e) { return ''; }
    if (PLOHIE_SHEMY.test(u.protocol)) return '';   // страховка; по договору сервер и так отдаёт только https
    if (u.protocol !== 'https:') return '';   // своих схем и адресов своей машины в первой версии нет (договор 38426a4)
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
    pole('kod_sverki', kod(d.kod_sverki) || '····');
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
    const u = perehod(z && z.perehod);
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
    z = d; zapolnit(d); pokazat(pokaz);
    dalee();
  }

  // ---- действия ----
  main.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-ssylka]');
    if (a && a.getAttribute('href') && vid === 'prosba') { pokazat('zhdem'); dalee(); }   // ссылка открывается сама (обычная ссылка, без ожидания — иначе браузер режет окно)
    const y = e.target.closest && e.target.closest('[data-yaz]');
    if (y && I && y.dataset.yaz !== I.ui) { I.set(y.dataset.yaz); location.reload(); }   // запрос живёт на сервере — перезагрузка его не теряет
  });
  $$('[data-yaz]').forEach((b) => { b.setAttribute('aria-pressed', String(!!I && b.dataset.yaz === I.ui)); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !KONEC[vid]) oprosit(); });   // вернулись из Telegram — сразу проверяем
  window.addEventListener('pageshow', (e) => { if (e.persisted && !KONEC[vid]) oprosit(); });
  document.title = t('Подключение программы') + ' · JASA';
  oprosit();
})();
