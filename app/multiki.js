/* JASA · Мультики (28.10.2026). Учитель собирает обучающий мультик по шагам, утверждая каждый.
   Подключается после app.js, экран #/multiki. Зависит от window.JASA. План — MULTIKI-PLAN.md. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, spend, $, $$, arr, lightbox, S, store, topbar, loadImg, API_BASE, loadMe } = J;
  let L = null;          // /api/multiki: цены, голоса, список
  let P = null;          // открытый мультик
  let cur = null;        // открытый шаг
  let mediaSig = '';     // чтобы опрос перерисовывал только при изменениях
  const ETAP = { titr: 'Титр', zavyazka: 'Завязка', vopros: 'Вопрос', obyasnenie: 'Объяснение', zadanie: 'Задание', proverka: 'Проверка', zapomni: 'Запомни' };
  const EKRAN = { titr: 'Титр', zadanie: 'Задание', proverka: 'Проверка', zapomni: 'Запомни' };
  const ZAD = [['vsluh', 'Ответь вслух · 7 с'], ['zhest', 'Покажи жестом · 5 с'], ['zapis', 'Запиши в тетради · пауза']];
  const KLASS = [['0', 'Предшкола'], ['1', '1 класс'], ['2', '2 класс'], ['3', '3 класс'], ['4', '4 класс'], ['5', '5 класс'], ['6', '6 класс']];
  const kr = (n) => (Math.round(n * 10) / 10).toLocaleString('ru-RU') + ' кр';
  const pidOf = () => ((location.hash.split('?')[1] || '').match(/(?:^|&)p=([0-9a-f]{12})/) || [])[1] || null;
  const it = (vid, n) => ((P.media || {})[vid] || {})[String(n)] || {};
  const vplany = () => arr((P.raskadrovka || {}).plany).filter((p) => p.tip === 'video');
  const gplany = () => arr((P.raskadrovka || {}).plany).filter((p) => (p.replika || '').trim());
  const ready = (x) => x.status === 'gotovo' && !x.ustarel;
  const SHAGI = () => arr(L && L.shagi);

  style();

  async function screen() {
    const main = $('#main');
    main.innerHTML = topbar('Мультики', '<a class="btn sm quiet" href="#/multiki">Все мультики</a>') + '<div id="mk"><div class="working"><span class="spin"></span><span>Открываю…</span></div></div>';
    try { L = await api('/api/multiki'); } catch (e) { $('#mk').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    const pid = pidOf();
    if (!pid) { list(); return; }
    try { P = (await api('/api/multiki/' + pid)).proekt; } catch (e) { $('#mk').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    cur = P.shag; drawProekt(); poll();
  }

  // ---------- список и бриф ----------
  function list() {
    const box = $('#mk');
    if (L.zakryto) { box.innerHTML = intro() + '<p class="warn"><b>Скоро.</b> Раздел открывается после проверки на первых уроках — напишем в Telegram, когда можно будет пробовать.</p>'; return; }
    if (L.guest) {
      box.innerHTML = intro() + '<a class="btn accent" href="#/kabinet" style="margin-top:18px">Войти через Telegram</a><p class="dim small" style="margin-top:10px">Мультик собирается несколько дней по шагам — поэтому он хранится за вами.</p>';
      return;
    }
    box.innerHTML = intro() + (arr(L.proekty).length ? `<div class="mk-list">${L.proekty.map((x) => `<a class="card mk-pr" href="#/multiki?p=${esc(x.id)}"><b>${esc(x.nazvanie)}</b><span class="small muted">${x.gotov ? 'Готов' : 'Шаг: ' + esc(name(x.shag))} · потрачено ${kr(x.potracheno)}</span><span class="dim small">${esc(x.ts)}</span></a>`).join('')}</div>` : '') +
      (arr(L.shablony).length ? `<section class="card mk-shab"><span class="caps">Готовый сценарий · ${esc(L.shablony[0].gruppa)}</span><p class="small muted" style="margin:6px 0 12px">Сценарий, раскадровка и лист героев уже есть — утвердить бесплатно и сразу к озвучке.</p><div class="mk-row">${L.shablony.map((x) => `<button class="btn sm" data-shab="${esc(x.kod)}">${esc(x.nazvanie)} · ${x.sek} с</button>`).join('')}</div></section>` : '') +
      `<form class="card mk-brif" id="mkb" autocomplete="off"><span class="caps">Новый мультик</span><h3 style="margin:6px 0 16px">О чём урок</h3>${brifFields(null)}
      <div class="mk-row"><button class="btn accent" type="submit">Начать · бесплатно</button><span class="small muted" id="mksm"></span></div></form>`;
    bindBrif($('#mkb'), null);
    $$('[data-shab]', box).forEach((b) => { b.onclick = async () => { b.disabled = true; try { P = (await api('/api/multiki/shablon', { kod: b.dataset.shab })).proekt; location.hash = '#/multiki?p=' + P.id; } catch (e) { toast(e.message); b.disabled = false; } }; });
  }

  function intro() {
    return `<section style="max-width:720px;margin-bottom:22px"><h2>Обучающий мультик к уроку</h2>
      <p class="muted" style="margin-top:10px">Два героя-зверёнка объясняют одну мысль урока: один знает, второй спрашивает. Вы утверждаете каждый шаг — сценарий, кадры, голоса, ролики. Цена видна до запуска, дорогое видео — только после ваших «да» на картинки.</p>
      ${L.zaglushka ? '<p class="warn"><b>Пробный режим.</b> Модели заменены заглушками: картинки, голос и ролики — тестовые, кредиты считаются как настоящие.</p>' : ''}</section>`;
  }

  function brifFields(b) {
    b = b || { tema: '', predmet: 'Естествознание', klass: 1, yazyk: 'ru', dlit: 60, celi: '', lokaciya: '', zadanie: 'vsluh', geroi: L.geroi_default };
    return `<div class="field"><label for="mkt">Тема урока</label><input id="mkt" required maxlength="200" placeholder="Какие бывают растения?" value="${esc(b.tema)}"></div>
      <div class="mk-3"><div class="field"><label for="mkp">Предмет</label><input id="mkp" list="mkpl" maxlength="60" value="${esc(b.predmet)}"><datalist id="mkpl">${arr(L.predmety).map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div>
        <div class="field"><label for="mkk">Класс</label><select id="mkk">${KLASS.map(([v, t]) => `<option value="${v}" ${+v === +b.klass ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Язык ролика</label><div class="chips" id="mky">${[['ru', 'Русский'], ['kz', 'Қазақша']].map(([v, t]) => `<button type="button" class="chip ${b.yazyk === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div></div>
      <div class="field"><label>Длительность</label><div class="chips" id="mkd">${[30, 60, 90].map((v) => `<button type="button" class="chip ${+b.dlit === v ? 'on' : ''}" data-v="${v}">${v} с</button>`).join('')}</div></div>
      <div class="field"><label>Задание зрителю</label><div class="chips" id="mkz">${ZAD.map(([v, t]) => `<button type="button" class="chip ${(b.zadanie || 'vsluh') === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
      <div class="field"><label for="mkc">Цели урока, КСП или термины из учебника <span class="dim">— по желанию, вставьте текст</span></label><textarea id="mkc" rows="3" maxlength="4000" placeholder="Цели обучения, что дети должны понять, термины как в учебнике…">${esc(b.celi || '')}</textarea></div>
      <div class="field"><label for="mkl">Где происходит <span class="dim">— по желанию</span></label><input id="mkl" maxlength="600" placeholder="Горная поляна у речки, начало осени" value="${esc(b.lokaciya || '')}"></div>
      <div class="field"><label>Герои — нарисованные зверята</label><div id="mkg">${arr(b.geroi).map(geroyRow).join('')}</div>
        <button type="button" class="chip ghost" id="mkga" style="margin-top:6px">+ третий герой</button></div>`;
  }
  const geroyRow = (g) => `<div class="mk-g"><input data-k="imya" maxlength="30" placeholder="Имя" value="${esc(g.imya || '')}"><input data-k="kto" maxlength="60" placeholder="Кто: снежный барс, лисёнок…" value="${esc(g.kto || '')}"><input data-k="rol" maxlength="60" placeholder="Роль: объясняет / спрашивает" value="${esc(g.rol || '')}"></div>`;

  function readBrif(f) {
    return {
      tema: $('#mkt', f).value.trim(), predmet: $('#mkp', f).value.trim(), klass: +$('#mkk', f).value,
      yazyk: ($('#mky .chip.on', f) || {}).dataset ? $('#mky .chip.on', f).dataset.v : 'ru', dlit: +$('#mkd .chip.on', f).dataset.v,
      zadanie: $('#mkz .chip.on', f).dataset.v,
      celi: $('#mkc', f).value.trim(), lokaciya: $('#mkl', f).value.trim(),
      geroi: $$('.mk-g', f).map((r) => { const o = {}; $$('input', r).forEach((i) => { o[i.dataset.k] = i.value.trim(); }); return o; }).filter((g) => g.imya),
    };
  }

  function bindBrif(f, pid) {
    const sm = () => { const s = L.ceny.smeta[$('#mkd .chip.on', f).dataset.v]; const el = $('#mksm', f); if (el && s) el.textContent = `Весь мультик ≈ ${kr(s.itogo['720p'])} в 720p (≈ ${kr(s.itogo['480p'])} в 480p), пересъёмки — по цене плана. Бесплатный аниматик — до видео.`; };
    ['#mky', '#mkd', '#mkz'].forEach((id) => $(id, f).addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; $$(id + ' .chip', f).forEach((x) => x.classList.toggle('on', x === c)); sm(); }));
    $('#mkga', f).onclick = () => { if ($$('.mk-g', f).length >= 3) return; $('#mkg', f).insertAdjacentHTML('beforeend', geroyRow({})); };
    sm();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('[type=submit]', f); btn.disabled = true;
      try {
        const r = pid ? await api('/api/multiki/pravka', Object.assign({ pid, shag: 'brif' }, readBrif(f))) : await api('/api/multiki/sozdat', readBrif(f));
        P = r.proekt;
        if (!pid) { location.hash = '#/multiki?p=' + P.id; return; }
        toast('Бриф сохранён'); cur = 'scenarij'; drawProekt();
      } catch (er) { toast(er.message); btn.disabled = false; }
    });
  }

  // ---------- мультик ----------
  const name = (kod) => (SHAGI().find((s) => s.kod === kod) || {}).name || kod;
  function stepPrice(kod) {
    const s = P.smeta;
    return { brif: 'бесплатно', scenarij: s.scenarij ? 'до ' + kr(s.scenarij) : 'готов, бесплатно', raskadrovka: s.raskadrovka ? 'до ' + kr(s.raskadrovka) : 'готова, бесплатно', geroi: kr(s.geroi), kadry: kr(s.kadry),
      golos: '≈ ' + kr(s.golos), video: kr(s.video['480p']) + ' / ' + kr(s.video['720p']), sborka: 'бесплатно' }[kod];
  }

  function drawProekt() {
    const box = $('#mk'); if (!box) return;
    const idx = SHAGI().findIndex((s) => s.kod === P.shag);
    box.innerHTML = `<div class="mk-head"><div><span class="caps">${esc(P.brif.predmet)} · ${P.brif.klass ? P.brif.klass + ' класс' : 'предшкола'} · ${P.brif.yazyk === 'kz' ? 'қазақша' : 'русский'} · ${P.brif.dlit} с</span>
        <h3 style="margin:6px 0 4px">${esc((P.scenarij || {}).nazvanie || P.brif.tema)}</h3>
        <p class="small muted">Потрачено ${kr(P.potracheno || 0)} · весь мультик ≈ ${kr(P.smeta.itogo['480p'])} (480p) или ${kr(P.smeta.itogo['720p'])} (720p)</p></div></div>
      <div class="mk-grid"><nav class="mk-steps">${SHAGI().map((s, i) => {
        const done = P.ok[s.kod]; const open = i <= idx;
        return `<a href="#" data-s="${s.kod}" class="${s.kod === cur ? 'on' : ''} ${done ? 'done' : ''} ${open ? '' : 'lock'}"><i>${done ? '✓' : i + 1}</i><span><b>${esc(s.name)}</b><small>${stepPrice(s.kod)}</small></span></a>`;
      }).join('')}</nav><section class="card mk-panel" id="mkpan"></section></div>`;
    $$('.mk-steps a').forEach((a) => { a.onclick = (e) => { e.preventDefault(); if (a.classList.contains('lock')) { toast('Сначала утвердите «' + name(P.shag) + '»'); return; } cur = a.dataset.s; drawProekt(); }; });
    panel();
    mediaSig = JSON.stringify(P.media || {});
  }

  function panel() {
    const pan = $('#mkpan'); if (!pan) return;
    const f = { brif: pBrif, scenarij: pScen, raskadrovka: pRask, geroi: pGeroi, kadry: pKadry, golos: pGolos, video: pVideo, sborka: pSborka }[cur] || pBrif;
    f(pan);
  }

  const head = (t, p) => `<span class="caps">Шаг ${SHAGI().findIndex((s) => s.kod === cur) + 1} из ${SHAGI().length}</span><h3 style="margin:6px 0 8px">${esc(t)}</h3><p class="small muted" style="margin-bottom:16px">${p}</p>`;
  const okBadge = (kod) => P.ok[kod] ? '<span class="mk-ok">✓ утверждено</span>' : '';
  const utvBtn = (kod, t) => `<button class="btn accent" data-ut="${kod}">${esc(t)}</button>`;

  function bindCommon(pan) {
    $$('[data-ut]', pan).forEach((b) => { b.onclick = () => utverdit(b.dataset.ut, b); });
    $$('img[data-lb]', pan).forEach((im) => { im.onclick = () => lightbox(im.src, im.alt); });
  }

  async function utverdit(kod, btn) {
    btn.disabled = true;
    try {
      P = (await api('/api/multiki/utverdit', { pid: P.id, shag: kod })).proekt;
      const i = SHAGI().findIndex((s) => s.kod === kod);
      cur = (SHAGI()[i + 1] || {}).kod || kod;
      toast(kod === 'kadry' ? 'Кадры утверждены — дальше голос, затем съёмка' : 'Утверждено');
      drawProekt(); window.scrollTo({ top: 0 });
    } catch (e) { toast(e.message); btn.disabled = false; }
  }

  // платный вызов: показать цену на кнопке, удержание — на сервере
  async function run(btn, path, body, label) {
    const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + esc(label || 'Работаю…');
    try {
      const r = await api(path, Object.assign({ pid: P.id }, body));
      if (r.kredity) spend(r.kredity, r.ostatok); else if (typeof r.ostatok === 'number') spend(0, r.ostatok);
      if (r.oshibka) toast(r.oshibka);
      P = r.proekt; drawProekt(); poll();
      return r;
    } catch (e) { toast(e.message); btn.disabled = false; btn.innerHTML = t; return null; }
  }

  function pBrif(pan) {
    pan.innerHTML = head('Бриф', 'Изменения брифа снимут утверждение сценария и всех шагов после него.') + `<form id="mkb2">${brifFields(P.brif)}<div class="mk-row"><button class="btn" type="submit">Сохранить бриф</button><a class="btn quiet" href="#" id="mkdel">Удалить мультик</a></div></form>`;
    bindBrif($('#mkb2'), P.id);
    $('#mkdel').onclick = async (e) => { e.preventDefault(); if (!confirm('Удалить мультик целиком? Потраченные кредиты не вернутся.')) return; try { await api('/api/multiki/udalit', { pid: P.id }); location.hash = '#/multiki'; } catch (er) { toast(er.message); } };
  }

  function pScen(pan) {
    const sc = P.scenarij;
    if (!sc) {
      pan.innerHTML = head('Сценарий', 'Сценарист напишет ролик по этапам урока: вопрос → объяснение → задание с паузой → проверка → «Запомни». Затем методист проверит факты по программе РК, возраст и темп речи.') +
        `<button class="btn accent" id="mkgo">Написать сценарий · до ${kr(P.smeta.scenarij)}</button><p class="dim small" style="margin-top:10px">Около минуты. Списываем по факту, не больше цены на кнопке.</p>`;
      $('#mkgo').onclick = () => run($('#mkgo'), '/api/multiki/scenarij', {}, 'Пишу и проверяю факты…');
      return;
    }
    const tempo = arr(P.tempo);
    pan.innerHTML = head('Сценарий ' + (P.ok.scenarij ? '' : '— прочитайте и поправьте'), 'Реплики правятся прямо в таблице, сохраняется само. Правка снимет утверждение следующих шагов.') + okBadge('scenarij') +
      `<div class="mk-kv"><span>Вопрос урока</span><b>${esc(sc.vopros)}</b><span>Локация</span><span>${esc(sc.lokaciya)}</span>${sc.ocenka ? `<span>Методист</span><span>${sc.ocenka}/10</span>` : ''}${sc.istochnik ? `<span>Источник</span><span>${esc(sc.istochnik)}</span>` : ''}</div>
      ${arr(sc.zamechaniya).length ? `<details class="mk-zam" open><summary>Замечания методиста · ${sc.zamechaniya.length} — уже внесены в текст</summary>${sc.zamechaniya.map((z) => `<div><b>${z.plan ? 'План ' + esc(z.plan) + ' · ' : ''}${esc(z.vid)}</b>${z.bylo ? ` <s>${esc(z.bylo)}</s> → ${esc(z.stalo)}` : ''}<p class="small muted">${esc(z.pochemu)}</p>${+z.plan && arr(sc.plany_avtor).length === sc.plany.length ? `<button class="chip" data-vern="${+z.plan}">Вернуть как было</button>` : ''}</div>`).join('')}</details>` : ''}
      ${sc.provereno === false ? `<p class="warn"><b>Текст изменён после проверки.</b> <button class="chip" id="mkpro">Проверить ещё раз · до ${kr(L.ceny.proverit)}</button></p>` : ''}
      ${tempo.length ? `<p class="warn"><b>Темп:</b> ${tempo.map((t) => `план ${t.plan} — ${t.slov} ${t.ed} на ${t.sek} с (нужно ≈ ${t.nado} с)`).join('; ')}. ${P.brif.yazyk === 'kz' ? 'Детям — не больше 3,5 слога в секунду' : 'Детям — не больше 2 слов в секунду'}, одна реплика — до 11 с: сократите или добавьте секунды.</p>` : ''}
      <div class="mk-table">${sc.plany.map((p, i) => `<div class="mk-tr" data-i="${i}"><div class="mk-n">${i + 1}<small>${esc(ETAP[p.etap] || p.etap)}</small><small>${p.tip === 'ekran' ? 'экран' : 'видео'}</small></div>
        <div><label class="dim small">${p.kto ? esc(p.kto) + ' говорит' : 'без голоса'}</label><textarea data-k="replika" rows="2">${esc(p.replika)}</textarea>
        <label class="dim small">Что видно</label><textarea data-k="dejstvie" rows="1">${esc(p.dejstvie)}</textarea>
        <div class="mk-2"><input data-k="na_ekrane" value="${esc(arr(p.na_ekrane).join(', '))}" placeholder="подписи через запятую"><input data-k="sek" type="number" min="3" max="12" step="1" value="${p.sek}" ${p.etap === 'zadanie' && p.tip === 'ekran' ? 'disabled title="пауза задания — ровно 7 с"' : ''}></div></div></div>`).join('')}</div>
      ${sc.zapiska ? `<details class="mk-zam"><summary>Записка учителю</summary><p class="small">${esc(sc.zapiska)}</p></details>` : ''}
      ${P.brif.yazyk === 'kz' ? `<label class="mk-chk"><input type="checkbox" id="mknos" ${sc.nositel_ok ? 'checked' : ''}> Казахский текст прочитал носитель языка — без этого озвучка не откроется</label>` : ''}
      <div class="mk-row">${P.ok.scenarij ? '' : utvBtn('scenarij', 'Утвердить сценарий')}<button class="btn quiet" id="mkre">Переписать заново · до ${kr(P.smeta.scenarij)}</button></div>`;
    bindCommon(pan);
    $$('.mk-tr [data-k]', pan).forEach((el) => el.addEventListener('change', async () => {
      const row = el.closest('.mk-tr'); const e = {}; $$('[data-k]', row).forEach((x) => { e[x.dataset.k] = x.value; });
      const pl = sc.plany.map(() => ({})); pl[+row.dataset.i] = e;
      try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'scenarij', plany: pl })).proekt; drawProekt(); } catch (er) { toast(er.message); }
    }));
    const n = $('#mknos'); if (n) n.onchange = async () => { try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'scenarij', nositel_ok: n.checked })).proekt; drawProekt(); } catch (er) { toast(er.message); } };
    $('#mkre').onclick = () => { if (confirm('Написать сценарий заново? Ваши правки пропадут.')) run($('#mkre'), '/api/multiki/scenarij', {}, 'Пишу и проверяю факты…'); };
    const pro = $('#mkpro'); if (pro) pro.onclick = () => run(pro, '/api/multiki/proverit', {}, 'Методист читает…');
    $$('[data-vern]', pan).forEach((b) => { b.onclick = async () => { try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'scenarij', vernut: +b.dataset.vern })).proekt; drawProekt(); toast('План ' + b.dataset.vern + ' — как у сценариста'); } catch (e) { toast(e.message); } }; });
  }

  function pRask(pan) {
    const r = P.raskadrovka;
    if (!r) {
      pan.innerHTML = head('Раскадровка', 'ИИ-режиссёр разложит сценарий на планы: видео-план — одна съёмка 4–12 с, экран — карточка монтажа (титр, задание, «Запомни»). Для каждого плана — крупность, камера, кто в кадре.') +
        `<button class="btn accent" id="mkgo">Разложить на планы · до ${kr(P.smeta.raskadrovka)}</button>`;
      $('#mkgo').onclick = () => run($('#mkgo'), '/api/multiki/raskadrovka', {}, 'Раскладываю…');
      return;
    }
    pan.innerHTML = head('Раскадровка', `${vplany().length} видео-планов и ${r.plany.length - vplany().length} экранов. Поправьте «что видно» словами — художник нарисует по вашему описанию.`) + okBadge('raskadrovka') +
      `<div class="mk-plans">${r.plany.map((p) => `<div class="mk-plan ${p.tip}" data-n="${p.n}"><div class="mk-ph"><b>${p.n}</b><span>${p.tip === 'video' ? 'Видео · ' + p.dlit + ' с' : esc(EKRAN[(p.ekran || {}).vid] || 'Экран') + ' · ' + p.sek + ' с'}</span>${p.tip === 'video' ? `<small>${esc(p.krupnost)} · ${esc(p.kamera)}${arr(p.v_kadre).length ? ' · ' + esc(p.v_kadre.join(', ')) : ''}</small>` : ''}</div>
        ${p.tip === 'video' ? `<textarea data-k="dejstvie" rows="2">${esc(p.dejstvie)}</textarea>` : `<p class="small"><b>${esc((p.ekran || {}).zagolovok || '')}</b>${arr((p.ekran || {}).punkty).length ? '<br>' + p.ekran.punkty.map(esc).join(' · ') : ''}</p>`}
        ${p.replika ? `<p class="small mk-rep"><b>${esc(p.kto || '')}:</b> ${esc(p.replika)}</p>` : ''}
        ${p.tip === 'video' ? `<input data-k="podpisi" value="${esc(arr(p.podpisi).join(', '))}" placeholder="подписи на экране через запятую">` : ''}</div>`).join('')}</div>
      <div class="mk-row">${P.ok.raskadrovka ? '' : utvBtn('raskadrovka', 'Утвердить раскадровку')}<button class="btn quiet" id="mkre">Пересобрать · до ${kr(P.smeta.raskadrovka)}</button></div>`;
    bindCommon(pan);
    $$('.mk-plan [data-k]', pan).forEach((el) => el.addEventListener('change', async () => {
      const n = +el.closest('.mk-plan').dataset.n;
      try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'raskadrovka', plany: [{ n, [el.dataset.k]: el.value }] })).proekt; drawProekt(); } catch (er) { toast(er.message); }
    }));
    $('#mkre').onclick = () => { if (confirm('Пересобрать раскадровку по утверждённому сценарию? Правки планов пропадут.')) run($('#mkre'), '/api/multiki/raskadrovka', {}, 'Раскладываю…'); };
  }

  function imgBox(x, alt) {
    if (x.status === 'idet') return '<div class="mk-ph-img"><span class="spin"></span><span class="small muted">рисую…</span></div>';
    if (x.status === 'oshibka') return `<div class="mk-ph-img err"><span class="small">Не получилось: ${esc(x.error || '')}. Кредиты вернулись.</span></div>`;
    if (x.url && x.error) return `<img src="${esc(API_BASE + x.url)}" alt="${esc(alt)}" data-lb loading="lazy"><span class="mk-old">${esc(x.error)}</span>`;
    if (x.url) return `<img src="${esc(API_BASE + x.url)}" alt="${esc(alt)}" data-lb loading="lazy">${x.ustarel ? '<span class="mk-old">устарел — описание изменилось</span>' : ''}`;
    return '<div class="mk-ph-img"><span class="small dim">ещё нет</span></div>';
  }

  function pGeroi(pan) {
    const gl = it('geroi', 'list'), lo = it('geroi', 'lokaciya');
    pan.innerHTML = head('Герои и локация', 'Лист героев держит их облик во всех кадрах, локация — одно место на весь мультик. Можно нарисовать по описанию или загрузить свой рисунок. Фото людей и детей не берём.') + okBadge('geroi') +
      `<div class="mk-2col"><div><span class="caps">Лист героев</span><div class="mk-img">${imgBox(gl, 'Лист героев')}</div>
        ${P.brif.geroi.map((g) => `<div class="field"><label>${esc(g.imya)} — ${esc(g.kto)}</label><textarea data-g="${esc(g.imya)}" rows="2" placeholder="окрас, одежда, предметы">${esc(g.vneshnost || '')}</textarea></div>`).join('')}
        <div class="mk-row"><button class="btn sm accent" data-ris="list">${gl.url ? 'Перерисовать' : 'Нарисовать'} · ${kr(L.ceny.kartinka)}</button>${upBtn('list')}</div></div>
        <div><span class="caps">Локация</span><div class="mk-img">${imgBox(lo, 'Локация')}</div>
        <div class="field"><label>Где происходит</label><textarea id="mklok" rows="4">${esc(P.raskadrovka.lokaciya || '')}</textarea></div>
        <div class="mk-row"><button class="btn sm accent" data-ris="lokaciya">${lo.url ? 'Перерисовать' : 'Нарисовать'} · ${kr(L.ceny.kartinka)}</button>${upBtn('lokaciya')}</div></div></div>
      <div class="mk-row" style="margin-top:18px">${P.ok.geroi ? '' : utvBtn('geroi', 'Утвердить героев и локацию')}</div>`;
    bindCommon(pan);
    $$('[data-g]', pan).forEach((t) => t.addEventListener('change', async () => { try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'geroi', geroi: [{ imya: t.dataset.g, vneshnost: t.value }] })).proekt; } catch (e) { toast(e.message); } }));
    $('#mklok').addEventListener('change', async (e) => { try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'geroi', lokaciya: e.target.value })).proekt; } catch (er) { toast(er.message); } });
    $$('[data-ris]', pan).forEach((b) => { b.onclick = () => run(b, '/api/multiki/geroi', { chto: b.dataset.ris }, 'Отправляю художнику…'); });
    $$('input[data-up]', pan).forEach((inp) => { inp.onchange = () => upload(inp); });
  }
  const upBtn = (chto) => `<label class="btn sm quiet"><input type="file" accept="image/png,image/jpeg,image/webp" hidden data-up="${chto}">Свой рисунок</label>`;

  async function upload(inp) {
    const file = inp.files[0]; if (!file) return;
    if (!confirm('Это рисунок, а не фото людей или детей? Фото через генераторы не пропускаем.')) { inp.value = ''; return; }
    try {
      const im = await loadImg(URL.createObjectURL(file)); const c = document.createElement('canvas'); const k = Math.min(1, 2048 / Math.max(im.naturalWidth, im.naturalHeight));
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const b64 = c.toDataURL('image/jpeg', 0.9).split(',')[1];
      P = (await api('/api/multiki/zagruzit', { pid: P.id, chto: inp.dataset.up, risunok: true, fajl: { b64, mime: 'image/jpeg' } })).proekt; drawProekt();
    } catch (e) { toast(e.message); }
  }

  function pKadry(pan) {
    const vp = vplany(); const net = vp.filter((p) => !ready(it('kadr', p.n)) && it('kadr', p.n).status !== 'idet');
    pan.innerHTML = head('Стоп-кадры', 'Первый кадр каждого видео-плана. С него начнётся съёмка — поэтому смотрите внимательно: облик героев, место, кто в кадре. <b>Утверждая кадры, вы даёте «да» на съёмку роликов</b> — это самый дорогой шаг.') + okBadge('kadry') +
      `${net.length ? `<div class="mk-row" style="margin-bottom:14px"><button class="btn accent" id="mkall">Нарисовать ${net.length === vp.length ? 'все' : 'недостающие'} · ${kr(net.length * L.ceny.kartinka)}</button></div>` : ''}
      <div class="mk-cards">${vp.map((p) => { const x = it('kadr', p.n); return `<div class="mk-c"><div class="mk-img">${imgBox(x, 'План ' + p.n)}</div><p class="small"><b>${p.n}.</b> ${esc(p.dejstvie)}</p>
        <button class="btn sm ${x.url ? 'quiet' : ''}" data-k="${p.n}" ${x.status === 'idet' ? 'disabled' : ''}>${x.url ? 'Переделать' : 'Нарисовать'} · ${kr(L.ceny.kartinka)}</button></div>`; }).join('')}</div>
      <div class="mk-row" style="margin-top:18px">${P.ok.kadry ? '' : utvBtn('kadry', 'Да, кадры подходят')}</div>`;
    bindCommon(pan);
    const all = $('#mkall'); if (all) all.onclick = () => run(all, '/api/multiki/kadr', { n: 'vse' }, 'Отправляю художнику…');
    $$('[data-k]', pan).forEach((b) => { b.onclick = () => run(b, '/api/multiki/kadr', { n: +b.dataset.k }, 'Рисую…'); });
  }

  function pGolos(pan) {
    const gp = gplany(); const net = gp.filter((p) => !ready(it('golos', p.n)) && it('golos', p.n).status !== 'idet');
    const cena = net.reduce((s, p) => s + (p.cena_golos || 0), 0);
    pan.innerHTML = head('Озвучка', 'Голоса синтезированы ИИ — это не голоса реальных детей. Каждая реплика — отдельный файл: послушайте и переозвучьте, если интонация не та. Длина реплики задаёт длину плана — поэтому голос до картинок.') + okBadge('golos') +
      (P.brif.yazyk === 'kz' ? '<p class="warn"><b>Қазақша:</b> послушайте все реплики целиком — ударения и звуки ә, ғ, қ, ң, ө, ұ, ү, і модель может произнести неточно.</p>' : '') +
      `<div class="mk-voices">${P.brif.geroi.map((g) => `<label>${esc(g.imya)}<select data-gv="${esc(g.imya)}">${arr(L.golosa).map((v) => `<option value="${v.kod}" ${g.golos === v.kod ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>`).join('')}</div>
      ${net.length ? `<div class="mk-row" style="margin:14px 0"><button class="btn accent" id="mkall">Озвучить ${net.length === gp.length ? 'все' : 'остальные'} · ≈ ${kr(cena)}</button></div>` : ''}
      <div class="mk-lines">${gp.map((p) => { const x = it('golos', p.n); return `<div class="mk-line"><b>${p.n}. ${esc(p.kto || '—')}</b><span>${esc(p.replika)}${p.dolgo ? '<br><span class="small" style="color:var(--bad)">Реплика длиннее 11 с — один план её не вместит. Сократите в раскадровке.</span>' : ''}</span>
        <div>${x.status === 'idet' ? '<span class="spin"></span>' : x.status === 'oshibka' ? `<span class="small" style="color:var(--bad)">${esc(x.error || 'ошибка')}</span>` : x.url ? `<audio controls preload="none" src="${esc(API_BASE + x.url)}"></audio>${x.ustarel ? '<span class="mk-old">устарел</span>' : ''}` : ''}
        <button class="btn sm ${x.url ? 'quiet' : ''}" data-g="${p.n}" ${x.status === 'idet' ? 'disabled' : ''}>${x.url ? 'Ещё раз' : 'Озвучить'} · ≈ ${kr(p.cena_golos)}</button></div></div>`; }).join('') || '<p class="muted">В мультике нет реплик.</p>'}</div>
      <div class="mk-row" style="margin-top:18px">${P.ok.golos ? '' : utvBtn('golos', 'Голоса подходят')}</div>`;
    bindCommon(pan);
    $$('[data-gv]', pan).forEach((s) => { s.onchange = async () => { try { P = (await api('/api/multiki/pravka', { pid: P.id, shag: 'golos', golosa: { [s.dataset.gv]: s.value } })).proekt; drawProekt(); } catch (e) { toast(e.message); } }; });
    const all = $('#mkall'); if (all) all.onclick = () => run(all, '/api/multiki/golos', { n: 'vse' }, 'Озвучиваю…');
    $$('[data-g]', pan).forEach((b) => { b.onclick = () => run(b, '/api/multiki/golos', { n: +b.dataset.g }, 'Озвучиваю…'); });
  }

  function pVideo(pan) {
    const res = store.get('mkres', '720p');
    const vp = vplany(); const net = vp.filter((p) => !(ready(it('video', p.n)) && it('video', p.n).res === res) && it('video', p.n).status !== 'idet');
    const cena = net.reduce((s, p) => s + p.cena_video[res], 0);
    const an = it('animatik', 0);
    pan.innerHTML = head('Ролики', 'Каждый видео-план снимается от утверждённого стоп-кадра, губы — под голос. Снимайте по одному, если хотите сначала проверить качество. Неудача — кредиты возвращаются.') + okBadge('video') +
      `<div class="mk-anim"><div><b>Аниматик · бесплатно</b><p class="small muted">Весь мультик из стоп-кадров с голосом, подписями и заданиями — посмотрите по времени до съёмки. Можно показать и так, без видео.</p></div>
        ${an.status === 'idet' ? '<div class="working"><span class="spin"></span><span>Собираю…</span></div>' : an.status === 'oshibka' ? `<p class="warn">${esc(an.error || '')}</p>` : an.url ? `<video controls preload="metadata" src="${esc(API_BASE + an.url)}"></video><a class="btn sm quiet" href="${esc(API_BASE + an.url)}" download="animatik.mp4">Скачать аниматик</a>` : ''}
        <button class="btn sm" id="mkan" ${an.status === 'idet' ? 'disabled' : ''}>${an.url ? 'Собрать заново' : 'Собрать аниматик'}</button></div>` +
      `<div class="field"><label>Качество</label><div class="chips" id="mkres">${[['720p', '720p · для проектора в классе'], ['480p', '480p · проба одного плана']].map(([v, t]) => `<button class="chip ${res === v ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
      ${net.length ? `<div class="mk-row" style="margin-bottom:14px"><button class="btn accent" id="mkall">Снять ${net.length === vp.length ? 'все' : 'остальные'} (${net.length}) · ${kr(cena)}</button><span class="small muted">≈ 2–6 минут на план</span></div>` : ''}
      <div class="mk-cards">${vp.map((p) => { const x = it('video', p.n); const k = it('kadr', p.n); return `<div class="mk-c"><div class="mk-img">${x.status === 'idet' ? `<img src="${esc(API_BASE + k.url)}" alt="" style="opacity:.45"><div class="mk-over"><span class="spin"></span> снимаю…</div>` : x.status === 'oshibka' ? `<div class="mk-ph-img err"><span class="small">Не получилось: ${esc(x.error || '')}. Кредиты вернулись.</span></div>` : x.url ? `<video controls preload="metadata" src="${esc(API_BASE + x.url)}" poster="${esc(API_BASE + k.url)}"></video>${x.ustarel ? '<span class="mk-old">устарел</span>' : ''}` : `<img src="${esc(API_BASE + k.url)}" alt="План ${p.n}" data-lb>`}</div>
        <p class="small"><b>${p.n}.</b> ${p.dlit} с${p.replika ? ' · ' + esc(p.kto) + ': ' + esc(p.replika) : ''}</p>
        <button class="btn sm ${x.url ? 'quiet' : ''}" data-v="${p.n}" ${x.status === 'idet' ? 'disabled' : ''}>${x.url ? 'Переснять' : 'Снять'} · ${kr(p.cena_video[res])}</button></div>`; }).join('')}</div>
      <div class="mk-row" style="margin-top:18px">${P.ok.video ? '' : utvBtn('video', 'Ролики подходят')}</div>`;
    bindCommon(pan);
    $('#mkres').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; store.set('mkres', c.dataset.v); panel(); });
    $('#mkan').onclick = async () => { const b = $('#mkan'); b.disabled = true; try { const body = await render(); run(b, '/api/multiki/sborka', Object.assign(body, { rezhim: 'animatik' }), 'Собираю…'); } catch (e) { toast(e.message); b.disabled = false; } };
    const all = $('#mkall'); if (all) all.onclick = () => { if (confirm(`Снять ${net.length} план(ов) в ${res} за ${kr(cena)}? Кредиты удерживаются сразу, за неудачные вернутся.`)) run(all, '/api/multiki/video', { n: 'vse', res }, 'Отправляю на съёмку…'); };
    $$('button[data-v]', pan).forEach((b) => { b.onclick = () => { const p = vp.find((x) => x.n === +b.dataset.v); if (confirm(`Снять план ${p.n} в ${res} за ${kr(p.cena_video[res])}?`)) run(b, '/api/multiki/video', { n: p.n, res }, 'Отправляю…'); }; });
  }

  function pSborka(pan) {
    const x = it('sborka', 0);
    pan.innerHTML = head('Сборка', 'Склеим планы, наложим подписи-термины, экраны-задания с паузой и «Запомни», в конце — титр «Создано с помощью ИИ». Бесплатно.') + okBadge('sborka') +
      `<div class="mk-prev" id="mkprev"><span class="spin"></span></div>
      <div class="mk-final">${x.status === 'idet' ? '<div class="working"><span class="spin"></span><span>Собираю мультик… около минуты</span></div>' : x.status === 'oshibka' ? `<p class="warn"><b>Сборка не прошла:</b> ${esc(x.error || '')}</p>` : x.url ? `${x.ustarel ? '<p class="warn">Собрано из прежних планов — соберите заново.</p>' : ''}<video controls preload="metadata" src="${esc(API_BASE + x.url)}"></video><div class="mk-row"><a class="btn" href="${esc(API_BASE + x.url)}" download="multik.mp4">Скачать mp4 · ${x.sek} с</a>${P.ok.sborka ? '' : utvBtn('sborka', 'Готово')}</div>` : ''}</div>
      <div class="mk-row" style="margin-top:14px"><button class="btn accent" id="mksb" ${x.status === 'idet' ? 'disabled' : ''}>${x.url ? 'Собрать заново' : 'Собрать мультик'} · бесплатно</button></div>`;
    bindCommon(pan);
    preview();
    $('#mksb').onclick = async () => {
      const b = $('#mksb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Рисую экраны…';
      try { const body = await render(); run(b, '/api/multiki/sborka', body, 'Собираю…'); } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Собрать мультик · бесплатно'; }
    };
  }

  // ---------- экраны и подписи: рисуем здесь, сервер только накладывает ----------
  const CW = 1280, CH = 720;
  const FONT = 'Geologica, Onest, system-ui, sans-serif';
  function cnv() { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; }
  function wrap(g, text, maxW) {
    const words = String(text || '').split(/\s+/); const lines = []; let line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function shadowText(g, text, x, y) { g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; g.shadowOffsetY = 3; g.fillText(text, x, y); g.restore(); }
  async function bgFor(n) {
    const pl = P.raskadrovka.plany; let src = null;
    for (let i = pl.findIndex((p) => p.n === n); i >= 0 && !src; i--) if (pl[i].tip === 'video' && it('kadr', pl[i].n).url) src = it('kadr', pl[i].n).url;
    if (!src) { const after = pl.find((p) => p.tip === 'video' && it('kadr', p.n).url); src = after ? it('kadr', after.n).url : (it('geroi', 'lokaciya').url || null); }
    return src ? loadImg(API_BASE + src).catch(() => null) : null;
  }
  async function card(p) {
    const c = cnv(); const g = c.getContext('2d'); const e = p.ekran || {}; const im = await bgFor(p.n);
    g.fillStyle = '#1d2a3a'; g.fillRect(0, 0, CW, CH);
    if (im) { const k = Math.max(CW / im.naturalWidth, CH / im.naturalHeight); g.filter = 'blur(18px)'; g.drawImage(im, (CW - im.naturalWidth * k) / 2, (CH - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); g.filter = 'none'; }
    g.fillStyle = 'rgba(10,16,28,.42)'; g.fillRect(0, 0, CW, CH);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let y = 250;
    if (e.vid === 'titr') {
      g.font = `500 34px ${FONT}`; shadowText(g, arr(e.punkty)[0] || `${P.brif.predmet} · ${P.brif.yazyk === 'kz' ? P.brif.klass + '-сынып' : P.brif.klass + ' класс'}`, CW / 2, 230);
      g.font = `700 72px ${FONT}`; wrap(g, e.zagolovok || P.scenarij.vopros, 1040).forEach((l, i) => shadowText(g, l, CW / 2, 340 + i * 86));
      g.font = `500 24px ${FONT}`; g.globalAlpha = 0.85; shadowText(g, aiText(), CW / 2, CH - 60); g.globalAlpha = 1;
      return c;
    }
    if (e.vid === 'zadanie') {
      g.fillStyle = '#fff'; [-28, 28].forEach((dx) => { g.beginPath(); g.roundRect(CW / 2 + dx - 14, 110, 28, 90, 10); g.fill(); }); y = 300;
      if (P.brif.zadanie === 'zapis') { g.font = `500 32px ${FONT}`; shadowText(g, P.brif.yazyk === 'kz' ? 'Мұғалім: кідірісті басыңыз' : 'Учитель: нажмите паузу', CW / 2, 240); }
    }
    if (e.vid === 'zapomni') { g.font = `700 44px ${FONT}`; g.fillStyle = '#FFD24D'; shadowText(g, P.brif.yazyk === 'kz' ? 'Есте сақта!' : 'Запомни', CW / 2, 150); g.fillStyle = '#fff'; y = 240; }
    g.font = `700 54px ${FONT}`; const head = (e.vid === 'zapomni' ? '' : e.zagolovok) || '';
    wrap(g, head, 1000).forEach((l) => { shadowText(g, l, CW / 2, y); y += 66; });
    g.font = `500 40px ${FONT}`; y += 20;
    arr(e.punkty).forEach((t) => { wrap(g, t, 1000).forEach((l) => { shadowText(g, l, CW / 2, y); y += 54; }); y += 8; });
    return c;
  }
  function caption(t, k, n) {
    const c = cnv(); const g = c.getContext('2d'); g.font = `700 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    shadowText(g, String(t).toLowerCase(), CW * (k + 1) / (n + 1), CH - 86); return c;
  }
  function digit(d) {
    const c = cnv(); const g = c.getContext('2d'); g.fillStyle = 'rgba(255,77,31,.92)'; g.beginPath(); g.arc(CW - 130, 130, 64, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = `700 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(d), CW - 130, 134); return c;
  }
  function finalCard() {
    const c = cnv(); const g = c.getContext('2d'); g.fillStyle = '#15192A'; g.fillRect(0, 0, CW, CH); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 56px ${FONT}`; wrap(g, P.scenarij.nazvanie, 1000).forEach((l, i) => g.fillText(l, CW / 2, 300 + i * 66));
    g.font = `500 30px ${FONT}`; g.fillStyle = '#B9BECB'; g.fillText(aiText(), CW / 2, 470);
    g.font = `400 24px ${FONT}`; g.fillText(P.brif.yazyk === 'kz' ? 'Дауыстар мен суреттерді ЖИ жасады — бұл нақты балалар емес' : 'Голоса и картинки созданы ИИ — это не реальные дети', CW / 2, 515); return c;
  }
  const aiText = () => (P.brif.yazyk === 'kz' ? 'ЖИ көмегімен жасалған · JASA' : 'Создано с помощью ИИ · JASA');
  function metka() {   // постоянная метка в углу всего ролика: видна и во фрагменте (ст. 21 закона 230-VIII)
    const c = cnv(); const g = c.getContext('2d'); g.fillStyle = 'rgba(15,20,32,.55)'; g.beginPath(); g.roundRect(24, 24, 70, 38, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,.92)'; g.font = `700 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.brif.yazyk === 'kz' ? 'ЖИ' : 'ИИ', 59, 44); return c;
  }
  const b64 = (c, t) => c.toDataURL(t || 'image/png', 0.9).split(',')[1];
  async function render() {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const karty = {}, podpisi = {};
    for (const p of P.raskadrovka.plany) {
      if (p.tip === 'ekran') karty[p.n] = b64(await card(p), 'image/jpeg');
      else if (arr(p.podpisi).length) podpisi[p.n] = p.podpisi.map((t, k) => b64(caption(t, k, p.podpisi.length)));
    }
    return { karty, podpisi, cifry: [1, 2, 3, 4, 5, 6, 7].map((d) => b64(digit(d))), final: b64(finalCard(), 'image/jpeg'), metka: b64(metka()) };
  }
  async function preview() {
    const box = $('#mkprev'); if (!box) return;
    const ek = P.raskadrovka.plany.filter((p) => p.tip === 'ekran');
    const urls = []; for (const p of ek) { try { urls.push([p, (await card(p)).toDataURL('image/jpeg', 0.7)]); } catch (e) { /* фон не загрузился */ } }
    if (!$('#mkprev')) return;
    box.innerHTML = `<span class="caps">Экраны монтажа · ${ek.length}</span><div class="mk-cards sm">${urls.map(([p, u]) => `<div class="mk-c"><img src="${u}" alt="${esc(EKRAN[p.ekran.vid])}" data-lb><p class="small">${p.n}. ${esc(EKRAN[p.ekran.vid])}</p></div>`).join('')}</div>`;
    $$('img[data-lb]', box).forEach((im) => { im.onclick = () => lightbox(im.src, im.alt); });
  }

  // ---------- опрос фоновых задач ----------
  function poll() {
    const token = S.pollToken;
    const busy = () => Object.values(P.media || {}).some((m) => Object.values(m).some((x) => x.status === 'idet'));
    if (!busy()) return;
    clearTimeout(poll.h);
    poll.h = setTimeout(async function tick() {
      if (token !== S.pollToken || !$('#mk') || !P) return;
      try {
        const pid = P.id; const r = await api('/api/multiki/' + pid);
        if (token !== S.pollToken || !P || P.id !== pid || pidOf() !== pid) return;   // человек уже ушёл на другой мультик
        P = r.proekt;
        const sig = JSON.stringify(P.media || {});
        if (sig !== mediaSig) { const y = window.scrollY; drawProekt(); window.scrollTo({ top: y }); if (typeof r.ostatok === 'number') spend(0, r.ostatok); }
      } catch (e) { /* сеть моргнула — следующий круг */ }
      if (busy()) poll.h = setTimeout(tick, 3000); else loadMe();
    }, 3000);
  }

  function style() {
    if (document.getElementById('mk-style')) return;
    const s = document.createElement('style'); s.id = 'mk-style';
    s.textContent = `
.mk-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:22px}
.mk-pr{display:flex;flex-direction:column;gap:4px;text-decoration:none;padding:16px 18px}
.mk-brif{max-width:760px}.mk-shab{max-width:760px;margin-bottom:16px}.mk-brif select,.mk-panel select{width:100%;border:1px solid var(--line);border-radius:var(--r-sm);padding:11px 12px;font:inherit;background:var(--field);color:var(--ink)}
.mk-3{display:grid;grid-template-columns:2fr 1fr 1.4fr;gap:12px}.mk-2{display:grid;grid-template-columns:1fr 80px;gap:8px;margin-top:6px}
.mk-g{display:grid;grid-template-columns:1fr 1.4fr 1.4fr;gap:8px;margin-bottom:8px}
.mk-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.mk-head{margin-bottom:18px}
.mk-grid{display:grid;grid-template-columns:220px 1fr;gap:18px;align-items:start}
.mk-steps{display:flex;flex-direction:column;gap:4px;position:sticky;top:16px}
.mk-steps a{display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:var(--r-sm);text-decoration:none;color:var(--text)}
.mk-steps a:hover{background:var(--surface-2)}.mk-steps a.on{background:var(--surface);box-shadow:var(--shadow)}
.mk-steps a.lock{opacity:.45}.mk-steps i{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:600;background:var(--surface-2);color:var(--muted)}
.mk-steps a.on i{background:var(--ink);color:var(--ink-fg)}.mk-steps a.done i{background:var(--ok);color:#fff}
.mk-steps span{display:flex;flex-direction:column;line-height:1.25}.mk-steps small{color:var(--dim);font-size:12px}
.mk-panel{min-width:0}.mk-panel textarea{min-height:0}
.mk-ok{display:inline-block;margin:-6px 0 14px;padding:3px 10px;border-radius:var(--r-pill);background:var(--ok-soft);color:var(--ok);font-size:13px;font-weight:600}
.mk-kv{display:grid;grid-template-columns:140px 1fr;gap:6px 14px;margin-bottom:14px;font-size:var(--fs-small)}.mk-kv>span:nth-child(odd){color:var(--dim)}
.mk-zam{margin:12px 0;padding:12px 14px;border-radius:var(--r-sm);background:var(--surface-2)}.mk-zam summary{cursor:pointer;font-weight:600}.mk-zam>div{margin-top:10px}
.mk-table{display:flex;flex-direction:column;gap:10px;margin:14px 0}
.mk-tr{display:grid;grid-template-columns:86px 1fr;gap:12px;padding:12px;border:1px solid var(--line-soft);border-radius:var(--r-sm)}
.mk-n{display:flex;flex-direction:column;font-weight:700;font-size:20px;font-family:var(--disp)}.mk-n small{font-weight:500;font-size:12px;color:var(--dim);font-family:var(--body)}
.mk-tr textarea{margin-bottom:6px}
.mk-chk{display:flex;gap:10px;align-items:flex-start;margin:12px 0;font-size:var(--fs-small)}.mk-chk input{width:auto!important;margin-top:3px}
.mk-plans{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin:12px 0 18px}
.mk-plan{padding:12px;border-radius:var(--r-sm);border:1px solid var(--line-soft);display:flex;flex-direction:column;gap:8px}.mk-plan.ekran{background:var(--surface-2)}
.mk-ph{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}.mk-ph b{font-family:var(--disp);font-size:20px}.mk-ph small{width:100%;color:var(--dim)}
.mk-rep{border-left:3px solid var(--accent);padding-left:8px}
.mk-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.mk-img{position:relative;aspect-ratio:16/9;border-radius:var(--r-sm);overflow:hidden;background:var(--surface-2);margin:8px 0 10px}
.mk-img img,.mk-img video{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in}.mk-img video{cursor:auto;background:#000}
.mk-ph-img{position:absolute;inset:0;display:flex;gap:8px;align-items:center;justify-content:center;padding:12px;text-align:center}.mk-ph-img.err{color:var(--bad)}
.mk-over{position:absolute;inset:0;display:flex;gap:8px;align-items:center;justify-content:center;font-weight:600}
.mk-old{position:absolute;left:8px;top:8px;padding:3px 8px;border-radius:8px;background:var(--warn-soft);color:var(--warn);font-size:12px;font-weight:600}
.mk-line .mk-old{position:static}
.mk-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}.mk-cards.sm{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));margin:8px 0 16px}
.mk-c .btn{margin-top:6px}.mk-c img{width:100%;border-radius:var(--r-sm);display:block;cursor:zoom-in}
.mk-voices{display:flex;gap:14px;flex-wrap:wrap}.mk-voices label{display:flex;flex-direction:column;gap:4px;font-size:var(--fs-small);color:var(--muted);min-width:200px}
.mk-lines{display:flex;flex-direction:column;gap:8px}.mk-line{display:grid;grid-template-columns:120px 1fr;gap:4px 12px;padding:10px 12px;border:1px solid var(--line-soft);border-radius:var(--r-sm)}
.mk-line>div{grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.mk-line audio{height:34px;max-width:100%}
.mk-anim{display:grid;gap:10px;padding:14px;border-radius:var(--r-sm);background:var(--surface-2);margin-bottom:18px}.mk-anim video{width:100%;max-width:640px;border-radius:var(--r-sm);background:#000}.mk-anim .btn{justify-self:start}
.mk-final video{width:100%;max-width:760px;border-radius:var(--r-sm);background:#000;margin:10px 0}
@media (max-width:860px){.mk-grid{grid-template-columns:1fr}.mk-steps{position:static;flex-direction:row;overflow-x:auto;gap:2px;padding-bottom:4px}.mk-steps a{flex:none}.mk-steps small{display:none}
.mk-3,.mk-2col{grid-template-columns:1fr}.mk-g{grid-template-columns:1fr 1fr}.mk-g input:last-child{grid-column:1/-1}.mk-tr{grid-template-columns:1fr}.mk-n{flex-direction:row;gap:8px;align-items:baseline}.mk-kv{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  J.routes.multiki = screen;
  if ((location.hash || '').startsWith('#/multiki')) J.route();
})();
