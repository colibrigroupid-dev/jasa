/* JASA · Отчёт разбора сценария в PDF (31.10.2026). Экран #/scenariy → «Скачать отчёт».
   Строгий чёрно-белый стиль, как любят киношники: обложка-хлопушка, колонтитулы, кадры фильмов-референсов в плёночной рамке,
   подпись и ссылка на jasa.asia на каждой странице (в PDF ссылка нажимается).
   Сборка: страницы A4 из HTML (794×1123 px) → html2canvas → JPEG → jsPDF. Кадры референсов — из Википедии, в ч/б на своём canvas.
   Подключается после app.js, зависит от window.JASA. Классы — только с приставкой jo-. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, arr, toB64, API_BASE, TG } = J;
  const W = 794, H = 1123;                 // A4 при 96 dpi
  const SAJT = 'https://jasa.asia';
  const abs = (u) => (/^https?:/.test(u) ? u : (API_BASE || location.origin) + u);

  // библиотеки — только при выгрузке, с хешами целостности
  const LIBS = { pdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk'],
    h2c: ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H'] };
  const loaded = {};
  function lib(k) { return loaded[k] || (loaded[k] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = LIBS[k][0]; s.integrity = LIBS[k][1]; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => { loaded[k] = null; rej(new Error('библиотека не загрузилась — проверьте интернет')); }; document.head.appendChild(s); })); }

  const { blokName, dotfix, slej } = J;   // общие помощники из app.js (метка сцены, чистка «..», склейка предложений)
  const t = (x) => esc(dotfix(x));
  const scM = (x) => { const l = blokName(x); return l ? esc(/^\d/.test(l) ? 'Сц. ' + l : l) : ''; };     // для узкого столбца строк (уже экранировано)
  const scB = (x) => { const l = blokName(x); return l ? '<br>' + esc(/^\d/.test(l) ? 'сц. ' + l : l) : ''; };
  const objs = (a) => arr(a).filter((o) => o && typeof o === 'object');   // ответы модели: null и строки вместо объектов не роняют сборку
  const num = (x) => { const n = parseFloat(x); return isFinite(n) ? n : null; };
  const f1 = (x) => { const n = num(x); return n == null ? '—' : (Math.round(n * 10) / 10).toFixed(1); };
  const data = () => new Date().toLocaleDateString('ru-RU');

  // Кадры фильмов-референсов из Википедии убраны 02.11.2026: постеры там загружены как несвободные файлы, а в РК и РФ нет fair use. Референсы — типографские карточки.
  function perforaciya(w, h, fon, dyrka) {
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = fon; g.fillRect(0, 0, w, h); g.fillStyle = dyrka;
    const dw = Math.round(h * 0.62), dh = Math.round(h * 0.42), shag = Math.round(h * 1.1);
    for (let x = shag * 0.4; x < w - dw; x += shag) { const y = (h - dh) / 2; g.beginPath(); if (g.roundRect) g.roundRect(x, y, dw, dh, 2); else g.rect(x, y, dw, dh); g.fill(); }
    return c.toDataURL('image/png');
  }
  function hlopushka(w, h) {
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000';
    const s = h * 1.1;
    for (let x = -h; x < w + h; x += s * 2) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + s, 0); g.lineTo(x + s, h); g.closePath(); g.fill(); }
    return c.toDataURL('image/png');
  }

  // ---------------------------------------------------------------------
  // Стили отчёта (живут только на время сборки)
  // ---------------------------------------------------------------------
  const CSS = `
  .jo-host{position:absolute;left:-14000px;top:0;width:${W}px;z-index:-1}
  .jo-page{width:${W}px;height:${H}px;background:#fff;color:#111;position:relative;overflow:hidden;font-family:Onest,'Noto Sans',Arial,sans-serif;font-size:12.5px;line-height:1.55;box-sizing:border-box;padding:0 64px;margin-bottom:24px}
  .jo-page *{box-sizing:border-box}
  .jo-page h1,.jo-page h2,.jo-page h3,.jo-page p,.jo-page li,.jo-page dt,.jo-page dd,.jo-page small,.jo-page b,.jo-page span,.jo-page em{color:inherit;max-width:none;text-wrap:initial}
  .jo-page .jo-dim,.jo-page .jo-cap,.jo-page .jo-hd span:last-child,.jo-page .jo-ft,.jo-page .jo-sec small{color:#666}
  .jo-hd{position:absolute;left:64px;right:64px;top:34px;display:flex;justify-content:space-between;gap:20px;font:500 8.5px/1 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:#111;padding-bottom:9px;border-bottom:1px solid #111}
  .jo-hd span:last-child{color:#666;max-width:330px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .jo-body{position:absolute;left:64px;right:64px;top:78px;bottom:74px;overflow:hidden}
  .jo-ft{position:absolute;left:64px;right:64px;bottom:30px;display:flex;justify-content:space-between;align-items:center;font:500 8.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#666;padding-top:10px;border-top:1px solid #111}
  .jo-ft b{color:#111;font-weight:600}
  .jo-ft .jo-pg{color:#111;letter-spacing:.3em}
  .jo-b{margin-bottom:14px}
  .jo-sec{display:flex;align-items:baseline;gap:14px;border-bottom:2px solid #111;padding:10px 0 8px;margin:6px 0 16px}
  .jo-sec .jo-n{font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:#111}
  .jo-sec h2{margin:0;font:700 22px/1.05 Geologica,Onest,sans-serif;letter-spacing:.06em;text-transform:uppercase}
  .jo-sec small{margin-left:auto;font:500 8.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#666}
  .jo-cap{font:500 8.5px/1.3 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#666;display:block;margin-bottom:6px}
  .jo-p{margin:0 0 8px}
  .jo-dim{color:#666}
  .jo-lead{font:400 15px/1.55 Onest,sans-serif;margin:0}
  .jo-score{display:flex;gap:28px;align-items:stretch;border:1.5px solid #111}
  .jo-score .jo-big{background:#111;color:#fff;padding:18px 22px;min-width:190px;display:flex;flex-direction:column;justify-content:space-between}
  .jo-score .jo-big b{font:700 76px/0.9 Geologica,sans-serif;letter-spacing:-.02em}
  .jo-score .jo-big b small{font-size:22px;font-weight:500;letter-spacing:0;color:#aaa}
  .jo-score .jo-big span{font:500 8.5px/1.3 'JetBrains Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:#bbb}
  .jo-score .jo-parts{flex:1;padding:14px 18px 14px 0}
  .jo-bar{display:grid;grid-template-columns:84px 1fr 34px;gap:10px;align-items:center;margin:5px 0;font-size:11.5px}
  .jo-bar i{display:block;height:7px;background:#e4e4e4;position:relative}
  .jo-bar i em{position:absolute;left:0;top:0;bottom:0;background:#111}
  .jo-bar b{font:600 12px/1 'JetBrains Mono',monospace;text-align:right}
  .jo-bar.jo-low span{text-decoration:underline}
  .jo-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #111}
  .jo-3>div{padding:12px 14px;border-right:1px solid #111}
  .jo-3>div:last-child{border-right:0}
  .jo-3 b{display:block;font:700 30px/1 Geologica,sans-serif;margin:6px 0 8px}
  .jo-3 p{margin:0;font-size:11.5px;line-height:1.5}
  .jo-black{background:#111;color:#fff;padding:16px 18px}
  .jo-black .jo-cap{color:#aaa}
  .jo-zen{display:grid;grid-template-columns:40px 1fr;gap:12px;background:#111;color:#fff;padding:14px 18px;margin-bottom:2px}
  .jo-zen .jo-k{font:700 22px/1 Geologica,sans-serif;color:#fff}
  .jo-zen b{display:block;font:600 13.5px/1.35 Geologica,sans-serif;margin-bottom:4px}
  .jo-zen span{color:#c8c8c8;font-size:11.5px}
  .jo-li{display:grid;grid-template-columns:22px 1fr;gap:8px;margin:0 0 7px}
  .jo-li:before{content:'—';font-weight:600}
  .jo-fix{display:grid;grid-template-columns:62px 1fr;gap:16px;border-top:1px solid #111;padding:12px 0 4px}
  .jo-fix .jo-sc{border:1.5px solid #111;text-align:center;padding:6px 0 7px;height:max-content}
  .jo-fix .jo-sc small{display:block;font:500 7.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;color:#666}
  .jo-fix .jo-sc b{font:700 20px/1.1 Geologica,sans-serif}
  .jo-fix.jo-nosc{grid-template-columns:1fr}
  .jo-fix.jo-fix-txt{grid-template-columns:92px 1fr}
  .jo-fix .jo-sc.jo-txt{padding:6px 5px 7px}
  .jo-fix .jo-sc.jo-txt b{display:block;font:600 10.5px/1.3 Geologica,sans-serif;word-break:break-word}
  .jo-fix h4{margin:0 0 4px;font:600 13.5px/1.35 Geologica,sans-serif}
  .jo-fix h4 em{font:500 8px/1 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;font-style:normal;border:1px solid #111;padding:2px 5px;margin-left:6px;vertical-align:2px}
  .jo-fix p{margin:0 0 5px;font-size:12px}
  .jo-fix .jo-ef{font:500 10.5px/1.45 'JetBrains Mono',monospace;color:#333;border-left:2px solid #111;padding-left:8px}
  .jo-refs{display:grid;grid-template-columns:324px 324px;gap:18px}
  .jo-ref .jo-fr{background:#111;padding:0 10px}
  .jo-ref .jo-fr img.jo-perf{display:block;width:100%;height:14px}
  .jo-ref .jo-fr .jo-im{display:block;width:304px;height:228px;background:#222}
  .jo-ref .jo-fr .jo-net{height:228px;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font:700 20px/1.2 Geologica,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:0 20px;border:1px solid #444}
  .jo-ref h4{margin:9px 0 2px;font:700 13.5px/1.25 Geologica,sans-serif;text-transform:uppercase;letter-spacing:.03em}
  .jo-ref small{font:500 8.5px/1 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#666}
  .jo-ref p{margin:5px 0 0;font-size:11px;line-height:1.5}
  .jo-tr{display:grid;border-bottom:1px solid #cfcfcf;font-size:11.5px;line-height:1.5}
  .jo-tr>div,.jo-tr>span{padding:7px 8px;min-width:0}
  .jo-th{background:#111;color:#fff;border:0;font:500 8px/1.3 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
  .jo-tr.jo-top{background:#efefef}
  .jo-tr .jo-m{font:600 11px/1.3 'JetBrains Mono',monospace}
  .jo-kv{display:grid;grid-template-columns:110px 1fr;border-top:1px solid #111}
  .jo-kv dt,.jo-kv dd{margin:0;padding:7px 0;border-bottom:1px solid #cfcfcf;font-size:11.5px}
  .jo-kv dt{font:500 8.5px/1.6 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#666;padding-top:9px}
  .jo-row{display:grid;grid-template-columns:70px 1fr;gap:14px;border-top:1px solid #cfcfcf;padding:9px 0}
  .jo-row .jo-m{font:600 11px/1.4 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase}
  .jo-row p{margin:0;font-size:12px}
  .jo-hero{border-top:1px solid #111;padding:10px 0 8px}
  .jo-hero h4{margin:0 0 4px;font:700 14px/1.2 Geologica,sans-serif;text-transform:uppercase;letter-spacing:.04em}
  .jo-hero p{margin:0 0 3px;font-size:11.5px}
  .jo-fin{display:flex;justify-content:flex-end;font:600 14px/1 'JetBrains Mono',monospace;letter-spacing:.2em;margin:26px 0 22px}
  .jo-sign{background:#111;color:#fff;padding:22px 24px;display:flex;justify-content:space-between;align-items:center;gap:20px}
  .jo-sign b{display:block;font:700 30px/1 Geologica,sans-serif;letter-spacing:.14em}
  .jo-sign p{margin:8px 0 0;color:#bbb;font-size:11.5px;max-width:360px}
  .jo-sign .jo-url{font:600 14px/1 'JetBrains Mono',monospace;letter-spacing:.12em;border:1.5px solid #fff;padding:12px 16px;white-space:nowrap}
  /* обложка */
  .jo-cover{background:#0b0b0b;color:#fff;padding:0}
  .jo-cover .jo-perf-top,.jo-cover .jo-perf-bot{position:absolute;left:0;right:0;height:26px;width:100%}
  .jo-cover .jo-perf-top{top:0}.jo-cover .jo-perf-bot{bottom:0}
  .jo-cover .jo-in{position:absolute;left:64px;right:64px;top:70px;bottom:70px;display:flex;flex-direction:column}
  .jo-cover .jo-tag{font:500 9.5px/1 'JetBrains Mono',monospace;letter-spacing:.3em;text-transform:uppercase;color:#bbb;display:flex;justify-content:space-between}
  .jo-cover h1{margin:200px 0 0;font:700 76px/0.96 Geologica,sans-serif;letter-spacing:.02em;text-transform:uppercase}
  .jo-cover .jo-log{margin:26px 0 0;font:400 17px/1.5 Onest,sans-serif;color:#ddd;max-width:560px}
  .jo-cover .jo-slate{margin-top:auto;background:#fff;color:#111}
  .jo-cover .jo-slate img{display:block;width:100%;height:34px}
  .jo-cover .jo-sg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:2px solid #111}
  .jo-cover .jo-sg>div{padding:10px 14px 12px;border-right:1.5px solid #111;border-bottom:1.5px solid #111}
  .jo-cover .jo-sg>div:nth-child(3n){border-right:0}
  .jo-cover .jo-sg small{display:block;font:500 7.5px/1 'JetBrains Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:#666;margin-bottom:6px}
  .jo-cover .jo-sg b{font:600 14px/1.25 Geologica,sans-serif;display:block;overflow:hidden;max-height:56px}
  .jo-cover .jo-sg .jo-long b{font-size:12.5px}
  .jo-cover .jo-sg .jo-ball b{font-size:26px}
  .jo-cover .jo-cf{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;font:500 9px/1 'JetBrains Mono',monospace;letter-spacing:.2em;text-transform:uppercase}
  .jo-cover .jo-cf b{font-size:12px;letter-spacing:.16em}`;

  // ---------------------------------------------------------------------
  // Содержимое: список блоков; страницы раскладываются сами
  // ---------------------------------------------------------------------
  const CH = { syuzhet: 'Сюжет', geroi: 'Герои', dialog: 'Диалог', premisa: 'Премиса', mir: 'Мир', polza: 'Польза' };
  const RP = { kz: 'Казахстан', asia: 'Азия', stream: 'Стриминги', eu: 'Фестивали', vse: 'Среднее по рынкам' };

  function ballOf(j) {
    const sr = j.showrunner || {}; const kr = (j.results || {}).kritik || {}; const B = j.ball || {};
    return B.tekst != null ? +B.tekst : (+sr.ball || +kr.obshchiy || 0);
  }

  function bloki(j, kadry) {
    const sr = j.showrunner || {}; const R = j.results || {}; const B = j.ball || {}; const kr = R.kritik || {};
    const out = []; let n = 0;
    const sec = (title, note) => { n++; out.push({ keep: true, html: `<div class="jo-sec"><span class="jo-n">${String(n).padStart(2, '0')}</span><h2>${t(title)}</h2>${note ? `<small>${t(note)}</small>` : ''}</div>` }); };
    const b = (html, keep) => out.push({ keep: !!keep, html: `<div class="jo-b">${html}</div>` });
    const tablica = (cols, head, rows) => {   // строки — отдельными блоками: длинная таблица переходит на новую страницу с повтором шапки
      const th = `<div class="jo-tr jo-th" style="grid-template-columns:${cols}">${head.map((h) => `<span>${t(h)}</span>`).join('')}</div>`;
      out.push({ keep: true, html: th });
      rows.forEach((r) => out.push({ thead: th, html: `<div class="jo-tr ${r.cls || ''}" style="grid-template-columns:${cols}">${r.cells.map((c) => `<div>${c}</div>`).join('')}</div>` }));
    };
    const sc = (x) => (x == null || x === '' ? '—' : t(x));

    // 01 Вердикт
    sec('Вердикт', 'режим · ' + (j.rezhim || ''));
    if (sr.odnim_abzacem) b(`<p class="jo-lead">${t(sr.odnim_abzacem)}</p>`);
    const ball = ballOf(j);
    const chasti = Object.entries(B.chasti && typeof B.chasti === 'object' ? B.chasti : {}).filter(([, v]) => v != null && typeof v !== 'object');
    b(`<div class="jo-score"><div class="jo-big"><span>Балл текста</span><b>${f1(ball)}<small> /10</small></b><span>${B.rynok != null ? (B.rynok_luchshij ? 'лучший рынок' : 'рынок') + ' · ' + t(B.rynok_imya || RP[B.rynok_po] || B.rynok_po) + ' · ' + f1(B.rynok) : ''}</span></div>
      <div class="jo-parts"><span class="jo-cap">Из чего складывается</span>${chasti.map(([k, v]) => `<div class="jo-bar ${arr(B.potolok).includes(k) ? 'jo-low' : ''}"><span>${t(CH[k] || k)}</span><i><em style="width:${Math.max(0, Math.min(100, (num(v) || 0) * 10))}%"></em></i><b>${f1(v)}</b></div>`).join('')}
      ${arr(B.potolok).length ? `<p class="jo-p" style="margin-top:8px;font-size:11px"><b>Потолок 7:</b> ${arr(B.potolok).map((k) => t(CH[k] || k)).join(', ')} ниже 5.</p>` : ''}</div></div>`);
    const golosa = ['otborshchik', 'redaktor', 'zritel'].filter((k) => kr[k] && typeof kr[k] === 'object');
    if (golosa.length) b(`<span class="jo-cap">Критик читал вслепую · три голоса</span><div class="jo-3">${golosa.map((k) => `<div><span class="jo-cap">${{ otborshchik: 'Отборщик', redaktor: 'Редактор', zritel: 'Зритель' }[k]}</span><b>${t(kr[k].ball)}</b><p>${t(kr[k].slovo)}</p></div>`).join('')}</div>`);
    if (kr.odno) b(`<p class="jo-p"><b>Одно, что поменял бы критик:</b> ${t(kr.odno)}</p>`);

    // 02 Зеница ока
    const zen = objs(R.serdce && R.serdce.zenica).length ? objs(R.serdce.zenica) : objs(j.zenica);
    if (zen.length) {
      sec('Зеница ока', 'не трогаем');
      b(`<p class="jo-p jo-dim">Что делает этот сценарий вашим. Любая правка проверяется на эти пункты.</p>`, true);
      zen.forEach((z, i) => out.push({ html: `<div class="jo-zen"><span class="jo-k">${i + 1}</span><div><b>${t(z.chto)}</b><span>${t(z.gde)}${z.pochemu ? ' — ' + t(z.pochemu) : ''}</span></div></div>` }));
      if (R.serdce && R.serdce.chelovechnost) b(`<p class="jo-p" style="margin-top:12px"><b>Человечность.</b> ${t(R.serdce.chelovechnost)}</p>`);
    }

    // 03 Что работает
    if (arr(sr.chto_rabotaet).length) { sec('Что работает', 'это беречь'); arr(sr.chto_rabotaet).forEach((x) => out.push({ html: `<div class="jo-li"><span>${t(x)}</span></div>` })); }

    // 04 Правки
    if (arr(sr.pravki).length) {
      sec('Топ правок', 'каждую — отдельным решением');
      objs(sr.pravki).forEach((p) => { const lab = blokName(p.scena); out.push({ html: `<div class="jo-fix ${lab ? (/^\d/.test(lab) ? '' : 'jo-fix-txt') : 'jo-nosc'}">${lab ? `<div class="jo-sc ${/^\d/.test(lab) ? '' : 'jo-txt'}"><small>${/^\d/.test(lab) ? 'СЦЕНА' : 'БЛОК'}</small><b>${t(lab)}</b></div>` : ''}<div><h4>${t(p.chto)}${p.vazhnost ? `<em>${t(p.vazhnost)}</em>` : ''}</h4>${p.zachem ? `<p>${t(p.zachem)}</p>` : ''}${p.effekt ? `<div class="jo-ef">${t(p.effekt)}${p.konflikt && p.konflikt !== 'нет' ? ' · ' + (p.konflikt === 'не проверено' ? 'конфликт не проверен' : 'задевает ' + t(p.konflikt)) + ' — вопрос автору' : ''}</div>` : ''}</div></div>` }); });
      if (arr(sr.protivorechiya).length) { b(`<span class="jo-cap" style="margin-top:10px">Где помощники не согласны</span>`); objs(sr.protivorechiya).forEach((c) => b(`<p class="jo-p"><b>${t(c.kto)}</b> — ${t(c.sut)}<br><span class="jo-dim">Решение: ${t(slej(c.reshenie, c.pochemu))}</span></p>`)); }
      if (arr(sr.voprosy_avtoru).length) { b(`<span class="jo-cap" style="margin-top:10px">Вопросы автору</span>`, true); arr(sr.voprosy_avtoru).forEach((q) => out.push({ html: `<div class="jo-black" style="margin-bottom:2px;padding:10px 18px"><p class="jo-p" style="margin:0">— ${t(q)}</p></div>` })); }
    }

    // 05 Референсы
    const refs = objs(R.zhanrist && R.zhanrist.referensy);
    if (refs.length || R.zhanrist) {
      sec('Референсы', 'жанр и тон');
      const zh = R.zhanrist || {};
      if (zh.zhanr) b(`<dl class="jo-kv"><dt>Жанр</dt><dd>${t(zh.zhanr)}</dd>${zh.podzhanr ? `<dt>Поджанр</dt><dd>${t(zh.podzhanr)}</dd>` : ''}${arr(zh.ton).length ? `<dt>Тон</dt><dd>${arr(zh.ton).map(t).join(' · ')}</dd>` : ''}</dl>`);
      const perf = perforaciya(304, 14, '#111', '#fff');
      for (let i = 0; i < refs.length; i += 2) {
        out.push({ html: `<div class="jo-b jo-refs">${refs.slice(i, i + 2).map((r, k) => { const im = kadry[i + k]; return `<div class="jo-ref"><div class="jo-fr"><img class="jo-perf" src="${perf}">${im ? `<img class="jo-im" src="${im}">` : `<div class="jo-net">${t(String(r.nazvanie || '').replace(/\([^)]*\)/g, ''))}</div>`}<img class="jo-perf" src="${perf}"></div><h4>${t(r.nazvanie)}</h4><small>${[r.god, r.strana].filter(Boolean).map(t).join(' · ')}</small>${r.chem_pohozh ? `<p>${t(r.chem_pohozh)}</p>` : ''}${r.kak_proshel ? `<p class="jo-dim">${t(r.kak_proshel)}</p>` : ''}</div>`; }).join('')}</div>` });
      }
    }

    // 06 Рынки
    const ry = objs(R.rynochnik && R.rynochnik.leyery);
    if (ry.length) {
      sec('Предикт по рынкам');
      const best = Math.max(...ry.map((l) => num(l.ball) || 0), 0);
      tablica('150px 104px 1fr', ['Рынок', 'Балл', 'Почему и что изменить'], ry.map((l) => ({ cls: num(l.ball) === best ? 'jo-top' : '', cells: [`<b>${t(l.nazvanie)}</b>`, `<div class="jo-bar" style="grid-template-columns:1fr 22px;margin:4px 0"><i><em style="width:${Math.max(0, Math.min(100, (num(l.ball) || 0) * 10))}%"></em></i><b>${t(l.ball)}</b></div>`, `${t(l.pochemu)}${arr(l.izmenit).length ? `<br><span class="jo-dim">→ ${arr(l.izmenit).map(t).join(' · ')}</span>` : ''}`] })));
      const kz = R.rynochnik.kz_osobo;
      if (kz) b(`<dl class="jo-kv"><dt>Госфонд</dt><dd>${sc(kz.gosfond)}</dd><dt>Код</dt><dd>${sc(kz.kod)}</dd><dt>Язык</dt><dd>${sc(kz.yazyk)}</dd><dt>Рейтинг</dt><dd>${sc(kz.reyting)}</dd></dl>`);
      if (R.rynochnik.luchshiy) b(`<p class="jo-p"><b>Лучший путь:</b> ${t(R.rynochnik.luchshiy)}</p>`);
    }

    // 07 Карта сцен (как производственная раскадровка)
    const sceny = objs(j.chitatel && j.chitatel.sceny);
    if (sceny.length) {
      sec('Карта сцен', j.chitatel.scen + ' сцен · ≈ ' + (j.chitatel.minut || '—') + ' мин');
      const slozh = {}; objs(R.prodyuser && R.prodyuser.sceny).forEach((s) => { slozh[String(s.n)] = s; });
      tablica('40px 1fr 66px 200px', ['№', 'Сцена', 'Время', 'Сложность съёмки'], sceny.map((x) => { const p = slozh[String(x.n)] || {}; return { cells: [`<span class="jo-m">${t(x.n)}</span>`, t(x.zagolovok), t(x.vremya || p.vremya || ''), `${arr(p.slozhnost).map(t).join(', ')}${p.ocenka ? ' <span class="jo-dim">· ' + t(p.ocenka) + '</span>' : ''}`] }; }));
    }

    // 08 Ошибки логики
    const osh = objs(R.logik && R.logik.oshibki);
    if (osh.length) { sec('Карта ошибок', 'логика и причинность'); osh.forEach((o) => out.push({ html: `<div class="jo-row"><span class="jo-m">${scM(o.scena)}</span><div><p><b>${t(o.tip)}${o.sereznost ? ' · ' + t(o.sereznost) : ''}</b></p><p>${t(o.sut)}</p>${arr(o.kak).length ? `<p class="jo-dim">→ ${arr(o.kak).map(t).join(' / ')}</p>` : ''}</div></div>` })); }

    // 09 Герои
    const geroi = objs(R.personazhnik && R.personazhnik.geroi);
    if (geroi.length) {
      sec('Герои');
      geroi.forEach((g) => out.push({ html: `<div class="jo-hero"><h4>${t(g.imya)}</h4>${g.rol ? `<p class="jo-dim">${t(g.rol)}</p>` : ''}<p><b>Хочет:</b> ${t(g.zhelanie)}</p><p><b>Нуждается:</b> ${t(g.nuzhda)}</p>${g.arka ? `<p><b>Арка:</b> ${t(g.arka)}</p>` : ''}${g.slabo ? `<p class="jo-dim"><b>Слабое место:</b> ${t(g.slabo)}</p>` : ''}</div>` }));
      if (R.personazhnik.test_imen) b(`<p class="jo-p jo-dim">${t(R.personazhnik.test_imen)}</p>`);
    }

    // 10 Структура
    const A = R.arhitektor, Sc = R.scenovik;
    if (A || Sc) {
      sec('Структура и сцены');
      if (A && A.hronometrazh) b(`<p class="jo-p">${t(A.hronometrazh)}</p>`);
      objs(A && A.zatyanuto).forEach((z) => out.push({ html: `<div class="jo-row"><span class="jo-m">Затянуто${scB(z.scena)}</span><div><p>${t(z.pochemu)}</p><p class="jo-dim">→ ${t(z.predlozhenie)}</p></div></div>` }));
      objs(A && A.skomkano).forEach((z) => out.push({ html: `<div class="jo-row"><span class="jo-m">Скомкано${scB(z.scena)}</span><div><p>${t(z.pochemu)}</p><p class="jo-dim">→ ${t(z.predlozhenie)}</p></div></div>` }));
      if (Sc && Sc.itog) b(`<p class="jo-p" style="margin-top:10px">${t(Sc.itog)}</p>`);
      objs(Sc && Sc.bez_povorota).forEach((z) => out.push({ html: `<div class="jo-row"><span class="jo-m">Без поворота${scB(z.scena)}</span><div><p>${t(z.pochemu)}</p><p class="jo-dim">→ ${t(z.predlozhenie)}</p></div></div>` }));
      objs(Sc && Sc.vhod_vyhod).forEach((z) => out.push({ html: `<div class="jo-row"><span class="jo-m">${scM(z.scena)}</span><div><p>${t(z.sovet)}</p></div></div>` }));
    }

    // 11 Речь
    const Y = R.yazykoved;
    if (Y && (Y.dvuyazychie || arr(Y.zamechaniya).length)) {
      sec('Речь', 'русский и казахский');
      if (Y.dvuyazychie) b(`<p class="jo-p">${t(Y.dvuyazychie)}</p>`);
      objs(Y.zamechaniya).forEach((z) => out.push({ html: `<div class="jo-row"><span class="jo-m">${scM(z.scena)}</span><div><p><b>${t(z.chto)}</b>${z.replika ? ': «' + t(z.replika) + '»' : ''}</p>${z.kak ? `<p class="jo-dim">→ ${t(z.kak)}</p>` : ''}</div></div>` }));
    }

    // 12 Риски
    const St = R.strazh;
    if (St && (St.reyting || arr(St.riski).length || arr(St.fakty).length)) {
      sec('Риски и рейтинг');
      if (St.reyting) b(`<div class="jo-black"><span class="jo-cap">Возрастной рейтинг</span><b style="font:700 18px/1.3 Geologica,sans-serif">${t(St.reyting)}</b></div>`);
      objs(St.riski).forEach((r) => out.push({ html: `<div class="jo-row"><span class="jo-m">${scM(r.scena)}</span><div><p>${t(r.risk)}</p>${r.smyagchit ? `<p class="jo-dim">→ ${t(r.smyagchit)}</p>` : ''}</div></div>` }));
      if (arr(St.fakty).length) { b(`<span class="jo-cap" style="margin-top:10px">Факты и советы · проверка</span>`); objs(St.fakty).forEach((f) => out.push({ html: `<div class="jo-row"><span class="jo-m">${scM(f.scena)}</span><div><p>«${t(f.citata)}»</p><p><b>${t(f.status)}</b> <span class="jo-dim">${t(f.kommentarij)}</span></p></div></div>` })); }
    }

    // 13 А что если
    const mix = objs(R.mikser && R.mikser.varianty);
    if (mix.length) { sec('А что если', 'варианты, не правки'); mix.forEach((v) => out.push({ html: `<div class="jo-hero"><h4>${t(v.nazvanie)}</h4>${v.k_pravke && v.k_pravke !== '—' ? `<p class="jo-dim">к правке ${t(v.k_pravke)}</p>` : ''}<p>${t(v.sut)}</p><p class="jo-dim">Сохраняется: ${t(v.sohranyaetsya)} · риск: ${t(v.risk)}</p></div>` })); }

    // 14 Производство
    const P = R.prodyuser;
    if (P && (P.kategoriya || P.ii_proizvodstvo)) {
      sec('Производство');
      b(`<dl class="jo-kv">${P.kategoriya ? `<dt>Категория</dt><dd>${t(P.kategoriya)}</dd>` : ''}${P.ii_proizvodstvo ? `<dt>Кадров</dt><dd>${sc(P.ii_proizvodstvo.kadrov)}</dd><dt>Видео</dt><dd>${sc(P.ii_proizvodstvo.video_sekund)} с</dd>${P.ii_proizvodstvo.zamechanie ? `<dt>Заметка</dt><dd>${t(P.ii_proizvodstvo.zamechanie)}</dd>` : ''}` : ''}</dl>`);
    }

    // 15 План версии 2
    if (arr(sr.plan_v2).length) {
      sec('План версии 2');
      arr(sr.plan_v2).forEach((p, i) => out.push({ html: `<div class="jo-row"><span class="jo-m">Шаг ${i + 1}</span><div><p>${t(p)}</p></div></div>` }));
      if (sr.rezhim_otvet) b(`<p class="jo-p jo-dim" style="margin-top:8px">${t(sr.rezhim_otvet)}</p>`);
    }

    // 16 Реестр замечаний: расшифровка P1…Pn из текста правок
    const nomer = (x) => parseInt(String(x.id).replace(/\D+/g, ''), 10) || 0;
    const reg = objs(j.problemy).filter((x) => x.id).sort((a, c) => nomer(a) - nomer(c));
    if (reg.length) {
      sec('Реестр замечаний', 'расшифровка P' + nomer(reg[0]) + '–P' + nomer(reg[reg.length - 1]));
      b(`<p class="jo-p jo-dim">В правках и планах встречаются номера вида P15 — это замечания отдельных помощников. Здесь суть каждого.</p>`, true);
      tablica('44px 118px 1fr', ['№', 'Кто', 'Суть'], reg.map((x) => ({ cells: [`<b>${t(x.id)}</b>`, t((j.agents && j.agents[x.kto] && j.agents[x.kto].name) || x.kto), `${scM(x.scena) ? '<b>' + scM(x.scena) + '</b> · ' : ''}${t(String(x.sut || '').slice(0, 320))}${String(x.sut || '').length > 320 ? '…' : ''}`] })));
    }

    // финал и подпись
    out.push({ html: `<div><div class="jo-fin">ЗАТЕМНЕНИЕ.</div><div class="jo-sign" data-link="${SAJT}"><div><b>JASA</b><p>Разбор сценария командой помощников: структура, герои, диалоги, рынок и риски. Без вашего «да» ничего не меняется.</p></div><span class="jo-url">jasa.asia →</span></div></div>` });
    return out;
  }

  function oblozhka(j) {
    const ch = j.chitatel || {}; const zh = (j.results || {}).zhanrist || {};
    const p = j.pasport || {};
    let zhanr = String(zh.zhanr || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); if (zhanr.length > 70) zhanr = zhanr.slice(0, 68).replace(/\s+\S*$/, '') + '…';
    const sceny = +ch.scen || 0; const A = (j.results || {}).arhitektor || {};
    // у синопсиса «1 страница = 1 минута» неверно: берём оценку Архитектора («около 15 минут», «≈ 1 ч 30 мин», «90–100 минут»)
    const tA = String(A.hronometrazh || ''); const mCh = tA.match(/(?:около|≈|~)?\s*(\d+)\s*ч(?:ас\w*)?\s*(\d+)?\s*мин/i); const mA = tA.match(/(?:около|≈|~)?\s*(\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+)?)\s*мин/i);
    const hron = mCh ? '≈ ' + ((+mCh[1]) * 60 + (+mCh[2] || 0)) + ' мин (оценка архитектора)' : mA ? '≈ ' + mA[1].replace('.', ',') + ' мин (оценка архитектора)' : (sceny && ch.minut ? '≈ ' + ch.minut + ' мин' : '—');
    const yach = [['Жанр', zhanr || '—'], sceny ? ['Сцен', sceny] : ['Формат', 'синопсис, без разметки сцен'], ['Хронометраж', hron],
      ['Режим', j.rezhim || '—'], ['Дата', data()], ['Балл текста', f1(ballOf(j)) + ' / 10']];
    return `<div class="jo-page jo-cover"><img class="jo-perf-top" src="${perforaciya(W, 26, '#0b0b0b', '#fff')}">
      <div class="jo-in"><div class="jo-tag"><span>JASA · Script coverage</span><span>№ ${t(String(j.id || '').slice(0, 6).toUpperCase())}</span></div>
      <h1>Разбор<br>сценария</h1>
      ${p.o_chem ? `<p class="jo-log">«${t(p.o_chem)}»</p>` : ''}
      ${p.avtor_prava ? `<p class="jo-log" style="font-size:12px;color:#999;margin-top:12px">${t(p.avtor_prava)}</p>` : ''}
      <div class="jo-slate"><img src="${hlopushka(W - 128, 34)}"><div class="jo-sg">${yach.map(([k, v], i) => `<div class="${i === 5 ? 'jo-ball' : ''} ${String(v).length > 30 ? 'jo-long' : ''}"><small>${t(k)}</small><b>${t(v)}</b></div>`).join('')}</div>
      <div class="jo-cf" data-link="${SAJT}"><span>Создано с помощью ИИ · для автора</span><b>jasa.asia</b></div></div></div>
      <img class="jo-perf-bot" src="${perforaciya(W, 26, '#0b0b0b', '#fff')}"></div>`;
  }

  // ---------------------------------------------------------------------
  // Раскладка по страницам
  // ---------------------------------------------------------------------
  function stranica(host, nazv) {
    const el = document.createElement('div'); el.className = 'jo-page';
    const kor = String(nazv || '').length > 46 ? String(nazv).slice(0, 44).replace(/[\s,.;:—–-]+\S*$/, '') + '…' : String(nazv || '');
    el.innerHTML = `<div class="jo-hd"><span>JASA · Разбор сценария</span><span>${t(kor)}</span></div><div class="jo-body"></div><div class="jo-ft" data-link="${SAJT}"><span>Отчёт собран в <b>JASA · jasa.asia</b></span><span class="jo-pg"></span><span>${data()}</span></div>`;
    host.appendChild(el); return el;
  }
  function razlozhit(host, spisok, nazv) {
    const pages = []; let pg = stranica(host, nazv); pages.push(pg); let body = pg.querySelector('.jo-body');
    const tmp = document.createElement('div');
    spisok.forEach((bl) => {
      tmp.innerHTML = bl.html; const el = tmp.firstElementChild; if (!el) return;
      if (bl.keep) el.dataset.keep = '1';
      el._thead = bl.thead || '';
      body.appendChild(el);
      if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
        const perenos = [el]; body.removeChild(el);
        while (body.lastElementChild && body.lastElementChild.dataset.keep && body.children.length > 1) { perenos.unshift(body.lastElementChild); body.removeChild(body.lastElementChild); }
        pg = stranica(host, nazv); pages.push(pg); body = pg.querySelector('.jo-body');
        if (perenos[0]._thead && !perenos[0].classList.contains('jo-th')) { tmp.innerHTML = perenos[0]._thead; body.appendChild(tmp.firstElementChild); }
        perenos.forEach((x) => body.appendChild(x));
      }
    });
    pages.forEach((p) => { const bd = p.querySelector('.jo-body'); if (bd.scrollHeight > bd.clientHeight + 1) razlozhit.obrezano = (razlozhit.obrezano || 0) + 1; });
    return pages;
  }

  async function shrifty() {
    await Promise.all(['700 40px Geologica', '600 40px Geologica', '400 20px Onest', '600 20px Onest', '500 20px "JetBrains Mono"', '600 20px "JetBrains Mono"']
      .map((f) => document.fonts.load(f, 'АБВабв').catch(() => null)));
    if (document.fonts.ready) await document.fonts.ready;
  }

  const imyaFajla = (j) => {
    const s = String((j.pasport && j.pasport.o_chem) || 'scenariy').replace(/[^\wа-яёәғқңөұүһі\- ]/gi, '').trim().split(/\s+/).slice(0, 5).join('-');
    return 'razbor-' + (s || 'scenariya') + '.pdf';
  };

  async function otdat(blob, name, j) {
    const tw = window.Telegram && window.Telegram.WebApp;
    if (TG && tw) {   // в Telegram ссылка-blob не скачивается: файл на час на сервер
      if (blob.size > 10e6) throw new Error('файл больше 10 МБ — скачайте с компьютера');
      const r = await api('/api/scenariy/otchet', { id: j.id, b64: await toB64(blob), imya: name });
      if (typeof tw.downloadFile === 'function') tw.downloadFile({ url: abs(r.url), file_name: r.imya || name }, (ok) => { if (!ok) toast('Скачивание отменено'); });
      else { tw.openLink(abs(r.url)); toast('Открываю файл в браузере — ссылка действует 1 час'); }
      return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast('Отчёт скачан: ' + name);
  }

  // ---- невидимый текстовый слой: PDF остаётся картинкой, но текст ищется и копируется ----
  const SHRIFT_URL = 'Onest-Regular.ttf';   // кириллица, лицензия OFL; нет файла — слой пропускается молча
  async function podklyuchitShrift(doc) {
    try {
      const r = await fetch(SHRIFT_URL, { cache: 'force-cache' }); if (!r.ok) return false;
      const buf = new Uint8Array(await r.arrayBuffer());
      const sig = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
      if (!(sig === '\u0000\u0001\u0000\u0000' || sig === 'true' || sig === 'OTTO')) return false;   // не шрифт (например, index.html с кодом 200)
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      doc.addFileToVFS('Onest-Regular.ttf', btoa(bin)); doc.addFont('Onest-Regular.ttf', 'OnestJ', 'normal'); doc.setFont('OnestJ'); return true;
    } catch (e) { return false; }
  }
  function nevidimyjTekst(doc, page, k) {
    try {
      const B = page.getBoundingClientRect();   // после рендера: если страницу сдвинули прокруткой, слой едет вместе с ней
      const clips = new Map();
      const clipOf = (el) => {   // область, которую реально видно: страница ∩ предки с overflow; скрытые элементы — null
        if (clips.has(el)) return clips.get(el);
        let c = { l: B.left, t: B.top, r: B.right, b: B.bottom };
        for (let a = el; a && a !== page.parentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) { c = null; break; }
          if (a !== page && (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) { const q = a.getBoundingClientRect(); c = { l: Math.max(c.l, q.left), t: Math.max(c.t, q.top), r: Math.min(c.r, q.right), b: Math.min(c.b, q.bottom) }; }
        }
        clips.set(el, c); return c;
      };
      const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT); const rg = document.createRange(); const lines = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        let tx = n.nodeValue; const el = n.parentElement; if (!tx || !tx.trim() || !el || /^(STYLE|SCRIPT)$/.test(el.tagName)) continue;
        const c = clipOf(el); if (!c) continue;
        const up = /uppercase/.test(getComputedStyle(el).textTransform || '');
        const re = /\S+/g; let m, cur = null;
        while ((m = re.exec(tx))) {
          rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const r = rg.getClientRects()[0]; if (!r || r.width < 1) continue;
          const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2; if (cx < c.l || cx > c.r || cy < c.t || cy > c.b) continue;   // обрезано overflow или за краем
          const w = up ? m[0].toUpperCase() : m[0];
          if (cur && Math.abs(r.top - cur.top) < 3 && r.left >= cur.right - 1) { cur.text += ' ' + w; cur.right = r.right; cur.bottom = Math.max(cur.bottom, r.bottom); }
          else { cur = { text: w, left: r.left, right: r.right, top: r.top, bottom: r.bottom }; lines.push(cur); }
        }
      }
      lines.forEach((l) => {
        try {
          const w = (l.right - l.left) * k; if (w < 2) return;
          doc.setFontSize(10); const w10 = doc.getTextWidth(l.text); if (!w10) return;
          const fs = Math.max(3, Math.min(40, 10 * w / w10));
          doc.setFontSize(fs); doc.text(l.text, (l.left - B.left) * k, (l.bottom - B.top) * k - fs * 0.2, { renderingMode: 'invisible' });
        } catch (e) { /* символ, которого нет в шрифте, портит одну строку, а не страницу */ }
      });
    } catch (e) { console.warn('отчёт: текстовый слой не добавлен', e); }
  }

  let idet = false;
  async function sobrat(j, onShag) {
    const shag = onShag || (() => {});
    shag('Готовлю шрифты…');
    await Promise.all([lib('pdf'), lib('h2c'), shrifty()]);
    const refs = arr(j.results && j.results.zhanrist && j.results.zhanrist.referensy);
    const kadry = refs.map(() => null);   // 02.11: чужие постеры из Википедии больше не берём — типографские карточки

    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const host = document.createElement('div'); host.className = 'jo-host'; document.body.appendChild(host);
    try {
      host.insertAdjacentHTML('beforeend', oblozhka(j));
      const nazv = (j.pasport && j.pasport.o_chem) || 'Разбор сценария';
      razlozhit.obrezano = 0;
      const pages = [host.firstElementChild].concat(razlozhit(host, bloki(j, kadry), nazv));
      if (razlozhit.obrezano) console.warn('отчёт: страниц с обрезанным текстом —', razlozhit.obrezano);
      pages.forEach((p, i) => { const g = p.querySelector('.jo-pg'); if (g) g.textContent = '— ' + (i + 1) + ' —'; });
      await Promise.all(Array.from(host.querySelectorAll('img')).map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), k = pw / W;
      const tekstSlojOk = await podklyuchitShrift(doc);
      doc.setProperties({ title: 'Разбор сценария · JASA', subject: 'Создано с помощью ИИ · JASA · jasa.asia · ' + data(), author: 'JASA · jasa.asia', creator: 'JASA · jasa.asia', keywords: 'JASA, разбор сценария, jasa.asia' });
      for (let i = 0; i < pages.length; i++) {
        shag('Страница ' + (i + 1) + ' из ' + pages.length + '…');
        const p = pages[i]; const B = p.getBoundingClientRect();
        const cnv = await window.html2canvas(p, { scale: 1.6, backgroundColor: '#ffffff', useCORS: true, logging: false, width: W, height: H, scrollX: 0, scrollY: 0, windowWidth: W });
        if (i) doc.addPage();
        doc.addImage(cnv.toDataURL('image/jpeg', 0.74), 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
        if (tekstSlojOk) nevidimyjTekst(doc, p, k);
        const B2 = p.getBoundingClientRect(); p.querySelectorAll('[data-link]').forEach((el) => { const r = el.getBoundingClientRect(); doc.link((r.left - B2.left) * k, (r.top - B2.top) * k, r.width * k, r.height * k, { url: el.dataset.link }); });
      }
      return doc.output('blob');
    } finally { host.remove(); st.remove(); }
  }

  // Сначала просим сервер напечатать отчёт по образцу (HTML → Chrome, текст векторный, обложка по смыслу сценария).
  // Нет Chrome на этом сервере или сбой — false, и отчёт собирается здесь, в браузере, как раньше.
  async function izServera(j, name, btn, opts) {
    if (btn) btn.innerHTML = '<span class="spin"></span> Печатаю отчёт на сервере…';
    const r = await api('/api/scenariy/otchet', Object.assign({ id: j.id, imya: name }, opts && opts.standart ? { standart: true } : {}));
    if (!r || !r.ok || !r.url) return false;
    const tw = window.Telegram && window.Telegram.WebApp;
    if (TG && tw) {
      if (typeof tw.downloadFile === 'function') tw.downloadFile({ url: abs(r.url), file_name: r.imya || name }, (ok) => { if (!ok) toast('Скачивание отменено'); });
      else { tw.openLink(abs(r.url)); toast('Открываю файл в браузере — ссылка действует 1 час'); }
      return true;
    }
    const resp = await fetch(abs(r.url)); if (!resp.ok) return false;
    const blob = await resp.blob(); if (!blob.size) return false;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = r.imya || name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast('Отчёт скачан: ' + (r.imya || name));
    return true;
  }

  async function skachat(j, btn, opts) {
    if (idet) { toast('Отчёт уже собирается — подождите несколько секунд'); return; } if (!j || !j.done) { toast('Отчёт ещё собирается'); return; }
    idet = true; const o = btn ? btn.innerHTML : ''; if (btn) btn.disabled = true;
    try {
      let serverom = false;
      try { serverom = await izServera(j, imyaFajla(j), btn, opts); } catch (e) { console.warn('отчёт: сервер не напечатал, собираю в браузере', e); }
      if (serverom) { idet = false; if (btn) { btn.disabled = false; btn.innerHTML = o; } return; }
      const blob = await sobrat(j, (s) => { if (btn) btn.innerHTML = '<span class="spin"></span> ' + esc(s); });
      await otdat(blob, imyaFajla(j), j);
      if (razlozhit.obrezano) toast('Отчёт скачан, но на ' + razlozhit.obrezano + ' стр. часть очень длинного текста не поместилась — полный текст есть на экране');
    } catch (e) { console.warn('отчёт:', e); const m = e && e.message ? String(e.message) : ''; toast('Отчёт не собрался: ' + (/[а-яё]/i.test(m) ? m : 'проверьте интернет и попробуйте ещё раз')); }
    idet = false; if (btn) { btn.disabled = false; btn.innerHTML = o; }
  }

  window.JASA_OTCHET = { skachat, sobrat };
})();
