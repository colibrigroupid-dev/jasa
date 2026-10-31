/* JASA · Презентации (29.10.2026). Студент или предприниматель описывает задачу — команда агентов собирает слайды, речь и тайминг.
   Подключается после app.js, экран #/prezentacii. Зависит от window.JASA. План — PREZENTACII-PLAN.md.
   Одна раскладка (layout) — три выхода: превью HTML, PDF (canvas → jsPDF, кириллица без встраивания шрифтов), PPTX (PptxGenJS,
   кегль считает код и пишет явно; речь — в заметках докладчика). Классы — только с приставкой pz-. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, spend, voice, $, $$, arr, S, store, topbar, toB64, loadImg, trimAlpha, API_BASE, TG } = J;
  let L = null;          // /api/prezentacii: справка, список
  let P = null;          // открытая презентация
  let cur = null;        // открытый шаг
  let otkryt = null;     // id слайда в редакторе
  let pokaz = 0;         // слайд в большом просмотре
  let zanyat = false;
  let cernovik = false;  // выгрузка с незаполненными «[…]» — слайды с ними помечаются «ЧЕРНОВИК»
  const W = 13.333, H = 7.5;   // дюймы, LAYOUT_WIDE
  const kr = (n) => (Math.round(n * 10) / 10).toLocaleString('ru-RU') + ' кр';
  const pidOf = () => ((location.hash.split('?')[1] || '').match(/(?:^|&)p=([0-9a-f]{12})/) || [])[1] || null;
  const MAKET = { titul: 'Титул', razdel: 'Раздел', punkty: 'Пункты', dve_kolonki: 'Две колонки', cifra: 'Большие цифры', grafik: 'График', shema: 'Схема', tajmlajn: 'Таймлайн', tablica: 'Таблица', citata: 'Цитата', kartinka: 'Картинка', final: 'Финал' };
  const METKA = { cifra: 'Цифра', ocenka: 'Оценка', opora: 'Опора', istochnik: 'Источник', pusto: 'Заполните', dlina: 'Длинно' };
  const S_KART = ['titul', 'kartinka', 'punkty', 'razdel', 'citata'];   // = MAKET_S_KARTINKOJ + MAKET_V_KARTINKU в prezentacii.py
  const abs = (u) => (/^https?:/.test(u) ? u : (API_BASE || location.origin) + u);

  style();

  // ---------- цена на кнопке: «до N кр · хватит на M» ----------
  function price(c) {
    if (!c) return '';
    if (c.rezhim === 'besplatno' || c.rezhim === 'v_pakete') return c.nadpis;
    const n = c.kr > 0 ? Math.floor((S.credits || 0) / c.kr) : 0;
    return (c.rezhim === 'paket' ? c.kr + ' кр · пакет: тексты, Критик, правки, речь' : 'до ' + c.kr + ' кр') + ' · хватит на ' + n;
  }

  async function screen() {
    const main = $('#main');
    main.innerHTML = topbar('Презентации', '<a class="btn sm quiet" href="#/prezentacii">Все презентации</a>') + '<div id="pz"><div class="working"><span class="spin"></span><span>Открываю…</span></div></div>';
    try { L = await api('/api/prezentacii'); } catch (e) { $('#pz').innerHTML = `<section style="max-width:720px"><h2>Презентации</h2><p class="skoro"><b>Скоро.</b> Раздел открывается после проверки на первых защитах и питчах — напишем в Telegram.</p></section>`; return; }
    const pid = pidOf();
    if (!pid) { list(); return; }
    try { P = (await api('/api/prezentacii/' + pid)).proekt; } catch (e) { $('#pz').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    cur = cur && P.id === (screen._pid || '') ? cur : (P.shag || 'brif'); screen._pid = P.id;
    draw();
  }

  // ---------- список и новый бриф ----------
  function intro() {
    return `<section style="max-width:760px;margin-bottom:22px"><h2>Презентация к защите или к питчу</h2>
      <p class="muted" style="margin-top:10px">Скажите голосом или напишите, что за выступление, и приложите свою работу или цифры. Команда агентов ИИ соберёт слайды, текст к выступлению под каждым слайдом и тайминг — займёт 5–10 минут, платите только за шаги, которые запустите. JASA не добавляет цифр от себя: каждую цифру и источник код сверяет с вашими материалами, сомнительное подсвечено жёлтым. Перед выступлением проверьте сами.</p>
      <p class="small dim" style="margin-top:6px">Слайды, тексты и речь готовит ИИ.</p>
      ${L.zaglushka ? '<p class="warn"><b>Демо-режим:</b> тексты-примеры, кредиты не списываются.</p>' : ''}</section>`;
  }

  function list() {
    const box = $('#pz');
    if (L.zakryto) { box.innerHTML = intro() + '<p class="skoro"><b>Скоро.</b> Раздел открывается после проверки на первых защитах и питчах — напишем в Telegram.</p>'; return; }
    if (L.guest) { box.innerHTML = intro() + '<a class="btn accent" href="#/kabinet">Войти через Telegram</a><p class="dim small" style="margin-top:10px">Презентация собирается по шагам — поэтому она хранится за вами.</p>'; return; }
    const pre = (() => { try { const x = JSON.parse(sessionStorage.getItem('jasa:prez') || 'null'); sessionStorage.removeItem('jasa:prez'); return x; } catch (e) { return null; } })();
    box.innerHTML = intro() + (arr(L.proekty).length ? `<div class="pz-list">${L.proekty.map((x) => `<a class="card pz-pr" href="#/prezentacii?p=${esc(x.id)}"><span class="caps">${esc((L.tipy[x.tip] || {}).name || x.tip)}</span><b>${esc(x.tema)}</b><span class="small muted">${x.slajdov} слайдов · шаг: ${esc(shagName(x.shag))} · потрачено ${kr(x.potracheno)}</span><span class="dim small">${esc(x.ts)}</span></a>`).join('')}</div>` : '') +
      `<form class="card pz-brif" id="pzb" autocomplete="off"><span class="caps">Новая презентация</span><h3 style="margin:6px 0 16px">Для кого и о чём</h3>${brifFields(null, pre)}
      <div class="pz-row" style="margin-top:6px"><button class="btn accent" type="submit" id="pzgo">Собрать структуру · ${L.besplatno > 0 ? 'бесплатно, ещё ' + L.besplatno + ' сегодня' : 'до ' + L.potolok.struktura + ' кр'}</button><span class="small muted" id="pzsm"></span></div></form>`;
    bindBrif($('#pzb'), null);
  }

  function brifFields(b, pre) {
    const kom = (b && b.komanda) || (pre && pre.komanda) || store.get('pzKom', 'student');
    const tip = (b && b.tip) || Object.keys(L.tipy).find((k) => L.tipy[k].komanda === kom);
    const br = (b && b.brif) || { tema: (pre && pre.tema) || '', yazyk: S.yazyk === 'kz' ? 'kz' : 'ru', minut: kom === 'student' ? 7 : 5 };
    const tipy = Object.entries(L.tipy).filter(([, v]) => v.komanda === kom);
    const f = (k, lbl, ph, ta) => `<div class="field"><label for="pzf-${k}">${lbl}</label>${ta ? `<textarea id="pzf-${k}" data-k="${k}" rows="3" placeholder="${esc(ph)}">${esc(br[k] || '')}</textarea>` : `<input id="pzf-${k}" data-k="${k}" placeholder="${esc(ph)}" value="${esc(br[k] || '')}">`}</div>`;
    return `${b ? '' : `<div class="pz-kom">${Object.entries(L.komandy).map(([k, v]) => `<button type="button" class="pz-k ${k === kom ? 'on' : ''}" data-kom="${k}"><b>${k === 'student' ? 'Студенту' : 'Бизнесу'}</b><small>${esc(v.split('·')[0])} · ${k === 'student' ? 'защита, курсовая, доклад' : 'питч, грант, КП, отчёт'}</small></button>`).join('')}</div>`}
      <div class="field"><label>Что за выступление</label><div class="chips" id="pztip">${tipy.map(([k, v]) => `<button type="button" class="chip ${k === tip ? 'on' : ''}" data-tip="${k}" ${b ? 'disabled' : ''}>${esc(v.name)}${v.paket ? ` · <span class="pz-pk">пакет ${v.paket} кр</span>` : ''}</button>`).join('')}</div></div>
      <div class="field"><label for="pzf-tema">Тема или задача — голосом или текстом</label><div class="pz-mic"><textarea id="pzf-tema" data-k="tema" rows="3" required placeholder="${kom === 'student' ? 'Защита диплома по экономике, КазНУ, 7 минут, тема — цифровизация МСБ в Алматы' : 'Питч на 5 минут для акселератора: доставка воды в Астане, 1 200 клиентов, выручка 4 млн в месяц, ищем 50 млн ₸'}">${esc(br.tema || '')}</textarea><button type="button" class="icobtn" id="pzmic" title="Сказать голосом"><svg><use href="#i-mic"/></svg></button></div></div>
      <div class="pz-2"><div class="field"><label>Язык</label><div class="chips" id="pzyaz">${Object.entries(L.yazyki).map(([k, v]) => `<button type="button" class="chip ${k === br.yazyk ? 'on' : ''}" data-y="${k}">${esc(v)}</button>`).join('')}</div></div>
      <div class="field"><label>Регламент</label><div class="chips" id="pzmin">${arr(L.minut).map((m) => `<button type="button" class="chip ${m === br.minut ? 'on' : ''}" data-m="${m}">${m} мин</button>`).join('')}</div></div></div>
      ${kom === 'student' ? `<details class="pz-more" ${b ? 'open' : ''}><summary>Вуз, руководитель, требования кафедры</summary><div class="pz-2">${f('vuz', 'Вуз', 'КазНУ им. аль-Фараби')}${f('kafedra', 'Кафедра / специальность', 'Экономика')}${f('fio', 'Ваше ФИО', 'Иванова А. С.')}${f('rukovoditel', 'Руководитель', 'к.э.н., доцент Петров П. П.')}</div>${f('trebovaniya', 'Требования кафедры (если есть)', 'Не больше 12 слайдов, шрифт Times New Roman, слайд с методами', true)}</details>`
        : `<div class="pz-2">${f('komu', 'Кому показываем', 'Инвестор, акселератор, закупщик сети кофеен')}${f('prosba', 'Что хотите получить', '50 млн ₸ на расширение, встреча до пятницы')}</div>${f('cifry', 'Ваши цифры — только реальные. JASA поставит на слайды только их', 'Выручка 4 млн ₸ в месяц, 1 200 клиентов, средний чек 3 300 ₸, команда 6 человек', true)}
        ${S.brandId ? `<label class="pz-chk"><input type="checkbox" id="pzbrand" ${!b || (b.oformlenie || {}).brand_id ? 'checked' : ''}> Взять «Мой бренд»: голос, палитра, лого оригиналом</label>` : '<p class="small dim">Бренд не настроен — презентация будет в стиле JASA. <a href="#/brend">Настроить «Мой бренд» →</a></p>'}`}
      ${b ? '' : `<div class="field" style="margin-top:8px"><label for="pzmat">${kom === 'student' ? 'Ваша работа — файлом или текстом (лучше целиком: возьмём введение, выводы, заключение и литературу)' : 'Материалы: бизнес-план, описание, отчёт — файлом или текстом (по желанию)'}</label>
        <div class="pz-drop" id="pzdrop"><textarea id="pzmat" rows="4" placeholder="Вставьте текст или перетащите файл .docx, .pdf, .txt"></textarea><label class="btn sm quiet"><input type="file" hidden id="pzfile" accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">Файл</label></div>
        <div class="small dim" id="pzfn"></div><p class="small dim">${esc(L.pravo)}</p></div>`}`;
  }

  function bindBrif(form, b) {
    let kom = (b && b.komanda) || store.get('pzKom', 'student');
    let fajl = null;
    const sel = (box, attr) => $$('[' + attr + ']', box).forEach((x) => { x.onclick = () => { $$('[' + attr + ']', box).forEach((y) => y.classList.toggle('on', y === x)); }; });
    $$('[data-kom]', form).forEach((x) => { x.onclick = () => { store.set('pzKom', x.dataset.kom); sessionStorage.setItem('jasa:prez', JSON.stringify({ komanda: x.dataset.kom, tema: $('#pzf-tema', form).value })); list(); }; });
    sel($('#pztip', form), 'data-tip'); sel($('#pzyaz', form), 'data-y'); sel($('#pzmin', form), 'data-m');
    voice($('#pzmic', form), (t) => { const ta = $('#pzf-tema', form); ta.value = (ta.value ? ta.value + ' ' : '') + t; });
    const fi = $('#pzfile', form);
    if (fi) {
      const set = (f) => { if (!f) return; if (f.size > 10e6) { toast('Файл больше 10 МБ — пришлите без картинок или вставьте текст'); return; } fajl = f; $('#pzfn', form).textContent = 'Файл: ' + f.name + ' · ' + Math.round(f.size / 1024) + ' КБ'; };
      fi.onchange = (e) => set(e.target.files[0]);
      const dz = $('#pzdrop', form);
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('over'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); set(e.dataTransfer.files[0]); });
    }
    const sobrat = () => {
      const o = {}; $$('[data-k]', form).forEach((x) => { o[x.dataset.k] = x.value.trim(); });
      const y = $('#pzyaz .on', form), m = $('#pzmin .on', form);
      if (y) o.yazyk = y.dataset.y; if (m) o.minut = +m.dataset.m;
      return o;
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (zanyat) return;
      const br = sobrat(); if (!br.tema) { toast('Напишите тему'); return; }
      const tip = ($('#pztip .on', form) || {}).dataset; const go = $('#pzgo', form);
      const brand = $('#pzbrand', form);
      zanyat = true; go.disabled = true; go.innerHTML = '<span class="spin"></span> Создаю…';
      try {
        let pr = (await api('/api/prezentacii/sozdat', Object.assign({ tip: tip && tip.tip, brand_id: brand && brand.checked ? S.brandId : null }, br))).proekt;
        const mt = $('#pzmat', form) && $('#pzmat', form).value.trim();
        if (fajl || mt) { go.innerHTML = '<span class="spin"></span> Читаю материалы…'; pr = (await api('/api/prezentacii/material', fajl ? { pid: pr.id, fajl: { b64: await toB64(fajl), imya: fajl.name } } : { pid: pr.id, tekst: mt })).proekt; }
        P = pr; cur = 'struktura'; screen._pid = P.id;
        history.replaceState(null, '', '#/prezentacii?p=' + P.id);
        zanyat = false; draw(); run('struktura', {}, (P.komanda === 'student' ? 'Методист' : 'Стратег') + ' собирает структуру… 20–40 секунд');
      } catch (err) { toast(err.message); go.disabled = false; go.textContent = 'Собрать структуру'; zanyat = false; }
    });
  }

  const shagName = (k) => ((arr(L && L.shagi).find((x) => x.kod === k) || {}).name || k);

  // ---------- проект ----------
  function draw() {
    const box = $('#pz'); if (!box || !P) return;
    const utv = P.utv || {};
    const sost = (k) => (k === 'brif' ? 'done' : k === 'sborka' ? '' : utv[k] ? 'done' : '');
    const dostup = (k) => ({ brif: true, struktura: true, teksty: !!utv.struktura, rech: !!utv.teksty, oformlenie: !!utv.teksty, sborka: !!utv.teksty })[k];
    const meta = { brif: L.tipy[P.tip].name, struktura: P.slajdy.length ? P.slajdy.length + ' слайдов' : '', teksty: P.proverka ? (P.proverka.metok ? P.proverka.metok + ' меток' : 'чисто') : '',
      rech: P.tajming.rech_sek ? mmss(P.tajming.rech_sek) + ' из ' + mmss(P.tajming.reglament_sek) : utv.rech === 'bez_rechi' ? 'без речи' : '', oformlenie: L.temy[P.oformlenie.tema] || '', sborka: 'PPTX · PDF' };
    box.innerHTML = `<div class="pz-head"><span class="caps">${esc(L.komandy[P.komanda])} · ${esc(L.tipy[P.tip].name)}${P.paket && P.paket.cena ? ' · пакет ' + P.paket.cena + ' кр' + (P.paket.oplachen ? ' оплачен' : '') : ''}</span><h2>${esc(P.brif.tema)}</h2><p class="small muted">Потрачено ${kr(P.potracheno || 0)} · вся презентация (без картинок) — ${P.paket && P.paket.cena ? P.paket.cena + ' кр' : 'до ' + P.smeta + ' кр'}${L.zaglushka ? ' · <b>заглушки</b>' : ''}</p></div>
      <div class="pz-grid"><nav class="pz-steps">${L.shagi.map((s, i) => `<a href="#" data-sh="${s.kod}" class="${s.kod === cur ? 'on' : ''} ${sost(s.kod)} ${dostup(s.kod) ? '' : 'lock'}"><i>${sost(s.kod) ? '✓' : i + 1}</i><span>${esc(s.name)}<small>${esc(meta[s.kod] || '')}</small></span></a>`).join('')}</nav>
      <div class="pz-panel" id="pzp"></div></div>`;
    $$('[data-sh]', box).forEach((a) => { a.onclick = (e) => { e.preventDefault(); if (a.classList.contains('lock')) { toast(!utv.struktura ? 'Сначала утвердите структуру' : 'Сначала утвердите тексты'); return; } cur = a.dataset.sh; draw(); }; });
    ({ brif: pBrif, struktura: pStruktura, teksty: pTeksty, rech: pRech, oformlenie: pOformlenie, sborka: pSborka })[cur]($('#pzp'));
  }
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

  async function run(op, body, msg, after) {
    if (zanyat) return; zanyat = true; const moj = P.id;
    const p = $('#pzp'); const ov = document.createElement('div'); ov.className = 'pz-busy'; ov.innerHTML = `<span class="spin"></span><span>${esc(msg || 'Работаю…')}</span>`; if (p) p.prepend(ov);
    $$('#pzp button').forEach((b) => (b.disabled = true));
    try {
      // rid — ключ операции: если связь оборвалась и мы повторяем запрос, сервер отдаст готовый ответ и не спишет второй раз
      const rid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 36);
      const q = Object.assign({ pid: moj, rid }, body || {});
      // api() превращает оборванное тело ответа в {error: 'сервер ответил не JSON'} при статусе 200 — считаем это обрывом связи
      const vyzov = () => api('/api/prezentacii/' + op, q).then((x) => { if (!x || (x.error && !x.proekt && x.ok !== true && !x.url)) throw new TypeError(x ? x.error : 'пустой ответ'); return x; });
      const r = await vyzov().catch(async (e) => {
        if (!(e instanceof TypeError)) throw e;            // ответ сервера (ошибка) — не сетевой обрыв
        for (let i = 0; i < 40; i++) {                       // повторяем с тем же rid: сервер отдаст готовый ответ или дождётся идущего запроса
          await new Promise((ok) => setTimeout(ok, 3000));
          try { return await vyzov(); } catch (e2) {
            if (!(e2 instanceof TypeError) && !/уже работаю|идёт генерация/.test(e2.message)) throw e2;
          }
        }
        throw e;
      });
      if (typeof r.ostatok === 'number') spend(r.spisano || 0, r.ostatok);
      if (pidOf() !== moj) { zanyat = false; return r; }   // человек ушёл на другую презентацию — её не подменяем
      if (r.proekt) P = r.proekt;
      zanyat = false; if (after) after(r); draw(); return r;
    } catch (e) {
      // обрыв связи: сервер мог дописать и списать — перечитываем проект, иначе кнопка «Написать» заплатит второй раз
      zanyat = false; toast(e.message);
      try { const g = await api('/api/prezentacii/' + moj); if (pidOf() === moj) P = g.proekt; if (typeof g.ostatok === 'number') spend(0, g.ostatok); } catch (e2) { /* остаёмся на прежнем */ }
      if (pidOf() === moj) draw(); return null;
    }
  }
  const pravka = (body) => run('pravka', body, 'Сохраняю…');

  // ---------- шаг 0 · бриф ----------
  function pBrif(box) {
    const m = P.materialy || {};
    box.innerHTML = `<form class="card" id="pzbe" autocomplete="off">${brifFields(P, null)}<div class="pz-row"><button class="btn" type="submit">Сохранить бриф</button><span class="small dim">Если поменяете бриф, структуру и следующие шаги нужно будет утвердить заново.</span></div></form>
      <section class="card" style="margin-top:14px"><span class="caps">Материалы</span>
      ${m.imya ? `<p style="margin:8px 0">${m.udaleny ? 'Материалы удалены (прошло 30 дней). Слайды на месте; чтобы пересобрать — загрузите материалы снова.' : `<b>${esc(m.imya)}</b> · ${Number(m.znakov || 0).toLocaleString('ru-RU')} знаков · отправляем на обработку ${Number(m.v_model || 0).toLocaleString('ru-RU')}`}</p>
        ${arr(m.zadachi).length ? `<p class="small"><b>Задачи из введения:</b> ${m.zadachi.map(esc).join('; ')}</p>` : ''}${arr(m.istochniki).length ? `<p class="small"><b>Источников в списке литературы:</b> ${m.istochniki.length}</p>` : ''}` : '<p class="small muted" style="margin:8px 0">Материалов нет — факты на слайдах будут помечены «уточните».</p>'}
      <div class="pz-drop"><textarea id="pzmat2" rows="3" placeholder="Вставьте текст или выберите файл .docx, .pdf, .txt"></textarea><label class="btn sm quiet"><input type="file" hidden id="pzfile2" accept=".docx,.pdf,.txt">Файл</label></div>
      <div class="pz-row"><button class="btn sm" type="button" id="pzmatgo">${m.imya ? 'Заменить материалы' : 'Добавить материалы'}</button><span class="small dim">${esc(L.pravo)}</span></div></section>
      <div class="pz-row" style="margin-top:16px"><button class="btn accent" id="pzs">${P.slajdy.length ? 'Собрать структуру заново' : 'Собрать структуру'} · ${esc(price(P.ceny.struktura))}</button></div>`;
    const form = $('#pzbe');
    $$('#pzyaz [data-y], #pzmin [data-m]', form).forEach((x) => { x.onclick = () => { $$('[' + (x.dataset.y ? 'data-y' : 'data-m') + ']', x.parentNode).forEach((y) => y.classList.toggle('on', y === x)); }; });
    voice($('#pzmic', form), (t) => { const ta = $('#pzf-tema', form); ta.value = (ta.value ? ta.value + ' ' : '') + t; });
    form.onsubmit = (e) => {
      e.preventDefault(); const o = { chto: 'brif' }; $$('[data-k]', form).forEach((x) => { o[x.dataset.k] = x.value.trim(); });
      const y = $('#pzyaz .on', form), mm = $('#pzmin .on', form); if (y) o.yazyk = y.dataset.y; if (mm) o.minut = +mm.dataset.m;
      const brand = $('#pzbrand', form); if (brand) o.brand_id = brand.checked ? S.brandId : '';
      pravka(o);
    };
    let f2 = null; $('#pzfile2').onchange = (e) => { f2 = e.target.files[0]; if (f2) $('#pzmat2').placeholder = 'Файл: ' + f2.name; };
    $('#pzmatgo').onclick = async () => { const t = $('#pzmat2').value.trim(); if (!f2 && !t) { toast('Вставьте текст или выберите файл'); return; } run('material', f2 ? { fajl: { b64: await toB64(f2), imya: f2.name } } : { tekst: t }, 'Читаю материалы…'); };
    $('#pzs').onclick = () => { if (P.slajdy.length && !confirm('Собрать структуру заново? Тексты и речь текущих слайдов уйдут, оплаченные картинки останутся в «прошлых».')) return; cur = 'struktura'; run('struktura', {}, 'Собираю структуру… 20–40 секунд'); };
  }

  // ---------- шаг 1 · структура ----------
  function pStruktura(box) {
    const st = P.struktura || {};
    if (!P.slajdy.length) { box.innerHTML = `<div class="card"><p>Структуры пока нет.</p><button class="btn accent" id="pzs">Собрать структуру · ${esc(price(P.ceny.struktura))}</button></div>`; $('#pzs').onclick = () => run('struktura', {}, 'Собираю структуру… 20–40 секунд'); return; }
    const sum = P.slajdy.reduce((a, s) => a + (+s.sek || 0), 0);
    box.innerHTML = `<div class="card">${P.utv.struktura ? '<span class="pz-ok">Утверждено</span>' : ''}${st.glavnaya_mysl ? `<p class="pz-lead">${esc(st.glavnaya_mysl)}</p>` : ''}
      ${arr(st.voprosy).length ? `<div class="warn"><b>Чего не хватает:</b><ul>${st.voprosy.map((q) => `<li>${esc(q)}</li>`).join('')}</ul><span class="small">Допишите в бриф или материалы — потом «Собрать заново».</span></div>` : ''}
      <div class="pz-srow pz-shead small dim"><span>№</span><span>Заголовок-вывод · зачем слайд</span><span>Макет</span><span>Сек</span><span></span></div>
      <div id="pzsl">${P.slajdy.map((s, i) => `<div class="pz-srow" data-id="${s.id}"><b>${i + 1}</b><div><input data-f="zagolovok" value="${esc(s.zagolovok)}" maxlength="160"><input data-f="zachem" class="pz-zachem" value="${esc(s.zachem || '')}" maxlength="200" placeholder="зачем этот слайд"></div>
        <select data-f="maket">${Object.entries(MAKET).map(([k, v]) => `<option value="${k}" ${k === s.maket ? 'selected' : ''}>${v}</option>`).join('')}</select><input data-f="sek" type="number" min="5" max="180" value="${s.sek}">
        <span class="pz-ctl"><button type="button" data-mv="-1" title="Выше">↑</button><button type="button" data-mv="1" title="Ниже">↓</button><button type="button" data-del title="Удалить">×</button></span></div>`).join('')}</div>
      <div class="pz-row"><button class="btn sm quiet" id="pzadd">+ Слайд</button><span class="small ${Math.abs(sum - P.tajming.reglament_sek) > P.tajming.reglament_sek * 0.1 ? 'pz-red' : 'muted'}">По плану ${mmss(sum)} из ${mmss(P.tajming.reglament_sek)}</span>
        ${arr(st.uchteno).length ? `<details class="small"><summary>Что учтено</summary>${st.uchteno.map(esc).join(' · ')}</details>` : ''}</div>
      <div class="pz-row" style="margin-top:14px"><button class="btn" id="pzsave" hidden>Сохранить изменения</button>
        ${P.utv.struktura ? `<button class="btn accent" id="pzt">${P.slajdy.some((s) => s.tekst_sig) ? 'К текстам' : 'Написать тексты · ' + esc(price(P.ceny.teksty))}</button>` : `<button class="btn accent" id="pzutv">Утвердить структуру</button>`}
        <button class="btn ghost sm" id="pzre">Собрать заново · ${esc(price(P.ceny.struktura))}</button></div>
      <p class="small dim">Утвердили — дальше тексты: ${P.komanda === 'student' ? 'Научный редактор пишет по вашей работе' : 'Аналитик собирает цифры, Копирайтер пишет голосом бренда'}, потом Критик смотрит глазами ${P.komanda === 'student' ? 'комиссии' : 'инвестора и клиента'} — видит только слайды, без черновиков команды.</p></div>`;
    const rows = () => $$('#pzsl .pz-srow').map((r) => ({ id: r.dataset.id || undefined, zagolovok: $('[data-f=zagolovok]', r).value, zachem: $('[data-f=zachem]', r).value, maket: $('[data-f=maket]', r).value, sek: +$('[data-f=sek]', r).value }));
    const dirty = () => { $('#pzsave').hidden = false; const u = $('#pzutv'); if (u) u.textContent = 'Сохранить и утвердить'; };
    $$('#pzsl input, #pzsl select').forEach((x) => (x.oninput = dirty));
    $$('#pzsl [data-mv]').forEach((b) => { b.onclick = () => { const r = b.closest('.pz-srow'); const sib = +b.dataset.mv < 0 ? r.previousElementSibling : r.nextElementSibling; if (sib) { if (+b.dataset.mv < 0) sib.before(r); else sib.after(r); dirty(); } }; });
    $$('#pzsl [data-del]').forEach((b) => { b.onclick = () => { b.closest('.pz-srow').remove(); dirty(); }; });
    $('#pzadd').onclick = () => { const d = document.createElement('div'); d.className = 'pz-srow'; d.innerHTML = `<b>+</b><div><input data-f="zagolovok" placeholder="Заголовок-вывод"><input data-f="zachem" class="pz-zachem" placeholder="зачем этот слайд"></div><select data-f="maket">${Object.entries(MAKET).map(([k, v]) => `<option value="${k}" ${k === 'punkty' ? 'selected' : ''}>${v}</option>`).join('')}</select><input data-f="sek" type="number" value="30"><span class="pz-ctl"><button type="button" data-del>×</button></span>`; $('#pzsl').appendChild(d); $('[data-del]', d).onclick = () => { d.remove(); dirty(); }; $$('input,select', d).forEach((x) => (x.oninput = dirty)); dirty(); };
    $('#pzsave').onclick = () => pravka({ chto: 'struktura', slajdy: rows() });
    const u = $('#pzutv'); if (u) u.onclick = async () => { const moj = P.id; if (!$('#pzsave').hidden && !(await run('pravka', { chto: 'struktura', slajdy: rows() }, 'Сохраняю…'))) return; if (pidOf() !== moj) return; run('utverdit', { shag: 'struktura' }, 'Утверждаю…'); };
    const t = $('#pzt'); if (t) t.onclick = () => { cur = 'teksty'; if (P.slajdy.some((s) => s.tekst_sig)) draw(); else run('teksty', {}, (P.komanda === 'student' ? 'Научный редактор пишет тексты, Критик оценивает глазами комиссии' : 'Аналитик считает цифры, Копирайтер пишет, Критик оценивает глазами инвестора') + '… 1–2 минуты'); };
    $('#pzre').onclick = () => { if (P.slajdy.some((s) => s.tekst_sig) && !confirm('Собрать заново? Тексты и речь текущих слайдов уйдут.')) return; run('struktura', {}, 'Собираю структуру… 20–40 секунд'); };
  }

  // ---------- шаг 2 · тексты + Критик ----------
  function pTeksty(box) {
    if (!P.slajdy.some((s) => s.tekst_sig)) { box.innerHTML = `<div class="card"><p>Тексты ещё не написаны.</p><button class="btn accent" id="pzt">Написать тексты · ${esc(price(P.ceny.teksty))}</button></div>`; $('#pzt').onclick = () => run('teksty', {}, 'Команда пишет тексты, Критик оценивает их глазами зала… 1–2 минуты'); return; }
    const k = P.kritik || {}; const pr = P.proverka || {};
    box.innerHTML = `${P.utv.teksty ? '<span class="pz-ok">Утверждено</span>' : ''}
      ${arr(pr.obshchie).length ? `<div class="warn"><b>Проверка кодом:</b> ${pr.obshchie.map(esc).join(' · ')}</div>` : ''}
      <p class="small muted" style="margin:10px 0">Нажмите на слайд — поправить текст (бесплатно) или переписать голосом. Жёлтая метка — того, что на слайде, нет в ваших материалах: проверьте или замените.</p>
      <div class="pz-thumbs">${P.slajdy.map((s, i) => `<button type="button" class="pz-th ${otkryt === s.id ? 'on' : ''}" data-id="${s.id}"><div class="pz-sl">${slideHtml(s, i)}</div>${arr(s.metki).length ? `<em class="pz-badge">${s.metki.length}</em>` : ''}<span class="small">${i + 1}. ${esc(MAKET[s.maket] || s.maket)}</span></button>`).join('')}</div>
      <div id="pzed"></div>
      ${k.rubrika ? kritikHtml(k) : ''}
      <div class="pz-row" style="margin-top:16px">${P.utv.teksty ? `<button class="btn accent" id="pznext">Дальше — речь</button>` : `<button class="btn accent" id="pzutv">Утвердить тексты</button>`}
        <button class="btn ghost sm" id="pzkr">Критик ещё раз · ${esc(price(P.ceny.kritik))}</button><button class="btn ghost sm" id="pzre">Написать заново · ${esc(price(P.ceny.teksty))}</button></div>`;
    $$('.pz-th', box).forEach((b) => { b.onclick = () => { otkryt = otkryt === b.dataset.id ? null : b.dataset.id; draw(); if (otkryt) $('#pzed').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }; });
    if (otkryt) editor($('#pzed'), P.slajdy.find((s) => s.id === otkryt));
    $$('[data-pr]', box).forEach((b) => { b.onclick = () => pravka({ chto: 'kritik', n: +b.dataset.n, status: b.dataset.pr }); });
    const vn = $('#pzvn'); if (vn) vn.onclick = () => run('pravki', { prinyato: arr(k.pravki).filter((x) => x.status === 'prinyata').map((x) => x.n) }, 'Правщик вносит принятое…');
    const u = $('#pzutv'); if (u) u.onclick = () => { if (pr.metok && !confirm('На слайдах ' + pr.metok + ' жёлтых меток. Утвердить всё равно? Перед выгрузкой список будет ещё раз.')) return; run('utverdit', { shag: 'teksty' }, 'Утверждаю…', () => { cur = 'rech'; }); };
    const nx = $('#pznext'); if (nx) nx.onclick = () => { cur = 'rech'; draw(); };
    $('#pzkr').onclick = () => run('kritik', {}, 'Критик оценивает глазами зала…');
    $('#pzre').onclick = () => { if (!confirm('Написать тексты заново? Ваши ручные правки слайдов уйдут.')) return; run('teksty', {}, 'Команда пишет тексты заново… 1–2 минуты'); };
  }

  function kritikHtml(k) {
    const rub = Object.entries(k.rubrika || {}); const nazv = { struktura: 'Структура', logika: 'Логика', yasnost: 'Ясность', dokazatelnost: 'Доказательность', dlina: 'Длина' };
    const prin = arr(k.pravki).filter((x) => x.status === 'prinyata').length;
    return `<section class="card pz-kr"><span class="caps">Критик глазами ${P.komanda === 'student' ? 'комиссии' : 'инвестора'} · видит только слайды, без черновиков команды · ${esc(k.versiya || '')}</span>
      <div class="pz-rub">${rub.map(([kk, v]) => `<div><span>${esc(nazv[kk] || kk)}</span><b>${v.ball}</b><i style="--v:${v.ball * 10}%"></i><small>${esc(v.pochemu)}</small></div>`).join('')}</div>
      ${arr(k.golosa).length ? `<div class="pz-golosa">${k.golosa.map((g) => `<p><b>${esc(g.kto)}${g.ball ? ' · ' + esc(g.ball) : ''}:</b> ${esc(g.slovo)}</p>`).join('')}</div>` : ''}
      ${arr(k.silno).length ? `<p class="small"><b>Беречь:</b> ${k.silno.map(esc).join(' · ')}</p>` : ''}
      <div class="pz-pravki">${arr(k.pravki).map((x) => `<div class="pz-pv ${x.status}"><span class="pz-vz">${esc(x.vazhnost)}</span><div><b>${esc(x.chto)}</b><small>${slideNo(x.slajd)}${esc(x.pochemu)}${x.kak ? ' · сделано: ' + esc(x.kak) : ''}</small></div>
        ${x.status === 'vneseno' ? '<span class="pz-ok sm">внесено</span>' : `<span class="pz-yn"><button type="button" class="chip ${x.status === 'prinyata' ? 'on' : ''}" data-pr="${x.status === 'prinyata' ? 'novaya' : 'prinyata'}" data-n="${x.n}">Принять</button><button type="button" class="chip ${x.status === 'otklonena' ? 'on' : ''}" data-pr="${x.status === 'otklonena' ? 'novaya' : 'otklonena'}" data-n="${x.n}">Отклонить</button></span>`}</div>`).join('')}</div>
      ${prin ? `<button class="btn" id="pzvn">Внести принятые (${prin}) · ${esc(price(P.ceny.pravki))}</button>` : ''}</section>`;
  }
  const slideNo = (id) => { const i = P.slajdy.findIndex((s) => s.id === id); return i >= 0 ? 'слайд ' + (i + 1) + ' · ' : ''; };

  function editor(box, s) {
    if (!s) { box.innerHTML = ''; return; }
    const i = P.slajdy.indexOf(s);
    const cif = arr(s.cifry).map((c) => c.znachenie + ' | ' + c.podpis).join('\n');
    box.innerHTML = `<section class="card pz-ed"><div class="pz-edg"><div><div class="pz-sl big">${slideHtml(s, i)}</div>
      ${arr(s.metki).length ? `<div class="pz-metki">${s.metki.map((m) => `<p><span class="pz-m ${m.tip}">${esc(METKA[m.tip] || m.tip)}</span> <b>${esc(m.chto)}</b> — ${esc(m.tekst)}</p>`).join('')}</div>` : '<p class="small pz-green">Всё на слайде нашлось в ваших материалах.</p>'}
      ${arr(s.opory).length ? `<details class="small"><summary>На чём держится слайд (${s.opory.length})</summary>${s.opory.map((o) => `<p><b>${esc(o.chto)}</b> ← «${esc(o.citata)}»</p>`).join('')}</details>` : ''}</div>
      <form id="pzef"><span class="caps">Слайд ${i + 1}</span><div class="field"><label>Заголовок</label><input name="zagolovok" value="${esc(s.zagolovok || '')}" maxlength="160"></div>
      <div class="field"><label>Подзаголовок</label><input name="podzagolovok" value="${esc(s.podzagolovok || '')}" maxlength="220"></div>
      <div class="field"><label>Пункты — по одному в строке</label><textarea name="punkty" rows="5">${esc(arr(s.punkty).join('\n'))}</textarea></div>
      ${s.maket === 'cifra' ? `<div class="field"><label>Одна цифра — одна строка, например: 1 200 | клиентов по подписке</label><textarea name="cifry" rows="3">${esc(cif)}</textarea></div>` : ''}
      <div class="pz-row"><button class="btn sm" type="submit">Сохранить · бесплатно</button><select name="maket" class="pz-sel">${Object.entries(MAKET).map(([k, v]) => `<option value="${k}" ${k === s.maket ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field" style="margin-top:14px"><label>Переписать слайд — скажите, что поменять</label><div class="pz-mic"><input id="pzuk" placeholder="короче, заголовок — выводом, добавь сравнение с прошлым годом"><button type="button" class="icobtn" id="pzmic2" title="Голосом"><svg><use href="#i-mic"/></svg></button></div></div>
      <button class="btn sm accent" type="button" id="pzrw">Переписать · ${esc(price(P.ceny.slajd))}</button></form></div></section>`;
    voice($('#pzmic2'), (t) => { $('#pzuk').value = ($('#pzuk').value ? $('#pzuk').value + ' ' : '') + t; });
    $('#pzef').onsubmit = (e) => {
      e.preventDefault(); const f = e.target; const polya = { zagolovok: f.zagolovok.value, podzagolovok: f.podzagolovok.value, punkty: f.punkty.value.split('\n').map((x) => x.trim()).filter(Boolean), maket: f.maket.value };
      if (f.cifry) polya.cifry = f.cifry.value.split('\n').map((x) => x.split('|')).filter((x) => x[0].trim()).map((x) => ({ znachenie: x[0].trim(), podpis: (x[1] || '').trim() }));
      pravka({ chto: 'slajd', sid: s.id, polya });
    };
    $('#pzrw').onclick = () => { const uk = $('#pzuk').value.trim(); if (!uk) { toast('Скажите, что поменять'); return; } run('slajd', { sid: s.id, ukazanie: uk }, 'Переписываю слайд…'); };
  }

  // ---------- шаг 3 · речь ----------
  function pRech(box) {
    const t = P.tajming; const est = P.slajdy.some((s) => s.rech);
    const cvet = Math.abs(t.rech_sek - t.reglament_sek) <= t.reglament_sek * 0.1 ? 'ok' : 'red';
    box.innerHTML = `${P.utv.rech ? `<span class="pz-ok">${P.utv.rech === 'bez_rechi' ? 'Без речи' : 'Утверждено'}</span>` : ''}
      ${est ? `<div class="card pz-tm"><span class="caps">Хронометраж</span><div class="pz-bar ${cvet}"><i style="width:${Math.min(100, t.rech_sek / t.reglament_sek * 100)}%"></i></div><p class="small">Речь ${mmss(t.rech_sek)} из ${mmss(t.reglament_sek)} · ${cvet === 'ok' ? 'укладываетесь' : t.rech_sek > t.reglament_sek ? 'длиннее регламента — сократите' : 'короче регламента — можно добавить пример'}</p></div>
      <div class="pz-rech">${P.slajdy.map((s, i) => `<div class="pz-rl" data-id="${s.id}"><div class="pz-sl">${slideHtml(s, i)}</div><div><b>${i + 1}. ${esc(s.zagolovok || '')}</b>
        ${s.rech ? `<textarea rows="5">${esc(s.rech.tekst)}</textarea><div class="pz-row small"><span class="muted">${mmss(s.rech.sek)} · план ${mmss(s.sek)}</span>${s.rech.sek < s.sek * 0.8 ? '<span class="pz-m">короче плана</span>' : ''}${s.rech.ustarela ? `<span class="pz-m dlina">слайд поменялся</span><button type="button" class="btn sm quiet" data-up>Обновить речь · ${esc(price(P.ceny.rech_slajd))}</button>` : ''}<button type="button" class="btn sm ghost" data-sv hidden>Сохранить</button></div>`
          : `<p class="small muted">Речи для слайда нет.</p><button type="button" class="btn sm quiet" data-up>Написать · ${esc(price(P.ceny.rech_slajd))}</button>`}</div></div>`).join('')}</div>
      ${arr(P.voprosy).length ? `<section class="card" style="margin-top:14px"><span class="caps">Вопросы, которые зададут</span>${P.voprosy.map((q) => `<details class="pz-q"><summary>${esc(q.vopros)}</summary><p>${esc(q.otvet)}</p><p class="small ${q.provereno ? 'pz-green' : 'pz-red'}">${q.provereno ? 'Ответ опирается на вашу работу.' : 'В материалах опоры нет — подготовьте ответ сами.'}</p></details>`).join('')}</section>` : ''}`
        : '<div class="card"><p>Спикер напишет, что сказать под каждым слайдом, связки между слайдами и 5–7 вопросов с ответами по вашим материалам — под регламент ' + Math.round(t.reglament_sek / 60) + ' мин.</p></div>'}
      <div class="pz-row" style="margin-top:16px">${est ? '' : `<button class="btn accent" id="pzr">Написать речь · ${esc(price(P.ceny.rech))}</button>`}
        ${P.utv.rech ? '<button class="btn accent" id="pznext">Дальше — оформление</button>' : `${est ? '<button class="btn accent" id="pzutv">Утвердить речь</button>' : ''}<button class="btn ghost sm" id="pzbez">Без речи</button>`}
        ${est ? `<button class="btn ghost sm" id="pzr">Написать заново · ${esc(price(P.ceny.rech))}</button>` : ''}</div>`;
    $$('.pz-rl', box).forEach((r) => {
      const ta = $('textarea', r), sv = $('[data-sv]', r), up = $('[data-up]', r);
      if (ta) ta.oninput = () => { sv.hidden = false; };
      if (sv) sv.onclick = () => pravka({ chto: 'slajd', sid: r.dataset.id, polya: { rech: ta.value } });
      if (up) up.onclick = () => run('rech', { sid: r.dataset.id }, 'Спикер пишет речь слайда…');
    });
    $$('#pzr', box).forEach((b) => { b.onclick = () => run('rech', {}, 'Спикер пишет речь и вопросы… 30–60 секунд'); });
    const u = $('#pzutv'); if (u) u.onclick = () => run('utverdit', { shag: 'rech' }, 'Утверждаю…', () => { cur = 'oformlenie'; });
    const bz = $('#pzbez'); if (bz) bz.onclick = () => run('utverdit', { shag: 'rech', bez_rechi: true }, 'Без речи…', () => { cur = 'oformlenie'; });
    const nx = $('#pznext'); if (nx) nx.onclick = () => { cur = 'oformlenie'; draw(); };
  }

  // ---------- шаг 4 · оформление ----------
  function pOformlenie(box) {
    const o = P.oformlenie; const br = o.brend;
    const logo = o.logo ? o.logo.url : br && br.logo ? br.logo.url : '';
    box.innerHTML = `${P.utv.oformlenie ? '<span class="pz-ok">Утверждено</span>' : ''}<section class="card"><span class="caps">Тема</span>
      <div class="pz-temy">${Object.entries(L.temy).filter(([k]) => k !== 'brend' || br).map(([k, v]) => `<button type="button" class="pz-tema ${k === o.tema ? 'on' : ''}" data-tema="${k}"><div class="pz-sl">${slideHtml(P.slajdy[0], 0, k)}</div><span>${esc(v)}${k === 'brend' && br ? ' · ' + esc(br.name) : ''}</span></button>`).join('')}</div>
      <label class="pz-chk"><input type="checkbox" id="pzfont" ${o.shrifty === 'firmennye' ? 'checked' : ''}> Фирменные шрифты в PPTX (Geologica, Onest${br && br.shrifty ? ', ' + esc(br.shrifty) : ''}). Без галочки — ${/times/i.test(P.brif.trebovaniya || '') ? 'Times New Roman (по требованию кафедры)' : 'Arial и Georgia'}: они есть на любом компьютере, и вёрстка у комиссии не поедет.</label>
      ${P.komanda === 'biznes' ? `<label class="pz-chk"><input type="checkbox" id="pzii" ${o.ii_stroka !== false ? 'checked' : ''}> Строка «Подготовлено с помощью JASA (ИИ)» на последнем слайде. Метка ИИ в свойствах файла стоит всегда.</label>` : '<p class="small dim">Слайд «Использование ИИ» — многие вузы РК просят указывать ИИ. Если ваша кафедра требует иначе — поправьте или уберите слайд в структуре. Метка ИИ в свойствах файла стоит всегда.</p>'}
      <div class="pz-logo"><span class="caps">Лого</span>${logo ? `<img src="${esc(abs(logo))}" alt="лого" crossorigin="anonymous">` : '<span class="small muted">нет</span>'}
        <label class="btn sm quiet"><input type="file" hidden accept="image/png,image/jpeg,image/webp" id="pzlogo">${P.komanda === 'student' ? 'Лого вуза' : 'Своё лого'}</label>${o.logo ? '<button class="btn sm ghost" id="pzlogox">Убрать</button>' : ''}
        <span class="small dim">Лого ставится оригиналом и не обрабатывается.</span></div></section>
      <section class="card" style="margin-top:14px"><span class="caps">Картинки</span><p class="small muted" style="margin:6px 0 12px">${P.komanda === 'student' ? 'Для защиты картинки обычно не нужны: схемы и графики рисует JASA сама. ' : ''}Картинка ИИ — ${L.kartinka} кр, рисуется только по вашему «да». Своё фото — бесплатно, если у вас есть право на него.</p>
      <div class="pz-imgs">${P.slajdy.map((s, i) => `<div class="pz-im" data-id="${s.id}"><div class="pz-sl">${slideHtml(s, i)}</div><b class="small">${i + 1}. ${esc(s.zagolovok || '')}</b>${s.vizual ? `<small class="muted">${esc(s.vizual)}</small>` : ''}
        ${S_KART.includes(s.maket) ? `<div class="pz-row"><button type="button" class="btn sm ${s.vizual ? 'accent' : 'quiet'}" data-ai>${s.kartinka && s.kartinka.ii ? 'Ещё вариант' : 'Картинка ИИ'} · ${L.kartinka} кр</button><label class="btn sm quiet"><input type="file" hidden accept="image/png,image/jpeg,image/webp" data-own>Своё фото</label>${s.kartinka ? '<button type="button" class="btn sm ghost" data-x>Убрать</button>' : ''}</div>`
          : `<small class="dim">В макете «${esc(MAKET[s.maket] || s.maket)}» картинки нет — график, таблицу или цифры рисует JASA.</small>`}</div>`).join('')}</div>
      ${arr(P.proshlye).length ? `<details class="small" style="margin-top:12px"><summary>Прошлые картинки (${P.proshlye.length}) — оплаченное не пропадает</summary><div class="pz-old">${P.proshlye.map((x) => `<img src="${esc(abs(x.url))}" data-file="${esc(x.file)}" title="Поставить на открытый слайд" crossorigin="anonymous">`).join('')}</div><p class="dim">Нажмите на картинку, потом на слайд в списке выше — «Вернуть».</p></details>` : ''}</section>
      <div class="pz-row" style="margin-top:16px">${P.utv.oformlenie ? '<button class="btn accent" id="pznext">Дальше — сборка</button>' : '<button class="btn accent" id="pzutv">Утвердить оформление</button>'}</div>`;
    $$('[data-tema]', box).forEach((b) => { b.onclick = () => pravka({ chto: 'oformlenie', oformlenie: { tema: b.dataset.tema } }); });
    $('#pzfont').onchange = (e) => pravka({ chto: 'oformlenie', oformlenie: { shrifty: e.target.checked ? 'firmennye' : 'bezopasnye' } });
    const ii = $('#pzii'); if (ii) ii.onchange = (e) => pravka({ chto: 'oformlenie', oformlenie: { ii_stroka: e.target.checked } });
    $('#pzlogo').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (!confirm('У вас есть право использовать это лого? Без прав лого не ставим — презентация будет без него.')) return; run('svoya', { sid: 'logo', b64: await toB64(f), pravo: true }, 'Загружаю лого…'); };
    const lx = $('#pzlogox'); if (lx) lx.onclick = () => pravka({ chto: 'oformlenie', oformlenie: { logo_ubrat: true } });
    let vybr = null;
    $$('.pz-old img', box).forEach((im) => { im.onclick = () => { vybr = im.dataset.file; $$('.pz-old img').forEach((x) => x.classList.toggle('on', x === im)); toast('Теперь нажмите «Вернуть» у нужного слайда'); $$('.pz-im').forEach((r) => { const row = $('.pz-row', r); if (row && !$('[data-back]', r)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.dataset.back = 1; b.textContent = 'Вернуть'; b.onclick = () => pravka({ chto: 'kartinka_vernut', sid: r.dataset.id, file: vybr }); row.appendChild(b); } }); }; });
    $$('.pz-im', box).forEach((r) => {
      const id = r.dataset.id;
      if (!$('[data-ai]', r)) return;
      $('[data-ai]', r).onclick = () => { if (!confirm('Нарисовать картинку к слайду за ' + L.kartinka + ' кр?')) return; run('kartinka', { sid: id }, 'Рисую картинку… 20–60 секунд'); };
      $('[data-own]', r).onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (!confirm('У вас есть право использовать это фото? Без прав фото не ставим.')) return; run('svoya', { sid: id, b64: await toB64(f), pravo: true }, 'Загружаю…'); };
      const x = $('[data-x]', r); if (x) x.onclick = () => pravka({ chto: 'kartinka_ubrat', sid: id });
    });
    const u = $('#pzutv'); if (u) u.onclick = () => run('utverdit', { shag: 'oformlenie' }, 'Утверждаю…', () => { cur = 'sborka'; });
    const nx = $('#pznext'); if (nx) nx.onclick = () => { cur = 'sborka'; draw(); };
  }

  // ---------- шаг 5 · сборка и выгрузка ----------
  function pSborka(box) {
    pokaz = Math.min(pokaz, P.slajdy.length - 1);
    const vse = []; P.slajdy.forEach((s, i) => arr(s.metki).forEach((m) => vse.push({ i, m })));
    const obshchie = arr((P.proverka || {}).obshchie);
    const kz = P.brif.yazyk === 'kz';
    box.innerHTML = `<div class="pz-show"><div class="pz-sl big" id="pzbig">${slideHtml(P.slajdy[pokaz], pokaz)}</div>
      <div class="pz-row"><button class="btn sm quiet" id="pzprev">←</button><span class="small mono">${pokaz + 1} / ${P.slajdy.length}</span><button class="btn sm quiet" id="pznx">→</button>${(P.slajdy[pokaz].rech || {}).tekst ? `<span class="small muted pz-notes">${esc(P.slajdy[pokaz].rech.tekst.slice(0, 220))}…</span>` : ''}</div>
      <div class="pz-strip">${P.slajdy.map((s, i) => `<button type="button" class="${i === pokaz ? 'on' : ''}" data-i="${i}"><div class="pz-sl">${slideHtml(s, i)}</div></button>`).join('')}</div></div>
      ${vse.length || obshchie.length ? `<section class="card pz-check"><span class="caps">Проверьте сами перед выступлением</span>${obshchie.map((x) => `<p>${esc(x)}</p>`).join('')}${vse.map((x) => `<p><a href="#" data-go="${x.i}">слайд ${x.i + 1}</a> · <span class="pz-m ${x.m.tip}">${esc(METKA[x.m.tip] || x.m.tip)}</span> <b>${esc(x.m.chto)}</b> — ${esc(x.m.tekst)}</p>`).join('')}</section>` : '<p class="small pz-green">Все цифры, цитаты и источники нашлись в ваших материалах.</p>'}
      ${kz ? `<label class="pz-chk"><input type="checkbox" id="pzkz" ${P.oformlenie.kz_provereno ? 'checked' : ''}> Казахский текст прочитал носитель языка</label>${P.oformlenie.kz_provereno ? '' : '<p class="small pz-red">Казахский текст написан ИИ — перед защитой пусть его прочитает носитель.</p>'}` : ''}
      <section class="card pz-out"><span class="caps">Скачать</span><div class="pz-row" style="margin-top:10px"><button class="btn accent" data-out="pdf">PDF · ${P.komanda === 'student' ? 'для защиты' : 'для показа'}</button><button class="btn" data-out="pptx">PPTX · править</button><button class="btn quiet" data-out="pdf-rech">PDF с речью</button><button class="btn ghost" data-out="copy">Скопировать речь</button></div>
      <p class="small dim" style="margin-top:10px">PDF выглядит везде одинаково — его и берите на ${P.komanda === 'student' ? 'защиту' : 'встречу'}. PPTX — для PowerPoint: текст правится, графики редактируются, речь — в заметках; в Keynote и Google Slides откроется, но графики и шрифты могут сдвинуться. Создано с помощью ИИ — метка стоит в свойствах файла.</p></section>`;
    $('#pzprev').onclick = () => { pokaz = Math.max(0, pokaz - 1); draw(); };
    $('#pznx').onclick = () => { pokaz = Math.min(P.slajdy.length - 1, pokaz + 1); draw(); };
    $$('.pz-strip [data-i]', box).forEach((b) => { b.onclick = () => { pokaz = +b.dataset.i; draw(); }; });
    $$('[data-go]', box).forEach((a) => { a.onclick = (e) => { e.preventDefault(); otkryt = P.slajdy[+a.dataset.go].id; cur = 'teksty'; draw(); }; });
    const kzc = $('#pzkz'); if (kzc) kzc.onchange = (e) => pravka({ chto: 'oformlenie', oformlenie: { kz_provereno: e.target.checked } });
    $$('[data-out]', box).forEach((b) => { b.onclick = () => vygruzka(b.dataset.out, b); });
  }

  // =====================================================================
  // РАСКЛАДКА: слайд → элементы в дюймах. Один расчёт для превью, PDF и PPTX.
  // =====================================================================
  const TEMY = {
    bumaga: { bg: 'F5F1E8', ink: '15192A', muted: '5E6474', accent: 'E8420F', soft: 'EDE7DA', card: 'FFFDF8', on: 'FFFFFF', head: 'Geologica', body: 'Onest', pHead: 'Arial', pBody: 'Arial' },
    grafit: { bg: '141518', ink: 'F2F2F2', muted: 'A3A3A3', accent: 'E8420F', soft: '24262B', card: '1C1D21', on: '141518', head: 'Geologica', body: 'Onest', pHead: 'Arial', pBody: 'Arial' },
    strogaya: { bg: 'FFFFFF', ink: '15192A', muted: '4E5566', accent: '1F4FBF', soft: 'EEF2FA', card: 'F6F8FC', on: 'FFFFFF', head: 'Onest', body: 'Onest', pHead: 'Georgia', pBody: 'Arial' },
  };
  function temaOf(k) {
    const t = Object.assign({}, TEMY[k || P.oformlenie.tema] || TEMY.bumaga);
    if ((k || P.oformlenie.tema) === 'brend' && P.oformlenie.brend) {
      const hex = (P.oformlenie.brend.cveta || '').match(/#?[0-9a-f]{6}\b/gi) || [];
      const cv = hex.map((h) => h.replace('#', '').toUpperCase());
      const lum = (h) => { const c = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const kontrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      Object.assign(t, TEMY.bumaga, { bg: 'FFFFFF', soft: 'F4F4F4', card: 'FAFAFA' });
      const tem = cv.filter((c) => kontrast(c, 'FFFFFF') >= 4.5).sort((a, b) => lum(a) - lum(b));
      if (tem[0]) t.ink = tem[0];
      const akc = cv.find((c) => c !== t.ink && kontrast(c, 'FFFFFF') >= 3);
      if (akc) t.accent = akc;
    }
    if (P.oformlenie.shrifty === 'firmennye') { t.pHead = t.head; t.pBody = t.body; }
    else if (/times/i.test(P.brif.trebovaniya || '')) { t.pHead = 'Times New Roman'; t.pBody = 'Times New Roman'; }
    return t;
  }

  const ctx = document.createElement('canvas').getContext('2d');
  // кегль (pt), при котором текст влезает в рамку: меряем шрифтом превью/PDF; PPTX получает тот же кегль ×0,96 (Arial чуть шире)
  function fit(el, T) {
    const fam = el.font === 'head' ? T.head : T.body; const wpx = el.w * 72; const hpx = el.h * 72;
    const paras = Array.isArray(el.t) ? el.t : [el.t];
    for (let size = el.size; size >= (el.min || 12); size -= 1) {
      ctx.font = `${el.bold ? 600 : 400} ${size}px ${fam}`;
      let lines = 0; const out = [];
      for (const p of paras) { const ls = wrap(String(p || ''), wpx - (el.bullets ? size * 1.1 : 0)); lines += ls.length; out.push(ls); }
      const hh = lines * size * (el.lh || 1.2) + (paras.length - 1) * size * (el.gap || 0);
      if (hh <= hpx || size === (el.min || 12)) { el.fs = size; el.lines = out; return el; }
    }
    return el;
  }
  function wrap(t, w) {
    const out = []; let line = '';
    for (const word of t.split(/\s+/).filter(Boolean)) { const tr = line ? line + ' ' + word : word; if (ctx.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; }
    if (line) out.push(line); return out.length ? out : [''];
  }

  function layout(s, i, temaKod) {
    const T = temaOf(temaKod); const n = P.slajdy.length; const E = [];
    const tx = (o) => E.push(fit(Object.assign({ k: 'text', color: T.ink, font: 'body', lh: 1.2 }, o), T));
    const rect = (o) => E.push(Object.assign({ k: 'rect' }, o));
    const pk = arr(s.punkty); const img = s.kartinka && s.kartinka.url;
    const M = 0.75, TW = W - 2 * M;
    const zag = (o) => tx(Object.assign({ x: M, y: 0.55, w: TW, h: 1.25, t: s.zagolovok || '', size: 34, min: 20, bold: true, font: 'head', valign: 'top', lh: 1.08 }, o));
    const pkt = (o) => pk.length && tx(Object.assign({ x: M, y: 2.0, w: TW, h: 4.6, t: pk, size: 22, min: 13, bullets: true, gap: 0.45, lh: 1.25 }, o));
    switch (s.maket) {
      case 'titul':
        rect({ x: 0, y: 0, w: 0.22, h: H, fill: T.accent });
        if (img) E.push({ k: 'img', x: W * 0.52, y: 0, w: W * 0.48, h: H, src: img, ii: s.kartinka.ii });
        tx({ x: M + 0.2, y: 1.7, w: (img ? W * 0.52 : W) - M * 2 - 0.2, h: 2.6, t: s.zagolovok || P.brif.tema, size: 46, min: 26, bold: true, font: 'head', valign: 'bottom', lh: 1.05 });
        if (s.podzagolovok) tx({ x: M + 0.2, y: 4.45, w: (img ? W * 0.52 : W) - M * 2 - 0.2, h: 0.9, t: s.podzagolovok, size: 20, min: 13, color: T.muted });
        if (pk.length) tx({ x: M + 0.2, y: 5.5, w: (img ? W * 0.52 : W) - M * 2 - 0.2, h: 1.4, t: pk, size: 15, min: 11, color: T.muted, gap: 0.15 });
        break;
      case 'razdel':
        rect({ x: 0, y: 0, w: W, h: H, fill: T.ink });
        tx({ x: M, y: 2.2, w: 2.2, h: 1.6, t: String(i + 1).padStart(2, '0'), size: 72, bold: true, font: 'head', color: T.accent });
        tx({ x: M + 2.4, y: 2.3, w: TW - 2.4, h: 2.4, t: s.zagolovok || '', size: 40, min: 24, bold: true, font: 'head', color: T.bg, valign: 'middle' });
        break;
      case 'dve_kolonki': {
        zag();
        const ks = arr(s.kolonki).length ? s.kolonki : [{ zagolovok: '', punkty: pk.slice(0, Math.ceil(pk.length / 2)) }, { zagolovok: '', punkty: pk.slice(Math.ceil(pk.length / 2)) }];
        ks.slice(0, 2).forEach((k, j) => { const x = M + j * (TW / 2 + 0.15); rect({ x, y: 2.0, w: TW / 2 - 0.15, h: 4.8, fill: T.card });
          if (k.zagolovok) tx({ x: x + 0.3, y: 2.25, w: TW / 2 - 0.75, h: 0.7, t: k.zagolovok, size: 22, min: 14, bold: true, font: 'head', color: T.accent });
          tx({ x: x + 0.3, y: 3.05, w: TW / 2 - 0.75, h: 3.5, t: arr(k.punkty), size: 19, min: 12, bullets: true, gap: 0.4 }); });
        break; }
      case 'cifra': {
        zag();
        const cs = arr(s.cifry).slice(0, 3); const cw = TW / Math.max(1, cs.length);
        cs.forEach((c, j) => { const x = M + j * cw;
          tx({ x, y: 2.4, w: cw - 0.3, h: 1.7, t: c.znachenie, size: cs.length === 1 ? 88 : 60, min: 28, bold: true, font: 'head', color: T.accent, valign: 'bottom', lh: 1 });
          rect({ x, y: 4.25, w: 0.8, h: 0.06, fill: T.ink });
          tx({ x, y: 4.45, w: cw - 0.3, h: 1.6, t: c.podpis, size: 19, min: 12, color: T.muted }); });
        if (pk.length) tx({ x: M, y: 6.25, w: TW, h: 0.7, t: pk.join(' · '), size: 14, min: 10, color: T.muted });
        break; }
      case 'grafik': {
        zag();
        const g = s.grafik || {}; const est = arr(g.ryady).length && arr(g.podpisi).length;
        if (est) E.push({ k: 'chart', x: M, y: 2.0, w: pk.length ? TW * 0.64 : TW, h: 4.8, g, T });
        pkt(est ? { x: M + TW * 0.68, w: TW * 0.32, size: 18 } : {});
        break; }
      case 'shema': case 'tajmlajn': {
        zag();
        const sh = arr(s.shagi).length ? s.shagi.slice(0, 6) : pk.slice(0, 5).map((p) => ({ zagolovok: '', tekst: p })); const cw = TW / Math.max(1, sh.length);
        if (s.maket === 'tajmlajn') rect({ x: M, y: 3.55, w: TW, h: 0.05, fill: T.muted });
        sh.forEach((x, j) => { const xx = M + j * cw;
          if (s.maket === 'shema') { rect({ x: xx, y: 2.2, w: cw - 0.25, h: 4.3, fill: T.card }); tx({ x: xx + 0.25, y: 2.4, w: 1, h: 0.8, t: String(j + 1), size: 34, bold: true, font: 'head', color: T.accent });
            if (x.zagolovok) tx({ x: xx + 0.25, y: 3.25, w: cw - 0.75, h: 0.9, t: x.zagolovok, size: 20, min: 12, bold: true, font: 'head' });
            tx({ x: xx + 0.25, y: x.zagolovok ? 4.2 : 3.3, w: cw - 0.75, h: x.zagolovok ? 2.1 : 3, t: x.tekst, size: 16, min: 11, color: T.muted }); }
          else { rect({ x: xx + 0.02, y: 3.42, w: 0.3, h: 0.3, fill: T.accent, round: true });
            tx({ x: xx, y: 2.3, w: cw - 0.2, h: 1, t: x.zagolovok, size: 24, min: 13, bold: true, font: 'head', valign: 'bottom' });
            tx({ x: xx, y: 4.0, w: cw - 0.25, h: 2.6, t: x.tekst, size: 16, min: 11, color: T.muted }); } });
        break; }
      case 'tablica':
        zag(); if (s.tablica && arr(s.tablica.shapka).length) E.push({ k: 'table', x: M, y: 2.0, w: TW, h: 4.8, tb: s.tablica, T }); else pkt();
        break;
      case 'citata':
        rect({ x: M, y: 1.4, w: 0.12, h: 3.6, fill: T.accent });
        tx({ x: M + 0.5, y: 1.3, w: TW - 0.5, h: 3.9, t: '«' + ((s.citata || {}).tekst || s.zagolovok || '') + '»', size: 34, min: 18, font: 'head', valign: 'middle', lh: 1.2 });
        tx({ x: M + 0.5, y: 5.4, w: TW - 0.5, h: 0.8, t: (s.citata || {}).avtor || s.podzagolovok || '', size: 18, min: 12, color: T.muted });
        break;
      case 'kartinka':
        if (img) E.push({ k: 'img', x: 0, y: 0, w: W * 0.55, h: H, src: img, ii: s.kartinka.ii });
        tx({ x: (img ? W * 0.55 : 0) + M * 0.8, y: 0.8, w: (img ? W * 0.45 : W) - M * 1.6, h: 2.0, t: s.zagolovok || '', size: 32, min: 18, bold: true, font: 'head', valign: 'top', lh: 1.08 });
        if (pk.length) tx({ x: (img ? W * 0.55 : 0) + M * 0.8, y: 3.0, w: (img ? W * 0.45 : W) - M * 1.6, h: 3.8, t: pk, size: 19, min: 12, bullets: true, gap: 0.4 });
        break;
      case 'final': {
        rect({ x: 0, y: 0, w: W, h: H, fill: T.ink });
        tx({ x: M, y: 1.4, w: TW, h: 2.4, t: s.zagolovok || 'Спасибо', size: 54, min: 28, bold: true, font: 'head', color: T.bg, valign: 'bottom', lh: 1.04 });
        if (s.podzagolovok) tx({ x: M, y: 4.0, w: TW, h: 0.9, t: s.podzagolovok, size: 22, min: 13, color: T.accent });
        if (pk.length) tx({ x: M, y: 5.0, w: TW, h: 1.6, t: pk, size: 17, min: 11, color: T.bg, gap: 0.15 });
        break; }
      default:
        zag({ w: img ? TW * 0.58 : TW });
        if (img) E.push({ k: 'img', x: W * 0.62, y: 0, w: W * 0.38, h: H, src: img, ii: s.kartinka.ii });
        pkt(img ? { w: TW * 0.56 } : {});
    }
    const temnyj = ['razdel', 'final'].includes(s.maket);
    if (arr(s.istochniki).length && !temnyj) tx({ x: M, y: H - 0.55, w: TW * 0.7, h: 0.35, t: 'Источники: ' + s.istochniki.join('; '), size: 10, min: 8, color: T.muted });
    if (s.maket !== 'titul') tx({ x: W - M - 0.8, y: H - 0.55, w: 0.8, h: 0.35, t: (i + 1) + ' / ' + n, size: 10, color: temnyj ? T.bg : T.muted, align: 'right' });
    if (P.komanda === 'biznes' && P.oformlenie.ii_stroka !== false && i === n - 1) tx({ x: M, y: H - 0.55, w: TW * 0.6, h: 0.35, t: 'Подготовлено с помощью JASA (ИИ)', size: 10, color: temnyj ? T.bg : T.muted });
    if (cernovik && arr(s.metki).some((m) => m.tip === 'pusto')) tx({ x: W - M - 3.2, y: 0.2, w: 2.2, h: 0.32, t: 'ЧЕРНОВИК', size: 11, bold: true, color: 'D8402C', align: 'right' });
    const lg = logoUrl();
    if (lg && !['razdel', 'final'].includes(s.maket)) E.push({ k: 'logo', x: W - M - 1.5, y: s.maket === 'titul' ? 0.5 : H - 0.95, w: 1.5, h: 0.55, src: lg });
    return { T, E };
  }
  function logoUrl() { const o = P.oformlenie; return o.logo ? o.logo.url : o.brend && o.brend.logo ? o.brend.logo.url : ''; }

  // ---------- превью HTML ----------
  function slideHtml(s, i, temaKod) {
    if (!s) return '';
    const { T, E } = layout(s, i, temaKod);
    const pc = (v, of) => (v / of * 100).toFixed(3) + '%';
    const box = (e) => `left:${pc(e.x, W)};top:${pc(e.y, H)};width:${pc(e.w, W)};height:${pc(e.h, H)}`;
    const fs = (pt) => `font-size:${(pt / 9.6).toFixed(3)}cqw`;
    return `<div class="pz-c" style="background:#${T.bg}">` + E.map((e) => {
      if (e.k === 'rect') return `<i style="${box(e)};background:#${e.fill};${e.round ? 'border-radius:50%' : ''}"></i>`;
      if (e.k === 'img') return `<i class="pz-ci" style="${box(e)}"><img src="${esc(abs(e.src))}" alt="" loading="lazy" data-no-lupa>${e.ii ? '<b>ИИ</b>' : ''}</i>`;
      if (e.k === 'logo') return `<i class="pz-cl" style="${box(e)}"><img src="${esc(abs(e.src))}" alt="лого" data-no-lupa></i>`;
      if (e.k === 'chart') return `<i style="${box(e)}">${chartSvg(e)}</i>`;
      if (e.k === 'table') return `<i style="${box(e)}">${tableHtml(e)}</i>`;
      const paras = e.lines ? e.lines.map((ls) => ls.join(' ')) : [].concat(e.t);
      const al = e.valign === 'bottom' ? 'flex-end' : e.valign === 'middle' ? 'center' : 'flex-start';
      return `<div class="pz-ct" style="${box(e)};${fs(e.fs || e.size)};color:#${e.color};font-family:${e.font === 'head' ? T.head : T.body};font-weight:${e.bold ? 600 : 400};line-height:${e.lh};justify-content:${al};text-align:${e.align || 'left'}">${paras.map((p) => `<p class="${e.bullets ? 'b' : ''}" style="margin-bottom:${(e.gap || 0)}em">${esc(p)}</p>`).join('')}</div>`;
    }).join('') + '</div>';
  }
  function chartSvg(e) {
    const g = e.g, T = e.T, n = arr(g.podpisi).length, rs = arr(g.ryady); const all = rs.flatMap((r) => arr(r.znacheniya));
    const mx = Math.max(1, ...all), mn = Math.min(0, ...all), rng = mx - mn;      // диапазон с нулём: столбцы вниз для отрицательных
    const w = 1000, h = 480, pad = 50, top = 50, bot = 40; const hh = h - top - bot; const cw = (w - pad) / Math.max(1, n); const cols = [T.accent, T.ink, T.muted];
    const y0 = top + (mx / rng) * hh, yv = (v) => top + ((mx - v) / rng) * hh;      // y нулевой линии и y значения
    let out = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="100%" font-family="${T.body}, Arial, Helvetica, sans-serif"><line x1="${pad}" y1="${y0}" x2="${w}" y2="${y0}" stroke="#${T.muted}" stroke-width="2"/>`;
    arr(g.podpisi).forEach((p, j) => { out += `<text x="${pad + cw * j + cw / 2}" y="${h - 10}" text-anchor="middle" font-size="22" fill="#${T.muted}">${esc(p)}</text>`; });
    rs.forEach((r, ri) => {
      if (g.tip === 'line') { const pts = arr(r.znacheniya).map((v, j) => `${pad + cw * j + cw / 2},${yv(v)}`).join(' '); out += `<polyline points="${pts}" fill="none" stroke="#${cols[ri % 3]}" stroke-width="6"/>`; }
      else { const bw = (cw * 0.7) / rs.length; arr(r.znacheniya).forEach((v, j) => { const x = pad + cw * j + cw * 0.15 + ri * bw; const yt = Math.min(yv(v), y0), bh = Math.abs(yv(v) - y0); out += `<rect x="${x}" y="${yt}" width="${bw - 6}" height="${bh}" fill="#${cols[ri % 3]}"/><text x="${x + bw / 2 - 3}" y="${v < 0 ? yt + bh + 24 : yt - 8}" text-anchor="middle" font-size="22" fill="#${T.ink}">${esc(num(v))}</text>`; }); }
    });
    return out + '</svg>';
  }
  const num = (v) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('ru-RU') : String(Math.round(v * 10) / 10).replace('.', ','));
  function tableHtml(e) {
    const tb = e.tb, T = e.T;
    return `<table class="pz-tb" style="color:#${T.ink};font-family:${T.body}"><tr>${arr(tb.shapka).map((x) => `<th style="background:#${T.ink};color:#${T.bg}">${esc(x)}</th>`).join('')}</tr>${arr(tb.stroki).map((r) => `<tr>${r.map((x) => `<td style="border-color:#${T.soft}">${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`;
  }

  // =====================================================================
  // ВЫГРУЗКА
  // =====================================================================
  // библиотеки грузятся только на выгрузке, с хешами целостности (подмена файла на CDN — скрипт не выполнится)
  const LIBS = { pptx: ['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', 'sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ'],
    pdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk'] };
  const loaded = {};
  function lib(k) { return loaded[k] || (loaded[k] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIBS[k][0]; s.integrity = LIBS[k][1]; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => { loaded[k] = null; rej(new Error('библиотека не загрузилась — проверьте интернет')); }; document.head.appendChild(s); })); }
  async function dataUrl(src) {
    const r = await fetch(abs(src)); if (!r.ok) throw new Error('картинка не загрузилась');
    const b = await r.blob(); return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
  }
  async function jpeg(src) {   // ИИ-картинки 2K PNG по несколько МБ: в PPTX кладём JPEG ≤ 1920 px
    const im = await loadImg(abs(src)); const k = Math.min(1, 1920 / im.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.86);
  }
  async function logoData() {
    const u = logoUrl(); if (!u) return null;
    const im = await loadImg(abs(u)); const c = trimAlpha(im); return { url: c.toDataURL('image/png'), r: c.width / c.height };
  }
  const imya = () => (P.brif.tema || 'prezentaciya').replace(/[^\wа-яёәғқңөұүһі\- ]/gi, '').trim().slice(0, 60).replace(/\s+/g, '-') || 'prezentaciya';
  const fontsReady = () => Promise.all(['600 40px Geologica', '400 40px Geologica', '400 40px Onest', '600 40px Onest'].map((f) => document.fonts.load(f).catch(() => null)));

  let expo = null;   // id проекта, который выгружается: если человек ушёл на другой — выгрузка отменяется, а не мешает слайды двух презентаций
  const okExpo = () => { if (!expo || !P || P.id !== expo) throw new Error('вы перешли на другую презентацию — выгрузка отменена, нажмите ещё раз'); };

  async function vygruzka(kak, btn) {
    if (kak === 'copy') { const t = P.slajdy.map((s, i) => `${i + 1}. ${s.zagolovok}\n${(s.rech || {}).tekst || ''}`).join('\n\n'); navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast('Речь скопирована')); return; }
    const pusto = P.slajdy.reduce((a, s) => a + arr(s.metki).filter((m) => m.tip === 'pusto').length, 0);
    if (pusto && !confirm('Незаполненных мест «[…]» на слайдах и в речи: ' + pusto + '. Выгрузить черновиком? На таких слайдах будет пометка «ЧЕРНОВИК».')) return;
    if (P.brif.yazyk === 'kz' && !P.oformlenie.kz_provereno && !confirm('Казахский текст написан ИИ и не проверен носителем языка. Всё равно выгрузить?')) return;
    cernovik = !!pusto; expo = P.id;
    const o = btn.textContent; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Собираю…';
    try {
      await fontsReady();
      const blob = kak === 'pptx' ? await pptx() : await pdf(kak === 'pdf-rech');
      okExpo();
      await otdat(blob, imya() + (kak === 'pdf-rech' ? '-s-rechyu' : '') + (kak === 'pptx' ? '.pptx' : '.pdf'), kak === 'pptx' ? 'pptx' : 'pdf');
    } catch (e) { toast('Не собралось: ' + e.message); }
    cernovik = false; expo = null; btn.disabled = false; btn.textContent = o;
  }

  async function otdat(blob, name, ext) {
    const tw = window.Telegram && window.Telegram.WebApp;
    if (TG && tw) {   // в Telegram ссылка-blob не скачивается: файл на час на сервер
      if (blob.size > 10e6) throw new Error('файл больше 10 МБ — уберите часть картинок или скачайте с компьютера');
      const r = await api('/api/prezentacii/fajl', { pid: P.id, ext, b64: await toB64(blob), imya: name });
      if (typeof tw.downloadFile === 'function') tw.downloadFile({ url: abs(r.url), file_name: name }, (ok) => { if (!ok) toast('Скачивание отменено'); });
      else { tw.openLink(abs(r.url)); toast('Открываю файл в браузере — ссылка действует 1 час'); }
      return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast('Файл ' + name + ' скачан');
  }

  const metka = () => 'Создано с помощью ИИ · JASA · jasa.asia · ' + (P.teksty_versiya || '') + ' · ' + new Date().toLocaleDateString('ru-RU');

  async function pptx() {
    await lib('pptx');
    const pp = new window.PptxGenJS(); pp.layout = 'LAYOUT_WIDE';
    pp.author = 'JASA (ИИ)'; pp.company = 'JASA · jasa.asia'; pp.title = P.brif.tema; pp.subject = metka();
    const lg = await logoData().catch(() => null);
    const imgs = {};
    for (const s of P.slajdy) if (s.kartinka && s.kartinka.url) imgs[s.id] = await jpeg(s.kartinka.url).catch(() => null);
    okExpo();
    P.slajdy.forEach((s, i) => {
      const { T, E } = layout(s, i); const sl = pp.addSlide(); sl.background = { color: T.bg };
      E.forEach((e) => {
        if (e.k === 'rect') sl.addShape(e.round ? pp.ShapeType.ellipse : pp.ShapeType.rect, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill }, line: { color: e.fill, width: 0 } });
        else if (e.k === 'img' && imgs[s.id]) { sl.addImage({ data: imgs[s.id], x: e.x, y: e.y, w: e.w, h: e.h, sizing: { type: 'cover', w: e.w, h: e.h }, altText: e.ii ? 'Изображение создано ИИ · JASA' : 'Фото автора' }); if (e.ii) sl.addText('ИИ', { x: e.x + e.w - 0.6, y: e.y + 0.15, w: 0.45, h: 0.28, fontSize: 9, bold: true, color: 'FFFFFF', fill: { color: '15192A' }, align: 'center', margin: 0 }); }
        else if (e.k === 'logo' && lg) { const h = Math.min(e.h, e.w / lg.r), w = h * lg.r; sl.addImage({ data: lg.url, x: e.x + e.w - w, y: e.y, w, h }); }
        else if (e.k === 'chart') {
          const g = e.g; const data = arr(g.ryady).map((r) => ({ name: r.imya || ' ', labels: g.podpisi, values: r.znacheniya }));
          sl.addChart(g.tip === 'line' ? pp.ChartType.line : pp.ChartType.bar, data, { x: e.x, y: e.y, w: e.w, h: e.h, barDir: 'col', chartColors: [T.accent, T.ink, T.muted], showValue: g.tip !== 'line', dataLabelFontSize: 11,
            catAxisLabelColor: T.muted, valAxisLabelColor: T.muted, catAxisLabelFontFace: T.pBody, valAxisHidden: true, valGridLine: { style: 'none' }, showLegend: data.length > 1, legendPos: 'b', legendFontFace: T.pBody });
        } else if (e.k === 'table') {
          const tb = e.tb; const rows = [arr(tb.shapka).map((x) => ({ text: x, options: { bold: true, color: T.bg, fill: { color: T.ink } } }))].concat(arr(tb.stroki).map((r) => r.map((x) => ({ text: x }))));
          sl.addTable(rows, { x: e.x, y: e.y, w: e.w, fontFace: T.pBody, fontSize: 14, color: T.ink, border: { type: 'solid', pt: 0.5, color: T.soft } });
        } else if (e.k === 'text') {
          const fsz = Math.max(8, Math.round((e.fs || e.size) * 0.96 * 10) / 10);
          const paras = [].concat(e.t);
          const runs = paras.map((p, j) => ({ text: String(p || ''), options: { bullet: e.bullets ? { indent: Math.round(fsz * 0.9) } : false, breakLine: j < paras.length - 1, paraSpaceAfter: Math.round((e.gap || 0) * fsz) } }));
          sl.addText(runs, { x: e.x, y: e.y, w: e.w, h: e.h, fontFace: e.font === 'head' ? T.pHead : T.pBody, fontSize: fsz, bold: !!e.bold, color: e.color, align: e.align || 'left', valign: e.valign || 'top', margin: 0, lineSpacingMultiple: e.lh || 1.2, fit: 'none', wrap: true });
        }
      });
      if (s.rech && s.rech.tekst) sl.addNotes(s.rech.tekst);
    });
    return pp.write({ outputType: 'blob' });
  }

  // PDF: слайд рисуем на canvas 1920×1080 теми же шрифтами, что превью (кириллица и казахские буквы без встраивания TTF)
  const PX = 1920 / W;
  async function slideCanvas(s, i) {
    const { T, E } = layout(s, i); const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const x = c.getContext('2d');
    x.fillStyle = '#' + T.bg; x.fillRect(0, 0, c.width, c.height);
    for (const e of E) {
      const X = e.x * PX, Y = e.y * PX, Wd = e.w * PX, Hd = e.h * PX;
      if (e.k === 'rect') { x.fillStyle = '#' + e.fill; if (e.round) { x.beginPath(); x.arc(X + Wd / 2, Y + Hd / 2, Wd / 2, 0, Math.PI * 2); x.fill(); } else x.fillRect(X, Y, Wd, Hd); }
      else if (e.k === 'img' || e.k === 'logo') {
        try {
          const im = await loadImg(abs(e.src)); const src = e.k === 'logo' ? trimAlpha(im) : im; const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
          if (e.k === 'img') { const k = Math.max(Wd / iw, Hd / ih); const sw = Wd / k, sh = Hd / k; x.drawImage(src, (iw - sw) / 2, (ih - sh) / 2, sw, sh, X, Y, Wd, Hd);
            if (e.ii) { x.fillStyle = '#15192A'; x.fillRect(X + Wd - 86, Y + 22, 64, 40); x.fillStyle = '#fff'; x.font = '600 24px Onest'; x.fillText('ИИ', X + Wd - 70, Y + 51); } }
          else { const h = Math.min(Hd, Wd * ih / iw), w = h * iw / ih; x.drawImage(src, X + Wd - w, Y, w, h); }
        } catch (er) { /* картинка не загрузилась — слайд без неё */ }
      } else if (e.k === 'chart' || e.k === 'table') {
        const svg = e.k === 'chart' ? chartSvg(e).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('width="100%" height="100%"', `width="${Wd}" height="${Hd}"`) : tableSvg(e, Wd, Hd);
        try { const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); x.drawImage(im, X, Y, Wd, Hd); } catch (er) { /* без графика */ }
      } else if (e.k === 'text') {
        const sz = (e.fs || e.size) * (PX / 72); const fam = e.font === 'head' ? T.head : T.body;
        x.font = `${e.bold ? 600 : 400} ${sz}px ${fam}`; x.fillStyle = '#' + e.color; x.textBaseline = 'top';
        const ind = e.bullets ? sz * 1.1 : 0; const lh = sz * (e.lh || 1.2);
        const lines = []; [].concat(e.t).forEach((p, j) => { const ls = wrapW(x, String(p || ''), Wd - ind); ls.forEach((l, k) => lines.push({ l, first: k === 0, gap: k === ls.length - 1 && j < [].concat(e.t).length - 1 })); });
        const total = lines.length * lh + lines.filter((z) => z.gap).length * sz * (e.gap || 0);
        let y = e.valign === 'bottom' ? Y + Hd - total : e.valign === 'middle' ? Y + (Hd - total) / 2 : Y;
        for (const z of lines) {
          const tw = x.measureText(z.l).width; const xx = e.align === 'right' ? X + Wd - tw : X + ind;
          if (e.bullets && z.first) { x.save(); x.fillStyle = '#' + temaOf().accent; x.fillText('•', X, y); x.restore(); }
          x.fillText(z.l, xx, y); y += lh + (z.gap ? sz * (e.gap || 0) : 0);
        }
      }
    }
    return c;
  }
  function wrapW(x, t, w) { const out = []; let line = ''; for (const word of t.split(/\s+/).filter(Boolean)) { const tr = line ? line + ' ' + word : word; if (x.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; } if (line) out.push(line); return out.length ? out : ['']; }
  function tableSvg(e, w, h) {
    const tb = e.tb, T = e.T; const rows = [arr(tb.shapka)].concat(arr(tb.stroki)); const rh = Math.min(70, h / rows.length); const cw = w / Math.max(1, rows[0].length);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="${T.body}, Arial, Helvetica, sans-serif" font-size="26">`;
    rows.forEach((r, i) => { if (!i) s += `<rect x="0" y="0" width="${w}" height="${rh}" fill="#${T.ink}"/>`; else s += `<line x1="0" y1="${(i + 1) * rh}" x2="${w}" y2="${(i + 1) * rh}" stroke="#${T.soft}" stroke-width="2"/>`;
      r.forEach((c, j) => { s += `<text x="${j * cw + 14}" y="${i * rh + rh / 2 + 9}" fill="#${i ? T.ink : T.bg}" font-weight="${i ? 400 : 600}">${esc(String(c).slice(0, 40))}</text>`; }); });
    return s + '</svg>';
  }

  async function pdf(sRechyu) {
    await lib('pdf');
    const { jsPDF } = window.jspdf;
    const doc = sRechyu ? new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' }) : new jsPDF({ orientation: 'landscape', unit: 'pt', format: [960, 540] });
    doc.setProperties({ title: P.brif.tema, subject: metka(), author: 'JASA (ИИ)', creator: 'JASA · jasa.asia', keywords: 'ИИ, AI-generated, JASA' });
    let first = true;
    const page = (cv) => { if (!first) doc.addPage(); first = false; doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 595.28, 841.89); };
    for (let i = 0; i < P.slajdy.length; i++) {
      okExpo();
      const s = P.slajdy[i]; const c = await slideCanvas(s, i);
      okExpo();
      if (!sRechyu) { if (!first) doc.addPage(); first = false; doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 960, 540); continue; }
      // A4 с речью: слайд сверху, текст речи ниже — тоже canvas, чтобы кириллица и казахские буквы не стали квадратиками;
      // длинная речь идёт на страницы продолжения (Codex: раньше всё после 23 строк молча пропадало)
      const sek = s.rech ? ' · ' + mmss(s.rech.sek) : '';
      const mk = () => { const a = document.createElement('canvas'); a.width = 1240; a.height = 1754; const x = a.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, a.width, a.height); x.textBaseline = 'top'; return [a, x]; };
      const foot = (x, n) => { x.fillStyle = '#8A8F9C'; x.font = '400 20px Onest'; x.fillText('Слайд ' + (i + 1) + ' из ' + P.slajdy.length + sek + (n ? ' · продолжение' : '') + ' · создано с помощью ИИ · JASA', 80, 1690); };
      let [a, x] = mk(); x.drawImage(c, 80, 80, 1080, 607.5); x.strokeStyle = '#DED7C9'; x.strokeRect(80, 80, 1080, 607.5);
      x.fillStyle = '#15192A'; x.font = '600 30px Geologica'; x.fillText((i + 1) + '. ' + (s.zagolovok || '').slice(0, 70), 80, 730);
      x.font = '400 26px Onest'; let y = 790, n = 0;
      for (const l of wrapW(x, (s.rech && s.rech.tekst) || 'Речи для слайда нет.', 1080)) {
        if (y > 1640) { foot(x, n); page(a); n++; [a, x] = mk(); x.fillStyle = '#15192A'; x.font = '600 26px Geologica'; x.fillText((i + 1) + '. ' + (s.zagolovok || '').slice(0, 60) + ' — продолжение', 80, 80); x.font = '400 26px Onest'; y = 140; }
        x.fillStyle = '#15192A'; x.fillText(l, 80, y); y += 38;
      }
      foot(x, n); page(a);
    }
    return doc.output('blob');
  }

  // ---------- стили (только pz-) ----------
  function style() {
    if (document.getElementById('pz-style')) return;
    const s = document.createElement('style'); s.id = 'pz-style';
    s.textContent = `
.pz-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-bottom:22px}
.pz-pr{display:flex;flex-direction:column;gap:4px;text-decoration:none;padding:16px 18px}.pz-pr b{color:var(--ink);font-family:var(--disp);font-size:1.05rem}
.pz-brif{max-width:820px}.pz-kom{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.pz-k{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface-2);text-align:left;color:var(--text)}
.pz-k b{font-family:var(--disp);font-size:1.15rem;color:var(--ink)}.pz-k small{color:var(--muted)}.pz-k.on{border-color:var(--ink);background:var(--surface);box-shadow:var(--shadow)}
.pz-pk{color:var(--accent-text);font-weight:600}.chip.on .pz-pk{color:inherit}
.pz-mic{display:flex;gap:8px;align-items:flex-start}.pz-mic textarea,.pz-mic input{flex:1}.pz-mic .icobtn{flex:none;width:44px;height:44px}
.pz-2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.pz-more{margin:4px 0 12px}.pz-more summary{cursor:pointer;color:var(--muted);margin-bottom:10px}
.pz-drop{display:flex;gap:8px;align-items:flex-start;padding:6px;border-radius:var(--r-sm);border:1px dashed var(--line)}.pz-drop.over{border-color:var(--accent);background:var(--accent-soft)}.pz-drop textarea{flex:1;min-height:90px!important;border:0!important}
.pz-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}
.pz-chk{display:flex;gap:10px;align-items:flex-start;margin:12px 0;font-size:var(--fs-small)}.pz-chk input{width:auto!important;margin-top:3px}
.pz-head{margin-bottom:18px}.pz-head h2{margin:6px 0}
.pz-grid{display:grid;grid-template-columns:210px 1fr;gap:18px;align-items:start}
.pz-steps{display:flex;flex-direction:column;gap:4px;position:sticky;top:16px}
.pz-steps a{display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:var(--r-sm);text-decoration:none;color:var(--text)}
.pz-steps a:hover{background:var(--surface-2)}.pz-steps a.on{background:var(--surface);box-shadow:var(--shadow)}.pz-steps a.lock{opacity:.45}
.pz-steps i{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:600;background:var(--surface-2);color:var(--muted)}
.pz-steps a.on i{background:var(--ink);color:var(--ink-fg)}.pz-steps a.done i{background:var(--ok);color:#fff}
.pz-steps span{display:flex;flex-direction:column;line-height:1.25}.pz-steps small{color:var(--dim);font-size:12px}
.pz-panel{min-width:0;position:relative;container-type:inline-size;container-name:pzp}#pzp [hidden]{display:none!important}
.pz-busy{display:flex;gap:10px;align-items:center;padding:12px 16px;margin-bottom:12px;border-radius:var(--r-sm);background:var(--accent-soft);color:var(--ink);font-weight:500}
.pz-ok{display:inline-block;margin:0 0 12px;padding:3px 10px;border-radius:var(--r-pill);background:var(--ok-soft);color:var(--ok);font-size:13px;font-weight:600}.pz-ok.sm{margin:0}
.pz-lead{font-family:var(--disp);font-size:1.15rem;color:var(--ink);margin:0 0 12px}
.pz-red{color:var(--bad)}.pz-green{color:var(--ok)}
.pz-srow{display:grid;grid-template-columns:28px minmax(0,1fr) 140px 64px 92px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-soft)}
.pz-srow input,.pz-srow select{width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;background:var(--field);color:var(--ink)}
.pz-srow .pz-zachem{margin-top:4px;font-size:13px;color:var(--muted);border-style:dashed}.pz-shead{border:0;padding-bottom:0}
.pz-ctl{display:flex;gap:4px}.pz-ctl button{width:28px;height:28px;border-radius:8px;background:var(--surface-2);color:var(--muted)}.pz-ctl button:hover{color:var(--ink)}
.pz-sel{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;background:var(--field);color:var(--ink)}
.pz-sl{position:relative;aspect-ratio:16/9;width:100%;container-type:inline-size;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px var(--line-soft)}
.pz-sl.big{border-radius:var(--r-sm);box-shadow:var(--shadow)}
.pz-c{position:absolute;inset:0;overflow:hidden}.pz-c>i,.pz-c>div{position:absolute;display:block}
.pz-ct{display:flex;flex-direction:column;overflow:hidden;letter-spacing:-.005em}.pz-ct p{margin:0}.pz-ct p.b{padding-left:1.1em;position:relative}.pz-ct p.b::before{content:"•";position:absolute;left:0;color:var(--pz-acc,currentColor)}
.pz-ci img{width:100%;height:100%;object-fit:cover;display:block}.pz-ci b{position:absolute;right:4%;top:4%;padding:.2em .5em;font:600 1.6cqw/1 Onest,sans-serif;background:#15192A;color:#fff;border-radius:.3em}
.pz-cl img{width:100%;height:100%;object-fit:contain;object-position:right center;display:block}
.pz-tb{width:100%;border-collapse:collapse;font-size:1.5cqw}.pz-tb th,.pz-tb td{padding:.5em .7em;text-align:left;border-bottom:1px solid}.pz-tb th{font-weight:600}
.pz-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.pz-th{position:relative;display:flex;flex-direction:column;gap:6px;text-align:left;color:var(--muted);padding:6px;border-radius:12px;background:transparent}
.pz-th.on{background:var(--surface);box-shadow:var(--shadow)}.pz-th:hover .pz-sl{box-shadow:0 0 0 2px var(--ink)}
.pz-badge{position:absolute;right:12px;top:12px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:var(--warn);color:#fff;font:600 12px/22px var(--mono);font-style:normal;text-align:center}
.pz-ed{margin-top:16px}.pz-edg{display:grid;grid-template-columns:1.25fr 1fr;gap:20px}
.pz-metki{margin-top:12px;font-size:var(--fs-small)}.pz-metki p{margin:0 0 6px}
.pz-m{display:inline-block;padding:2px 8px;border-radius:8px;font-size:12px;font-weight:600;background:var(--warn-soft);color:var(--warn)}.pz-m.dlina{background:var(--surface-2);color:var(--muted)}.pz-m.ocenka{background:var(--accent-soft);color:var(--accent-text)}
.pz-kr{margin-top:18px}.pz-rub{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px 16px;margin:12px 0}
.pz-rub>div{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:var(--fs-small)}.pz-rub b{font-family:var(--mono)}
.pz-rub i{grid-column:1/-1;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--ink) var(--v),var(--line-soft) var(--v))}.pz-rub small{grid-column:1/-1;color:var(--dim)}
.pz-golosa p{margin:0 0 6px;font-size:var(--fs-small)}
.pz-pravki{display:flex;flex-direction:column;gap:8px;margin:12px 0}
.pz-pv{display:grid;grid-template-columns:76px 1fr auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line-soft);border-radius:var(--r-sm)}
.pz-pv small{display:block;color:var(--muted)}.pz-pv.otklonena{opacity:.5}.pz-pv.prinyata{border-color:var(--ink)}.pz-vz{font-size:12px;color:var(--dim)}.pz-yn{display:flex;gap:6px}
.pz-tm{margin-bottom:14px}.pz-bar{height:8px;border-radius:4px;background:var(--line-soft);margin:10px 0 6px;overflow:hidden}.pz-bar i{display:block;height:100%;background:var(--ok)}.pz-bar.red i{background:var(--bad)}
.pz-rech{display:flex;flex-direction:column;gap:12px}.pz-rl{display:grid;grid-template-columns:220px 1fr;gap:14px;padding:12px;border:1px solid var(--line-soft);border-radius:var(--r-sm);background:var(--surface)}
.pz-rl textarea{width:100%;margin-top:6px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit;background:var(--field);color:var(--ink);resize:vertical}
.pz-q{padding:8px 0;border-bottom:1px solid var(--line-soft)}.pz-q summary{cursor:pointer;font-weight:500}.pz-q p{margin:6px 0 0}
.pz-temy{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin:12px 0}
.pz-tema{display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:12px;background:transparent;color:var(--text);text-align:left}.pz-tema.on{background:var(--surface-2);box-shadow:0 0 0 2px var(--ink)}
.pz-logo{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:10px}.pz-logo img{height:40px;max-width:160px;object-fit:contain;background:var(--surface-2);border-radius:8px;padding:4px}
.pz-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}.pz-im{display:flex;flex-direction:column;gap:6px}
.pz-old{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.pz-old img{width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;cursor:pointer}.pz-old img.on{outline:2px solid var(--accent)}
.pz-show{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}.pz-show .pz-sl.big{max-width:980px}
.pz-notes{flex:1;min-width:200px}
.pz-strip{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px}.pz-strip button{flex:none;width:130px;padding:0;border-radius:8px;background:none}.pz-strip button.on .pz-sl{box-shadow:0 0 0 2px var(--accent)}
.pz-check p{margin:6px 0;font-size:var(--fs-small)}.pz-out{margin-top:14px}
@media (max-width:1100px){.pz-grid{grid-template-columns:1fr}.pz-steps{position:static;flex-direction:row;overflow-x:auto;gap:2px;padding-bottom:4px}.pz-steps a{flex:none}.pz-steps small{display:none}}
@media (max-width:860px){.pz-2,.pz-kom{grid-template-columns:1fr}}
@container pzp (max-width:720px){.pz-edg{grid-template-columns:1fr}.pz-srow{grid-template-columns:24px minmax(0,1fr) 92px}.pz-srow>b{grid-row:span 2}.pz-srow>div{grid-column:2;grid-row:1}.pz-srow select{grid-column:2;grid-row:2}.pz-srow input[data-f=sek]{grid-column:3;grid-row:1}.pz-srow .pz-ctl{grid-column:3;grid-row:2}.pz-shead{display:none}
.pz-rl{grid-template-columns:1fr}.pz-pv{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  J.routes.prezentacii = screen;
  if ((location.hash || '').startsWith('#/prezentacii')) J.route();
})();
