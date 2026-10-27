/* JASA · Карта бренда (28.10.2026). Папки-отделы бренда, файлы, помощник; генерация берёт всё отсюда сама.
   Подключается после app.js и заменяет экран «Мой бренд». Зависит от window.JASA. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, voice, spend, $, $$, arr, lightbox, S, store, topbar, toB64, trimAlpha, loadImg, API_BASE } = J;
  let D = null;          // ответ /api/brend
  let cur = 'golos';     // открытая папка
  let lastQ = [];        // вопросы помощника

  const B = () => (D && D.brands.find((b) => b.id === D.active)) || null;
  const sec = (b, kod) => (b.sections[kod] || (b.custom || []).find((c) => c.kod === kod) || { fields: {}, files: [] });
  const sch = (kod) => (D.schema.find((s) => s.kod === kod) || { kod, name: ((B().custom || []).find((c) => c.kod === kod) || {}).name || 'Папка', opis: 'Своя папка: всё, что агенты должны знать. Текст попадёт в контекст каждого поста.', files: true, agent: 'все агенты', fields: [{ key: 'tekst', label: 'Содержимое', hint: 'заметки, правила, факты' }] });

  function remember(b) {
    S.brandId = b ? b.id : null; S.brandName = b ? b.name : null;
    store.set('brandId', S.brandId); store.set('brandName', S.brandName);
  }

  async function load() {
    D = await api('/api/brend');
    if (!D.active && D.brands.length) D.active = D.brands[0].id;
    remember(B()); lastQ = arr(D.voprosy);
  }

  async function screen() {
    const main = $('#main');
    main.innerHTML = topbar('Карта бренда') + '<div id="bk"><div class="working"><span class="spin"></span><span>Открываю карту…</span></div></div>';
    try { await load(); } catch (e) { $('#bk').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    draw();
  }

  function draw() {
    const box = $('#bk'); if (!box) return;
    const b = B();
    if (!b) {
      box.innerHTML = `<section style="max-width:780px"><h2>Карта бренда — всё о вас в одном месте, и каждая модель берёт отсюда сама.</h2>
        <p class="muted" style="margin-top:12px">Лого, миссия, голос автора, палитра, продукты, лица, референсы стиля, запреты и правила — по папкам. Копирайтер пишет вашим слогом, художники держат ваши цвета и стиль, лого ставится оригиналом. Помощник соберёт карту из ваших постов и сайта и спросит, чего не хватает.</p>
        <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn accent" id="bnew">Создать карту бренда</button>${arr(D.shablony).includes('welluma') ? '<button class="btn quiet" id="btpl">Собрать карту Welluma</button>' : ''}</div></section>`;
      $('#bnew').onclick = D.guest ? () => { location.hash = '#/kabinet'; } : newBrand; const t = $('#btpl'); if (t) t.onclick = () => template('welluma');
      if (D.guest) { $('#bnew').textContent = 'Войти через Telegram, чтобы создать карту'; }
      return;
    }
    const all = D.schema.map((s) => s.kod).concat((b.custom || []).map((c) => c.kod));
    if (!all.includes(cur)) cur = all[0];
    box.innerHTML = `
      <div class="bhead">
        <div class="ring sm" style="--v:${b.percent}"><b>${b.percent}<small>%</small></b></div>
        <div style="min-width:0"><div class="bsel"><select id="bsel">${D.brands.map((x) => `<option value="${esc(x.id)}" ${x.id === b.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          <button class="chip" id="bnew">+ Бренд</button>${arr(D.shablony).includes('welluma') && !D.brands.some((x) => x.name === 'Welluma') ? '<button class="chip" id="btpl">Карта Welluma</button>' : ''}</div>
          <p class="small muted" style="margin-top:6px">Карта заполнена на ${b.percent} %. Всё, что здесь лежит, модели берут сами — в боте и на сайте. ${S.useBrend ? '' : '<b>Сейчас выключено на «Создать».</b>'}</p></div>
        <label class="btoggle"><input type="checkbox" id="buse" ${S.useBrend ? 'checked' : ''}> использовать в генерации</label>
      </div>
      <div class="bgrid">
        <nav class="bnav">${D.schema.map((s) => navItem(b, s.kod, s.name)).join('')}
          ${(b.custom || []).map((c) => navItem(b, c.kod, c.name)).join('')}
          <button class="bnew-folder" id="bfold">+ Своя папка</button></nav>
        <section class="card beditor" id="bed"></section>
        <aside class="card bassist" id="bas"></aside>
      </div>`;
    $('#bsel').onchange = async (e) => { await api('/api/brend/aktivnyj', { bid: e.target.value }); await load(); draw(); };
    $('#bnew').onclick = newBrand; const t = $('#btpl'); if (t) t.onclick = () => template('welluma');
    $('#buse').onchange = (e) => { S.useBrend = e.target.checked; store.set('useBrend', S.useBrend); draw(); };
    $('#bfold').onclick = async () => { const name = prompt('Название папки (например: «Отзывы клиентов», «Сезонные акции»)'); if (!name) return; try { const r = await api('/api/brend/papka', { bid: b.id, name }); await load(); cur = r.papka.kod; draw(); } catch (e) { toast(e.message); } };
    $$('.bnav a').forEach((a) => { a.onclick = (e) => { e.preventDefault(); cur = a.dataset.kod; draw(); }; });
    editor(b); assistant(b);
  }

  function navItem(b, kod, name) {
    const st = (b.sost || {})[kod]; const s = sec(b, kod);
    const filled = st ? (st.fields > 0 || st.files > 0) : (Object.values(s.fields || {}).some((v) => String(v).trim()) || arr(s.files).length);
    const full = st ? (st.fields >= st.of && (!sch(kod).files || st.files > 0)) : filled;
    return `<a href="#" data-kod="${esc(kod)}" class="${kod === cur ? 'on' : ''}"><i class="st ${full ? 'full' : filled ? 'part' : ''}"></i><span>${esc(name)}</span>${arr(s.files).length ? `<em>${arr(s.files).length}</em>` : ''}</a>`;
  }

  function editor(b) {
    const s = sch(cur); const d = sec(b, cur); const ed = $('#bed');
    ed.innerHTML = `<span class="caps">Папка · берёт: ${esc(s.agent)}</span><h3 style="margin:6px 0 6px">${esc(s.name)}</h3><p class="small muted">${esc(s.opis)}</p>
      <div class="bfields">${s.fields.map((f) => `<div class="field"><label for="f_${esc(f.key)}">${esc(f.label)}</label><textarea id="f_${esc(f.key)}" data-key="${esc(f.key)}" rows="${cur === 'primery' ? 9 : 2}" placeholder="${esc(f.hint || '')}">${esc((d.fields || {})[f.key] || '')}</textarea></div>`).join('')}</div>
      ${s.files ? `<div class="bfiles"><div class="caps" style="margin:6px 0 8px">Файлы · ${arr(d.files).length}</div><div class="bthumbs">${arr(d.files).map((f) => `<div class="bthumb ${cur === 'logo' ? 'checker' : ''}"><img src="${esc(API_BASE + f.url)}" alt="${esc(f.name)}" loading="lazy" crossorigin="anonymous"><button class="bx" data-fid="${esc(f.id)}" title="Удалить">×</button><small>${esc(f.name || '')}</small></div>`).join('')}
        <label class="bthumb badd"><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden id="bfile"><span>+ Загрузить</span><small>${cur === 'logo' ? 'PNG с прозрачным фоном, края обрежем сами' : 'PNG, JPEG, WEBP до 9 МБ'}</small></label></div></div>` : ''}
      <div class="dim small" style="margin-top:12px" id="bsaved">Сохраняется само, когда вы выходите из поля.</div>`;
    $$('textarea', ed).forEach((ta) => ta.addEventListener('change', () => saveField(b, ta)));
    const fi = $('#bfile'); if (fi) fi.onchange = () => upload(b, Array.from(fi.files || []));
    $$('.bx', ed).forEach((x) => { x.onclick = async (e) => { e.stopPropagation(); if (!confirm('Удалить файл из карты?')) return; try { await api('/api/brend/fajl-udalit', { bid: b.id, kod: cur, fid: x.dataset.fid }); await load(); draw(); } catch (er) { toast(er.message); } }; });
    $$('.bthumb img', ed).forEach((im) => { im.onclick = () => lightbox(im.src, im.alt); });
  }

  async function saveField(b, ta) {
    try {
      const r = await api('/api/brend/sohranit', { bid: b.id, kod: cur, polya: { [ta.dataset.key]: ta.value } });
      const i = D.brands.findIndex((x) => x.id === b.id); D.brands[i] = r.brand;
      $('#bsaved').textContent = 'Сохранено · ' + new Date().toLocaleTimeString().slice(0, 5);
      $$('.bnav a').forEach((a) => { if (a.dataset.kod === cur) a.outerHTML = navItem(r.brand, cur, a.querySelector('span').textContent); });
      $$('.bnav a').forEach((a) => { a.onclick = (e) => { e.preventDefault(); cur = a.dataset.kod; draw(); }; });
      const ring = $('.bhead .ring'); if (ring) { ring.style.setProperty('--v', r.brand.percent); ring.querySelector('b').innerHTML = r.brand.percent + '<small>%</small>'; }
    } catch (e) { toast(e.message); }
  }

  async function prepare(file, kod) {
    if (file.size > 25e6) throw new Error('файл больше 25 МБ: ' + file.name);
    const url = URL.createObjectURL(file); const im = await loadImg(url);
    let c;
    if (kod === 'logo') {
      c = trimAlpha(im);
      const k = Math.min(1, 2048 / Math.max(c.width, c.height));
      if (k < 1) { const s2 = document.createElement('canvas'); s2.width = Math.round(c.width * k); s2.height = Math.round(c.height * k); s2.getContext('2d').drawImage(c, 0, 0, s2.width, s2.height); c = s2; }
    } else { c = document.createElement('canvas'); const k = Math.min(1, 2048 / Math.max(im.naturalWidth, im.naturalHeight)); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); }
    URL.revokeObjectURL(url);
    const mime = kod === 'logo' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((res) => c.toBlob(res, mime, 0.9));
    return { b64: await toB64(blob), mime, name: file.name.slice(0, 80) };
  }

  async function upload(b, files) {
    if (!files.length) return;
    const kod = cur;   // пользователь может переключить папку, пока файлы грузятся
    if (D.guest) { toast('Файлы — после входа через Telegram (раздел «Кабинет»)'); return; }
    if (kod === 'lica' && !confirm('Люди на фото согласны, что их лицо используют для картинок бренда? Фото детей сюда не загружаем.')) return;
    toast('Загружаю ' + files.length + '…');
    for (const f of files.slice(0, 8)) {
      try { await api('/api/brend/fajl', { bid: b.id, kod, fajl: await prepare(f, kod) }); } catch (e) { toast(f.name + ': ' + e.message); }
    }
    await load(); draw();
  }

  function assistant(b) {
    const as = $('#bas');
    as.innerHTML = `<span class="caps">Помощник собирает карту</span>
      <p class="small muted" style="margin:6px 0 10px">Вставьте посты, описание, текст презентации или ссылку на сайт — помощник разложит всё по папкам. Пустые поля заполнит, ваши не тронет.</p>
      <textarea id="bmat" rows="6" placeholder="3–5 постов целиком, о чём бренд, что продаёте, кому…"></textarea>
      <input id="bsite" placeholder="Сайт (необязательно): https://…" style="margin-top:8px">
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px"><button class="btn sm accent" id="bgo">Собрать · ≈6 кр</button><button class="icobtn" id="bmic" title="Рассказать голосом"><svg><use href="#i-mic"/></svg></button></div>
      <div id="bres" class="small" style="margin-top:10px"></div>
      <div class="caps" style="margin-top:18px">Чего не хватает${lastQ.length ? ' · ' + lastQ.length : ''}</div>
      <div id="bq">${lastQ.length ? lastQ.map((q, i) => `<div class="bqi"><a href="#" class="bqk" data-kod="${esc(q.kod)}">${esc((D.schema.find((s) => s.kod === q.kod) || {}).name || q.kod)}</a><p>${esc(q.vopros)}</p><div class="inrow"><input data-i="${i}" placeholder="Ответ или голосом"><button class="icobtn qmic" data-i="${i}"><svg><use href="#i-mic"/></svg></button><button class="btn sm quiet qgo" data-i="${i}">→</button></div></div>`).join('') : '<p class="small muted" style="margin-top:6px">Всё главное заполнено. Добавляйте примеры постов — так слог точнее.</p>'}</div>`;
    voice($('#bmic'), (t) => { const m = $('#bmat'); m.value = (m.value ? m.value + '\n' : '') + t; });
    $('#bgo').onclick = () => sobrat(b);
    $$('.qmic', as).forEach((btn) => voice(btn, (t) => { const i = $(`input[data-i="${btn.dataset.i}"]`, as); i.value = (i.value ? i.value + ' ' : '') + t; }));
    $$('.qgo', as).forEach((btn) => { btn.onclick = () => otvet(b, +btn.dataset.i); });
    $$('.bqk', as).forEach((a) => { a.onclick = (e) => { e.preventDefault(); cur = a.dataset.kod; draw(); }; });
  }

  async function sobrat(b) {
    const material = $('#bmat').value.trim(); const sajt = $('#bsite').value.trim();
    if (material.length < 80 && !sajt) { toast('Нужно хотя бы несколько абзацев или ссылка на сайт'); return; }
    const btn = $('#bgo'); btn.disabled = true; btn.textContent = 'Раскладываю по папкам…';
    try {
      const r = await api('/api/brend/sobrat', { bid: b.id, material, sajt });
      spend(r.kredity, r.ostatok); lastQ = arr(r.voprosy);
      await load(); draw();
      $('#bres').innerHTML = `<b>Заполнено полей: ${arr(r.zapolneno).length}.</b> ${esc(r.itog || '')}`;
    } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Собрать · ≈6 кр'; }
  }

  async function otvet(b, i) {
    const q = lastQ[i]; const inp = $(`#bas input[data-i="${i}"]`); const val = (inp.value || '').trim();
    if (!val) { inp.focus(); return; }
    inp.disabled = true;
    try {
      const r = await api('/api/brend/otvet', { bid: b.id, kod: q.kod, vopros: q.vopros, otvet: val });
      spend(r.kredity, r.ostatok);
      lastQ = arr(r.voprosy); if (r.sleduyushchij && !lastQ.some((x) => x.vopros === r.sleduyushchij)) lastQ.unshift({ kod: q.kod, vopros: r.sleduyushchij });
      await load(); cur = q.kod; draw(); toast('Внесено в «' + ((D.schema.find((s) => s.kod === q.kod) || {}).name || q.kod) + '»');
    } catch (e) { toast(e.message); inp.disabled = false; }
  }

  async function newBrand() {
    const name = prompt('Как называется бренд или блог?'); if (!name) return;
    try { await api('/api/brend/sozdat', { name }); await load(); cur = 'golos'; draw(); } catch (e) { toast(e.message); }
  }
  async function template(kod) {
    try { await api('/api/brend/shablon', { kod }); await load(); cur = 'logo'; draw(); toast('Карта Welluma собрана: лого, палитра, голос, право'); } catch (e) { toast(e.message); }
  }

  J.routes.brend = screen;
  if ((location.hash || '').startsWith('#/brend')) J.route();
  // имя активного бренда для пилюли на «Создать» — сразу при загрузке
  api('/api/brend').then((d) => { D = d; if (!D.active && D.brands.length) D.active = D.brands[0].id; remember(B()); }).catch(() => {});
})();
