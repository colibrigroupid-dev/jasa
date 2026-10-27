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
  };
  function spend(k, ostatok) { S.credits = typeof ostatok === 'number' ? ostatok : Math.max(0, Math.round((S.credits - (k || 0)) * 10) / 10); store.set('credits', S.credits); drawCredits(); }
  function drawCredits() { $('#cred').textContent = S.credits; $('#credbar').style.width = Math.min(100, S.credits / 3) + '%'; }
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
    const r = await fetch(API_BASE + path, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
    const j = await r.json().catch(() => ({ error: 'сервер ответил не JSON' }));
    if (!r.ok) throw new Error(j.error || ('ошибка ' + r.status));
    return j;
  }
  api('/api/status').then((s) => { S.status = s; }).catch(() => {});
  api('/api/me').then((m) => { S.credits = m.kredity; store.set('credits', S.credits); drawCredits(); const n = $('#acctname'); if (n && m.name) n.textContent = m.name; const sub = n && n.nextElementSibling; if (sub) sub.textContent = m.guest ? 'гость · ' + m.kredity + ' кр в день' : 'первая волна · пробные ' + m.trial; }).catch(() => {});

  // ---------- тема ----------
  const theme = TG && TG.colorScheme === 'dark' ? 'dark' : store.get('theme', 'light');
  document.documentElement.dataset.theme = theme;
  $('#theme').addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; store.set('theme', t);
    $('meta[name=theme-color]').content = t === 'dark' ? '#0f0f0f' : '#F5F1E8';
  });

  // ---------- маршруты ----------
  const routes = { sozdat, trendy, brend, kanaly, scenariy, biblioteka, tarify };
  function route() {
    const h = (location.hash || '#/sozdat').replace('#/', '').split('?')[0];
    const fn = routes[h] || sozdat;
    $$('#nav a, #tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.r === (routes[h] ? h : 'sozdat')));
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
  const EXAMPLES = [
    ['post', 'Пост для кофейни в Алматы: новое сезонное меню с тыквенным латте, скидка 20 % до пятницы'],
    ['rils', 'Рилс для фитнес-тренера: 3 ошибки новичков в зале, 20 секунд, с хуком'],
    ['afisha', 'Афиша мастер-класса по гончарному делу, Астана, 9 ноября 15:00, 12 000 ₸'],
    ['karusel', 'Карусель для бухгалтера: 5 штрафов ИП в Казахстане 2026 и как их избежать'],
    ['plan', 'План на неделю для магазина детской одежды на Kaspi: цель — продажи зимней коллекции'],
  ];

  function sozdat() {
    main.innerHTML = topbar('Создать', brandPill()) + `
      <section class="hero">
        <h1>Скажи, <em>что нужно</em> — пост, рилс, афиша появятся на этом листе.</h1>
        <p>Скажите голосом или текстом, пришлите ссылку на чужой рилс как пример подачи — и за вас работает команда: копирайтер, промптер, три художника, рилсмейкер. К каждому посту три картинки на выбор.</p>
        <div class="examples" id="examples">${EXAMPLES.map(([t, e]) => `<button data-tip="${t}" data-text="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      </section>
      <div class="feed" id="feed"></div>
      <div class="composer" id="composer">
        <div class="box">
          <textarea id="ask" rows="1" placeholder="Скажите голосом (микрофон справа) или напишите: пост про открытие второго салона в Астане, тёплый тон"></textarea>
          <div class="row">
            <div class="chips" id="tips">${Object.entries(TIPS).map(([k, v]) => `<button class="chip ${k === S.tip ? 'on' : ''}" data-tip="${k}">${v}</button>`).join('')}</div>
            <div class="send">
              <button class="chip ${S.yazyk === 'kz' ? 'on' : ''}" id="lang" title="Язык результата">${S.yazyk === 'kz' ? 'Қаз' : 'Рус'}</button>
              <button class="icobtn" id="mic" title="Сказать голосом"><svg><use href="#i-mic"/></svg></button>
              <button class="icobtn go" id="go" title="Сделать"><svg><use href="#i-send"/></svg></button>
            </div>
          </div>
        </div>
      </div>`;
    const ta = $('#ask');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(200, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', grow);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    $('#tips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; S.tip = b.dataset.tip; $$('#tips .chip').forEach((c) => c.classList.toggle('on', c === b)); ta.focus(); });
    $('#lang').addEventListener('click', (e) => { S.yazyk = S.yazyk === 'kz' ? 'ru' : 'kz'; e.currentTarget.textContent = S.yazyk === 'kz' ? 'Қаз' : 'Рус'; e.currentTarget.classList.toggle('on', S.yazyk === 'kz'); });
    $('#examples').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.tip = b.dataset.tip; $$('#tips .chip').forEach((c) => c.classList.toggle('on', c.dataset.tip === S.tip)); ta.value = b.dataset.text; grow(); send(); });
    $('#go').addEventListener('click', send);
    voice($('#mic'), (t) => { ta.value = (ta.value ? ta.value + ' ' : '') + t; grow(); });
    const pre = sessionStorage.getItem('jasa:prefill');
    if (pre) { const p = JSON.parse(pre); sessionStorage.removeItem('jasa:prefill'); S.tip = p.tip; $$('#tips .chip').forEach((c) => c.classList.toggle('on', c.dataset.tip === S.tip)); ta.value = p.text; grow(); }
    S.feed.slice().reverse().slice(0, 8).forEach((item) => $('#feed').appendChild(sheet(item)));
    $('#brandpill') && $('#brandpill').addEventListener('click', () => { S.useBrend = !S.useBrend; store.set('useBrend', S.useBrend); route(); });

    async function send() {
      let text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      let primer = null; const link = (text.match(/https?:\/\/\S+/) || [])[0];
      if (link && /instagram\.com|tiktok\.com|youtu|vk\.com/.test(link)) {
        toast('Разбираю ролик-пример…');
        try { const r = await api('/api/transcribe', { url: link }); primer = r.text; spend(1, r.ostatok); text = text.replace(link, '').trim() || 'пост в подаче этого примера'; } catch (e) { toast('Пример не разобран: ' + e.message); }
      }
      const item = { id: Date.now(), tip: S.tip, tema: text, yazyk: S.yazyk, state: 'working', primer };
      const el = sheet(item);
      $('#feed').prepend(el);
      ta.value = ''; grow();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const res = await api('/api/ask', { tip: item.tip, tema: text, yazyk: S.yazyk, brend: S.useBrend && S.brend ? S.brend : null, ploshchadka: item.tip === 'rils' ? 'Instagram Reels / TikTok' : 'Instagram', primer });
        Object.assign(item, { state: 'done', result: res.result, kredity: res.kredity, imgJob: res.img_job, promty: res.promty });
        spend(res.kredity, res.ostatok);
      } catch (e) {
        Object.assign(item, { state: 'error', error: e.message });
      }
      S.feed.push(item); S.feed = S.feed.slice(-20); store.set('feed', S.feed);
      el.replaceWith(sheet(item));
    }
  }

  function brandPill() {
    if (!S.brend) return `<a class="pill" href="#/brend">Голос бренда не задан →</a>`;
    return `<button class="pill ${S.useBrend ? 'on' : ''}" id="brandpill"><span class="dot"></span>${esc(S.brend.name || 'Мой бренд')}</button>`;
  }

  // лист результата
  function sheet(item) {
    const el = document.createElement('article');
    el.className = 'sheet';
    const head = `<div class="head"><span class="kind">${TIPS[item.tip] || item.tip}</span>${item.yazyk === 'kz' ? '<span class="pill">қазақша</span>' : ''}<span class="meta">${item.kredity ? item.kredity + ' кр' : ''}</span></div><div class="q">${esc(item.tema)}</div>`;
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
    el.innerHTML = head + R(r, item);
    $$('.rv', el).forEach((n, i) => { n.style.animationDelay = Math.min(i * 90, 1200) + 'ms'; });
    if (item.imgJob && !item.imgItems) pollImages(item, el);
    if (item.videoJob) pollVideo(item, el);
    el.addEventListener('click', (e) => {
      const h = e.target.closest('.hooks button'); if (h) { $$('.hooks button', el).forEach((b) => b.classList.toggle('on', b === h)); return; }
      const d = e.target.closest('.draw'); if (d) { drawImage(d, item); return; }
      const vg = e.target.closest('.vgo'); if (vg) { startVideo(vg, item, el); return; }
      const ch = e.target.closest('.vidpanel .chip'); if (ch) { const k = ch.dataset.res ? 'data-res' : 'data-ratio'; $$('.chip[' + k + ']', ch.parentElement).forEach((c) => c.classList.toggle('on', c === ch)); const vb = $('.vgo', ch.closest('.vidpanel')); if (vb) vb.textContent = 'Снять · 5 с · ' + ({ '480p': 15, '720p': 35, '1080p': 80 }[($('.chip.on[data-res]', ch.closest('.vidpanel')) || {}).dataset.res || '720p']) + ' кр'; return; }
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
  const actionsBlock = (extra) => `<div class="actions rv"><button class="btn sm" data-copy="self">Скопировать</button><button class="btn sm quiet">Запланировать в канал</button><button class="btn sm quiet">Ещё вариант</button>${extra || ''}<span class="dim small" style="margin-left:auto;align-self:center">при экспорте — метка «создано с помощью ИИ» (закон РК № 230-VIII)</span></div>`;
  const imgCard = (im, cls, i) => `<div class="img ${cls || ''} rv" data-i="${i == null ? '' : i}" data-prompt="${esc(im.prompt)}" data-aspect="${esc(im.aspect || '4:5')}"><div class="ph"></div>${im.url ? `<img src="${esc(im.url)}" alt="">` : '<button class="btn sm accent draw">Нарисовать · 12 кр</button>'}<div class="cap">${esc(im.caption || im.text || '')}</div></div>`;

  function threeImgs(item) {
    const its = arr(item.imgItems);
    if (its.length) return `<div class="caps rv" style="margin-top:16px">Три варианта картинки · выберите свой</div><div class="imgs three">${its.map((it) => it.url ? `<div class="img rv"><img src="${esc(API_BASE + it.url)}" alt="" loading="lazy"><div class="cap">вариант ${esc(it.variant)}</div></div>` : `<div class="img rv"><div class="ph"></div><div class="cap">вариант ${esc(it.variant)}: ${esc(it.error || 'не вышло')}</div></div>`).join('')}</div>`;
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
      <div class="chips" style="margin:8px 0">${['480p', '720p', '1080p'].map((q, i) => `<button class="chip ${i === 1 ? 'on' : ''}" data-res="${q}">${q} · ${{ '480p': 15, '720p': 35, '1080p': 80 }[q]} кр</button>`).join('')}</div>
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
  const AI_MARK = '\n\nСоздано с помощью ИИ · JASA';
  function lightbox(src, cap) {
    let lb = $('#lb'); if (!lb) { lb = document.createElement('div'); lb.id = 'lb'; lb.innerHTML = '<img alt=""><div class="lbcap"></div><button class="lbx" aria-label="Закрыть">×</button>'; document.body.appendChild(lb); lb.addEventListener('click', () => lb.classList.remove('on')); document.addEventListener('keydown', (e) => e.key === 'Escape' && lb.classList.remove('on')); }
    $('img', lb).src = src; $('.lbcap', lb).textContent = cap || 'Полный размер · создано с помощью ИИ'; lb.classList.add('on');
  }
  document.addEventListener('click', (e) => { const im = e.target.closest('.sheet img, .imgs img'); if (im && !e.target.closest('button')) lightbox(im.currentSrc || im.src, im.closest('.img') && im.closest('.img').querySelector('.cap') && im.closest('.img').querySelector('.cap').textContent); });
  function copyText(t, btn) { navigator.clipboard && navigator.clipboard.writeText(t + AI_MARK).then(() => { const o = btn.textContent; btn.textContent = 'Скопировано'; setTimeout(() => (btn.textContent = o), 1200); }); }
  function toast(msg) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);background:var(--ink);color:var(--ink-fg);padding:12px 18px;border-radius:14px;z-index:50;max-width:90vw;font-size:15px;box-shadow:var(--shadow)'; document.body.appendChild(t); }
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
        rec.onend = () => btn.classList.remove('rec'); btn.classList.add('rec'); rec.start(); return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
        mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); chunks = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop()); btn.classList.remove('rec');
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); mr = null;
          if (blob.size < 2000) { toast('Слишком коротко'); return; }
          toast('Распознаю…');
          try {
            const b64 = await toB64(blob);
            const r = await api('/api/transcribe', { audio: { b64, mime: blob.type.split(';')[0] }, lang: S.yazyk === 'kz' ? 'kk' : 'ru' });
            spend(1, r.ostatok); onText(r.text || '');
          } catch (e) { toast(e.message); }
        };
        btn.classList.add('rec'); mr.start();
        setTimeout(() => mr && mr.state === 'recording' && mr.stop(), 90000);
      } catch (e) { toast('Нет доступа к микрофону'); }
    });
  }
  const toB64 = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });

  // =====================================================================
  // ТРЕНДЫ (пока курация, не живой сбор)
  // =====================================================================
  const TRENDS = [
    { t: '«Что было бы, если…» в твоей нише', fire: '↑ 340 %', g: 'linear-gradient(160deg,#15192A,#3B4A8C)', p: 'Один вопрос на экране, ответ раскрывается за 15 секунд. Заходит у экспертов и магазинов.', tip: 'rils', q: 'Рилс «что было бы, если бы ты сделал это раньше» для моей ниши' },
    { t: 'POV: ты пришёл в Алматы первый раз', fire: '↑ 210 %', g: 'linear-gradient(160deg,#FF4D1F,#FFB38A)', p: 'Съёмка от первого лица, 3 локации, субтитры по слову. Кафе, салоны, туры.', tip: 'rils', q: 'POV-рилс: первый раз у нас, три момента, которые удивляют' },
    { t: 'Цены «тогда и сейчас» на Kaspi', fire: '↑ 180 %', g: 'linear-gradient(160deg,#0E6B55,#19B98B)', p: 'Карусель с честным сравнением. Доверие растёт, когда показываешь цифры.', tip: 'karusel', q: 'Карусель «тогда и сейчас»: что изменилось в ценах и качестве за год' },
    { t: 'День из жизни за 20 секунд', fire: '↑ 150 %', g: 'linear-gradient(160deg,#5B3A8C,#15192A)', p: 'Без лица, руки и процесс. Мастера, пекарни, швейные, автосервисы.', tip: 'rils', q: 'Рилс «день из жизни» без лица: руки, процесс, результат, 20 секунд' },
    { t: 'Ответ на хейт с юмором', fire: '↑ 120 %', g: 'linear-gradient(160deg,#B8231A,#FF4D1F)', p: 'Комментарий на экран — и спокойный ответ с фактами. Поднимает охваты в 2–3 раза.', tip: 'rils', q: 'Рилс-ответ на типичный негативный комментарий в моей нише, с фактами и юмором' },
    { t: 'Афиша-календарь на ноябрь', fire: 'сезон', g: 'linear-gradient(160deg,#C98B1F,#F2B705)', p: 'Один пост со всеми событиями месяца. Сохраняют в 5 раз чаще обычного.', tip: 'afisha', q: 'Афиша-календарь событий на ноябрь для моего бизнеса' },
  ];
  function trendy() {
    main.innerHTML = topbar('Тренды', '<span class="pill">образец · живой сбор трендов — месяц 2</span>') + `
      <section style="margin-bottom:26px;max-width:760px"><h2>Что сейчас залетает в Казахстане</h2><p class="muted" style="margin-top:10px">Тренд-скаут смотрит TikTok, Instagram и Telegram по вашей нише. Нажмите «Сделать по тренду» — рилсмейкер адаптирует формат под вашу тему.</p></section>
      <div class="grid3">${TRENDS.map((t, i) => `<article class="trend rv" style="animation-delay:${i * 70}ms"><div class="cover" style="background:${t.g}"><span class="fire">${t.fire}</span>${esc(t.t)}</div><div class="body"><p>${esc(t.p)}</p><button class="btn sm accent" data-i="${i}">Сделать по тренду</button></div></article>`).join('')}</div>`;
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
          <div class="warn" style="margin:-4px 0 14px"><b>Анализ аккаунта:</b> по ссылке платформа пройдёт по всем вашим постам, темам, охватам и комментариям и соберёт ДНК автоматически. Для полного анализа и автопостинга вы дадите доступ к аккаунту через Meta — кнопка появится в первой волне. Пока вставьте 3–5 постов ниже.</div>
          <div class="field"><label>Ваши посты или описание</label><textarea id="posts" placeholder="Вставьте 3–5 постов целиком или напишите: кто вы, что продаёте, кому, как любите говорить с людьми">${esc((S.brend && S.brend.source) || '')}</textarea></div>
          <div style="display:flex;gap:8px;align-items:center"><button class="btn accent" id="mkdna">Собрать ДНК · ~3 кр</button><button class="icobtn" id="mic2" title="Рассказать голосом"><svg><use href="#i-mic"/></svg></button><span class="dim small">Instagram/Telegram подключим на следующем шаге</span></div>
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
      b.disabled = false; b.textContent = 'Собрать ДНК · ~3 кр';
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
  function kanaly() {
    main.innerHTML = topbar('Каналы', '<button class="btn sm">Подключить канал</button>') + `
      <section style="margin-bottom:26px;max-width:760px"><h2>Каналы, расписание, рассылки</h2><p class="muted" style="margin-top:10px">Telegram подключается ботом-администратором за минуту. Instagram и TikTok — следующим шагом. Ничего не уходит без «Утвердить».</p></section>
      <div class="two"><div>
        <div class="chan rv"><div class="ico tg">TG</div><div><b>Мой канал · пример</b><small>1 240 подписчиков · макет, подключение — неделя 2</small></div><span class="pill st">пример</span></div>
        <div class="chan rv"><div class="ico ig">IG</div><div><b>@moy_biznes</b><small>Бизнес-аккаунт · публикация через Meta</small></div><button class="btn sm ghost st">Подключить</button></div>
        <div class="chan rv"><div class="ico tt">TT</div><div><b>TikTok</b><small>Публикация роликов и обложек</small></div><button class="btn sm ghost st">Скоро</button></div>
        <div class="card rv" style="margin-top:16px"><span class="caps">Клуб по подписке</span><h3 style="margin:6px 0 8px">Закрытый канал · 1 500 ₸/мес</h3><p class="muted small">Оплата через Telegram Stars или Kaspi, доступ выдаёт бот, напоминания о продлении — сами. 38 участников.</p><div style="margin-top:12px"><button class="btn sm quiet">Настроить</button></div></div>
      </div><div>
        <span class="caps">Очередь на неделю</span>
        <div class="queue" style="margin-top:10px">
          ${[['Вт 10:00', 'Пост: сезонное меню', 'Telegram · утверждено', 'on'], ['Ср 18:30', 'Рилс: 3 ошибки новичков', 'Instagram · ждёт утверждения', ''], ['Чт 10:00', 'Рассылка: напоминание о встрече', '1 240 получателей', 'on'], ['Пт 12:00', 'Афиша: мастер-класс 9 ноября', 'Telegram + Instagram', ''], ['Сб 11:00', 'Опрос: какую тему разобрать', 'Telegram', 'on']].map(([t, b, s, on], i) => `<div class="qi rv" style="animation-delay:${i * 60}ms"><span class="t">${t}</span><div><b>${b}</b><small>${s}</small></div><button class="pill ${on}">${on ? 'в очереди' : 'утвердить'}</button></div>`).join('')}
        </div>
      </div></div>`;
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
      <section style="margin-bottom:22px;max-width:760px"><h2>Загрузите сценарий — 15 агентов разберут его за 10 минут</h2><p class="muted" style="margin-top:10px">Логик найдёт дыры, Сердце выпишет то, что нельзя трогать, Рыночник даст предикт по восьми рынкам от Казахстана до «Оскара». Ничего не меняется без вашего «да».</p></section>
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
        <div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn accent" id="run">Разобрать агентами</button><span class="dim small">≈ 60–150 кр · 3–8 минут</span></div>
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
  function pollJob(id) {
    let first = true; let fails = 0; const token = S.pollToken;
    const tick = async () => {
      if (token !== S.pollToken || !$('#sc')) return;
      let j; try { j = await api('/api/scenariy/razbor/' + id); } catch (e) { if (token !== S.pollToken || !$('#sc')) return; fails++; if (fails < 5 && !/нет такой/.test(e.message)) { setTimeout(tick, 3000); return; } $('#sc').innerHTML = `<div class="warn"><b>Задача потеряна:</b> ${esc(e.message)}</div><p style="margin-top:12px"><button class="btn sm" id="again">Начать заново</button></p>`; $('#again').onclick = () => { S.job = null; store.set('job', null); route(); }; return; }
      if (token !== S.pollToken || !$('#sc')) return;
      if (first) { first = false; $('#sc').innerHTML = `<div class="steps"><span class="done">1 · Сценарий</span><span class="done">2 · Четыре вопроса</span><span class="on">3 · Агенты</span><span>4 · Отчёт</span></div>
        <section style="margin-bottom:18px"><h2>Агенты работают</h2><div class="chitatel" id="chit" style="margin-top:10px"></div></section><div class="board" id="board"></div><p class="dim small" style="margin-top:14px" id="jmeta"></p>`; }
      if (j.chitatel) $('#chit').innerHTML = `<span>Читатель: <b>${j.chitatel.scen}</b> сцен</span><span><b>${j.chitatel.stranic}</b> стр ≈ <b>${j.chitatel.minut}</b> мин</span><span>героев: <b>${j.chitatel.geroi.length}</b></span><span>режим: <b>${esc(j.rezhim)}</b></span>`;
      $('#board').innerHTML = Object.entries(j.agents).map(([k, a]) => `<div class="ag" data-s="${a.state}"><b>${esc(a.name)}</b><span class="st"></span><small>${esc(a.role)}${a.sec ? ' · ' + a.sec + ' с' : ''}${j.errors[k] ? ' · ' + esc(j.errors[k]).slice(0, 60) : ''}</small></div>`).join('');
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
    const ball = +sr.ball || +kr.obshchiy || 0;
    $('#sc').innerHTML = `<div class="steps"><span class="done">1 · Сценарий</span><span class="done">2 · Четыре вопроса</span><span class="done">3 · Агенты</span><span class="on">4 · Отчёт</span><button class="chip" id="newrun" style="margin-left:auto">Новый разбор</button></div>
      <div class="report">
        ${Object.keys(j.errors || {}).length ? `<div class="warn rv"><b>Отчёт неполный:</b> ${Object.entries(j.errors).map(([k, v]) => esc((j.agents[k] && j.agents[k].name) || k) + ' — ' + esc(v)).join(' · ')}</div>` : ''}
        <div class="card score rv"><div class="ring" style="--v:${ball * 10}"><b>${ball.toFixed(1)}<small>/10</small></b></div><div><span class="caps">Режим · ${esc(j.rezhim)} · ${j.kredity} кр · ${j.sec || ''} с</span><h2 style="margin:6px 0 10px;font-size:var(--fs-title)">${esc((j.pasport && j.pasport.o_chem) || 'Ваш сценарий')}</h2><p>${esc(sr.odnim_abzacem || '')}</p></div></div>
        <div class="zen rv"><span class="caps" style="opacity:.6;color:inherit">Зеница ока · не трогаем</span><h3>Что делает этот сценарий вашим</h3><ol>${zen.map((z) => `<li><b>${esc(z.chto)}</b><span>${esc(z.gde)} — ${esc(z.pochemu)}</span></li>`).join('')}</ol>${R.serdce && R.serdce.chelovechnost ? `<div class="chel">${esc(R.serdce.chelovechnost)}</div>` : ''}</div>
        <div class="card rv"><span class="caps">Предикт по рынкам</span><div class="layers" style="margin-top:14px">${ry.map((l) => `<div class="lay"><span>${esc(l.nazvanie)}</span><div class="bar"><i class="${+l.ball === best ? 'top' : ''}" data-w="${(+l.ball || 0) * 10}"></i></div><span class="n">${esc(l.ball)}</span><details><summary>почему и что изменить</summary>${esc(l.pochemu)}<ul>${arr(l.izmenit).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><span class="dim">${arr(l.referensy).map(esc).join(' · ')}</span></details></div>`).join('')}</div>
          ${R.rynochnik && R.rynochnik.kz_osobo ? `<dl class="kv"><dt>Госфонд</dt><dd>${esc(R.rynochnik.kz_osobo.gosfond)}</dd><dt>Код</dt><dd>${esc(R.rynochnik.kz_osobo.kod)}</dd><dt>Язык</dt><dd>${esc(R.rynochnik.kz_osobo.yazyk)}</dd><dt>Рейтинг</dt><dd>${esc(R.rynochnik.kz_osobo.reyting)}</dd></dl>` : ''}
          ${R.rynochnik && R.rynochnik.luchshiy ? `<p class="small" style="margin-top:12px"><b>Лучший лейер:</b> ${esc(R.rynochnik.luchshiy)}</p>` : ''}</div>
        <div class="card rv"><span class="caps">Топ правок · принимайте каждую отдельно</span><div class="fixes" style="margin-top:12px">${arr(sr.pravki).map((p) => `<div class="fix"><span class="n">${esc(p.n)}</span><div><b>Сц. ${esc(p.scena)} · ${esc(p.chto)}</b><p>${esc(p.zachem)}</p><div class="ef ${p.konflikt && p.konflikt !== 'нет' ? 'q' : ''}">${esc(p.effekt)}${p.konflikt !== 'нет' ? ' · ' + (p.konflikt === 'не проверено' ? 'конфликт не проверен' : 'задевает ' + esc(p.konflikt)) + ' — вопрос автору' : ''}</div></div><div class="ok"><button ${p.konflikt !== 'нет' ? 'disabled title="Задевает зеницу ока или не проверено — сначала ответ автора"' : ''} class="yes ${S.accepted[j.id + ':' + p.n] === 1 ? 'on' : ''}" data-k="${esc(j.id + ':' + p.n)}" data-v="1" title="Принять"><svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-check"/></svg></button><button class="no ${S.accepted[j.id + ':' + p.n] === 0 ? 'on' : ''}" data-k="${esc(j.id + ':' + p.n)}" data-v="0" title="Отклонить"><svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"><use href="#i-x"/></svg></button></div></div>`).join('')}</div>
          ${arr(sr.voprosy_avtoru).length ? `<div class="warn" style="margin-top:14px"><b>Вопросы автору:</b> ${arr(sr.voprosy_avtoru).map(esc).join(' · ')}</div>` : ''}
          <div class="actions"><button class="btn sm accent">Собрать версию 2 из принятых</button><button class="btn sm quiet">Разложить на кадры и героев →</button></div></div>
        <div class="card rv"><span class="caps">Критик · три голоса</span><div class="voice3" style="margin-top:12px">${['otborshchik', 'redaktor', 'zritel'].map((k, i) => kr[k] ? `<div class="v3"><small>${['Отборщик', 'Редактор', 'Зритель'][i]}</small><b>${esc(kr[k].ball)}</b><p>${esc(kr[k].slovo)}</p></div>` : '').join('')}</div>${kr.odno ? `<p class="small" style="margin-top:12px"><b>Одно, что поменял бы критик:</b> ${esc(kr.odno)}</p>` : ''}</div>
        <div class="card rv"><span class="caps">Логик · карта ошибок</span><div style="margin-top:8px">${j.errors && j.errors.logik ? `<p class="warn">Логик не ответил: ${esc(j.errors.logik)}</p>` : ''}${arr(R.logik && R.logik.oshibki).map((o) => `<div class="err"><span class="s">${esc(o.scena)}</span><div><b>${esc(o.tip)} · ${esc(o.sereznost)}</b><br>${esc(o.sut)}<br><i>${(o.kak || []).map(esc).join(' / ')}</i></div></div>`).join('') || (j.errors && j.errors.logik ? '' : '<p class="muted small">Ошибок не найдено.</p>')}</div></div>
        <div class="card rv"><span class="caps">Жанрист · референсы</span><p class="small muted" style="margin:8px 0 12px">${esc((R.zhanrist && (R.zhanrist.zhanr + ' · ' + R.zhanrist.podzhanr + ' · ' + (R.zhanrist.ton || []).join(', '))) || '')}</p><div class="refs">${arr(R.zhanrist && R.zhanrist.referensy).map((r) => `<div class="ref"><b>${esc(r.nazvanie)}</b><small>${esc(r.god)} · ${esc(r.strana)}</small><p>${esc(r.chem_pohozh)}</p><p class="dim">${esc(r.kak_proshel)}</p></div>`).join('')}</div></div>
        <div class="card rv"><span class="caps">Миксер · а что если</span><div class="mix" style="margin-top:12px">${arr(R.mikser && R.mikser.varianty).map((v) => `<div class="mixv"><b>${esc(v.nazvanie)}</b><p>${esc(v.sut)}</p><p class="dim">сохраняется: ${esc(v.sohranyaetsya)} · риск: ${esc(v.risk)}</p></div>`).join('')}</div></div>
        <div class="two"><div class="card rv"><span class="caps">Персонажник</span>${arr(R.personazhnik && R.personazhnik.geroi).map((g) => `<p class="small" style="margin-top:10px"><b>${esc(g.imya)}</b> — ${esc(g.zhelanie)} / нужда: ${esc(g.nuzhda)}<br><span class="dim">${esc(g.arka)} · ${esc(g.slabo)}</span></p>`).join('')}<p class="small muted" style="margin-top:10px">${esc((R.personazhnik && R.personazhnik.test_imen) || '')}</p></div>
        <div class="card rv"><span class="caps">Страж · риски и рейтинг</span><p class="small" style="margin-top:8px"><b>${esc((R.strazh && R.strazh.reyting) || '')}</b></p>${arr(R.strazh && R.strazh.riski).map((r) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(r.scena)}</b> · ${esc(r.risk)}<br><span class="dim">${esc(r.smyagchit)}</span></p>`).join('')}
          <span class="caps" style="display:block;margin-top:18px">Продюсер</span><p class="small" style="margin-top:6px"><b>${esc((R.prodyuser && R.prodyuser.kategoriya) || '')}</b> · ${R.prodyuser && R.prodyuser.ii_proizvodstvo ? `кадров ${esc(R.prodyuser.ii_proizvodstvo.kadrov)}, видео ${esc(R.prodyuser.ii_proizvodstvo.video_sekund)} с · ${esc(R.prodyuser.ii_proizvodstvo.zamechanie)}` : ''}</p></div></div>
        ${R.yazykoved ? `<div class="card rv"><span class="caps">Языковед · речь RU/KZ</span><p class="small" style="margin-top:8px">${esc(R.yazykoved.dvuyazychie || '')}</p>${arr(R.yazykoved.zamechaniya).map((z) => `<p class="small" style="margin-top:8px"><b>Сц. ${esc(z.scena)}</b> · ${esc(z.chto)}: «${esc(z.replika)}» <span class="dim">→ ${esc(z.kak)}</span></p>`).join('')}</div>` : ''}
        ${R.arhitektor ? `<div class="card rv"><span class="caps">Архитектор · структура</span><p class="small" style="margin-top:8px">${esc(R.arhitektor.hronometrazh || '')}</p>${arr(R.arhitektor.zatyanuto).map((z) => `<p class="small" style="margin-top:8px"><b>Затянуто · сц. ${esc(z.scena)}</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}${arr(R.arhitektor.skomkano).map((z) => `<p class="small" style="margin-top:8px"><b>Скомкано · сц. ${esc(z.scena)}</b> — ${esc(z.pochemu)} <span class="dim">→ ${esc(z.predlozhenie)}</span></p>`).join('')}</div>` : ''}
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
    main.innerHTML = topbar('Библиотека', '<a class="pill" href="#/tarify">Тарифы →</a>') + `<section style="max-width:760px"><h2>Всё, что вы сделали, — в одном месте</h2><p class="muted" style="margin-top:10px">Тексты, картинки, ролики, бренд-кит и версии. Пока — последние результаты этого кабинета.</p></section>
      <div class="feed" style="margin-top:22px" id="lib"></div>`;
    S.feed.slice().reverse().forEach((i) => $('#lib').appendChild(sheet(i)));
    if (!S.feed.length) $('#lib').innerHTML = '<p class="muted">Пусто. Создайте первый пост.</p>';
  }
  function tarify() {
    const T = [
      ['Lite', '0 ₸', 'попробовать', ['10 кредитов в день ≈ 3 поста', 'картинки с водяным знаком', '1 канал', 'тренды — только смотреть'], 'Начать', ''],
      ['Creator', '6 990 ₸', 'блогер, малый бизнес', ['600 кредитов ≈ 50 картинок', 'ДНК бренда', '3 канала, автопостинг', 'без водяных знаков', 'рилсы по кадрам — за кредиты'], 'Выбрать', 'hot'],
      ['Pro', '24 990 ₸', 'SMM, дизайнер, агентство', ['2 500 кредитов', 'до 10 брендов-клиентов', 'команда 3 человека', 'согласование и отчёты', 'приоритетная очередь'], 'Выбрать', ''],
      ['Studio', '59 990 ₸', 'сценаристы, продюсеры', ['6 000 кредитов', 'разбор сценария агентами', 'герои, локации, кадры, видео', '10 участников, 5 проектов', 'шлюз в студийный конвейер'], 'Выбрать', ''],
    ];
    main.innerHTML = topbar('Тарифы') + `<section style="max-width:760px;margin-bottom:26px"><h2>Платите за то, что делаете</h2><p class="muted" style="margin-top:10px">Кредит — одна единица работы: текст поста ≈ 3, картинка 2K — 12, пять секунд видео — 128, разбор сценария ≈ 100–700. Kaspi, карта, годовая оплата −15 %. Цены — предварительные.</p></section>
      <div class="tiers">${T.map(([n, p, w, li, b, c]) => `<div class="tier ${c} rv"><span class="caps">${w}</span><h3>${n}</h3><div class="price">${p}<small> /мес</small></div><ul>${li.map((l) => `<li>${l}</li>`).join('')}</ul><button class="btn ${c ? 'accent' : 'quiet'}">${b}</button></div>`).join('')}</div>`;
    $$('.rv', main).forEach((n, i) => (n.style.animationDelay = i * 80 + 'ms'));
  }

  route();
})();
