/* JASA · «Кино» → «Улучшить сценарий + питч-пакет» (02.11.2026, концепт KINO-ULUCHSHIT-KONCEPT.md).
   Блок на экране отчёта разбора: цена фиксированная по хронометражу (до 15 / 30 / 100 / 130 мин), шаги:
   «Что меняем» (принятые правки, ответы автора, интенсивность) → «План версии 2» (15 % сразу) → «Версия 2» (85 % сразу; команда помощников в фоне,
   можно уйти — пришлём в Telegram) → вкладки «Версия 2 / Было → стало / Критик». Любую сцену можно вернуть к своей версии бесплатно.
   Подключается после app.js, зависит от window.JASA; стили — свои, с приставкой ul-, в styles.css не лезем. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, arr, $, $$, S, store, API_BASE, TG, spend, voice } = J;
  const abs = (u) => (/^https?:/.test(u) ? u : (API_BASE || location.origin) + u);
  const DEJ = { ostavit: 'оставить', pravit: 'править', slit: 'слить', ubrat: 'убрать', novaya: 'новая', vlita: 'вливается' };
  const INT = { lyogkaya: ['Лёгкая', 'только принятые правки'], srednyaya: ['Средняя', 'правки и соседние места, чтобы всё стыковалось'], glubokaya: ['Глубокая', 'можем менять и соседние сцены, если правка требует — всё увидите в плане'] };
  let poll = null;

  const css = `
.ul-blok{margin-top:14px;padding:16px 18px;border:1px solid var(--line,rgba(127,127,127,.25));border-radius:16px;background:var(--card,transparent)}
.ul-blok h3{margin:0 0 6px;font-size:18px}.ul-cena{font-weight:700;white-space:nowrap}.ul-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}
.ul-steps{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px}.ul-steps span{padding:4px 10px;border-radius:999px;font-size:12px;border:1px solid var(--line,rgba(127,127,127,.3));opacity:.6}
.ul-steps span.on{opacity:1;border-color:var(--accent,#E8420F);color:var(--accent,#E8420F)}.ul-steps span.done{opacity:1}
.ul-pr{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line,rgba(127,127,127,.18))}.ul-pr:first-child{border-top:0}
.ul-pr input[type=checkbox]{width:20px;height:20px;margin-top:2px;accent-color:var(--accent,#E8420F)}.ul-pr .n{font-weight:700;min-width:22px}
.ul-pr textarea{width:100%;min-height:56px;margin-top:6px;font:inherit;font-size:14px;padding:8px 10px;border-radius:10px;border:1px solid var(--line,rgba(127,127,127,.3));background:transparent;color:inherit}
.ul-q{font-size:13px;opacity:.8;margin-top:4px}.ul-seg{display:flex;gap:6px;flex-wrap:wrap}.ul-seg .chip{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15}.ul-seg .chip small{display:block;font-size:11px;opacity:.7;margin-top:2px}
.ul-ag{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:12px}.ul-ag div{padding:10px 12px;border-radius:12px;border:1px solid var(--line,rgba(127,127,127,.25));font-size:13px}
.ul-ag b{display:block;font-size:13px}.ul-ag small{opacity:.7}.ul-ag[data-s] div[data-s="работает"],.ul-ag div[data-s^="работает"]{border-color:var(--accent,#E8420F)}.ul-ag div[data-s="готово"]{opacity:.9}.ul-ag div[data-s="ожидает"]{opacity:.5}
.ul-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}.ul-tbl td,.ul-tbl th{padding:6px 8px;border-bottom:1px solid var(--line,rgba(127,127,127,.18));text-align:left;vertical-align:top}
.ul-tbl .d{white-space:nowrap}.ul-tbl .d.pravit,.ul-tbl .d.slit,.ul-tbl .d.novaya{color:var(--accent,#E8420F);font-weight:600}.ul-tbl .d.ubrat{text-decoration:line-through}
.ul-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 10px}.ul-pre{white-space:pre-wrap;font-family:var(--mono,ui-monospace,monospace);font-size:13px;line-height:1.5;max-height:60vh;overflow:auto;padding:14px;border-radius:12px;border:1px solid var(--line,rgba(127,127,127,.25))}
.ul-bs{padding:12px 0;border-top:1px solid var(--line,rgba(127,127,127,.18))}.ul-bs .cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}@media(max-width:700px){.ul-bs .cols{grid-template-columns:1fr}}
.ul-bs pre{white-space:pre-wrap;font-family:var(--mono,ui-monospace,monospace);font-size:12px;line-height:1.45;max-height:260px;overflow:auto;padding:10px;border-radius:10px;border:1px solid var(--line,rgba(127,127,127,.2));margin:0}
.ul-bs .lab{font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.6;margin-bottom:4px}.ul-bs ul{margin:8px 0 0;padding-left:18px;font-size:13px}
.ul-kr{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px}.ul-kr div{padding:8px 10px;border-radius:10px;border:1px solid var(--line,rgba(127,127,127,.25));font-size:13px}.ul-kr b{font-size:16px;display:block}
.ul-warn{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--accent,#E8420F);font-size:13px}
.ul-dim{opacity:.7;font-size:13px}
.ul-opt{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;padding:10px 12px;border-radius:12px;border:1px solid var(--line,rgba(127,127,127,.25));cursor:pointer}.ul-opt input{accent-color:var(--accent,#E8420F)}.ul-opt small{opacity:.7}.ul-opt .ul-seg{flex-basis:100%}
.ul-opt:has(input:checked){border-color:var(--accent,#E8420F)}
.ul-diff,.ul-proza{white-space:pre-wrap;line-height:1.55;font-size:15px;margin-top:8px;padding:12px 14px;border-radius:12px;border:1px solid var(--line,rgba(127,127,127,.2));max-height:420px;overflow:auto}
.ul-diff:not(.proza){font-family:var(--mono,ui-monospace,monospace);font-size:13px}
.ul-del{text-decoration:line-through;background:rgba(255,110,90,.16);color:inherit;opacity:.75}.ul-ins{text-decoration:none;background:rgba(59,203,154,.22);color:inherit;border-radius:3px}
.ul-bs pre.proza{font-family:inherit;font-size:14px;line-height:1.5}
.ul-menu[open] summary{opacity:.8}.ul-menu{position:relative}`;
  if (!document.getElementById('ul-css')) { const s = document.createElement('style'); s.id = 'ul-css'; s.textContent = css; document.head.appendChild(s); }

  const kr = (n) => Math.round(+n || 0) + ' кр';
  const zenTxt = (konflikt) => { const j = S.job || {}; const m = String(konflikt || '').match(/Z(\d+)/); const z = m && arr(j.zenica)[+m[1] - 1]; if (!z) return ''; const s = String(z).replace(/^Z\d+:\s*/, ''); return ': «' + esc(s.length > 160 ? s.slice(0, 160) + '…' : s) + '»'; };
  const minTxt = (m) => (m ? Math.round(m) + ' мин' : '');
  const stop = () => { if (poll) { clearInterval(poll); poll = null; } };
  const panel = () => $('#uluch-akcii') || $('#sc');   // мастерская живёт внутри отчёта «Кино», а не на отдельном экране
  const pokazat = (html) => { const p = panel(); p.innerHTML = html; const r = p.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * 0.6) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); return p; };
  const CH = { premisa: 'премиса', syuzhet: 'сюжет', geroi: 'герои', dialog: 'диалог', mir: 'мир' };
  const bTxt = (b) => (b && b.tekst != null ? (+b.tekst).toFixed(1).replace('.', ',') : '—');
  const sost = (z) => z && z.sostoyanie;
  const idet = (z) => ['plan_zhdet', 'plan_idet', 'pishem_zhdet', 'pishem'].includes(sost(z));

  // ---------- мастерская на экране отчёта ----------
  async function knopka(job, box) {
    box = box || panel(); if (!box) return;
    stop();
    // гостю сервер ответит «после входа через Telegram» — показываем его слова (владелец на стенде тоже гость по IP)
    let oc; try { oc = await api('/api/scenariy/uluchshit/ocenka', { razbor: job.id }); } catch (e) { box.innerHTML = `<div class="ul-blok"><h3>Мастерская сценария</h3><p class="ul-dim">${esc(e.message)}${S.me && S.me.guest ? ' — версии хранятся за вами, уведомление придёт туда' : ''}</p></div>`; return; }
    const zz = arr(oc.zadaniya);
    const z = zz[0];
    const pk = oc.paket;
    const cena = pk ? pk.cena : 0;
    const gotovye = arr(oc.cepochka).filter((v) => v.sostoyanie === 'gotovo');
    let html = '';
    if (!oc.dostup) html = `<div class="ul-blok"><h3>Мастерская сценария</h3><p class="ul-dim">Команда перепишет сценарий по правкам разбора, оценит заново и будет дорабатывать кругами. Сейчас открыто по приглашениям — напишите нам в Telegram, и мы включим доступ.</p></div>`;
    else if (!oc.tekst_est) html = `<div class="ul-blok"><h3>Мастерская сценария</h3><p class="ul-dim">Этот разбор сделан до того, как мы начали хранить текст. Вставьте сценарий ещё раз — тот же, что разбирали.</p><div class="ul-row"><button class="btn sm accent" id="ul-tekst">Вставить сценарий</button></div></div>`;
    else if (oc.razmetka) html = `<div class="ul-blok"><h3>Мастерская сценария</h3><p class="ul-dim">${esc(oc.razmetka)}</p></div>`;
    else if (!pk) html = `<div class="ul-blok"><h3>Мастерская сценария</h3><p class="ul-dim">${esc(oc.dlinno || '')}</p></div>`;
    else if (z && (idet(z) || sost(z) === 'plan_gotov' || sost(z) === 'zadanie' || (sost(z) === 'oshibka' && z.plan))) {
      const t = { zadanie: 'цель выбрана — покажем план', plan_zhdet: 'план в очереди', plan_idet: 'Редактор-постановщик пишет план…', plan_gotov: 'план готов — посмотрите и запустите переписывание', pishem_zhdet: 'версия в очереди', pishem: 'команда пишет версию ' + (z.uroven || 2) + '…', oshibka: 'не получилось, кредиты возвращены — можно повторить' }[sost(z)];
      html = `<div class="ul-blok"><h3>Мастерская сценария</h3>${lenta(oc, false)}<p class="ul-dim">Версия ${esc(z.uroven || 2)}: ${esc(t)}</p><div class="ul-row"><button class="btn sm accent" id="ul-open">Открыть</button></div></div>`;
    } else if (gotovye.length > 1 && innerWidth < 700 && !box.dataset.razvernut) {
      // телефон: сначала карточка-приглашение, полная мастерская — по нажатию (человек ещё не видел, за что ему 6,5)
      const Bp = gotovye[gotovye.length - 1].ball || {}; const ch = Bp.chasti || {};
      const slab = Object.entries(ch).filter(([k2, v]) => v != null && CH[k2]).sort((x, y) => x[1] - y[1])[0];
      html = `<div class="ul-blok"><h3 style="margin:0 0 4px">Поднять балл до ${celBall(Bp)}</h3><p class="ul-dim" style="margin:0">Сейчас ${bTxt(Bp)} · версия ${esc(gotovye[gotovye.length - 1].uroven)}${slab ? ` · слабее всего ${esc(CH[slab[0]])} ${esc(String(slab[1]).replace('.', ','))}` : ''}</p><div class="ul-row"><button type="button" class="btn accent" id="ul-razv">Улучшить</button><button type="button" class="btn sm quiet" data-ver="${esc(gotovye[gotovye.length - 1].id)}">Открыть версию ${esc(gotovye[gotovye.length - 1].uroven)}</button></div></div>`;
    } else if (gotovye.length > 1) {
      const Bp = gotovye[gotovye.length - 1].ball || {};
      html = `<div class="ul-blok"><h3>Довести сценарий до ${celBall(Bp)}</h3><p class="ul-dim" style="margin:2px 0 0">Команда перепишет сцены по вашей цели и заново оценит. Решаете вы — любую сцену можно вернуть.</p>${lenta(oc, true)}${dalshe(oc, gotovye)}</div>`;
    } else {
      html = `<div class="ul-blok"><h3>Улучшить сценарий <span class="ul-cena">· ${kr(cena)}</span></h3>
        <p class="ul-dim">Команда выполнит правки разбора и соберёт версию 2 — ${oc.rezhim_teksta === 'bloki' ? 'текст без разметки сцен правим по блокам-абзацам, ' : ''}не трогая то, что вы отметили как главное. Потом оценим версию 2 тем же способом, что и разбор: вы увидите, вырос ли балл ${bTxt((arr(oc.cepochka)[0] || {}).ball)}. Дальше можно дорабатывать кругами. Обычно 20–60 минут, можно уйти — пришлём в Telegram.</p>
        <p class="ul-dim">Сначала — план: ${kr(pk.plan_kr)} из ${kr(cena)}. Не подошёл — остальные ${kr(cena - pk.plan_kr)} не спишем.</p>
        <div class="ul-row"><button class="btn sm accent" id="ul-go">Выбрать правки и получить план · ${kr(pk.plan_kr)}</button>${z && sost(z) === 'oshibka' ? '<span class="ul-dim">прошлая попытка не удалась, кредиты возвращены</span>' : ''}</div></div>`;
    }
    box.innerHTML = html;
    const go = $('#ul-go', box); if (go) go.addEventListener('click', () => ekranZadanie(job, oc));
    const op = $('#ul-open', box); if (op) op.addEventListener('click', () => ekranStatus(job, z.id));
    const tk = $('#ul-tekst', box); if (tk) tk.addEventListener('click', () => ekranTekst(job));
    $$('[data-ver]', box).forEach((b) => b.addEventListener('click', () => ekranStatus(job, b.dataset.ver)));
    const kf = $('#ul-krug', box); if (kf) krugForma(job, oc, gotovye, kf);
    const rv = $('#ul-razv', box); if (rv) rv.addEventListener('click', () => { box.dataset.razvernut = '1'; knopka(job, box); });
  }

  // сдвиг балла: меньше 0,5 — «≈ так же» (одна оценка шумит на ±0,5), больше — зелёным/тёплым
  const sdvig = (d) => (d == null ? '' : Math.abs(d) < 0.5 ? '<small style="opacity:.6">≈ так же</small>' : `<small style="color:${d > 0 ? 'var(--ok,#3bcb9a)' : '#ff8a6a'}">${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1).replace('.', ',')}</small>`);
  const celBall = (b) => Math.min(10, Math.floor(((b && b.tekst) || 6) + 1.5));

  // лента версий: В1 6,5 — В2 6,5 ≈ так же — В3 ?; клик по версии открывает её
  function lenta(oc, sled) {
    const v = arr(oc.cepochka).filter((x) => x.uroven === 1 || x.sostoyanie === 'gotovo');
    if (v.length < 2) return '';
    return `<div class="ul-row" style="margin:8px 0 12px;gap:6px">${v.map((x, i) => {
      const pr = i ? v[i - 1] : null; const d = pr && x.ball && pr.ball && x.ball.tekst != null && pr.ball.tekst != null ? x.ball.tekst - pr.ball.tekst : null;
      return `${i ? '<span class="ul-dim">—</span>' : ''}<button type="button" class="chip ${i === v.length - 1 ? 'on' : ''}" ${x.id ? `data-ver="${esc(x.id)}"` : 'disabled'} title="${esc(x.cel ? 'Цель: ' + x.cel.imya + (x.cel.slova ? ' · ' + x.cel.slova : '') : x.uroven === 1 ? 'Ваш текст' : 'По правкам разбора')}">В${esc(x.uroven)} · <b>${bTxt(x.ball)}</b> ${sdvig(d)}</button>`; }).join('')}${sled ? `<span class="ul-dim">—</span><span class="chip" style="border-style:dashed;opacity:.75">В${esc(v[v.length - 1].uroven + 1)} · ?</span>` : ''}</div>`;
  }

  // форма следующей версии: цель (всё / одна часть / под рынок) + свои слова + деньги одной фразой
  function dalshe(oc, gotovye) {
    const posl = gotovye[gotovye.length - 1];
    const B = posl.ball || {};
    const krugCena = Math.round(((oc.paket || {}).cena || 0) * (oc.krug_dolya || 0.5)); const planKr = Math.round(krugCena * 0.15);
    const prir = gotovye.slice(1).map((x, i) => (x.ball && gotovye[i].ball && x.ball.tekst != null && gotovye[i].ball.tekst != null ? x.ball.tekst - gotovye[i].ball.tekst : null)).filter((x) => x != null);
    const stop2 = prir.length >= 2 && prir.slice(-2).every((d) => d < 0.3);
    const ch = B.chasti || {};
    const slab = Object.entries(ch).filter(([k, v]) => v != null && CH[k]).sort((a, b) => a[1] - b[1])[0];
    const cel = celBall(B); const ost = B.tekst != null ? Math.max(0, cel - B.tekst) : null;
    const RY = [['kz', 'Казахстан'], ['eu', 'Фестивали'], ['stream', 'Стриминги'], ['asia', 'Азия']];
    const ryn = B.rynki || {};
    const HINT = ['смешнее', 'короче', 'больше Казахстана', 'не трогать финал'];
    return `${stop2 ? '<div class="ul-warn"><b>Два последних шага почти не сдвинули балл.</b> Дальше лучше точечно: напишите команде, что именно изменить, или покажите текст живому редактору.</div>' : ''}
      <div id="ul-krug">
        <span class="caps">Что улучшаем в версии ${esc(posl.uroven + 1)}</span>
        <div class="ul-vyb" style="display:grid;gap:8px;margin:8px 0 12px">
          <label class="ul-opt"><input type="radio" name="ul-tip" value="vse"> <span><b>Всё сразу</b><small> — по главным замечаниям критика</small></span></label>
          <label class="ul-opt"><input type="radio" name="ul-tip" value="chast" checked> <span><b>Одну часть</b><small> — поднять самое слабое</small></span>
            <span class="ul-seg" data-dlya="chast" style="margin-top:8px">${Object.keys(CH).filter((k) => ch[k] != null).map((k) => `<button type="button" class="chip ${slab && k === slab[0] ? 'on' : ''}" data-cel="${k}">${CH[k]} <small>${esc(String(ch[k]).replace('.', ','))}${slab && k === slab[0] ? ' · слабее всего' : ''}</small></button>`).join('')}</span></label>
          <label class="ul-opt"><input type="radio" name="ul-tip" value="rynok"> <span><b>Под рынок</b><small> — под зрителя и фонды</small></span>
            <span class="ul-seg" data-dlya="rynok" style="margin-top:8px">${RY.map(([k, n], i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-cel="${k}">${n}${ryn[k] != null ? ` <small>${esc(ryn[k])}/10</small>` : ''}</button>`).join('')}</span></label>
        </div>
        <label class="ul-dim" for="ul-slova" style="display:block;margin:0 0 6px">Что ещё изменить или не трогать — необязательно</label>
        <div style="position:relative"><textarea id="ul-slova" placeholder="Например: сделай ROAR смешнее, птицу верни" style="width:100%;min-height:64px;font:inherit;font-size:15px;padding:10px 44px 10px 12px;border-radius:12px;border:1px solid var(--line,rgba(127,127,127,.3));background:transparent;color:inherit"></textarea><button type="button" class="ul-mic-in" id="ul-slova-mic" title="Надиктовать · 1 кр" aria-label="Надиктовать · 1 кр" style="position:absolute;right:8px;top:8px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(127,127,127,.18);color:inherit;cursor:pointer"><svg class="ic" style="width:16px;height:16px"><use href="#i-mic"/></svg></button></div>
        <div class="ul-row" style="margin:6px 0 4px;gap:6px">${HINT.map((h) => `<button type="button" class="chip" data-hint="${esc(h)}" style="font-size:12px">+ ${esc(h)}</button>`).join('')}</div>
        <div class="ul-row" style="margin-top:12px"><button type="button" class="btn accent" id="ul-krug-go">Показать план · ${kr(planKr)}</button></div>
        <p class="ul-dim" style="margin-top:6px">Версия ${esc(posl.uroven + 1)} целиком — ${kr(krugCena)}. Сначала увидите план по сценам; не понравится — остальные ${kr(krugCena - planKr)} не спишем.${ost != null && ost > 0 ? ` До ${cel} осталось ${ost.toFixed(1).replace('.', ',')}.` : ''}</p>
      </div>`;
  }

  function krugForma(job, oc, gotovye, box) {
    const posl = gotovye[gotovye.length - 1];
    const tip = () => (($('input[name="ul-tip"]:checked', box) || {}).value || 'chast');
    const pokazSeg = () => $$('.ul-seg[data-dlya]', box).forEach((s) => { s.style.display = s.dataset.dlya === tip() ? 'flex' : 'none'; });
    pokazSeg();
    $$('input[name="ul-tip"]', box).forEach((r) => r.addEventListener('change', pokazSeg));
    $$('.ul-seg[data-dlya]', box).forEach((s) => s.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; e.preventDefault(); $$('.chip', s).forEach((c) => c.classList.toggle('on', c === b)); }));
    $$('[data-hint]', box).forEach((h) => h.addEventListener('click', () => { const ta = $('#ul-slova', box); ta.value = (ta.value.trim() ? ta.value.trim().replace(/[.,;]?$/, ', ') : '') + h.dataset.hint; ta.focus(); }));
    voice($('#ul-slova-mic', box), (t2) => { const ta = $('#ul-slova', box); ta.value = (ta.value ? ta.value + ' ' : '') + t2; });
    $('#ul-krug-go', box).addEventListener('click', async (e) => {
      const tp = tip(); const seg = $(`.ul-seg[data-dlya="${tp}"] .chip.on`, box);
      const cel = tp === 'vse' ? 'vse' : (seg ? seg.dataset.cel : 'vse');
      const slova = $('#ul-slova', box).value.trim();
      const krugCena = Math.round(((oc.paket || {}).cena || 0) * (oc.krug_dolya || 0.5)); const planKr = Math.round(krugCena * 0.15);
      const ostanetsya = Math.floor((+S.credits || 0) - planKr);
      if (!(await J.confirm(`Спишем ${kr(planKr)} за план версии ${posl.uroven + 1}, останется ${ostanetsya} кр. Команда возьмёт версию ${posl.uroven}${slova ? ' и ваши слова' : ''} и покажет, что меняет по сценам. Переписывать или нет — решите после.`))) return;
      e.target.disabled = true;
      try {
        const r = await api('/api/scenariy/uluchshit/krug', { id: posl.id, cel, tekst: slova });
        const p2 = await api('/api/scenariy/uluchshit/plan', { id: r.zadanie.id });
        if (p2.ostatok != null) spend(0, p2.ostatok);
        ekranStatus(job, r.zadanie.id);
      } catch (er) { toast(er.message); e.target.disabled = false; }
    });
  }

  function shapka(job, shag, z) {
    const v = (z && z.uroven) || 2;
    if (shag === 3) return `<div class="ul-row" style="margin:0 0 10px"><button type="button" class="btn sm quiet" id="ul-back">← к мастерской</button></div>`;
    const st = ['Что меняем', 'План версии ' + v, 'Версия ' + v, 'Готово'];
    return `<div class="ul-row" style="margin:0 0 12px;justify-content:space-between"><div class="ul-steps" style="margin:0">${st.map((s, i) => `<span class="${i < shag ? 'done' : i === shag ? 'on' : ''}">${s}</span>`).join('')}</div><button type="button" class="btn sm quiet" id="ul-back">Свернуть</button></div>`;
  }
  let curJob = null;
  const back = () => { stop(); knopka(curJob || S.job, panel()); };

  // ---------- старый разбор: вставить текст ----------
  function ekranTekst(job) {
    stop(); curJob = job;
    pokazat(shapka(job, 0) + `<div class="ul-blok"><h3 style="margin:0 0 8px">Вставьте тот же сценарий</h3><p class="ul-dim">Сверим объём с картой сцен разбора: если это другой текст, не примем.</p>
      <textarea id="ul-ta" style="min-height:240px;font-family:var(--mono);font-size:13px;margin-top:10px"></textarea>
      <div class="ul-row"><input type="file" id="ul-file" accept=".txt,.fountain,.md" class="hide"><button class="btn sm quiet" id="ul-pick">Выбрать файл</button><button class="btn sm accent" id="ul-save">Сохранить и продолжить</button></div></div>`);
    $('#ul-back').addEventListener('click', back);
    $('#ul-pick').addEventListener('click', () => $('#ul-file').click());
    $('#ul-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) f.text().then((t) => { $('#ul-ta').value = t; }); });
    $('#ul-save').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await api('/api/scenariy/uluchshit/tekst', { razbor: job.id, text: $('#ul-ta').value }); toast('Текст сохранён'); const oc = await api('/api/scenariy/uluchshit/ocenka', { razbor: job.id }); ekranZadanie(job, oc); }
      catch (er) { toast(er.message); e.target.disabled = false; }
    });
  }

  // ---------- шаг 0: что меняем ----------
  function ekranZadanie(job, oc) {
    stop(); curJob = job;
    const pk = oc.paket;
    const vopr = arr(oc.voprosy);
    const voprosDlya = (n) => vopr.find((q) => new RegExp('(^|\\D)' + n + '(\\D|$)').test(q.split(':')[0]) || q.indexOf('Правка ' + n) >= 0) || '';
    const prin = (n) => S.accepted[job.id + ':' + n] === 1;
    pokazat(shapka(job, 0) + `
      <div class="ul-blok"><span class="caps">Что меняем</span><h3 style="margin:6px 0 4px">Принятые правки</h3><p class="ul-dim">Отметьте, что команда должна внести. Если правка задевает главное в сценарии, мы спросим вас — без ответа её не внесём.</p>
        <div id="ul-pravki" style="margin-top:8px">${arr(oc.pravki).map((p) => { const z = p.konflikt && p.konflikt !== 'нет' && p.konflikt !== 'не проверено'; const q = z ? voprosDlya(p.n) : ''; return `<div class="ul-pr"><input type="checkbox" data-n="${esc(p.n)}" ${prin(p.n) ? 'checked' : ''}><span class="n">${esc(p.n)}</span><div style="flex:1"><div>${esc(p.chto)}${p.vazhnost ? ` <span class="pill">${esc(p.vazhnost)}</span>` : ''}</div>${z ? `<div class="ul-q">Задевает главное${zenTxt(p.konflikt)}. ${esc(q || 'Решаете вы — напишите, как поступить.')}</div><textarea data-otvet="${esc(p.n)}" placeholder="Ваш ответ — можно надиктовать"></textarea><button type="button" class="btn sm quiet ul-mic" data-for="${esc(p.n)}" style="margin-top:6px"><svg class="ic"><use href="#i-mic"/></svg>Надиктовать · 1 кр</button>` : ''}</div></div>`; }).join('')}</div>
        <span class="caps" style="display:block;margin-top:18px">Насколько глубоко править</span>
        <div class="ul-seg" id="ul-int" style="margin-top:8px">${Object.entries(INT).map(([k, v]) => `<button type="button" class="chip ${k === 'srednyaya' ? 'on' : ''}" data-int="${k}">${v[0]}<small>${v[1]}</small></button>`).join('')}</div>
        <label class="chk" style="display:flex;gap:10px;align-items:flex-start;margin-top:18px"><input type="checkbox" id="ul-pitch" style="margin-top:3px;flex:none"> <span>Питч-пакет · +${kr(oc.spravka.pitch_kr)}: логлайн, синопсис короткий и на страницу, презентация для фонда или продюсера с постером и кадрами <span class="ul-dim">(+${kr(oc.spravka.pitch_kr)} спишем, только если запустите переписывание)</span></span></label>
        <div class="ul-row" style="margin-top:18px"><button class="btn accent" id="ul-plan">Составить план версии 2 · ${kr(pk.plan_kr)}</button><span class="ul-dim">Всего ${kr(pk.cena)}: сейчас ${kr(pk.plan_kr)}, остальные ${kr(pk.cena - pk.plan_kr)} — только если после плана нажмёте «Переписать».</span></div>
        <p class="ul-dim" style="margin-top:12px">${esc(oc.spravka.pravo)}</p></div>`);
    $('#ul-back').addEventListener('click', back);
    $('#ul-int').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('#ul-int .chip').forEach((c) => c.classList.toggle('on', c === b)); });
    $$('.ul-mic').forEach((b) => voice(b, (t) => { const ta = $(`textarea[data-otvet="${b.dataset.for}"]`); if (ta) ta.value = (ta.value ? ta.value + ' ' : '') + t; }));
    $('#ul-plan').addEventListener('click', async (e) => {
      const prinyato = {}; const otvety = {};
      $$('#ul-pravki input[type=checkbox]').forEach((c) => { prinyato[c.dataset.n] = c.checked ? 1 : 0; });
      $$('#ul-pravki textarea').forEach((t) => { if (t.value.trim()) otvety[t.dataset.otvet] = t.value.trim(); });
      if (!Object.values(prinyato).some((v) => v)) { toast('Отметьте хотя бы одну правку'); return; }
      const ok = await J.confirm(`Составить план за ${kr(pk.plan_kr)}? Разберём принятые правки по сценам и покажем, что меняем. Переписывать или нет — решите после.`);
      if (!ok) return;
      e.target.disabled = true;
      const intens = ($('#ul-int .chip.on') || {}).dataset ? $('#ul-int .chip.on').dataset.int : 'srednyaya';
      try {
        const r = await api('/api/scenariy/uluchshit/zadanie', { razbor: job.id, prinyato, otvety, intensivnost: intens, pitch: $('#ul-pitch').checked });
        if (arr(r.otbrosheno).length) toast('Не пойдут в работу: ' + r.otbrosheno.map((x) => 'правка ' + x.n).join(', ') + ' — нет ответа');
        const p = await api('/api/scenariy/uluchshit/plan', { id: r.zadanie.id });
        if (p.ostatok != null) spend(0, p.ostatok);
        ekranStatus(job, r.zadanie.id);
      } catch (er) { toast(er.message); e.target.disabled = false; }
    });
  }

  // ---------- статус, план, результат ----------
  async function ekranStatus(job, jid) {
    stop(); curJob = job;
    let z; try { z = (await api('/api/scenariy/uluchshit/' + jid)).zadanie; } catch (e) { toast(e.message); return; }
    risovat(job, z);
    if (idet(z)) poll = setInterval(async () => { if (!$('#ul-root')) { stop(); return; } try { const r = await api('/api/scenariy/uluchshit/' + jid); const nz = r.zadanie; if (nz.sostoyanie !== z.sostoyanie || nz.kuskov_gotovo !== z.kuskov_gotovo || JSON.stringify(nz.agents) !== JSON.stringify(z.agents)) { z = nz; risovat(job, z); } if (!idet(z)) stop(); } catch (e) { /* сеть моргнула — следующий тик */ } }, 3000);
  }

  function agenty(z) {
    return `<div class="ul-ag">${Object.entries(z.agents || {}).map(([k, a]) => `<div data-s="${esc(a.state)}"><b>${esc(a.name)}</b><small>${esc(a.state)}${a.sec ? ' · ' + a.sec + ' с' : ''}</small></div>`).join('')}</div>`;
  }

  function risovat(job, z) {
    const st = sost(z); const pk = z.paket || {};
    const shag = ['zadanie'].includes(st) ? 0 : ['plan_zhdet', 'plan_idet', 'plan_gotov'].includes(st) ? 1 : ['pishem_zhdet', 'pishem'].includes(st) ? 2 : st === 'gotovo' ? 3 : 1;
    let body = '';
    if (st === 'oshibka') {
      const e = z.errors || {};
      body = `<div class="ul-warn"><b>Не получилось.</b> ${esc(Object.values(e).join(' · '))}<br><span class="ul-dim">Кредиты за этот шаг возвращены.</span></div><div class="ul-row"><button class="btn sm accent" id="ul-retry">Попробовать ещё раз</button></div>`;
    } else if (st === 'plan_zhdet' || st === 'plan_idet') {
      body = `<p class="ul-dim">Редактор-постановщик читает сценарий, принятые правки и ваши ответы — раскладывает работу по сценам. Обычно 3–8 минут; можно уйти, пришлём в Telegram.</p>${agenty(z)}`;
    } else if (st === 'plan_gotov') {
      const pl = z.plan || {}; const karta = Object.fromEntries(arr(z.karta).map((k) => [k.id, k]));
      const ostatok = pk.cena - pk.plan_kr + (z.pitch ? (z.spravka_pitch || 400) : 0);
      body = `<p>${esc(pl.itog || '')}</p>
        ${arr(pl.konflikty).length ? `<div class="ul-warn"><b>Правки спорят между собой:</b> ${arr(pl.konflikty).map(esc).join(' · ')}</div>` : ''}
        ${arr(pl.ne_sdelano).length ? `<div class="ul-warn"><b>Не будем делать и почему:</b> ${arr(pl.ne_sdelano).map(esc).join(' · ')}</div>` : ''}
        <table class="ul-tbl"><thead><tr><th>${z.rezhim_teksta === 'bloki' ? 'Блок' : 'Сцена'}</th><th>Действие</th><th>Что меняем</th><th title="Снять сцену с правки — останется ваш текст">Не трогать</th></tr></thead><tbody>
        ${arr(pl.sceny).map((s) => `<tr><td><b>${esc(s.id)}</b><br><span class="ul-dim">${esc((karta[s.id] || {}).zagolovok || '')}</span></td><td class="d ${esc(s.dejstvie)}">${esc(DEJ[s.dejstvie] || s.dejstvie)}${s.v && s.v.length ? ' ← ' + esc(s.v.join(', ')) : ''}</td><td>${esc(s.chto || '')}${arr(s.pravki).length ? `<br><span class="ul-dim">правки ${esc(s.pravki.join(', '))}${arr(s.P).length ? ' · ' + esc(s.P.join(', ')) : ''}</span>` : ''}</td><td>${['pravit', 'slit', 'ubrat'].includes(s.dejstvie) ? `<input type="checkbox" class="ul-nt" data-id="${esc(s.id)}">` : ''}</td></tr>`).join('')}
        ${arr(pl.novye).map((n) => `<tr><td><b>${esc(n.id)}</b><br><span class="ul-dim">${esc(n.zagolovok || '')}</span></td><td class="d novaya">новая · после ${esc(n.posle)}</td><td>${esc(n.chto || '')}</td><td><input type="checkbox" class="ul-nt" data-id="${esc(n.id)}"></td></tr>`).join('')}</tbody></table>
        <div class="ul-row" style="margin-top:16px"><button class="btn accent" id="ul-pravit">Переписать по плану · ${kr(ostatok)}</button><label class="chk" style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" id="ul-pitch2" ${z.pitch ? 'checked' : ''}> питч-пакет +400 кр</label></div>
        <p class="ul-dim" style="margin-top:8px">Итого за пакет ${kr(pk.cena)} (${kr(pk.plan_kr)} уже списано)${z.pitch ? ' + 400 кр питч' : ''}. Переписываем по частям, сводим стыки, проверяем, что главное не тронуто, и независимый читатель сравнивает обе версии, не зная, какая чья. Обычно 20–60 минут — можно уйти, пришлём в Telegram. Если план не подошёл — на этом можно остановиться: списано только ${kr(pk.plan_kr)}.</p>`;
    } else if (st === 'pishem_zhdet' || st === 'pishem') {
      body = `<p class="ul-dim">${st === 'pishem_zhdet' ? (z.ochered ? `В очереди: перед вами ${z.ochered}. ` : 'Запускаем. ') : ''}Команда пишет версию 2: готово частей ${z.kuskov_gotovo || 0} из ${z.kuskov || '?'}. Можно уйти — пришлём в Telegram.</p>${agenty(z)}<p class="ul-dim" style="margin-top:8px">обновлено только что · экран обновляется сам</p>`;
    } else if (st === 'gotovo') {
      body = `<div id="ul-res"></div>`;
    }
    const zag = z.cel ? `Версия ${esc(z.uroven)} · цель: ${esc(z.cel.imya)}${z.cel.slova ? ' · «' + esc(z.cel.slova.slice(0, 80)) + (z.cel.slova.length > 80 ? '…' : '') + '»' : ''} · ${kr(pk.cena)}` : `Версия ${esc(z.uroven || 2)} по правкам разбора · пакет «до ${esc(pk.do)} мин» · ${kr(pk.cena)}${z.pitch ? ' + питч' : ''}`;
    pokazat(shapka(job, shag, z) + `<div class="ul-blok" id="ul-root"><span class="caps">${zag}</span>${body}</div>`);
    $('#ul-back').addEventListener('click', back);
    const rt = $('#ul-retry'); if (rt) rt.addEventListener('click', async () => { rt.disabled = true; try { const op = z.plan ? 'pravit' : 'plan'; const r = await api('/api/scenariy/uluchshit/' + op, { id: z.id }); if (r.ostatok != null) spend(0, r.ostatok); ekranStatus(job, z.id); } catch (e) { toast(e.message); rt.disabled = false; } });
    const p2 = $('#ul-pitch2'); if (p2) p2.addEventListener('change', () => { $('#ul-pravit').textContent = `Переписать по плану · ${kr(pk.cena - pk.plan_kr + (p2.checked ? 400 : 0))}`; });
    const pv = $('#ul-pravit'); if (pv) pv.addEventListener('click', async () => {
      const pitch = $('#ul-pitch2').checked; const summa = pk.cena - pk.plan_kr + (pitch ? 400 : 0);
      const ok = await J.confirm(`Переписать сценарий по плану за ${kr(summa)}? Это остаток пакета${pitch ? ' и питч-пакет' : ''}; работа займёт до часа, результат придёт в Telegram.`);
      if (!ok) return;
      pv.disabled = true;
      try { const r = await api('/api/scenariy/uluchshit/pravit', { id: z.id, pitch, ne_trogat: $$('.ul-nt:checked').map((c) => c.dataset.id) }); if (r.ostatok != null) spend(0, r.ostatok); ekranStatus(job, z.id); }
      catch (e) { toast(e.message); pv.disabled = false; }
    });
    if (st === 'gotovo') rezultat(job, z);
  }

  // ---------- результат: вкладки ----------
  async function rezultat(job, z) {
    let T; try { T = await api('/api/scenariy/uluchshit/' + z.id + '/tekst'); } catch (e) { $('#ul-res').innerHTML = `<p class="ul-dim">${esc(e.message)}</p>`; return; }
    const kr2 = z.kritik || {}; const stat = T.stat || {};
    const uv = z.uroven || 2;
    const verdikt = kr2.luchshe === 'v2' ? [`Версия ${uv} сильнее`, 'так решил читатель, который не знал, где какая версия'] : kr2.luchshe === 'ravny' ? ['Версии на равных', 'возьмите лучшие сцены из каждой — любую можно вернуть во вкладке «Было → стало»'] : kr2.luchshe === 'v1' ? [`Прежняя версия пока сильнее`, z.vozvrat_huzhe ? 'вернули ' + kr(z.vozvrat_huzhe) + ' на баланс; ниже — почему и что делать' : 'ниже — почему и что делать'] : ['Версия готова', ''];
    const B = z.ball || {}; const B0 = z.ball_bylo || {};
    const d = B.tekst != null && B0.tekst != null ? B.tekst - B0.tekst : null;
    const chastiHtml = Object.keys(CH).filter((c) => (B.chasti || {})[c] != null).map((c) => {
      const a = (B0.chasti || {})[c], b = B.chasti[c]; const dd = a != null ? b - a : null;
      const minus = dd != null && dd <= -0.5; const pochemu = minus ? ((B.pochemu || {})[c] || '') : '';
      return `<span class="pill" ${pochemu ? `title="${esc('Почему: ' + pochemu)}" style="cursor:help"` : ''}>${CH[c]} ${esc(String(a ?? '—').replace('.', ','))} → <b>${esc(String(b).replace('.', ','))}</b> ${dd == null ? '' : Math.abs(dd) < 0.5 ? '' : dd > 0 ? '↑' : '↓'}</span>`; }).join('');
    const minusy = Object.keys(CH).filter((c) => (B.chasti || {})[c] != null && (B0.chasti || {})[c] != null && B.chasti[c] - B0.chasti[c] <= -0.5 && (B.pochemu || {})[c]);
    const izm = [stat.izmeneno ? `изменено ${stat.izmeneno}` : '', stat.slito ? `слито ${stat.slito}` : '', stat.ubrano ? `убрано ${stat.ubrano}` : '', stat.novyh ? `новых ${stat.novyh}` : ''].filter(Boolean).join(', ');
    const glavnoe = B.glavnoe || kr2.slovo || '';
    const krugCena = Math.round(((z.paket || {}).cena || 0) * (z.roditel ? 1 : 0.5)); const planKr = Math.round(krugCena * 0.15);
    const tabs = [['bs', `Было → стало · ${arr(T.bylo_stalo).length}`], ['v2', 'Текст версии ' + uv], ['kr', 'Критик и проверки'], ['pt', 'Питч-пакет']];
    $('#ul-res').innerHTML = `<div style="margin:6px 0 2px"><div style="font:600 1.35rem/1.25 var(--disp,inherit)">${esc(verdikt[0])}</div>${verdikt[1] ? `<div class="ul-dim" style="margin-top:2px">${esc(verdikt[1])}</div>` : ''}</div>
      ${B.tekst != null ? `<div class="ul-row" style="margin:12px 0 4px;align-items:baseline"><span style="font-weight:600">Балл ${bTxt(B0)} → ${bTxt(B)}</span><span class="ul-dim">${d != null && Math.abs(d) < 0.5 ? 'в пределах погрешности' : d != null ? (d > 0 ? 'вырос' : 'снизился') : ''}</span><span class="ul-dim" title="Один и тот же текст при повторной оценке получает ±0,5. Сдвиг меньше 0,5 — ещё не сдвиг; прямое сравнение двух версий точнее" style="cursor:help;border-bottom:1px dotted">почему ±0,5?</span></div><div class="ul-row" style="gap:6px;margin:0 0 4px">${chastiHtml}</div>${minusy.length ? `<p class="ul-dim" style="margin:4px 0 0">${minusy.map((c) => `<b>${CH[c]} ниже:</b> ${esc((B.pochemu || {})[c])}`).join('<br>')}</p>` : ''}` : (z.errors && z.errors.pereocenka ? `<p class="ul-dim">Оценка не удалась: ${esc(z.errors.pereocenka)}</p>` : '')}
      <ul class="small" style="margin:10px 0 0;padding-left:18px">${izm ? `<li>${esc(izm[0].toUpperCase() + izm.slice(1))} ${stat.ostavleno ? `· ${stat.ostavleno} без изменений` : ''}</li>` : ''}<li>Длина: было ≈ ${minTxt(z.minut)}, стало ≈ ${minTxt(z.v2 && z.v2.minut)}</li>${stat.otkat ? `<li>Возвращено к вашему тексту: ${esc(stat.otkat)}</li>` : ''}${T.list && T.list.itog ? `<li>${esc(T.list.itog)}</li>` : ''}</ul>
      ${glavnoe ? `<div class="ul-blok" style="margin:14px 0 4px"><span class="caps">Дальше</span><p style="margin:6px 0 10px">Критик считает главным: ${esc(glavnoe)}</p><div class="ul-row" style="margin:0"><button type="button" class="btn accent" id="ul-dalshe">Сделать это · план ${kr(planKr)}</button><button type="button" class="btn sm quiet" id="ul-esche">выбрать другую цель</button></div></div>` : `<div class="ul-row" style="margin:12px 0 0"><button type="button" class="btn accent" id="ul-esche">Улучшить ещё</button></div>`}
      <div class="ul-tabs" style="margin-top:18px">${tabs.map(([k2, n], i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-tab="${k2}">${n}</button>`).join('')}</div><div id="ul-tab"></div>`;
    const draw = (k) => {
      const el = $('#ul-tab');
      if (k === 'v2') el.innerHTML = `<details class="ul-menu" style="margin:0 0 10px;display:inline-block"><summary class="btn sm" style="list-style:none;cursor:pointer">Скачать версию ${esc(uv)} ▾</summary><div class="ul-blok" style="position:absolute;z-index:5;margin-top:6px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:240px"><button class="btn sm quiet" data-f="fountain">.fountain — сценарный формат</button><button class="btn sm quiet" data-f="fdx">Final Draft .fdx</button><button class="btn sm quiet" data-f="docx">Word .docx</button><hr style="border:0;border-top:1px solid var(--line,rgba(127,127,127,.25));margin:2px 0"><button class="btn sm quiet" data-f="fountain" data-v="1">Исходная версия .fountain</button></div></details><div class="${T.rezhim_teksta === 'bloki' ? 'ul-proza' : 'ul-pre'}">${esc(T.v2)}</div><p class="ul-dim" style="margin-top:8px">${esc(T.pravo || '')}</p>`;
      else if (k === 'pt') {
        const p = T.pitch || {};
        if (!p.gotov && !p.titul) {
          const oshibki = Object.entries(z.errors || {}).filter(([k2]) => /pitcher|vizual|kartink|koloda/.test(k2)).map(([, v]) => v).join(' · ');
          el.innerHTML = `<p class="ul-dim">${z.pitch && oshibki ? 'Питч-пакет не собрался, ' + (arr(Object.values(z.oplata || {})).length && (z.oplata.pitch || {}).vozvrashcheno ? '400 кр вернули на баланс. ' : '') + esc(oshibki) : 'Питч-пакет: логлайн, синопсис короткий и на страницу, презентация для фонда или продюсера с постером и кадрами.'}</p><div class="ul-row"><button class="btn sm accent" id="ul-pitch-add">${z.pitch && oshibki ? 'Собрать питч-пакет ещё раз' : 'Добавить питч-пакет'} · +400 кр</button></div>`;
          const pa = $('#ul-pitch-add', el); if (pa) pa.addEventListener('click', async () => { if (!(await J.confirm('Собрать питч-пакет за 400 кр? Логлайн, синопсисы, постер, кадры и презентация по версии 2. Если не соберётся — вернём 400 кр.'))) return; pa.disabled = true; try { const r = await api('/api/scenariy/uluchshit/pitch', { id: z.id }); if (r.ostatok != null) spend(0, r.ostatok); ekranStatus(job, z.id); } catch (er) { toast(er.message); pa.disabled = false; } });
          return;
        }
        el.innerHTML = `<div class="ul-row" style="margin:0 0 12px">${p.pid ? `<button class="btn sm accent" id="ul-koloda">Открыть презентацию · ${esc(p.slajdov || '')} слайдов → PPTX / PDF</button>` : '<span class="ul-dim">колода не собралась</span>'}</div>
          <h3 style="margin:6px 0 2px">${esc(p.titul || '')}</h3><p class="ul-dim" style="margin:0 0 10px">${esc(p.teglajn || '')}${p.format ? ' · ' + esc(p.format) : ''}${p.hronometrazh ? ' · ' + esc(p.hronometrazh) : ''}${p.vozrast ? ' · ' + esc(p.vozrast) : ''}</p>
          <span class="caps">Логлайн</span><ul class="small" style="margin:6px 0 12px;padding-left:18px">${arr(p.loglajn).map((l) => `<li><span class="ul-dim">${esc(l.vid)}:</span> ${esc(l.tekst)}</li>`).join('')}</ul>
          ${arr(p.kartinki).length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin:0 0 12px">${p.kartinki.map((k2) => `<div class="img" style="aspect-ratio:16/9;position:relative;overflow:hidden;border-radius:12px"><img src="${esc(abs(k2.url))}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"><div class="cap" style="position:absolute;left:0;right:0;bottom:0;padding:8px 10px;background:linear-gradient(transparent,rgba(0,0,0,.65));color:#fff;font-size:12px">${esc(k2.podpis || k2.kod)}</div></div>`).join('')}</div>` : ''}
          <span class="caps">Синопсис короткий</span><p class="small" style="margin:6px 0 12px">${esc(p.sinopsis_korotkij || '')}</p>
          <span class="caps">Синопсис на страницу</span><div class="small" style="margin:6px 0 12px;white-space:pre-wrap">${esc(p.sinopsis_stranica || '')}</div>
          ${arr(p.analogi).length ? `<span class="caps">Аналоги</span><ul class="small" style="margin:6px 0 12px;padding-left:18px">${p.analogi.map((a) => `<li><b>${esc(a.nazvanie)}</b>${a.god ? ' (' + esc(a.god) + ')' : ''} — ${esc(a.chem)}</li>`).join('')}</ul>` : ''}
          ${arr(p.geroi).length ? `<span class="caps">Герои</span><ul class="small" style="margin:6px 0 12px;padding-left:18px">${p.geroi.map((g) => `<li><b>${esc(g.imya)}</b>${g.kto ? ', ' + esc(g.kto) : ''}: хочет — ${esc(g.hochet)}; нуждается — ${esc(g.nuzhdaetsya)}; путь — ${esc(g.arka)}</li>`).join('')}</ul>` : ''}
          ${arr(p.tema).length ? `<span class="caps">Тема и почему сейчас</span><p class="small" style="margin:6px 0 12px">${esc(p.tema.join(' '))} ${esc(p.pochemu_sejchas || '')} ${esc(p.pochemu_kz || '')}</p>` : ''}
          ${arr(p.auditoriya).length ? `<span class="caps">Аудитория</span><p class="small" style="margin:6px 0 12px">${esc(p.auditoriya.join(' · '))}</p>` : ''}
          <p class="ul-dim">Тексты можно поправить в презентации — там же сборка PPTX и PDF.</p>`;
        const kb = $('#ul-koloda', el); if (kb) kb.addEventListener('click', () => { stop(); location.hash = '#/prezentacii?p=' + p.pid; });
      }
      else if (k === 'bs') {
        const vid = el.dataset.vid || 'vmeste';
        el.innerHTML = `<div class="ul-row" style="margin:0 0 6px;justify-content:space-between"><span class="ul-dim">Изменено ${arr(T.bylo_stalo).length} из ${esc(T.vsego_scen || '?')} ${T.rezhim_teksta === 'bloki' ? 'блоков' : 'сцен'}, остальные без изменений. Новое принято — любую можно вернуть.</span><span class="ul-seg" style="display:inline-flex"><button type="button" class="chip ${vid === 'vmeste' ? 'on' : ''}" data-vid="vmeste">Вместе</button><button type="button" class="chip ${vid === 'ryadom' ? 'on' : ''}" data-vid="ryadom">Рядом</button></span></div>` +
          arr(T.bylo_stalo).map((b) => `<div class="ul-bs" data-id="${esc(b.id)}"><div class="ul-row" style="margin:0;justify-content:space-between"><div><b>${esc(b.id)}</b>${b.zagolovok ? ` · ${esc(b.zagolovok)}` : ''} <span class="pill">${esc(DEJ[b.dejstvie] || b.dejstvie)}${b.posle ? ' после ' + esc(b.posle) : ''}</span></div><span class="ul-row" style="margin:0;gap:6px">${b.otkat ? '<span class="ul-dim">ваш текст</span>' : '<span class="ul-dim">✓ новое</span>'}<button class="btn sm ${b.otkat ? 'accent' : 'quiet'}" data-otkat="${esc(b.id)}" data-v="${b.otkat ? 0 : 1}">${b.otkat ? 'Взять новое' : 'Вернуть моё'}</button></span></div>
            ${b.zachem ? `<p class="small" style="margin:6px 0 0">${esc(b.zachem)}</p>` : ''}${arr(b.izmeneniya).length ? `<details style="margin-top:4px"><summary class="ul-dim" style="cursor:pointer">Подробнее о правках (${b.izmeneniya.length})</summary><ul>${b.izmeneniya.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
            ${vid === 'ryadom' ? `<div class="cols"><div><div class="lab">было</div><pre class="${T.rezhim_teksta === 'bloki' ? 'proza' : ''}">${esc(b.bylo || '—')}</pre></div><div><div class="lab">стало</div><pre class="${T.rezhim_teksta === 'bloki' ? 'proza' : ''}">${b.stalo ? razn(b.bylo, b.stalo, 'ins') : '—'}</pre></div></div>` : `<div class="ul-diff ${T.rezhim_teksta === 'bloki' ? 'proza' : ''}">${razn(b.bylo, b.stalo || '', 'oba')}</div>`}</div>`).join('');
        $$('[data-vid]', el).forEach((x) => x.addEventListener('click', () => { el.dataset.vid = x.dataset.vid; draw('bs'); }));
      }
      else {
        const v1 = kr2.v1 || {}, v2 = kr2.v2 || {}; const m = kr2.metriki || {};
        el.innerHTML = `<span class="caps">Независимый читатель · не знал, какая версия чья${kr2.raund > 1 ? ' · после круга доработки' : ''}</span>
          <div class="ul-kr">${Object.keys(CH).map((c) => `<div>${CH[c]}<b>${v1[c] != null ? esc(v1[c]) : '—'} → ${v2[c] != null ? esc(v2[c]) : '—'}</b></div>`).join('')}</div>
          <p class="small" style="margin-top:10px">${esc(kr2.slovo || '')}</p>
          ${kr2.golos ? `<p class="small"><b>Голос автора:</b> ${esc(kr2.golos.status === 'odinakov' ? 'не отличить' : kr2.golos.kto === 'v2' ? (kr2.golos.status === 'glazhe' ? 'версия 2 звучит глаже вашей — проверьте реплики' : 'в версии 2 манера другая — проверьте реплики') : kr2.golos.kto === 'v1' ? 'ваша версия ровнее — версия 2 ближе к живой речи' : 'есть разница')}${kr2.golos.gde ? ': ' + esc(kr2.golos.gde) : ''}</p>` : ''}
          ${arr(kr2.gde_huzhe).length ? `<p class="small"><b>Где слабее:</b></p><ul class="small">${kr2.gde_huzhe.map((g) => `<li>${g.variant === 'v2' ? 'версия 2' : 'ваша версия'} · ${esc(CH[g.chast] || g.chast)}${g.scena ? ' · ' + esc(g.scena) : ''}: ${esc(g.pochemu)}${g.citata ? ' «' + esc(g.citata) + '»' : ''}</li>`).join('')}</ul>` : ''}
          ${m.slov ? `<p class="ul-dim">Автоматическая сверка: ${stat.ostavleno || 0} ${(stat.ostavleno || 0) === 1 ? 'сцена' : 'сцен'} из ${arr(z.karta).length} — слово в слово как у вас; средняя реплика ${esc(m.replika_slov[0])} → ${esc(m.replika_slov[1])} слов, ремарка ${esc(m.remarka_slov[0])} → ${esc(m.remarka_slov[1])}; ${Math.round((m.slovar_sovpal || 0) * 100)} % слов — из вашего словаря; объём ${esc(m.slov[0])} → ${esc(m.slov[1])} слов.</p>` : ''}
          <span class="caps" style="display:block;margin-top:16px">Главное в сценарии (зеница ока)</span><p class="small">${esc((T.serdce || {}).itog || 'проверка не проводилась')}</p>
          ${arr(T.otkat_zenica).length ? `<p class="small"><b>${T.otkat_zenica.length === 1 ? 'Сцену ' + esc(T.otkat_zenica[0]) + ' вернули к вашему тексту' : 'Сцены ' + esc(T.otkat_zenica.join(', ')) + ' вернули к вашему тексту'}: правка задевала главное.</b></p>` : ''}
          ${arr((T.serdce || {}).punkty).filter((p) => p.status !== 'cela').length ? `<ul class="small">${T.serdce.punkty.filter((p) => p.status !== 'cela').map((p) => `<li>${esc(p.Z)} — ${esc(p.status === 'razmyta' ? 'смысл ослаблен' : 'нарушена')}${p.scena ? ' · ' + esc(p.scena) : ''}${p.vernut ? ': ' + esc(p.vernut) : ''}</li>`).join('')}</ul>` : ''}
          <span class="caps" style="display:block;margin-top:16px">Стыки между частями</span><p class="small">${arr(T.shvy).length ? arr(T.shvy).map((s) => `${esc(s.scena)}: ${esc(s.chto)} → ${esc(s.kak)}`).join('<br>') : 'расхождений между частями не нашли'}</p>
          ${Object.keys(z.errors || {}).length ? `<div class="ul-warn"><b>Не все проверки прошли:</b> ${Object.entries(z.errors).map(([k, v]) => esc(k + ': ' + v)).join(' · ')}</div>` : ''}`;
      }
    };
    draw('bs');
    const ue = $('#ul-esche'); if (ue) ue.addEventListener('click', () => back());
    const ud = $('#ul-dalshe'); if (ud) ud.addEventListener('click', async () => {
      const ostanetsya = Math.floor((+S.credits || 0) - planKr);
      if (!(await J.confirm(`Спишем ${kr(planKr)} за план версии ${uv + 1}, останется ${ostanetsya} кр. Команда возьмёт главное замечание критика и покажет, что меняет. Переписывать или нет — решите после.`))) return;
      ud.disabled = true;
      try { const r = await api('/api/scenariy/uluchshit/krug', { id: z.id, cel: 'svoe', tekst: glavnoe }); const p2 = await api('/api/scenariy/uluchshit/plan', { id: r.zadanie.id }); if (p2.ostatok != null) spend(0, p2.ostatok); ekranStatus(job, r.zadanie.id); }
      catch (er) { toast(er.message); ud.disabled = false; }
    });
    $$('#ul-res .ul-tabs .chip').forEach((b) => b.addEventListener('click', () => { $$('#ul-res .ul-tabs .chip').forEach((c) => c.classList.toggle('on', c === b)); draw(b.dataset.tab); }));
    $('#ul-res').addEventListener('click', async (e) => {
      const f = e.target.closest('[data-f]');
      if (f) { f.disabled = true; try { const r = await api('/api/scenariy/uluchshit/fajl', { id: z.id, ext: f.dataset.f, versiya: f.dataset.v ? 1 : 2 }); skachat(r); } catch (er) { toast(er.message); } f.disabled = false; return; }
      const o = e.target.closest('[data-otkat]');
      if (o) { o.disabled = true; try { await api('/api/scenariy/uluchshit/otkat', { id: z.id, scena: o.dataset.otkat, vernut: o.dataset.v === '1' }); toast(o.dataset.v === '1' ? 'Сцена возвращена к вашей версии' : 'Взяли версию 2'); ekranStatus(job, z.id); } catch (er) { toast(er.message); o.disabled = false; } }
    });
  }

  // разница как в документе с правками: абзацы сравниваются целиком; переписанный абзац — «старый зачёркнут, новый целиком»,
  // мелкая правка внутри абзаца — по словам (слово вместе с пробелом после него, чтобы слова не слипались)
  function lcs(A, B) {
    const n = A.length, m = B.length; const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ops = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { ops.push(['=', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) ops.push(['-', A[i++]]); else ops.push(['+', B[j++]]); }
    while (i < n) ops.push(['-', A[i++]]); while (j < m) ops.push(['+', B[j++]]);
    return { ops, obshchee: L[0][0] };
  }
  function razn(a, b, rezhim) {
    const oba = rezhim === 'oba';
    const del = (s) => (oba ? `<del class="ul-del">${esc(s)}</del>` : '');
    const ins = (s) => `<ins class="ul-ins">${esc(s)}</ins>`;
    const slova = (s) => String(s).match(/\S+\s*|\s+/g) || [];
    const abzac = (x, y) => {   // пара абзацев: похожи — по словам, иначе целиком
      const X = slova(x), Y = slova(y);
      if (X.length * Y.length > 2.5e6) return del(x) + (oba ? '\n' : '') + ins(y);
      const { ops, obshchee } = lcs(X, Y);
      if (2 * obshchee / Math.max(1, X.length + Y.length) < 0.55) return (oba ? del(x) + '\n' : '') + ins(y);
      let out = '', bufD = '', bufI = '';
      const sbros = () => { if (bufD) out += del(bufD); if (bufI) out += ins(bufI); bufD = bufI = ''; };
      ops.forEach(([o, s]) => { if (o === '=') { sbros(); out += esc(s); } else if (o === '-') bufD += s; else bufI += s; });
      sbros();
      return out;
    };
    const P = String(a || '').split(/\n{2,}/), Q = String(b || '').split(/\n{2,}/);
    const { ops } = lcs(P, Q);
    const out = []; let minus = [], plus = [];
    const sbros = () => {
      const n = Math.max(minus.length, plus.length);
      for (let i = 0; i < n; i++) {
        if (minus[i] != null && plus[i] != null) out.push(abzac(minus[i], plus[i]));
        else if (minus[i] != null) { if (oba) out.push(del(minus[i])); }
        else out.push(ins(plus[i]));
      }
      minus = []; plus = [];
    };
    ops.forEach(([o, s]) => { if (o === '=') { sbros(); out.push(esc(s)); } else if (o === '-') minus.push(s); else plus.push(s); });
    sbros();
    return out.join('\n\n');
  }

  function skachat(r) {
    const tw = window.Telegram && window.Telegram.WebApp;
    if (TG && tw) {
      if (typeof tw.downloadFile === 'function') tw.downloadFile({ url: abs(r.url), file_name: r.imya }, (ok) => { if (!ok) toast('Скачивание отменено'); });
      else { tw.openLink(abs(r.url)); toast('Открываю файл — ссылка действует 1 час'); }
      return;
    }
    const a = document.createElement('a'); a.href = abs(r.url); a.download = r.imya; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1500);
  }

  window.JASA_ULUCHSHIT = { knopka, ekranStatus };
  // app.js мог нарисовать отчёт раньше, чем загрузился этот модуль: пустую мастерскую дорисовываем сами
  const p0 = document.getElementById('uluch-akcii');
  if (p0 && !p0.innerHTML.trim() && S.job && S.job.id && S.job.done) knopka(S.job, p0);
})();
