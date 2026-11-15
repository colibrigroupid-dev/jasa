/* JASA · «Клиенты» — раздел только для владельца (15.11.2026, dizajn-ux; договор KAK-CHASY/API-KLIENTY.md, kod-chistka).
   Просьба Александра: «где смотреть всех, кто подписался, и активность». Сверху деньги дня (/api/admin/dengi) и воронка за 7 дней,
   30 дней и всё время; ниже люди — поиск, сортировка; по нажатию карточка человека: работы, счета, оплаты, подписка, партнёр,
   история кредитов и «Написать в Telegram» (ссылка t.me/<ник>, сами сообщения не шлём).
   Условия bezopasnost: вход в раздел — только при vladelec в /api/me, остальным ни одного запроса к /api/admin/*; поиск и номер
   человека — в теле POST, не в адресе; ответы не кладутся в localStorage; имена, ники, номера, суммы — данные (data-no-i18n).
   Строки интерфейса — по-русски здесь, переводы — в i18n.js. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, $, arr, S, toast } = J;
  const main = $('#main');
  const d = (s) => `<span data-no-i18n>${esc(s == null ? '' : s)}</span>`;
  const tng = (n) => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  const kr = (n) => (Math.round((+n || 0) * 10) / 10).toString().replace('.', ',');
  const KR = (n, plus) => d((plus && +n > 0 ? '+' : '') + kr(n)) + ' <span>кр</span>';   /* число — данные, «кр» — слово интерфейса */
  const vladelec = () => !!(S.me && S.me.vladelec === true);

  // состояние экрана — только в памяти: ответы с людьми в хранилище браузера не ложатся (условие bezopasnost)
  const K = { okno: '30', dengi: null, spisok: null, iskat: '', sort: 'aktivnost', zagr: false, oshibka: '', pok: 0 };

  const TIP = { post: 'Пост', afisha: 'Афиша', karusel: 'Карусель', rils: 'Рилс', plan: 'Контент-план', kartinka: 'Картинка', video: 'Видео' };
  const STATUS_SCHETA = { vystavlen: 'ждёт оплаты', v_rabote: 'зачисляется', oplachen: 'оплачен', otmenyon: 'отменён', istyok: 'истёк' };
  const STATUS_OPLATY = { gotovo: 'проведена', vozvrat: 'возврат' };
  const SORT = [['aktivnost', 'Последняя активность'], ['prishel', 'Когда пришёл'], ['oplacheno', 'Оплачено'], ['potracheno', 'Потратил'], ['kredity', 'Баланс'], ['rabot', 'Работ']];
  const VORONKA = [['prishli', 'Пришли'], ['voshli', 'Вошли'], ['sdelali_rabotu', 'Сделали работу'], ['vystavili_schet', 'Выставили счёт'], ['oplatili', 'Оплатили'], ['oplatili_povtorno', 'Оплатили второй раз']];

  // ---- данные ----
  async function zagruzit() {
    const g = ++K.pok; K.zagr = true; K.oshibka = ''; risovat();
    try {
      const [dg, sp] = await Promise.all([api('/api/admin/dengi').catch(() => null), api('/api/admin/klienty', { iskat: K.iskat, predel: 500 })]);
      if (g !== K.pok) return;
      K.dengi = dg; K.spisok = sp;
    } catch (e) { if (g !== K.pok) return; K.oshibka = e.message; }
    K.zagr = false; risovat();
  }
  let iskT = null;
  async function iskat(v) {
    K.iskat = v; clearTimeout(iskT);
    iskT = setTimeout(async () => {
      const g = ++K.pok;
      try { const sp = await api('/api/admin/klienty', { iskat: K.iskat, predel: 500 }); if (g !== K.pok) return; K.spisok = sp; K.oshibka = ''; }
      catch (e) { if (g !== K.pok) return; K.oshibka = e.message; }
      risovatSpisok();
    }, 350);
  }

  // ---- отрисовка ----
  const pustoNe = (x) => x !== null && x !== undefined && x !== '';
  function dengiHtml() {
    const c = K.dengi; if (!c) return '';
    const plitki = [['Заработано сегодня', tng(c.zarabotano_tenge)], ['Оплат сегодня', c.oplat], ['Новых людей', c.novyh_lyudej], ['Работ сегодня', c.rabot], ['Расход у поставщиков', tng(c.rashod_tenge)]].filter((x) => pustoNe(x[1]));
    return `<section class="kl-dengi" aria-label="Деньги дня"><span class="caps">Деньги дня</span>${c.den ? ' ' + d('· ' + c.den) : ''}
      <div class="kl-plitki">${plitki.map(([n, v]) => `<div class="kl-plitka"><span>${n}</span><b>${d(v)}</b></div>`).join('')}</div></section>`;
  }
  function voronkaHtml() {
    const v = K.spisok && K.spisok.voronka && K.spisok.voronka[K.okno]; if (!v) return '';
    let pred = null;
    const shagi = VORONKA.map(([kl, n]) => { const x = +v[kl] || 0; const proc = pred ? Math.round((x / pred) * 100) : null; pred = x || null; return { n, x, proc }; });
    const max = Math.max(1, ...shagi.map((s) => s.x));
    return `<section class="kl-voronka"><div class="kl-vhead"><span class="caps">Воронка</span>
        <div class="bs-seg kl-seg" role="group" aria-label="Период">${[['7', '7 дней'], ['30', '30 дней'], ['vse', 'Всё время']].map(([k, n]) => `<button type="button" data-okno="${k}" class="${K.okno === k ? 'on' : ''}" aria-pressed="${K.okno === k}">${n}</button>`).join('')}</div></div>
      <ol class="kl-shagi">${shagi.map((s) => `<li><span class="kl-sn">${s.n}</span><span class="kl-bar"><i style="width:${Math.max(2, Math.round((s.x / max) * 100))}%"></i></span><b>${d(s.x)}</b><em>${s.proc === null ? '' : d(s.proc + ' %')}</em></li>`).join('')}</ol>
      <p class="small muted">Оплачено за период: ${d(tng(v.oplacheno_tenge))}${pustoNe(v.gosti) ? ` · <span>гостей</span> ${d(v.gosti)}` : ''}</p></section>`;
  }
  const kluchSort = { aktivnost: (x) => x.poslednyaya_aktivnost || '', prishel: (x) => x.prishel || '', oplacheno: (x) => +x.oplacheno_tenge || 0, potracheno: (x) => +x.potracheno || 0, kredity: (x) => +x.kredity || 0, rabot: (x) => +x.rabot || 0 };
  function lyudi() {
    const ls = arr(K.spisok && K.spisok.lyudi).slice(); const f = kluchSort[K.sort] || kluchSort.aktivnost;
    return ls.sort((a, b) => { const x = f(a), y = f(b); return x < y ? 1 : x > y ? -1 : 0; });
  }
  function chelovekHtml(x) {
    const pod = x.podpiska && x.podpiska.aktivna;
    return `<button type="button" class="kl-chel" data-uid="${esc(x.uid)}">
      <span class="kl-imya"><b>${d(x.imya || x.nik || x.uid)}</b>${x.nik ? d('@' + x.nik) : ''}</span>
      <span class="kl-metki">${x.platit ? '<span class="kl-metka pl">платит</span>' : ''}${pod ? '<span class="kl-metka">подписка</span>' : ''}${x.schetov_otkrytyh ? '<span class="kl-metka sch">счёт открыт</span>' : ''}</span>
      <span class="kl-cifry">
        <span><i>Пришёл</i> ${d(x.prishel || '—')}</span>
        <span><i>Активность</i> ${d(x.poslednyaya_aktivnost || '—')}</span>
        <span><i>Работ</i> ${d(x.rabot || 0)}</span>
        <span><i>Потратил</i> ${KR(x.potracheno)}</span>
        <span><i>Баланс</i> ${KR(x.kredity)}</span>
        <span><i>Оплаты</i> ${d((x.oplat || 0) + ' · ' + tng(x.oplacheno_tenge))}</span>
      </span></button>`;
  }
  function spisokHtml() {
    if (!K.spisok) return '';
    const ls = lyudi();
    return `<div class="kl-spisok-top"><span class="caps">Люди</span> ${d(K.spisok.vsego_lyudej != null ? K.spisok.vsego_lyudej : ls.length)}${K.spisok.obrezano ? ' <span class="small muted">· число работ неполное: сервер прочитал не все записи</span>' : ''}</div>
      ${ls.length ? `<div class="kl-lyudi">${ls.map(chelovekHtml).join('')}</div>` : `<p class="muted">${K.iskat ? 'Никого не нашлось.' : 'Пока никого.'}</p>`}`;
  }
  function risovatSpisok() { const box = $('#kl-spisok'); if (box) { box.innerHTML = (K.oshibka ? `<div class="warn">${d(K.oshibka)}</div>` : '') + spisokHtml(); } }
  function risovat() {
    if (!main || !document.getElementById('kl')) return;
    const box = $('#kl');
    if (!vladelec()) { box.innerHTML = '<p class="muted">Раздел только для владельца.</p>'; return; }
    if (!K.spisok && K.zagr) { box.innerHTML = '<p class="muted" role="status">Загружаю…</p>'; return; }
    box.innerHTML = `${dengiHtml()}${voronkaHtml()}
      <section class="kl-lyudi-sec">
        <div class="kl-poisk"><input id="kl-iskat" type="search" placeholder="Имя, ник или номер" aria-label="Поиск по имени, нику или номеру" value="${esc(K.iskat)}" autocomplete="off">
          <label class="kl-sort"><span>Сортировка</span><select id="kl-sort">${SORT.map(([k, n]) => `<option value="${k}" ${K.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <div id="kl-spisok"></div></section>`;
    risovatSpisok();
  }

  // ---- карточка человека ----
  function schetChto(s) {
    const n = (x) => String(parseInt(x, 10) || 0);   /* только число — из полей сервера в разметку ничего, кроме цифр */
    if (s.tip === 'podpiska') return 'подписка на ' + n(s.dnej || 30) + ' дней';
    if (s.tip === 'paket') return 'пакет ' + n(s.paket || s.kr) + ' кредитов';
    return n(s.kr) + ' кредитов';
  }
  const tablica = (zag, stroki) => (stroki.length ? `<h4>${zag}</h4><div class="kl-tab">${stroki.join('')}</div>` : '');
  async function kartochka(uid) {
    const g = ++K.pok;
    const sh = J.bsheet(J.bsHead('Клиент') + '<div class="kl-kart" id="kl-kart"><p class="muted" role="status">Загружаю…</p></div>');
    sh.el.addEventListener('click', (e) => { if (e.target.closest('[data-bs-close]')) sh.close(); });
    let o;
    try { o = await api('/api/admin/klienty/kartochka', { uid }); } catch (e) { const b = sh.el.querySelector('#kl-kart'); if (b) b.innerHTML = `<div class="warn">${d(e.message)}</div>`; return; }
    if (g !== K.pok && !sh.el.isConnected) return;
    const c = o.chelovek || {}; const p = o.podpiska; const pt = o.partner || {};
    const b = sh.el.querySelector('#kl-kart'); if (!b) return;
    b.innerHTML = `<div class="kl-kart-top"><div><b class="kl-kart-imya">${d(c.imya || c.nik || c.uid)}</b>${c.nik ? '<br>' + d('@' + c.nik) : ''}<br><span class="small dim">${d(c.uid)}</span></div>
        ${c.nik ? `<a class="btn sm accent" href="https://t.me/${encodeURIComponent(c.nik)}" target="_blank" rel="noopener noreferrer">Написать в Telegram</a>` : '<span class="small muted">Ника в Telegram нет — написать отсюда нельзя.</span>'}</div>
      <div class="kl-cifry kl-kart-cifry">
        <span><i>Пришёл</i> ${d(c.prishel || '—')}</span><span><i>Активность</i> ${d(c.poslednyaya_aktivnost || '—')}</span>
        <span><i>Баланс</i> ${KR(c.kredity)}</span><span><i>Потратил</i> ${KR(c.potracheno)}</span>
        <span><i>Оплачено</i> ${d(tng(c.oplacheno_tenge))}</span><span><i>Опубликовано</i> ${d(c.opublikovano || 0)}</span>
        <span><i>Подписка</i> ${p && p.aktivna ? '<span>активна до:</span> ' + d(p.do) : '<span>нет</span>'}</span>
        <span><i>Пригласил</i> ${pt.priglasil ? d(pt.priglasil) : '<span>никто</span>'}</span>
        ${pt.priglasheno_lyudej ? `<span><i>Привёл людей</i> ${d(pt.priglasheno_lyudej)}</span>` : ''}
      </div>
      ${tablica('Работы', arr(o.raboty).map((r) => `<div class="kl-str"><span>${TIP[r.tip] ? '<span>' + TIP[r.tip] + '</span>' : d(r.tip)}${r.pravka ? ' · <span>правка</span>' : ''}${r.peredelka ? ' · <span>переделка</span>' : ''}</span><span>${d(r.kogda)}</span><b>${KR(r.kredity)}</b></div>`))}
      ${tablica('Счета', arr(o.scheta).map((s) => `<div class="kl-str"><span>${d(s.id)} · <span>${schetChto(s)}</span></span><span><span>${STATUS_SCHETA[s.status] || esc(s.status)}</span> · ${d(s.kogda)}</span><b>${d(tng(s.tenge))}</b></div>`))}
      ${tablica('Оплаты', arr(o.oplaty).map((s) => `<div class="kl-str"><span>${d(s.schet || '—')}${s.podpiska ? ' · <span>подписка</span>' : s.kr ? ' · ' + KR(s.kr) : ''}</span><span><span>${STATUS_OPLATY[s.status] || esc(s.status)}</span> · ${d(s.kogda)}</span><b>${d(tng(s.tenge))}</b></div>`))}
      ${tablica('История кредитов', arr(o.istoriya).map((h) => `<div class="kl-str"><span>${J.istChto ? J.istChto(h) : esc(h.chto || '')}</span><span>${d(h.ts || h.kogda || '')}</span><b>${h.besplatno ? '<span>бесплатно</span>' : d((h.vozvrat ? '+' : '−') + kr(h.kr)) + ' <span>кр</span>'}</b></div>`))}`;
  }

  // ---- экран ----
  function stil() {
    if (document.getElementById('kl-style')) return;
    const s = document.createElement('style'); s.id = 'kl-style';
    s.textContent = `#kl{max-width:980px}
#kl .kl-dengi,#kl .kl-voronka,#kl .kl-lyudi-sec{margin-top:18px}
#kl .kl-plitki{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px}
#kl .kl-plitka{border:1px solid var(--line);border-radius:var(--r-sm,12px);padding:12px 14px;background:var(--surface);min-width:0}
#kl .kl-plitka span{display:block;font-size:var(--fs-small);color:var(--muted)}#kl .kl-plitka b{display:block;font-size:1.25rem;margin-top:4px;overflow-wrap:anywhere}
#kl .kl-vhead{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
#kl .kl-seg{max-width:360px;flex:1 1 240px}
#kl .kl-shagi{list-style:none;margin:12px 0 8px;padding:0;display:flex;flex-direction:column;gap:8px}
#kl .kl-shagi li{display:grid;grid-template-columns:minmax(110px,180px) 1fr auto 52px;align-items:center;gap:10px}
#kl .kl-sn{font-size:var(--fs-small)}#kl .kl-shagi b{text-align:right;min-width:2ch}#kl .kl-shagi em{font-style:normal;color:var(--muted);font-size:var(--fs-small);text-align:right}
#kl .kl-bar{height:10px;border-radius:6px;background:var(--surface-2,var(--line));overflow:hidden}#kl .kl-bar i{display:block;height:100%;background:var(--accent);border-radius:6px}
#kl .kl-poisk{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:12px}
#kl .kl-poisk input{flex:1 1 220px;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:var(--r-sm,12px);background:var(--field,var(--surface));font:inherit;color:inherit}
#kl .kl-sort{display:flex;flex-direction:column;gap:4px;font-size:var(--fs-small);color:var(--muted)}#kl .kl-sort select{min-height:44px;font:inherit}
#kl .kl-spisok-top{margin-bottom:8px}
#kl .kl-lyudi{display:flex;flex-direction:column;gap:8px}
#kl .kl-chel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;width:100%;text-align:left;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r-sm,12px);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;min-height:44px}
#kl .kl-chel:hover{border-color:var(--ink)}
#kl .kl-imya{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;min-width:0;overflow-wrap:anywhere}#kl .kl-imya span{color:var(--muted);font-size:var(--fs-small)}
#kl .kl-metki{display:flex;flex-wrap:wrap;gap:4px;justify-content:end}
.kl-metka{white-space:nowrap;font-size:.72rem;padding:2px 8px;border-radius:999px;background:var(--surface-2,var(--line));color:var(--ink)}.kl-metka.pl{background:var(--accent);color:var(--accent-ink,#fff)}
.kl-cifry{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px 12px;font-size:var(--fs-small)}
.kl-cifry i{display:block;font-style:normal;color:var(--muted);font-size:.75rem}
.kl-kart{padding:4px 2px 12px}.kl-kart-top{display:flex;flex-wrap:wrap;gap:10px;align-items:start;justify-content:space-between;margin-bottom:12px}
.kl-kart-imya{font-size:1.15rem}.kl-kart-top .btn{min-height:44px;display:inline-flex;align-items:center}
.kl-kart-cifry{margin-bottom:8px}.kl-kart h4{margin:16px 0 6px;font-size:.95rem}
.kl-tab{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--r-sm,12px);overflow:hidden}
.kl-str{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto;gap:8px;padding:8px 12px;font-size:var(--fs-small);border-top:1px solid var(--line)}.kl-str:first-child{border-top:0}
.kl-str>*{min-width:0;overflow-wrap:anywhere}.kl-str b{text-align:right;white-space:nowrap}
@media (max-width:640px){#kl .kl-chel{grid-template-columns:minmax(0,1fr)}#kl .kl-metki{justify-content:start}#kl .kl-shagi li{grid-template-columns:minmax(0,1fr) auto 44px;}#kl .kl-shagi .kl-bar{grid-column:1/-1;order:3}.kl-str{grid-template-columns:minmax(0,1fr) auto}.kl-str>span:nth-child(2){grid-column:1/-1;order:3;color:var(--muted)}}`;
    document.head.appendChild(s);
  }
  function screen() {
    stil();
    main.innerHTML = J.topbar('Клиенты') + '<div id="kl"></div>';
    if (!vladelec()) { risovat(); return; }   /* не владельцу — ни одного запроса к /api/admin/* */
    risovat(); zagruzit();
  }
  // события — одним слушателем на #main (экран перерисовывается целиком)
  main.addEventListener('click', (e) => {
    if (!document.getElementById('kl')) return;
    const o = e.target.closest('[data-okno]'); if (o) { K.okno = o.dataset.okno; risovat(); return; }
    const c = e.target.closest('.kl-chel'); if (c && vladelec()) { kartochka(c.dataset.uid); }
  });
  main.addEventListener('input', (e) => { if (e.target && e.target.id === 'kl-iskat' && vladelec()) iskat(e.target.value.trim()); });
  main.addEventListener('change', (e) => { if (e.target && e.target.id === 'kl-sort') { K.sort = e.target.value; risovatSpisok(); } });

  // вход в раздел — карточкой в кабинете, только владельцу
  function vKabinet() {
    const k = $('#kab'); if (!k || $('#kl-vhod') || !vladelec()) return;
    const two = k.querySelector('.two'); if (!two) return;
    const card = document.createElement('div'); card.className = 'card'; card.id = 'kl-vhod'; card.style.marginTop = '22px';
    card.innerHTML = '<span class="caps">Только вам</span><h3 style="margin:8px 0 6px">Клиенты</h3><p class="small muted">Кто пришёл, кто платит, воронка и деньги дня.</p><a class="btn sm" href="#/klienty" style="margin-top:10px">Открыть «Клиенты»</a>';
    two.before(card);
  }
  new MutationObserver(() => { if ($('#kab') && !$('#kl-vhod')) vKabinet(); }).observe(main, { childList: true, subtree: true });
  if ($('#kab')) vKabinet();
  // признак владельца приходит с /api/me после первой отрисовки — перерисовать раздел, если он открыт
  (S.meP || Promise.resolve()).then(() => { if ((location.hash || '').startsWith('#/klienty')) screen(); else vKabinet(); });

  J.routes.klienty = screen;
  J.klienty = { K };
  if ((location.hash || '').startsWith('#/klienty')) J.route();
})();
