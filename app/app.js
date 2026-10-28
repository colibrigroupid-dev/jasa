/* JASA · кабинет · прототип 27.10.2026. Без сборки, без библиотек. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const col = (c, d) => (/^#[0-9a-fA-F]{3,8}$/.test(String(c || '')) ? c : d);
  const arr = (a) => (Array.isArray(a) ? a : []);
  const main = $('#main');

  // ---------- состояние ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jasa:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jasa:' + k, JSON.stringify(v)); } catch (e) { /* приватное окно */ } },
  };
  const S = {
    credits: store.get('credits', 300),
    brend: store.get('brend', null),
    useBrend: store.get('useBrend', true),
    feed: store.get('feed', []),
    tip: 'post',
    yazyk: 'ru',
    job: store.get('job', null),
    status: { key: false, images: false },
    accepted: store.get('accepted', {}),
    spentJobs: store.get('spentJobs', {}),
    pollToken: 0,
    session: store.get('session', null),
    brandId: store.get('brandId', null),
    brandName: store.get('brandName', null),
    me: null,
    ceny: { image: 12, zadanie: { post: 45, afisha: 45, karusel: 45, rils: 6, plan: 6, dna: 6 }, depo_prochitat: 2 },
    recepty: [],
    stil: store.get('stil', []),
    lastError: '',
  };
  function spend(k, ostatok) { S.credits = typeof ostatok === 'number' ? ostatok : Math.max(0, Math.round((S.credits - (k || 0)) * 10) / 10); store.set('credits', S.credits); drawCredits(); }
  function drawCredits() { $('#cred').textContent = Math.floor(+S.credits || 0); $('#cred').title = S.credits + ' кр'; $('#credbar').style.width = Math.min(100, S.credits / 3) + '%'; const ta = document.getElementById('ask'); if (ta) ta.dispatchEvent(new Event('input')); }
  drawCredits();

  // ---------- Telegram Mini App ----------
  const TG = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData ? window.Telegram.WebApp : null;
  const API_BASE = /^(jasa\.asia|www\.jasa\.asia)$/.test(location.hostname) ? 'https://api.jasa.asia' : '';
  if (TG) {
    try { TG.ready(); TG.expand(); document.documentElement.classList.add('tg'); if (TG.setHeaderColor) TG.setHeaderColor('#F5F1E8'); if (TG.setBackgroundColor) TG.setBackgroundColor('#F5F1E8'); } catch (e) { /* старый клиент */ }
  }

  // ---------- API ----------
  async function api(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (TG) headers['X-Tg-Init'] = TG.initData;
    else if (S.session) headers['X-Session'] = S.session;
    const r = await fetch(API_BASE + path, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
    const j = await r.json().catch(() => ({ error: 'сервер ответил не JSON' }));
    if (!r.ok) throw new Error(j.error || ('ошибка ' + r.status));
    return j;
  }
  api('/api/status').then((s) => { S.status = s; }).catch(() => {});
  api('/api/ceny').then((c) => { S.ceny = c; const ta = document.getElementById('ask'); if (ta) ta.dispatchEvent(new Event('input')); }).catch(() => {});
  api('/api/recepty').then((r) => { S.recepty = arr(r.recepty); const box = $('#recepty'); if (box) box.innerHTML = receptyHtml(); }).catch(() => {});
  // цена до запуска = тем же расчётом, что резерв на сервере (Plumar: «цена под кнопкой совпадает со счётом»)
  const priceOf = (tip) => (S.ceny.zadanie && S.ceny.zadanie[tip]) || 3;
  const priceLabel = (tip, extra) => 'до ' + (priceOf(tip) + (extra || 0)) + ' кр';
  const LINK_RE = /https?:\/\/\S*(instagram\.com|tiktok\.com|youtu|vk\.com)\S*/;
  function loadMe() { return api('/api/me').then((m) => { S.me = m; S.credits = m.kredity; store.set('credits', S.credits); drawCredits(); const n = $('#acctname'); if (n) n.textContent = m.guest ? 'Гость' : (m.name || 'Вы'); const sub = n && n.nextElementSibling; if (sub) sub.textContent = m.guest ? 'войти через Telegram →' : 'первая волна · ' + (m.username ? '@' + m.username : 'Telegram'); return m; }).catch(() => null); }
  loadMe();

  // ---------- тема ----------
  const theme = TG && TG.colorScheme === 'dark' ? 'dark' : store.get('theme', 'light');
  document.documentElement.dataset.theme = theme;
  $('#theme').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; store.set('theme', t);
    $('meta[name=theme-color]').content = t === 'dark' ? '#0f0f0f' : '#F5F1E8';
  });

  // ---------- маршруты ----------
  const routes = { sozdat, trendy, brend, kanaly, scenariy, biblioteka, tarify, kabinet };
  // Лестница: в первый раз в меню только «Создать». Остальные разделы человек открывает сам — через «Ещё разделы»
  // или приглашение после результата — и они остаются в меню навсегда.
  const NAV = [
    { r: 'sozdat', i: 'i-spark', n: 'Создать', d: 'Пост, рилс, афиша — голосом или текстом' },
    { r: 'brend', i: 'i-dna', n: 'Мой бренд', s: 'Бренд', d: 'Чтобы посты звучали как вы' },
    { r: 'kanaly', i: 'i-chan', n: 'Мои каналы', s: 'Каналы', d: 'Где публикуете — JASA подстроит формат' },
    { r: 'trendy', i: 'i-trend', n: 'Тренды', tag: 'KZ', d: 'Форматы, которые заходят' },
    { r: 'izuchit', i: 'i-lupa', n: 'Изучить', tag: 'Рилс', d: 'Разобрать ролик по ссылке: текст, крючки, кадры, сценарий' },
    { r: 'biblioteka', i: 'i-lib', n: 'Библиотека', d: 'Всё сделанное и ваши кадры для стиля' },
    { r: 'multiki', i: 'i-multik', n: 'Мультики', tag: 'Урок', d: 'Обучающий мультик к уроку — по шагам' },
    { r: 'scenariy', i: 'i-film', n: 'Кино', tag: 'Studio', d: 'Разбор сценария фильма или сериала' },
    { r: 'partnery', i: 'i-share', n: 'Партнёрам', tag: '10 %', d: 'Приглашайте — 10 % и 5 % с оплат' },
    { r: 'tarify', i: 'i-tarif', n: 'Тарифы', d: 'Кредиты и пакеты' },
    { r: 'kabinet', i: 'i-user', n: 'Кабинет', d: 'Вход, баланс, история' },
  ];
  S.open = store.get('open', null) || ['sozdat'].concat(S.feed.length ? ['brend'] : []);
  S.made = +store.get('made', S.feed.filter((x) => x.state === 'done').length) || 0;
  function openSec(r) { if (routes[r] && !S.open.includes(r)) { S.open.push(r); store.set('open', S.open); drawNav(); } }
  const navLink = (x) => `<a href="#/${x.r}" data-r="${x.r}"><svg><use href="#${x.i}"/></svg>${x.n}${x.tag ? `<span class="tag">${x.tag}</span>` : ''}</a>`;
  function drawNav() {
    const vis = NAV.filter((x) => S.open.includes(x.r)), rest = NAV.filter((x) => !S.open.includes(x.r));
    $('#nav').innerHTML = vis.map(navLink).join('') + (rest.length ? `<button class="navmore" type="button" data-more><svg><use href="#i-grid"/></svg>Ещё разделы<span class="tag">${rest.length}</span></button>` : '');
    const tb = vis.filter((x) => x.r !== 'kabinet').slice(0, 4);
    $('#tabbar').innerHTML = tb.map((x) => `<a href="#/${x.r}" data-r="${x.r}"><svg><use href="#${x.i}"/></svg>${x.s || x.n}</a>`).join('') + `<button type="button" data-more><svg><use href="#i-grid"/></svg>Ещё</button>`;
    markNav();
  }
  function markNav() { const h = (location.hash || '#/sozdat').replace('#/', '').split('?')[0]; $$('#nav a, #tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.r === (routes[h] ? h : 'sozdat'))); }
  function moreSheet() {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="mbox more"><button type="button" class="lbx mx" aria-label="Закрыть">×</button><span class="caps">Разделы</span><h3 style="margin:6px 0 4px">Откройте, что нужно</h3><p class="small muted" style="margin-bottom:14px">Открытый раздел остаётся в меню.</p>
      <div class="morelist">${NAV.map((x) => `<a href="#/${x.r}" class="${S.open.includes(x.r) ? 'is' : ''}"><svg><use href="#${x.i}"/></svg><span><b>${x.n}</b><small>${x.d}</small></span>${S.open.includes(x.r) ? '<em>в меню</em>' : '<em>открыть</em>'}</a>`).join('')}</div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.mx') || e.target.closest('a')) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { e.preventDefault(); moreSheet(); } });
  if (S.brandId) S.open.includes('brend') || S.open.push('brend');   // бренд уже есть — его раздел сразу в меню
  drawNav();
  function route() {
    const h = (location.hash || '#/sozdat').replace('#/', '').split('?')[0];
    const fn = routes[h] || sozdat;
    openSec(routes[h] ? h : 'sozdat');
    markNav();
    S.pollToken++;
    main.innerHTML = '';
    fn();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);

  function topbar(title, right) {
    return `<div class="topbar"><div class="crumbs"><span>JASA</span><span>·</span><b>${esc(title)}</b></div><div>${right || ''}</div></div>`;
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

  function sozdat() {
    const first = !S.feed.length;
    const recOpen = store.get('recOpen', false);
    main.innerHTML = topbar('Создать', S.made || S.brandId ? brandPill() : '') + `
      <section class="hero ${first ? '' : 'compact'}">
        <h1>${first ? 'Что <em>сделать</em>?' : 'Что ещё <em>сделать</em>?'}</h1>
        ${first ? '<p>Скажите голосом или напишите. Через минуту — готовый текст и три картинки на выбор.</p>' : ''}
        <div class="examples" id="examples">${EXAMPLES.map(([t, l, e]) => `<button data-tip="${t}" data-text="${esc(e)}">${esc(l)}</button>`).join('')}<button class="more-ideas" id="ideas" type="button" aria-expanded="${recOpen}">Готовые идеи${S.recepty.length ? ' · ' + S.recepty.length : ''} ${recOpen ? '▴' : '▾'}</button></div>
      </section>
      <section class="recwrap ${recOpen ? '' : 'hide'}" id="recwrap"><div class="rechead"><span class="caps">Готовые идеи · 2–3 поля, остальное сделает JASA</span><span class="dim small">цена видна до запуска</span></div><div class="recepty" id="recepty">${receptyHtml()}</div></section>
      <div class="feed" id="feed"></div>
      <div class="composer" id="composer">
        <div class="box">
          ${stilPill()}
          <textarea id="ask" rows="1" placeholder="Например: пост про открытие второго салона в Астане"></textarea>
          <div class="row">
            <div class="chips" id="tips">${Object.entries(TIPS).map(([k, v]) => `<button class="chip ${k === S.tip ? 'on' : ''} ${TIPS_MAIN.includes(k) || k === S.tip || store.get('tipsAll', false) ? '' : 'hide'}" data-tip="${k}">${v}</button>`).join('')}${store.get('tipsAll', false) ? '' : '<button class="chip ghost" id="tipsmore" type="button" title="Карусель, план на неделю">ещё</button>'}</div>
            <div class="send">
              <button class="chip ${S.yazyk === 'kz' ? 'on' : ''}" id="lang" title="Язык результата">${S.yazyk === 'kz' ? 'Қаз' : 'Рус'}</button>
              <button class="icobtn" id="mic" title="Сказать голосом"><svg><use href="#i-mic"/></svg></button>
              <span class="price" id="price" title="Больше этой суммы не спишем. Текст — по факту, картинки — только готовые. Голосовой ввод — 1 кр отдельно">${priceLabel(S.tip)}</span>
              <button class="icobtn go" id="go" title="Сделать"><svg><use href="#i-send"/></svg></button>
            </div>
          </div>
        </div>
      </div>`;
    const ta = $('#ask');
    // тип задания, выбранная кнопка и цена меняются только здесь — цена не отстаёт от типа
    // как у Plumar One: цена переводится в результат — «хватит на N таких»
    const drawPrice = () => { const link = LINK_RE.test(ta.value) ? (S.ceny.transcribe || 1) : 0; const n = Math.floor((+S.credits || 0) / (priceOf(S.tip) + link)); $('#price').textContent = priceLabel(S.tip, link) + (n > 0 ? ' · хватит на ' + n : ' · не хватает'); $('#price').classList.toggle('low', n < 1); $('#price').title = link ? 'Включает разбор ссылки-примера · больше этой суммы не спишем' : 'Больше этой суммы не спишем. Текст — по факту, картинки — только готовые. Голосовой ввод — 1 кр отдельно'; };
    const setTip = (tip) => { S.tip = TIPS[tip] ? tip : 'post'; $$('#tips .chip').forEach((c) => c.classList.toggle('on', c.dataset.tip === S.tip)); drawPrice(); };
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(200, ta.scrollHeight) + 'px'; drawPrice(); };
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    $('#tips').addEventListener('click', (e) => {
      if (e.target.closest('#tipsmore')) { store.set('tipsAll', true); $$('#tips .chip.hide').forEach((c) => c.classList.remove('hide')); e.target.closest('#tipsmore').remove(); return; }
      const b = e.target.closest('.chip'); if (!b) return; setTip(b.dataset.tip); ta.focus();
    });
    $('#ideas').addEventListener('click', (e) => { const on = $('#recwrap').classList.toggle('hide') === false; store.set('recOpen', on); e.currentTarget.setAttribute('aria-expanded', on); e.currentTarget.textContent = 'Готовые идеи' + (S.recepty.length ? ' · ' + S.recepty.length : '') + (on ? ' ▴' : ' ▾'); });
    $('#recepty').addEventListener('click', (e) => { const b = e.target.closest('[data-rec]'); if (!b) return; const r = S.recepty.find((x) => x.id === b.dataset.rec); if (r) receptForm(r, (tip, text, opts) => { setTip(tip); ta.value = text; grow(); send(Object.assign({ recept: r.id }, opts)); }); });
    const sp = $('#stilpill'); if (sp) sp.addEventListener('click', () => { S.stil = []; store.set('stil', S.stil); sp.remove(); toast('Стиль из депо снят'); });
    $('#lang').addEventListener('click', (e) => { S.yazyk = S.yazyk === 'kz' ? 'ru' : 'kz'; e.currentTarget.textContent = S.yazyk === 'kz' ? 'Қаз' : 'Рус'; e.currentTarget.classList.toggle('on', S.yazyk === 'kz'); });
    $('#examples').addEventListener('click', (e) => { const b = e.target.closest('button[data-text]'); if (!b) return; setTip(b.dataset.tip); ta.value = b.dataset.text; grow(); send(); });
    $('#go').addEventListener('click', send);
    voice($('#mic'), (t) => { ta.value = (ta.value ? ta.value + ' ' : '') + t; grow(); });
    drawPrice();
    const pre = sessionStorage.getItem('jasa:prefill');
    if (pre) { const p = JSON.parse(pre); sessionStorage.removeItem('jasa:prefill'); setTip(p.tip); ta.value = p.text; grow(); if (p.auto) send({ ploshchadka: p.ploshchadka, recept: p.recept, pravka: true, besplatno: p.besplatno, poyasnenie: p.poyasnenie }); }
    S.feed.slice().reverse().slice(0, 8).forEach((item) => $('#feed').appendChild(sheet(item)));
    $('#brandpill') && $('#brandpill').addEventListener('click', () => { S.useBrend = !S.useBrend; store.set('useBrend', S.useBrend); route(); });

    async function send(opts) {
      opts = opts && !(opts instanceof Event) ? opts : {};
      let text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      // как у Plumar One: перед рекламой — три вопроса (для кого, где покажем, цель); можно пропустить
      if (!opts.reklama && !opts.pravka && /реклам|жарнама/i.test(text) && ['post', 'rils', 'afisha', 'karusel'].includes(S.tip)) {
        reklamaVoprosy((dop) => { if (dop) { ta.value = text + dop.tekst; grow(); } send(Object.assign({}, opts, { reklama: true, ploshchadka: dop && dop.ploshchadka })); });
        return;
      }
      let primer = null; const link = (text.match(LINK_RE) || [])[0];
      if (link) {
        toast('Разбираю ролик-пример…');
        try { const r = await api('/api/transcribe', { url: link }); primer = r.text; spend(1, r.ostatok); text = text.replace(link, '').trim() || 'пост в подаче этого примера'; } catch (e) { toast('Пример не разобран: ' + e.message); }
      }
      const item = { id: Date.now(), tip: S.tip, tema: text, yazyk: S.yazyk, state: 'working', primer, recept: opts.recept || '', besplatno: !!opts.besplatno };
      const el = sheet(item);
      $('#feed').prepend(el);
      ta.value = ''; grow();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const res = await api('/api/ask', { tip: item.tip, tema: text, yazyk: S.yazyk, brand_id: S.useBrend ? (S.brandId || null) : 'net', brend: S.useBrend && !S.brandId && S.brend ? S.brend : null, ploshchadka: opts.ploshchadka || (item.tip === 'rils' ? 'Instagram Reels / TikTok' : 'Instagram'), primer, depo: S.stil.length ? S.stil : undefined, besplatno: opts.besplatno || undefined });
        Object.assign(item, { state: 'done', result: res.result, kredity: res.kredity, imgJob: res.img_job, promty: res.promty, brand: res.brand || null, zid: res.zid || '', besplatno: !!res.besplatno });
        spend(res.kredity, res.ostatok);
        S.made += 1; store.set('made', S.made);
      } catch (e) {
        Object.assign(item, { state: 'error', error: e.message }); S.lastError = e.message;
      }
      S.feed.push(item); S.feed = S.feed.slice(-20); store.set('feed', S.feed);
      const done = sheet(item);
      el.replaceWith(done);
      if (item.state === 'done') { const inv = invite(); if (inv) done.after(inv); }
    }
  }

  // Приглашение открыть следующий раздел — одно за раз, после результата, без давления.
  function invite() {
    let c = null;
    if (S.made >= 1 && !S.brandId && S.made >= +store.get('skip_brend', 0)) {
      c = { k: 'brend', h: 'Чтобы следующий пост звучал как вы', p: 'Три ответа, полминуты: как называетесь, чем занимаетесь, как говорите с клиентами.', b: 'Давайте' };
    } else if (S.made >= 3 && !S.open.includes('kanaly') && S.made >= +store.get('skip_kanaly', 0)) {
      c = { k: 'kanaly', h: 'Где вы публикуете?', p: 'Добавьте свои каналы и страницы — JASA подстроит длину и формат под каждую площадку.', b: 'Добавить каналы' };
    }
    if (!c) return null;
    const el = document.createElement('div'); el.className = 'invite rv';
    el.innerHTML = `<div><b>${c.h}</b><p>${c.p}</p></div><div class="ib"><a class="btn sm accent" href="#/${c.k}">${c.b}</a><button class="btn sm quiet" type="button">Не сейчас</button></div>`;
    el.querySelector('button').addEventListener('click', () => { store.set('skip_' + c.k, S.made + 3); el.remove(); });   // «Не сейчас» — спросим через 3 результата
    return el;
  }

  function receptyHtml() {
    if (!S.recepty.length) return '<span class="dim small">Рецепты загружаются…</span>';
    const ib = document.getElementById('ideas'); if (ib && S.recepty.length && !/· \d/.test(ib.textContent)) ib.textContent = ib.textContent.replace('Готовые идеи', 'Готовые идеи · ' + S.recepty.length);
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
    ['cel', 'Чего ждём от людей', ['купить сейчас', 'написать в WhatsApp', 'записаться или оставить заявку', 'прийти на событие', 'узнать о нас']],
    ['yazyk', 'Язык', ['по-русски', 'қазақша', 'на двух языках']],
  ];
  const PLOSHCHADKA = { 'лента Instagram': 'Instagram, пост 4:5', 'сторис Instagram': 'сторис Instagram, 9:16, до 15 с, текст в безопасной зоне', 'Reels / TikTok': 'Instagram Reels / TikTok, вертикально 9:16', 'Telegram-канал': 'Telegram-канал', 'рассылка WhatsApp': 'рассылка WhatsApp, коротко, один призыв', 'статус WhatsApp': 'статус WhatsApp, вертикально 9:16, коротко', 'карточка Kaspi Магазина': 'карточка Kaspi Магазина: фото 1:1 или 3:4 на чистом фоне, без лишнего текста на фото', '2GIS': 'карточка 2GIS: фото и акция', 'офлайн: печать, баннер, экран': 'офлайн: печать, баннер, экран' };
  function reklamaHtml() {
    return `<div class="rqbox"><span class="caps">Пара вопросов — реклама попадёт точнее</span>${RQ.map(([k, l, opts]) => `<div class="rq" data-q="${k}"><label>${l}</label><div class="chips">${opts.map((o) => `<button type="button" class="chip">${esc(o)}</button>`).join('')}</div></div>`).join('')}<p class="dim small">Можно не отвечать — тогда JASA выберет сама.</p></div>`;
  }
  function reklamaSobrat(root) {
    const ot = {}; RQ.forEach(([k]) => { const c = $(`.rq[data-q="${k}"] .chip.on`, root); if (c) ot[k] = c.textContent; });
    if (!Object.keys(ot).length) return null;
    const yaz = { 'по-русски': 'Язык текста: русский.', 'қазақша': 'Язык текста: казахский, грамотный, не дословный перевод.', 'на двух языках': 'Текст на двух языках: сначала казахский, потом русский, смысл одинаковый.' }[ot.yazyk] || '';
    let t = '\n' + [ot.kogo && 'Для кого: ' + ot.kogo + (ot.kogo === 'школьники и родители' ? ' (обращаться к родителям, не к детям)' : ''), ot.gde && 'Где покажем: ' + ot.gde, ot.cel && 'Чего ждём от людей: ' + ot.cel].filter(Boolean).join('. ') + '.' + (ot.cel ? ' Призыв — под эту цель.' : '') + (ot.gde ? ' Длина и формат — под площадку.' : '') + (yaz ? ' ' + yaz : '');
    // ст. 6 п. 2 Закона РК «О рекламе»: офлайн — обязательно на казахском, русский по желанию; к интернету не применяется
    if (ot.gde === 'офлайн: печать, баннер, экран') t += ' Офлайн-реклама в РК: обязателен текст на казахском, русский — по желанию, перевод без искажения смысла; казахский текст проверить перед печатью.';
    if (['лента Instagram', 'сторис Instagram', 'Reels / TikTok'].includes(ot.gde)) t += ' Если это реклама по заказу у блогера — в начале подписи пометка «реклама / жарнама».';
    return { tekst: t, ploshchadka: PLOSHCHADKA[ot.gde] };
  }
  function reklamaVoprosy(cb) {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<form class="mbox"><button type="button" class="lbx mx" aria-label="Закрыть">×</button><h3 style="margin:0 0 4px">Это реклама?</h3><p class="small muted" style="margin-bottom:12px">Ответьте в несколько касаний — текст и формат попадут точнее. Цена не меняется.</p>${reklamaHtml()}<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn accent" type="submit">Сделать</button><button class="btn quiet" type="button" data-skip>Пропустить</button></div></form>`;
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
    if (item.fb === 'ok') return '<div class="fb rv"><span class="dim small">Спасибо, отметили.</span></div>';
    if (item.fb === 'no') return '<div class="fb rv"><span class="dim small">Отметили, что не подошло.</span></div>';
    return `<div class="fb rv"><span class="small muted">Как вам результат?</span><button class="btn sm quiet fb-ok" type="button">👍 Подходит</button><button class="btn sm quiet fb-no" type="button">👎 Не то</button></div>`;
  }
  function fbPanel(item) {
    return `<div class="fbpanel"><span class="small"><b>Что не так?</b> Отметьте — переделаем с учётом.</span><div class="chips">${FB_PRICHINY.map(([k, l]) => `<button type="button" class="chip" data-p="${k}">${l}</button>`).join('')}</div><input class="fbtext" placeholder="Своими словами: короче, теплее, без эмодзи, другая картинка…"><div class="fbsverka"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm accent fb-redo" type="button" data-plat="Переделать · ${esc(priceLabel(item.tip))}, спишем по факту" data-besp="Сверить и переделать бесплатно, если ошибка наша">Переделать · ${esc(priceLabel(item.tip))}, спишем по факту</button><button class="btn sm ghost fb-mark" type="button">Просто отметить</button></div></div>`;
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
  function stilPill() {
    if (!S.stil.length) return '';
    return `<button class="pill on stilpill" id="stilpill" type="button" title="Снять стиль"><span class="dot"></span>Стиль из депо · ${S.stil.length} ${S.stil.length === 1 ? 'кадр' : 'кадра'} ×</button>`;
  }

  function brandPill() {
    if (!S.brandId && !S.brend) return `<a class="pill" href="#/brend">Карта бренда не собрана →</a>`;
    return `<button class="pill ${S.useBrend ? 'on' : ''}" id="brandpill" title="Генерация берёт всё из карты бренда"><span class="dot"></span>${esc(S.brandName || (S.brend && S.brend.name) || 'Мой бренд')}${S.useBrend ? '' : ' · выкл'}</button>`;
  }

  // лист результата
  function sheet(item) {
    const el = document.createElement('article');
    el.className = 'sheet';
    const head = `<div class="head"><span class="kind">${TIPS[item.tip] || item.tip}</span>${item.yazyk === 'kz' ? '<span class="pill">қазақша</span>' : ''}<span class="meta">${item.besplatno ? 'бесплатно — ошибка JASA' : (item.kredity ? item.kredity + ' кр' : '')}</span></div><div class="q">${esc(item.tema)}</div>`;
    if (item.state === 'working') {
      const ags = { post: ['Понимающий', 'Копирайтер', 'Художник', 'Страж'], rils: ['Понимающий', 'Рилсмейкер', 'Художник', 'Тренд-скаут'], afisha: ['Понимающий', 'Художник', 'Копирайтер'], karusel: ['Понимающий', 'Копирайтер', 'Художник'], plan: ['Понимающий', 'Планировщик', 'Тренд-скаут'] }[item.tip] || ['Понимающий', 'Копирайтер'];
      el.innerHTML = head + `<div class="working"><span class="spin"></span><div class="agents">${ags.map((a) => `<span>${a}</span>`).join('')}</div></div>`;
      let i = 0; const sp = $$('.agents span', el);
      const tick = setInterval(() => { sp.forEach((s, k) => s.classList.toggle('on', k <= i)); i++; if (i > sp.length) clearInterval(tick); }, 1400);
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
      const c = e.target.closest('[data-copy]'); if (c) { copyText(c.dataset.copy === 'self' ? c.closest('.sheet').innerText : $(c.dataset.copy, el).innerText, c); }
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
  const actionsBlock = (extra) => `<div class="actions rv"><button class="btn sm" data-copy="self">Скопировать</button><button class="btn sm quiet">Запланировать в канал</button><button class="btn sm quiet">Ещё вариант</button>${extra || ''}<span class="dim small" style="margin-left:auto;align-self:center">при экспорте — метка ИИ в тексте и в файлах (Закон РК № 230-VIII, ст. 21)</span></div>`;
  const imgCard = (im, cls, i) => `<div class="img ${cls || ''} rv" data-i="${i == null ? '' : i}" data-prompt="${esc(im.prompt)}" data-aspect="${esc(im.aspect || '4:5')}"><div class="ph"></div>${im.url ? `<img src="${esc(im.url)}" alt="">` : '<button class="btn sm accent draw">Нарисовать · 12 кр</button>'}<div class="cap">${esc(im.caption || im.text || '')}</div></div>`;

  function threeImgs(item) {
    const its = arr(item.imgItems);
    const logo = item.brand && item.brand.logo;
    if (its.length) return `<div class="caps rv" style="margin-top:16px">Три варианта картинки · выберите свой${logo ? ' · лого ставится оригиналом' : ''}</div><div class="imgs three">${its.map((it) => it.url ? `<div class="img rv"><img src="${esc(API_BASE + it.url)}" alt="" loading="lazy" crossorigin="anonymous"><div class="cap">вариант ${esc(it.variant)}</div>${logo ? `<button class="btn sm accent withlogo" data-src="${esc(API_BASE + it.url)}" data-logo="${esc(API_BASE + logo.url)}" data-ugol="${esc(logo.ugol)}" style="position:absolute;top:8px;right:8px">С лого</button>` : ''}</div>` : `<div class="img rv"><div class="ph"></div><div class="cap">вариант ${esc(it.variant)}: ${esc(it.error || 'не вышло')}</div></div>`).join('')}</div>`;
    if (item.imgJob) return `<div class="working rv" style="margin-top:16px"><span class="spin"></span><span>Художник рисует три варианта картинки, две-три минуты…</span></div>`;
    if (item.imgError) return `<div class="warn rv">Картинки: ${esc(item.imgError)}</div>`;
    return '';
  }
  function tgPreview(r, item) {
    const hooks = arr(r.hooks); const text = ((hooks[0] ? hooks[0] + '\n\n' : '') + (r.text || '')).trim();
    const its = arr(item.imgItems).filter((x) => x.url);
    return `<details class="more rv" open><summary>Как это придёт в Telegram</summary><div class="tgwrap"><div class="tgmsg"><div class="tgname">JASA</div><div class="tgtext">${esc(text).slice(0, 900)}${text.length > 900 ? '…' : ''}\n\n<span class="dim">— создано с помощью ИИ · JASA</span></div></div>${its.length ? `<div class="tgmsg tgalbum">${its.map((x) => `<img src="${esc(API_BASE + x.url)}" alt="">`).join('')}<div class="tgtext small">Три варианта картинки к посту — выберите свой.</div></div>` : ''}<div class="dim small" style="margin-top:8px">В боте можно отвечать голосом: наговорите правку, и пост переделается.</div></div></details>`;
  }
  function renderPost(r, item) {
    return `<div class="hooks rv">${(r.hooks || []).map((h, i) => `<button class="${i === 0 ? 'on' : ''}">${esc(h)}</button>`).join('')}</div>
      <div class="posttext rv" id="pt">${esc(r.text || r._raw || '')}</div>
      <div class="tags rv">${(r.hashtags || []).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>
      ${threeImgs(item)}
      ${tgPreview(r, item)}
      <dl class="kv rv"><dt>Когда</dt><dd>${esc(r.best_time || '—')}</dd></dl>
      ${r.kz_version ? `<details class="more rv"><summary>Қазақша нұсқа</summary><div class="kzbox">${esc(r.kz_version)}</div></details>` : ''}
      ${warnBlock(r.warnings)}${actionsBlock()}`;
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
    return `<div class="variants">${V}</div>${threeImgs(item)}<dl class="kv rv"><dt>Форматы</dt><dd>${(r.formats || []).map(esc).join(' · ')}</dd>${r.kz_headline ? `<dt>Қазақша</dt><dd>${esc(r.kz_headline)}</dd>` : ''}</dl>${warnBlock(r.warnings)}${actionsBlock()}`;
  }
  function renderKarusel(r, item) {
    return `<div class="slides">${(r.slides || []).map((s) => `<div class="slide rv"><span class="n">${esc(s.n)} / ${(r.slides || []).length}</span><div><b>${esc(s.headline)}</b><p>${esc(s.text)}</p></div></div>`).join('')}</div>
      <div class="posttext rv" style="margin-top:16px">${esc(r.caption || '')}</div><div class="tags rv">${(r.hashtags || []).map((t) => `<span>#${esc(t)}</span>`).join('')}</div>${threeImgs(item)}${warnBlock(r.warnings)}${actionsBlock()}`;
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
      <label class="small dim">Референсы (фото героя, продукта, место) — до 4 файлов <input type="file" class="vrefs" accept="image/*,video/mp4" multiple style="display:block;margin:6px 0"></label>
      <textarea class="vprompt" rows="3" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;background:var(--field);color:var(--ink)" placeholder="Промптер уже собрал описание ролика — можно поправить словами">${esc(pr && pr.prompt || '')}</textarea>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap"><button class="btn sm accent vgo">Снять · 5 с</button><span class="dim small">звук — шумы без музыки · 5 секунд</span></div>
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
      const r = await api('/api/kartinka', { prompt, aspect });
      spend(r.kredity, r.ostatok);
      const img = document.createElement('img'); img.src = r.image; img.alt = '';
      (card.querySelector('.pv') || card).prepend(img); btn.remove();
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
  function toast(msg) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:var(--ink);color:var(--ink-fg);padding:12px 18px;border-radius:14px;z-index:50;max-width:90vw;font-size:15px;box-shadow:var(--shadow)'; document.body.appendChild(t); }
    if (/не |ошиб|законч|нужно|нет |исчерпан|войдите/i.test(String(msg))) S.lastError = String(msg);
    t.textContent = msg; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => (t.style.opacity = 0), 4000);
  }

  // голос: запись → сервер (распознавание речи); если записи нет — распознавание браузера
  function voice(btn, onText) {
    let mr = null, chunks = [];
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    btn.addEventListener('click', async () => {
      if (mr) { mr.stop(); return; }
      if (!(navigator.mediaDevices && window.MediaRecorder)) {
        if (!SR) { toast('Голос работает в Chrome, Safari и Telegram'); return; }
        const rec = new SR(); rec.lang = S.yazyk === 'kz' ? 'kk-KZ' : 'ru-RU';
        rec.onresult = (e) => onText(Array.from(e.results).map((r) => r[0].transcript).join(' '));
        rec.onend = () => btn.classList.remove('zapis'); btn.classList.add('zapis'); rec.start(); return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
        mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); chunks = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop()); btn.classList.remove('zapis');
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); mr = null;
          if (blob.size < 2000) { toast('Слишком коротко'); return; }
          toast('Распознаю…');
          try {
            const b64 = await toB64(blob);
            const r = await api('/api/transcribe', { audio: { b64, mime: blob.type.split(';')[0] }, lang: S.yazyk === 'kz' ? 'kk' : 'ru' });
            spend(1, r.ostatok); onText(r.text || '');
          } catch (e) { toast(e.message); }
        };
        btn.classList.add('zapis'); mr.start();
        setTimeout(() => mr && mr.state === 'recording' && mr.stop(), 90000);
      } catch (e) { toast('Нет доступа к микрофону'); }
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
      <section style="margin-bottom:26px;max-width:760px"><h2>Форматы, которые заходят</h2><p class="muted" style="margin-top:10px">Подборка для бизнеса и блогов в Казахстане. Нажмите — JASA сделает такой же про вас.</p></section>
      <div class="grid3">${TRENDS.map((t, i) => `<article class="trend rv" style="animation-delay:${i * 70}ms"><div class="cover" style="background:${t.g}"><span class="fire">${t.fire}</span>${esc(t.t)}</div><div class="body"><p>${esc(t.p)}</p><button class="btn sm accent" data-i="${i}">Сделать так же</button></div></article>`).join('')}</div>`;
    main.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const t = TRENDS[+b.dataset.i]; sessionStorage.setItem('jasa:prefill', JSON.stringify({ tip: t.tip, text: t.q })); location.hash = '#/sozdat'; });
  }

  // =====================================================================
  // МОЙ БРЕНД (ДНК)
  // =====================================================================
  function brend() {
    main.innerHTML = topbar('Мой бренд') + `
      <section style="margin-bottom:26px;max-width:760px"><h2>ДНК бренда — голос, которым пишут все агенты</h2><p class="muted" style="margin-top:10px">Вставьте 3–5 своих постов или опишите, кто вы и для кого. Платформа соберёт голос, темы, палитру — и каждый пост будет звучать как ваш.</p></section>
      <div class="two">
        <div class="card">
          <div class="field"><label>Ссылка на ваш Instagram или Telegram-канал</label><input id="handle" placeholder="https://instagram.com/… или t.me/…" value="${esc((S.brend && S.brend.handle) || '')}"></div>
          <div class="warn" style="margin:-4px 0 14px"><b>Анализ аккаунта:</b> по ссылке платформа пройдёт по всем вашим постам, темам, охватам и комментариям и соберёт ДНК автоматически. Для полного анализа и автопостинга вы дадите доступ к аккаунту через Meta — кнопка появится скоро. Пока вставьте 3–5 постов ниже.</div>
          <div class="field"><label>Ваши посты или описание</label><textarea id="posts" placeholder="Вставьте 3–5 постов целиком или напишите: кто вы, что продаёте, кому, как любите говорить с людьми">${esc((S.brend && S.brend.source) || '')}</textarea></div>
          <div style="display:flex;gap:8px;align-items:center"><button class="btn accent" id="mkdna">Собрать ДНК · до 6 кр</button><button class="icobtn" id="mic2" title="Рассказать голосом"><svg><use href="#i-mic"/></svg></button><span class="dim small">Instagram/Telegram подключим на следующем шаге</span></div>
        </div>
        <div class="card dna" id="dnaout">${S.brend ? dnaHtml(S.brend) : '<p class="muted">Здесь появится ДНК: голос, темы, палитра, чего не писать.</p>'}</div>
      </div>`;
    voice($('#mic2'), (t) => { const p = $('#posts'); p.value = (p.value ? p.value + '\n' : '') + t; });
    $('#mkdna').addEventListener('click', async () => {
      const src = $('#posts').value.trim(); if (src.length < 40) { toast('Нужно хотя бы несколько предложений'); return; }
      const b = $('#mkdna'); b.disabled = true; b.textContent = 'Изучаю…';
      $('#dnaout').innerHTML = '<div class="working"><span class="spin"></span><span>ДНК-аналитик читает ваши тексты</span></div>';
      try {
        const r = await api('/api/ask', { tip: 'dna', tema: src });
        S.brend = Object.assign({}, r.result, { handle: $('#handle').value.trim(), source: src.slice(0, 6000) });
        store.set('brend', S.brend); spend(r.kredity, r.ostatok);
        $('#dnaout').innerHTML = dnaHtml(S.brend);
      } catch (e) { $('#dnaout').innerHTML = `<div class="warn"><b>Не получилось:</b> ${esc(e.message)}</div>`; }
      b.disabled = false; b.textContent = 'Собрать ДНК · до 6 кр';
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
    const head = '<section style="max-width:680px;margin-bottom:22px"><h2>Где вы публикуете?</h2><p class="muted" style="margin-top:10px">Добавьте каналы и страницы. JASA подстроит длину, формат и подачу под каждую площадку.</p></section>';
    if (d.guest) { box.innerHTML = head + '<a class="btn accent" href="#/kabinet">Войти через Telegram</a><p class="dim small" style="margin-top:10px">Каналы сохраняются за вами — поэтому нужен вход.</p>'; return; }
    const b = d.brands.find((x) => x.id === d.active) || d.brands[0];
    if (!b) { box.innerHTML = head + '<div class="card" style="max-width:680px"><b>Сначала назовите бренд</b><p class="small muted" style="margin:6px 0 12px">Каналы принадлежат бренду: у SMM-специалиста их может быть несколько.</p><a class="btn accent sm" href="#/brend">Назвать бренд</a></div>'; return; }
    const lines = () => String(((b.sections.kanaly || {}).fields || {}).spisok || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const save = async (list) => {
      const r = await api('/api/brend/sohranit', { bid: b.id, kod: 'kanaly', polya: { spisok: list.join('\n') } });
      Object.assign(b, r.brand); draw();
    };
    function draw() {
      const L = lines();
      box.innerHTML = head + `<div class="kgrid"><div>
        <span class="caps">${esc(b.name)} · ${L.length ? L.length + ' ' + (L.length === 1 ? 'канал' : L.length < 5 ? 'канала' : 'каналов') : 'пока пусто'}</span>
        <div class="klist">${L.map((l, i) => { const [pl, adr, ...rest] = l.split(' · '); return `<div class="chan"><div class="ico">${esc((pl || '?').slice(0, 2).toUpperCase())}</div><div><b>${esc(adr || pl)}</b><small>${esc([pl].concat(rest).join(' · '))}</small></div><button class="btn sm ghost" data-del="${i}" title="Убрать">×</button></div>`; }).join('') || '<p class="dim small" style="margin:10px 0">Добавьте первый канал справа.</p>'}</div>
        <p class="dim small" style="margin-top:14px">Автопубликация — следующим шагом: Telegram через бота-администратора, Instagram после проверки Meta. Пока JASA пишет под формат каждой площадки.</p>
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
    main.innerHTML = topbar('Сценарий', '<span class="pill">уровень Studio</span>') + `<div id="sc"></div>`;
    if (j && j.id && !j.done) { pollJob(j.id); return; }
    if (j && j.done && j.showrunner) { renderReport(j); return; }
    renderIntake();
  }
  function renderIntake() {
    $('#sc').innerHTML = `
      <div class="steps"><span class="on">1 · Сценарий</span><span>2 · Четыре вопроса</span><span>3 · Агенты</span><span>4 · Отчёт</span></div>
      <section style="margin-bottom:22px;max-width:760px"><h2>Загрузите сценарий — команда из 13 помощников разберёт его по слоям</h2><p class="muted" style="margin-top:10px">Сначала Сердце выписывает то, что нельзя трогать. Потом структура и герои, сцены и диалог, рынок и риски. В конце — отчёт: что беречь, что чинить, где помощники не согласны. Ничего не меняется без вашего «да».</p></section>
      <div class="two"><div class="card">
        <div class="field"><label>Текст сценария (Fountain, Markdown, просто текст) — или файл</label><textarea id="script" style="min-height:260px;font-family:var(--mono);font-size:13px" placeholder="НАТ. СТЕПЬ — ДЕНЬ&#10;&#10;…"></textarea></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="file" id="file" accept=".txt,.fountain,.md" class="hide"><button class="btn sm quiet" id="pick">Выбрать файл</button><button class="btn sm quiet" id="sample">Взять пример: «Тонкий лёд»</button><span class="dim small" id="cnt"></span></div>
      </div><div class="card">
        <span class="caps">Четыре вопроса — можно голосом</span>
        <div class="qs" style="margin-top:12px">
          ${[['О чём это и для кого?', 'q1', 'Подростковый триллер о правилах на льду, для 12–16'], ['Где это будут смотреть?', 'q2', 'YouTube и TikTok, потом школы'], ['Что для вас главное — что нельзя трогать?', 'q3', 'Голос диктора и честность про страх'], ['Кто автор и кому принадлежат права?', 'q4', 'Автор — я, права мои']].map(([l, id, ph], i) => `<div class="q4"><span class="n">${i + 1}</span><div><label for="${id}">${l}</label><div class="inrow"><input id="${id}" placeholder="${ph}"><button class="icobtn mic" data-for="${id}" title="Голосом"><svg><use href="#i-mic"/></svg></button></div></div></div>`).join('')}
        </div>
        <span class="caps" style="display:block;margin-top:18px">Что сделать</span>
        <div class="modes" id="modes">${MODES.map((m, i) => `<button class="chip ${i === 0 ? 'on' : ''}">${m}</button>`).join('')}</div>
        <div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn accent" id="run">Разобрать агентами</button><span class="dim small">≈ 80–700 кр, зависит от длины сценария · 5–8 минут</span></div>
      </div></div>`;
    const ta = $('#script'); const cnt = () => { $('#cnt').textContent = ta.value ? Math.round(ta.value.split(/\s+/).length / 180 * 10) / 10 + ' стр · ' + ta.value.length + ' зн' : ''; };
    ta.addEventListener('input', cnt);
    $('#pick').addEventListener('click', () => $('#file').click());
    $('#file').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { ta.value = t; cnt(); }); });
    $('#sample').addEventListener('click', () => fetch('primer-tonkiy-led.fountain?v=2').then((r) => r.text()).then((t) => { ta.value = t; cnt(); $('#q1').value = 'Подростковый триллер-инструкция о правилах на тонком льду, 12–16 лет'; $('#q2').value = 'YouTube и TikTok, потом показы в школах Казахстана'; $('#q3').value = 'Голос диктора, который говорит с подростком как с равным, и честность про страх'; $('#q4').value = 'Автор — студия «3%», права у студии'; }));
    $$('.mic').forEach((b) => voice(b, (t) => { const i = $('#' + b.dataset.for); i.value = (i.value ? i.value + ' ' : '') + t; }));
    $('#modes').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('#modes .chip').forEach((c) => c.classList.toggle('on', c === b)); });
    $('#run').addEventListener('click', async () => {
      const text = ta.value.trim(); if (text.length < 300) { toast('Вставьте сценарий — хотя бы несколько сцен'); return; }
      const pasport = { o_chem: $('#q1').value, gde: $('#q2').value, ne_trogat: $('#q3').value, avtor_prava: $('#q4').value };
      const rezhim = $('#modes .chip.on').textContent;
      $('#run').disabled = true;
      try {
        const r = await api('/api/scenariy/razbor', { text, pasport, rezhim });
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
      if (first) { first = false; $('#sc').innerHTML = `<div class="steps"><span class="done">1 · Сценарий</span><span class="done">2 · Четыре вопроса</span><span class="on">3 · Агенты</span><span>4 · Отчёт</span></div>
        <section style="margin-bottom:18px"><h2>Команда работает по слоям</h2><p class="dim small" style="margin-top:6px">Каждый следующий слой получает находки предыдущих. Критик оценивает вслепую. Линии показывают, кто кому передаёт.</p><div class="chitatel" id="chit" style="margin-top:10px"></div></section>
        <div class="flow" id="flow"><svg class="flow-svg" aria-hidden="true"></svg><div class="flow-cols" id="flowcols"></div></div>
        <div class="tfeed-wrap"><span class="caps">Лента команды</span><ol class="tfeed" id="tfeed"></ol></div><p class="dim small" style="margin-top:14px" id="jmeta"></p>`; }
      if (j.chitatel) $('#chit').innerHTML = `<span>Читатель: <b>${j.chitatel.scen}</b> сцен</span><span><b>${j.chitatel.stranic}</b> стр ≈ <b>${j.chitatel.minut}</b> мин</span><span>героев: <b>${j.chitatel.geroi.length}</b></span><span>режим: <b>${esc(j.rezhim)}</b></span>`;
      teamBoard(j, st);
      $('#jmeta').textContent = 'потрачено ' + j.kredity + ' кр';
      if (j.done) { S.job = j; store.set('job', j); if (!S.spentJobs[j.id]) { S.spentJobs[j.id] = 1; store.set('spentJobs', S.spentJobs); spend(j.kredity, j.ostatok); } setTimeout(() => { if (token === S.pollToken) renderReport(j); }, 900); return; }
      setTimeout(tick, 1500);
    };
    tick();
  }
  function renderReport(j) {
    const sr = j.showrunner || {}; const R = j.results || {};
    const ry = arr(R.rynochnik && R.rynochnik.leyery); const best = Math.max(...ry.map((l) => +l.ball || 0), 0);
    const kr = R.kritik || {}; const zen = arr(R.serdce && R.serdce.zenica);
    const B = j.ball || {}; const ball = B.tekst != null ? +B.tekst : (+sr.ball || +kr.obshchiy || 0);
    const CH = { syuzhet: 'сюжет', geroi: 'герой', dialog: 'диалог', premisa: 'премиса', mir: 'мир', polza: 'польза' };
    const RP = { kz: 'Казахстан', asia: 'Азия', stream: 'стриминги', eu: 'фестивали', vse: 'среднее по рынкам' };
    const otbr = Object.values(j.proverka || {}).reduce((a, x) => a + (+x.otbrosheno || 0), 0);
    const chasti = Object.entries(B.chasti || {}).filter(([, v]) => v != null).map(([k, v]) => `<span class="${arr(B.potolok).includes(k) ? 'low' : ''}">${CH[k]} <b>${esc(v)}</b></span>`).join('');
    $('#sc').innerHTML = `<div class="steps"><span class="done">1 · Сценарий</span><span class="done">2 · Четыре вопроса</span><span class="done">3 · Агенты</span><span class="on">4 · Отчёт</span><button class="chip" id="newrun" style="margin-left:auto">Новый разбор</button></div>
      <div class="report">
        ${otbr ? `<p class="dim small rv">Проверка по тексту: ${otbr} ${otbr === 1 ? 'находка без настоящей цитаты убрана' : 'находки без настоящих цитат убраны'}.</p>` : ''}${Object.keys(j.errors || {}).length ? `<div class="warn rv"><b>Отчёт неполный:</b> ${Object.entries(j.errors).map(([k, v]) => esc((j.agents[k] && j.agents[k].name) || k) + ' — ' + esc(v)).join(' · ')}</div>` : ''}
        <div class="card score rv"><div class="ring" style="--v:${ball * 10}"><b>${ball.toFixed(1)}<small>/10</small></b><em>текст</em></div><div><span class="caps">Режим · ${esc(j.rezhim)} · ${j.kredity} кр · ${j.sec || ''} с${j.zoloto ? ' · золотой v' + esc(j.zoloto) : ''}</span>
          ${B.rynok != null ? `<div class="rynok">${B.rynok_luchshij ? 'Лучший рынок' : 'Рынок'} · ${esc(B.rynok_imya || RP[B.rynok_po] || B.rynok_po)}: <b>${esc(B.rynok)}</b>/10</div>` : ''}
          ${chasti ? `<div class="chasti">${chasti}</div>` : ''}${B.razbros && Object.keys(B.razbros).length ? `<p class="dim small" style="margin:6px 0 0">Критик оценивал дважды независимо, в балл — среднее; наибольший разброс ${esc(Math.max(...Object.values(B.razbros)))}.</p>` : ''}${arr(B.potolok).length ? `<p class="small" style="margin:6px 0 0"><b>Потолок 7:</b> ${arr(B.potolok).map((k) => CH[k]).join(', ')} ниже 5 — остальное это не перекрывает.</p>` : ''}<h2 style="margin:6px 0 10px;font-size:var(--fs-title)">${esc((j.pasport && j.pasport.o_chem) || 'Ваш сценарий')}</h2><p>${esc(sr.odnim_abzacem || '')}</p></div></div>
        <div class="zen rv"><span class="caps" style="opacity:.6;color:inherit">Зеница ока · не трогаем</span><h3>Что делает этот сценарий вашим</h3><ol>${zen.map((z) => `<li><b>${esc(z.chto)}</b><span>${esc(z.gde)} — ${esc(z.pochemu)}</span></li>`).join('')}</ol>${R.serdce && R.serdce.chelovechnost ? `<div class="chel">${esc(R.serdce.chelovechnost)}</div>` : ''}${R.serdce && R.serdce.rashozhdenie_s_avtorom ? `<p class="small" style="margin-top:10px;opacity:.85"><b>Сверка с вами:</b> ${esc(R.serdce.rashozhdenie_s_avtorom)}</p>` : ''}</div>
        ${arr(sr.chto_rabotaet).length ? `<div class="card rv"><span class="caps">Что работает · это беречь</span><ul class="good">${arr(sr.chto_rabotaet).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <div class="card rv"><span class="caps">Предикт по рынкам</span><div class="layers" style="margin-top:14px">${ry.map((l) => `<div class="lay"><span>${esc(l.nazvanie)}</span><div class="bar"><i class="${+l.ball === best ? 'top' : ''}" data-w="${(+l.ball || 0) * 10}"></i></div><span class="n">${esc(l.ball)}</span><details><summary>почему и что изменить</summary>${esc(l.pochemu)}<ul>${arr(l.izmenit).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><span class="dim">${arr(l.referensy).map(esc).join(' · ')}</span></details></div>`).join('')}</div>
          ${R.rynochnik && R.rynochnik.kz_osobo ? `<dl class="kv"><dt>Госфонд</dt><dd>${esc(R.rynochnik.kz_osobo.gosfond)}</dd><dt>Код</dt><dd>${esc(R.rynochnik.kz_osobo.kod)}</dd><dt>Язык</dt><dd>${esc(R.rynochnik.kz_osobo.yazyk)}</dd><dt>Рейтинг</dt><dd>${esc(R.rynochnik.kz_osobo.reyting)}</dd></dl>` : ''}
          ${R.rynochnik && R.rynochnik.luchshiy ? `<p class="small" style="margin-top:12px"><b>Лучший лейер:</b> ${esc(R.rynochnik.luchshiy)}</p>` : ''}</div>
        <div class="card rv"><span class="caps">Топ правок · принимайте каждую отдельно</span><div class="fixes" style="margin-top:12px">${arr(sr.pravki).map((p) => `<div class="fix ${p.vazhnost === 'вторая' ? 'second' : ''}"><span class="n">${esc(p.n)}</span><div><b>Сц. ${esc(p.scena)} · ${esc(p.chto)}</b>${p.vazhnost ? ` <span class="tagv">${esc(p.vazhnost)}</span>` : ''}<p>${esc(p.zachem)}</p><div class="ef ${p.konflikt && p.konflikt !== 'нет' ? 'q' : ''}">${esc(p.effekt)}${p.konflikt !== 'нет' ? ' · ' + (p.konflikt === 'не проверено' ? 'конфликт не проверен' : 'задевает ' + esc(p.konflikt)) + ' — вопрос автору' : ''}</div></div><div class="ok"><button ${p.konflikt !== 'нет' ? 'disabled title="Задевает зеницу ока или не проверено — сначала ответ автора"' : ''} class="yes ${S.accepted[j.id + ':' + p.n] === 1 ? 'on' : ''}" data-k="${esc(j.id + ':' + p.n)}" data-v="1" title="Принять"><svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-check"/></svg></button><button class="no ${S.accepted[j.id + ':' + p.n] === 0 ? 'on' : ''}" data-k="${esc(j.id + ':' + p.n)}" data-v="0" title="Отклонить"><svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-x"/></svg></button></div></div>`).join('')}</div>
          ${arr(sr.protivorechiya).length ? `<div class="contra"><span class="caps">Где помощники не согласны</span>${arr(sr.protivorechiya).map((c) => `<p class="small"><b>${esc(c.kto)}</b> — ${esc(c.sut)}<br><span class="dim">Решение: ${esc(c.reshenie)}. ${esc(c.pochemu)}</span></p>`).join('')}</div>` : ''}
          ${arr(sr.voprosy_avtoru).length ? `<div class="warn" style="margin-top:14px"><b>Вопросы автору:</b> ${arr(sr.voprosy_avtoru).map(esc).join(' · ')}</div>` : ''}
          <div class="actions"><button class="btn sm accent">Собрать версию 2 из принятых</button><button class="btn sm quiet">Разложить на кадры и героев →</button></div></div>
        <div class="card rv"><span class="caps">Критик · три голоса</span><div class="voice3" style="margin-top:12px">${['otborshchik', 'redaktor', 'zritel'].map((k, i) => kr[k] ? `<div class="v3"><small>${['Отборщик', 'Редактор', 'Зритель'][i]}</small><b>${esc(kr[k].ball)}</b><p>${esc(kr[k].slovo)}</p></div>` : '').join('')}</div>${kr.odno ? `<p class="small" style="margin-top:12px"><b>Одно, что поменял бы критик:</b> ${esc(kr.odno)}</p>` : ''}</div>
        <div class="card rv"><span class="caps">Логик · карта ошибок</span><div style="margin-top:8px">${j.errors && j.errors.logik ? `<p class="warn">Логик не ответил: ${esc(j.errors.logik)}</p>` : ''}${arr(R.logik && R.logik.oshibki).map((o) => `<div class="err"><span class="s">${esc(o.scena)}</span><div><b>${esc(o.tip)} · ${esc(o.sereznost)}</b><br>${esc(o.sut)}<br><i>${(o.kak || []).map(esc).join(' / ')}</i></div></div>`).join('') || (j.errors && j.errors.logik ? '' : '<p class="muted small">Ошибок не найдено.</p>')}</div></div>
        <div class="card rv"><span class="caps">Жанрист · референсы</span><p class="small muted" style="margin:8px 0 12px">${esc((R.zhanrist && (R.zhanrist.zhanr + ' · ' + R.zhanrist.podzhanr + ' · ' + (R.zhanrist.ton || []).join(', '))) || '')}</p><div class="refs">${arr(R.zhanrist && R.zhanrist.referensy).map((r) => `<div class="ref"><b>${esc(r.nazvanie)}</b><small>${esc(r.god)} · ${esc(r.strana)}</small><p>${esc(r.chem_pohozh)}</p><p class="dim">${esc(r.kak_proshel)}</p></div>`).join('')}</div></div>
        ${R.scenovik ? `<div class="card rv"><span class="caps">Сценовик · каждая сцена</span><p class="small muted" style="margin-top:8px">${esc(R.scenovik.itog || '')}</p>${arr(R.scenovik.bez_povorota).map((z) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(z.scena)} · без поворота</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}${arr(R.scenovik.vhod_vyhod).map((z) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(z.scena)}</b> · ${esc(z.sovet)}</p>`).join('')}</div>` : ''}
        <div class="card rv"><span class="caps">Миксер · а что если</span><div class="mix" style="margin-top:12px">${arr(R.mikser && R.mikser.varianty).map((v) => `<div class="mixv">${v.k_pravke && v.k_pravke !== '—' ? `<small class="dim">к правке ${esc(v.k_pravke)}</small>` : ''}<b>${esc(v.nazvanie)}</b><p>${esc(v.sut)}</p><p class="dim">сохраняется: ${esc(v.sohranyaetsya)} · риск: ${esc(v.risk)}</p></div>`).join('')}</div></div>
        <div class="two"><div class="card rv"><span class="caps">Персонажник</span>${arr(R.personazhnik && R.personazhnik.geroi).map((g) => `<p class="small" style="margin-top:10px"><b>${esc(g.imya)}</b> — ${esc(g.zhelanie)} / нужда: ${esc(g.nuzhda)}<br><span class="dim">${esc(g.arka)} · ${esc(g.slabo)}</span></p>`).join('')}<p class="small muted" style="margin-top:10px">${esc((R.personazhnik && R.personazhnik.test_imen) || '')}</p></div>
        <div class="card rv"><span class="caps">Страж · риски и рейтинг</span><p class="small" style="margin-top:8px"><b>${esc((R.strazh && R.strazh.reyting) || '')}</b></p>${arr(R.strazh && R.strazh.riski).map((r) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(r.scena)}</b> · ${esc(r.risk)}<br><span class="dim">${esc(r.smyagchit)}</span></p>`).join('')}
          ${arr(R.strazh && R.strazh.fakty).length ? `<span class="caps" style="display:block;margin-top:18px">Факты и советы · проверка</span>${arr(R.strazh.fakty).map((f) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(f.scena)}</b> · «${esc(f.citata)}»<br><span class="${/сверить/.test(f.status) ? '' : 'dim'}">${esc(f.status)}</span> <span class="dim">${esc(f.kommentarij)}</span></p>`).join('')}` : ''}
          <span class="caps" style="display:block;margin-top:18px">Продюсер</span><p class="small" style="margin-top:6px"><b>${esc((R.prodyuser && R.prodyuser.kategoriya) || '')}</b> · ${R.prodyuser && R.prodyuser.ii_proizvodstvo ? `кадров ${esc(R.prodyuser.ii_proizvodstvo.kadrov)}, видео ${esc(R.prodyuser.ii_proizvodstvo.video_sekund)} с · ${esc(R.prodyuser.ii_proizvodstvo.zamechanie)}` : ''}</p></div></div>
        ${R.yazykoved ? `<div class="card rv"><span class="caps">Языковед · речь RU/KZ</span><p class="small" style="margin-top:8px">${esc(R.yazykoved.dvuyazychie || '')}</p>${arr(R.yazykoved.zamechaniya).map((z) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(z.scena)}</b> · ${esc(z.chto)}: «${esc(z.replika)}» <span class="dim">→ ${esc(z.kak)}</span></p>`).join('')}</div>` : ''}
        ${R.arhitektor ? `<div class="card rv"><span class="caps">Архитектор · структура</span><p class="small" style="margin-top:8px">${esc(R.arhitektor.hronometrazh || '')}</p>${arr(R.arhitektor.zatyanuto).map((z) => `<p class="small" style="margin-top:8px"><b>Затянуто · сц. ${esc(z.scena)}</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}${arr(R.arhitektor.skomkano).map((z) => `<p class="small" style="margin-top:8px"><b>Скомкано · сц. ${esc(z.scena)}</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}</div>` : ''}
        ${(() => { const st2 = { feed: [], t0: Date.now(), q: [], sloj: Object.fromEntries(Object.entries(j.agents || {}).map(([k, a]) => [k, a.sloj || 0])) };
          Object.entries(j.agents || {}).sort((a, b) => (a[1].sloj || 0) - (b[1].sloj || 0)).forEach(([k, a]) => { if (a.state === 'готово' || a.state === 'частично') soobshcheniya(j, st2, k, a); });
          return st2.feed.length ? `<details class="card rv team-log"><summary><span class="caps">Как работала команда · ${st2.feed.length} передач</span></summary><ol class="tfeed">${st2.feed.map((m) => `<li class="${m.kind}"><span class="av" data-sl="${st2.sloj[m.k] || 0}">${esc(m.name.slice(0, 1))}</span><div><b>${esc(m.name)}</b> <span class="dim">слой ${esc(st2.sloj[m.k] || '')}</span><p>${esc(m.text)}</p></div></li>`).join('')}</ol></details>` : ''; })()}
        ${arr(sr.plan_v2).length ? `<div class="card rv"><span class="caps">План версии 2</span><ol style="margin:10px 0 0;padding-left:20px">${arr(sr.plan_v2).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>${sr.rezhim_otvet ? `<p class="small muted" style="margin-top:12px">${esc(sr.rezhim_otvet)}</p>` : ''}</div>` : ''}
      </div>`;
    $$('.rv', $('#sc')).forEach((n, i) => (n.style.animationDelay = Math.min(i * 120, 1500) + 'ms'));
    setTimeout(() => $$('.lay .bar i').forEach((i) => (i.style.width = i.dataset.w + '%')), 300);
    $('#newrun').addEventListener('click', () => { S.job = null; store.set('job', null); renderIntake(); });
    $('#sc').addEventListener('click', (e) => { const b = e.target.closest('.ok button'); if (!b) return; S.accepted[b.dataset.k] = +b.dataset.v; store.set('accepted', S.accepted); $$('.ok button', b.parentElement).forEach((x) => x.classList.toggle('on', x === b)); });
  }

  // =====================================================================
  // БИБЛИОТЕКА, ТАРИФЫ
  // =====================================================================
  function biblioteka() {
    main.innerHTML = topbar('Библиотека', '<a class="pill" href="#/kabinet">Кабинет →</a> <a class="pill" href="#/tarify">Тарифы →</a>') + `
      <section class="depo" id="depo">
        <div class="dhead"><div><span class="caps">Депо · ваши референсы</span><h2 style="margin:6px 0 8px">Кадры, которые вам нравятся, — в одном клике от поста</h2><p class="muted small" style="max-width:640px">Перетащите картинки сюда, вставьте из буфера (Ctrl+V) или выберите файлом. JASA прочитает кадр глазами оператора — крупность, свет, оптику, настроение — и достанет палитру. «Взять стиль» передаст художникам эти кадры и описание света, цвета и фактуры — художники стараются не повторять чужой сюжет. Чужие лица и логотипы лучше не загружать.</p></div></div>
        <div class="drop" id="drop"><input type="file" id="dfile" accept="image/*" multiple class="hide"><b>Перетащите картинки или нажмите</b><span class="dim small">JPEG, PNG, WebP · палитра бесплатно · <label class="chk"><input type="checkbox" id="dread" checked> прочитать кадр · до ${esc(S.ceny.depo_prochitat || 2)} кр</label></span></div>
        <div class="dtools"><input id="dq" placeholder="Поиск своими словами: ночь, крупный план, тёплый свет, еда…"><span class="dim small" id="dcnt"></span><button class="btn sm accent ${S.stil.length ? '' : 'hide'}" id="dgo">Сделать пост в этом стиле →</button></div>
        <div class="dgrid" id="dgrid"></div>
      </section>
      <section style="max-width:760px;margin-top:34px"><h2>Всё, что вы сделали, — в одном месте</h2><p class="muted" style="margin-top:10px">Тексты, картинки, ролики, бренд-кит и версии. Пока — последние результаты этого кабинета.</p></section>
      <div class="feed" style="margin-top:22px" id="lib"></div>`;
    depoInit();
    S.feed.slice().reverse().forEach((i) => $('#lib').appendChild(sheet(i)));
    if (!S.feed.length) $('#lib').innerHTML = '<p class="muted">Пусто. Создайте первый пост.</p>';
  }
  // ---------- Депо: загрузка, палитра в браузере, чтение кадра, поиск, «взять стиль» ----------
  let DEPO = [];
  const authGen = () => (TG ? 'tg' : 'ses:' + (S.session || ''));   // смена аккаунта = другое поколение
  function depoInit() {
    const drop = $('#drop'); const fi = $('#dfile');
    if (!S.me || S.me.guest) {
      if (!TG && !S.session) { drop.innerHTML = '<b>Депо работает после входа через Telegram</b><span class="dim small">кадры хранятся за вами и видны и в Telegram, и на компьютере</span><a class="btn sm accent" href="#/kabinet" style="margin-top:8px">Войти</a>'; return; }
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
        toast(S.stil.length ? 'Стиль: ' + S.stil.length + ' из 3 кадров — уйдёт художникам в следующий пост' : 'Стиль снят');
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
    if (!DEPO.length) { g.innerHTML = '<p class="muted small">Пока пусто. Начните с 3–5 кадров, которые хотите повторить по настроению.</p>'; return; }
    g.innerHTML = list.map((x) => `<article class="dcard ${S.stil.includes(x.id) ? 'sel' : ''}" data-id="${esc(x.id)}" data-cap="${esc(x.podpis || '')}"><img src="${esc(API_BASE + x.url)}" alt="${esc(x.podpis || 'референс')}" loading="lazy">
      <div class="dpal">${arr(x.palitra).map((c) => `<button data-act="hex" data-hex="${esc(c)}" title="${esc(c)} — скопировать" style="background:${col(c, '#ccc')}"></button>`).join('')}</div>
      <div class="dbody">${x.podpis ? `<p class="small">${esc(x.podpis)}</p>` : ''}${x.krupnost ? `<p class="dim small">${[x.krupnost, x.svet, x.optika, x.nastroenie].filter(Boolean).map(esc).join(' · ')}</p>` : '<p class="dim small">только палитра</p>'}
      <div class="dact"><button class="btn sm ${S.stil.includes(x.id) ? 'accent' : 'quiet'}" data-act="stil">${S.stil.includes(x.id) ? 'Стиль взят ✓' : 'Взять стиль'}</button><button class="btn sm ghost" data-act="del" title="Удалить из депо">Удалить</button></div></div></article>`).join('') || '<p class="muted small">Ничего не нашлось — попробуйте другое слово.</p>';
  }
  async function depoUpload(files) {
    const imgs = files.filter((f) => /^image\//.test(f.type)).slice(0, 10);
    if (!imgs.length) { toast('Нужны картинки'); return; }
    const prochitat = $('#dread') ? $('#dread').checked : true;
    const gen = authGen();
    for (const f of imgs) {
      if (gen !== authGen() || !$('#dgrid')) { toast('Загрузка остановлена: сменился аккаунт или экран'); return; }
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
  function kabinet() {
    main.innerHTML = topbar('Кабинет') + '<div id="kab"></div>';
    loadMe().then(drawKab);
  }
  function drawKab(m) {
    const k = $('#kab'); if (!k) return;
    if (!m) { k.innerHTML = '<div class="warn">Сервер недоступен. Попробуйте через минуту.</div>'; return; }
    if (m.guest && !TG) {
      k.innerHTML = `<section style="max-width:760px;margin-bottom:26px"><h2>Войдите — и всё сохранится</h2><p class="muted" style="margin-top:10px">Без регистрации и паролей: нажмите кнопку или наведите камеру телефона на код, бот подтвердит вход. Ваши посты, бренд, кредиты и история будут одни и те же в Telegram и на компьютере.</p></section>
        <div class="two"><div class="card" id="logincard"><span class="caps">Вход</span><div style="margin-top:12px"><button class="btn accent" id="login">Войти через Telegram</button></div><p class="dim small" style="margin-top:10px">Входя, вы принимаете <a href="/oferta/" target="_blank" rel="noopener">условия использования</a> и <a href="/privacy/" target="_blank" rel="noopener">политику обработки персональных данных</a>.</p><div id="loginbox" style="margin-top:16px"></div></div>
        <div class="card"><span class="caps">Пока вы гость</span><p class="small muted" style="margin-top:8px">Сегодня у вас ${esc(Math.floor(m.kredity))} кр, завтра снова 50. После входа — ${esc(m.trial)} пробных: хватит примерно на 6 постов с картинками.</p></div></div>`;
      $('#login').addEventListener('click', startLogin);
      return;
    }
    const ist = arr(m.istoriya);
    k.innerHTML = `<div class="two">
      <div class="card"><span class="caps">Профиль</span><h3 style="margin:6px 0 4px">${esc(m.name || 'Вы')}</h3><p class="small muted">${m.username ? '@' + esc(m.username) : 'Telegram'}${m.since ? ' · с ' + esc(m.since) : ''}${TG ? ' · в Telegram' : ' · на компьютере'}</p>
        <div style="margin-top:18px;display:flex;align-items:baseline;gap:10px"><b style="font:700 2.4rem var(--disp);letter-spacing:-.03em;color:var(--ink)">${esc(m.kredity)}</b><span class="muted">кредитов</span></div>
        <p class="small dim">потрачено ${esc(m.spent || 0)} · пробных было ${esc(m.trial)}</p>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm" href="#/sozdat">Создать</a><a class="btn sm quiet" href="#/brend">Голос бренда</a>${TG ? '' : '<button class="btn sm ghost" id="logout">Выйти</button>'}</div></div>
      <div class="card"><span class="caps">Пополнить</span><p class="small muted" style="margin:8px 0 12px">Пополнение — по заявке: выберите пакет, ответим в Telegram и зачислим вручную. Оплата Kaspi и картой онлайн — скоро.</p>
        <div class="chips">${[['500', '5 990 ₸'], ['2 000', '19 990 ₸'], ['10 000', '89 990 ₸']].map(([n, c]) => `<button class="chip" data-paket="${n}">${n} кр · ${c}</button>`).join('')}</div>
        <p class="small dim" style="margin-top:10px">Цены пакетов предварительные.</p></div>
      </div>
      <div class="card" style="margin-top:22px"><span class="caps">История</span>${ist.length ? `<div style="margin-top:10px">${ist.map((h) => `<div class="err" style="grid-template-columns:120px 60px 1fr"><span class="dim small">${esc(h.ts)}</span><span class="mono small" style="color:${h.vozvrat ? 'var(--ok)' : 'var(--accent)'}">${h.besplatno ? 'бесплатно' : (h.vozvrat ? '+' : '−') + esc(h.kr)}</span><span class="small">${esc(h.chto)}</span></div>`).join('')}</div>` : '<p class="small muted" style="margin-top:8px">Пока пусто — создайте первый пост.</p>'}</div>`;
    const lo = $('#logout'); if (lo) lo.addEventListener('click', async () => { try { await api('/api/logout', {}); } catch (e) { /* и так выйдем */ } S.session = null; store.set('session', null); S.me = null; S.stil = []; store.set('stil', []); toast('Вы вышли'); loadMe(); kabinet(); });
    k.addEventListener('click', async (e) => { const b = e.target.closest('[data-paket]'); if (!b) return; b.disabled = true; try { await api('/api/popolnit', { paket: b.dataset.paket }); toast('Заявка принята — ответим в Telegram'); } catch (er) { toast(er.message); b.disabled = false; } });
  }
  async function startLogin() {
    const box = $('#loginbox'); const btn = $('#login'); btn.disabled = true;
    let st; try { st = await api('/api/login/start', {}); } catch (e) { toast(e.message); btn.disabled = false; return; }
    box.innerHTML = `<div class="qr" id="qr"></div><p class="small muted" style="margin-top:10px">Наведите камеру телефона на код или <a href="${esc(st.url)}" target="_blank" rel="noopener">откройте бота</a> и нажмите Start. Код действует 15 минут.</p><p class="small dim" id="loginst">Жду подтверждения…</p>`;
    try { new QRCode($('#qr'), { text: st.url, width: 180, height: 180, colorDark: '#15192A', colorLight: '#FFFDF8' }); } catch (e) { $('#qr').innerHTML = `<a class="btn quiet" href="${esc(st.url)}" target="_blank" rel="noopener">Открыть бота</a>`; }
    const token = S.pollToken;
    for (let i = 0; i < 450; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (token !== S.pollToken) return;
      let r; try { r = await api('/api/login/status?code=' + st.code); } catch (e) { continue; }
      if (r.state === 'ok') { S.session = r.token; store.set('session', r.token); toast('Вход выполнен' + (r.name ? ', ' + r.name : '')); await loadMe(); kabinet(); return; }
      if (r.state === 'expired') { $('#loginst').textContent = 'Код устарел, нажмите ещё раз.'; btn.disabled = false; return; }
    }
  }
  function tarify() {
    const T = [
      ['Lite', '0 ₸', 'попробовать', ['50 кредитов в день ≈ 1 пост с картинками', 'картинки с водяным знаком', '1 канал', 'тренды — только смотреть'], 'Начать', ''],
      ['Creator', '6 990 ₸', 'блогер, малый бизнес', ['600 кредитов ≈ 50 картинок', 'ДНК бренда', '3 канала, автопостинг', 'без водяных знаков', 'рилсы по кадрам — за кредиты'], 'Выбрать', 'hot'],
      ['Pro', '24 990 ₸', 'SMM, дизайнер, агентство', ['2 500 кредитов', 'до 10 брендов-клиентов', 'команда 3 человека', 'согласование и отчёты', 'приоритетная очередь'], 'Выбрать', ''],
      ['Studio', '59 990 ₸', 'сценаристы, продюсеры', ['6 000 кредитов', 'разбор сценария агентами', 'герои, локации, кадры, видео', '10 участников, 5 проектов', 'шлюз в студийный конвейер'], 'Выбрать', ''],
    ];
    main.innerHTML = topbar('Тарифы') + `<section style="max-width:760px;margin-bottom:26px"><h2>Платите за то, что делаете</h2><p class="muted" style="margin-top:10px">Кредит — одна единица работы: текст поста — до 6, пост с тремя картинками — до 45, картинка 2K — 12, пять секунд видео 720p — 131, разбор сценария ≈ 80–700, зависит от длины сценария. Пополнение — по заявке в Telegram, оплата Kaspi и картой — скоро. Цены на кнопке — действующие; цены пакетов и тарифов — предварительные.</p></section>
      <div class="tiers">${T.map(([n, p, w, li, b, c]) => `<div class="tier ${c} rv"><span class="caps">${w}</span><h3>${n}</h3><div class="price">${p}<small> /мес</small></div><ul>${li.map((l) => `<li>${l}</li>`).join('')}</ul><button class="btn ${c ? 'accent' : 'quiet'}">${b}</button></div>`).join('')}</div>`;
    $$('.rv', main).forEach((n, i) => (n.style.animationDelay = i * 80 + 'ms'));
  }

  // =====================================================================
  // ПОМОЩНИК (по образцу Plumar Support): частое — правилами и бесплатно, остальное — моделью
  // =====================================================================
  (function pomoshnik() {
    const fab = document.createElement('button'); fab.className = 'fab'; fab.id = 'fab'; fab.title = 'Помощник'; fab.setAttribute('aria-label', 'Помощник');
    fab.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/></svg>';
    const pan = document.createElement('aside'); pan.className = 'pom'; pan.id = 'pom'; pan.setAttribute('aria-label', 'Помощник JASA');
    pan.innerHTML = `<div class="ph"><b>Помощник</b><span class="dim small">отвечает сразу · ничего не меняет и не списывает</span><button class="lbx px" aria-label="Закрыть">×</button></div>
      <div class="pmsgs" id="pmsgs"><div class="pm a">Спросите про кредиты, цены, ошибку, вход с компьютера — отвечу сразу. Если не знаю, позову человека.</div></div>
      <div class="pchips" id="pchips">${['Сколько у меня кредитов?', 'Почему не получилось?', 'Сколько стоит видео?', 'Как войти с компьютера?', 'Как пополнить?'].map((q) => `<button class="chip">${q}</button>`).join('')}</div>
      <form class="pin" id="pform"><input id="pq" placeholder="Ваш вопрос…" autocomplete="off"><button class="icobtn go" title="Спросить"><svg><use href="#i-send"/></svg></button></form>`;
    document.body.appendChild(fab); document.body.appendChild(pan);
    const open = (v) => { pan.classList.toggle('on', v); fab.classList.toggle('on', v); if (v) setTimeout(() => $('#pq').focus(), 50); };
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

  window.JASA = { openSec, api, esc, toast, voice, spend, $, $$, arr, lightbox, routes, route, S, store, topbar, toB64, compose, trimAlpha, loadImg, API_BASE, TG: !!TG, loadMe, shrink };
  window.addEventListener('jasa:ready', route);
  if (!window.JASA_DEFER) route();
})();
