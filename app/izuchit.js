/* JASA · Изучить (28.10.2026). Ссылка или видео → текст, смысл, как снято, сценарий по образцу, скачать, в депо.
   Подключается после app.js, экран #/izuchit. Зависит от window.JASA. План — IZUCHIT-PLAN.md. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, spend, $, $$, arr, S, store, topbar, toB64, API_BASE, loadMe } = J;
  let L = null;                       // /api/izuchit: кнопки, цены, прошлые разборы
  let vybor = store.get('izVybor', ['tekst', 'smysl', 'kak']);
  let fajl = null;
  const kr = (n) => n ? (Math.round(n * 10) / 10).toLocaleString('ru-RU') + ' кр' : 'бесплатно';
  const tg = (n) => n ? ' ≈ ' + Math.round(n * 10).toLocaleString('ru-RU') + ' ₸' : '';   // 1 кр ≈ 10 ₸ (пакет 2 000 кр = 19 990 ₸)
  const VSE = () => arr(L.vse_kody);

  style();

  async function screen() {
    const main = $('#main');
    main.innerHTML = topbar('Изучить') + '<div id="iz"><div class="working"><span class="spin"></span><span>Открываю…</span></div></div>';
    try { L = await api('/api/izuchit'); } catch (e) { $('#iz').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    draw();
  }

  function cena() {
    const c = (k) => (arr(L.knopki).find((x) => x.kod === k) || {}).kredity || 0;
    if (VSE().every((k) => vybor.includes(k))) return L.vse + vybor.filter((k) => !VSE().includes(k)).reduce((s, k) => s + c(k), 0);
    return vybor.reduce((s, k) => s + c(k), 0);
  }

  function draw() {
    const box = $('#iz'); if (!box) return;
    box.innerHTML = `<section style="max-width:720px;margin-bottom:20px"><h2>Разобрать ролик</h2>
      <p class="muted" style="margin-top:10px">Вставьте ссылку из Instagram, TikTok, YouTube, VK или Telegram — или перетащите видео. JASA посмотрит ролик целиком: речь, текст на экране, кадры и монтаж.</p>
      ${L.zaglushka ? '<p class="warn"><b>Пробный режим.</b> Скачивание и модель заменены заглушкой, кредиты считаются как настоящие.</p>' : ''}</section>
      <form class="card iz-form" id="izf" autocomplete="off">
        <div class="iz-drop" id="izd"><input id="izu" placeholder="https://www.instagram.com/reel/…" inputmode="url">
          <label class="btn sm quiet"><input type="file" accept="video/*" hidden id="izfile">Видео файлом</label></div>
        <div class="small dim" id="izfn"></div>
        <div class="iz-knopki">${arr(L.knopki).map((k) => `<button type="button" class="iz-k ${vybor.includes(k.kod) ? 'on' : ''}" data-k="${k.kod}"><b>${esc(k.name)}</b><small>${esc(k.opis)}</small><em>${kr(k.kredity)}</em></button>`).join('')}</div>
        <label class="iz-moj ${vybor.includes('skachat') ? '' : 'hide'}" id="izmoj"><input type="checkbox" id="izmojc"> Это мой ролик или у меня есть право на него — только тогда его можно скачать</label>
        <div class="iz-row"><button type="button" class="chip" id="izvse">Всё сразу · ${kr(L.vse)}${tg(L.vse)} · выгоднее на ${L.vse_bez - L.vse} кр</button>
          <button class="btn accent" type="submit" id="izgo">Разобрать · ${kr(cena())}${tg(cena())}</button></div>
        <p class="small dim" style="margin-top:10px">Разбираем чужой ролик для изучения, автор и ссылка сохраняются в разборе. Публиковать чужой ролик или его кадры — только с разрешения автора. «Такой же ролик про мой бизнес» берёт приём и структуру, а не текст, кадры и музыку. Разбор делает ИИ.</p>
      </form>
      <div id="izres"></div>
      ${arr(L.razbory).length ? `<h3 style="margin:28px 0 12px">Ваши разборы</h3><div class="iz-list">${L.razbory.map((r, i) => `<a href="#" class="card iz-old" data-i="${i}"><b>${esc(short(r.istochnik))}</b><span class="small muted">${esc(r.ts)} · ${esc(arr(r.chto).map(name).join(', '))}</span></a>`).join('')}</div>` : ''}`;
    $$('.iz-k', box).forEach((b) => { b.onclick = () => { const k = b.dataset.k; vybor = vybor.includes(k) ? vybor.filter((x) => x !== k) : vybor.concat(k); store.set('izVybor', vybor); b.classList.toggle('on'); $('#izmoj').classList.toggle('hide', !vybor.includes('skachat')); upd(); }; });
    $('#izvse').onclick = () => { vybor = Array.from(new Set(vybor.concat(VSE()))); store.set('izVybor', vybor); $$('.iz-k', box).forEach((b) => b.classList.toggle('on', vybor.includes(b.dataset.k))); upd(); };
    $('#izfile').onchange = (e) => { setFile(e.target.files[0]); };
    const dz = $('#izd');
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) setFile(f); else { const t = e.dataTransfer.getData('text'); if (t) $('#izu').value = t.trim(); } });
    $('#izf').addEventListener('submit', (e) => { e.preventDefault(); go(); });
    $$('.iz-old', box).forEach((a) => { a.onclick = (e) => { e.preventDefault(); result(L.razbory[+a.dataset.i]); $('#izres').scrollIntoView({ behavior: 'smooth' }); }; });
    const pref = store.get('izUrl', ''); if (pref) { $('#izu').value = pref; store.set('izUrl', ''); }
  }
  const name = (k) => (arr(L.knopki).find((x) => x.kod === k) || {}).name || k;
  const short = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '').slice(0, 60);
  function upd() { const b = $('#izgo'); if (b) b.textContent = 'Разобрать · ' + kr(cena()) + tg(cena()); }
  function setFile(f) {
    if (!f) return;
    if (f.size > 10e6) { toast('Видео больше 10 МБ — пришлите ссылку'); return; }
    fajl = f; $('#izfn').textContent = 'Файл: ' + f.name + ' · ' + Math.round(f.size / 1e5) / 10 + ' МБ'; $('#izu').value = '';
  }

  async function go() {
    const url = $('#izu').value.trim();
    if (!url && !fajl) { toast('Вставьте ссылку на ролик или выберите видео'); return; }
    if (!vybor.length) { toast('Выберите, что сделать с роликом'); return; }
    const b = $('#izgo'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Отправляю…';
    try {
      if (vybor.includes('skachat') && !$('#izmojc').checked) { toast('Скачать можно только свой ролик — отметьте галочку'); b.disabled = false; upd(); return; }
      const body = { chto: vybor, brand_id: S.useBrend ? (S.brandId || null) : null, moj: $('#izmojc').checked };
      if (url) body.url = url; else body.fajl = { b64: await toB64(fajl), mime: fajl.type };
      const r = await api('/api/izuchit', body);
      loadMe();
      $('#izres').innerHTML = `<div class="card iz-wait"><span class="spin"></span><span id="izet">Скачиваю ролик…</span><small class="dim">обычно 20–60 секунд</small></div>`;
      poll(r.id, S.pollToken);
    } catch (e) { toast(e.message); }
    b.disabled = false; upd();
  }

  async function poll(id, token) {
    for (let i = 0; i < 160; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      if (token !== S.pollToken || !$('#izres')) return;
      let j; try { j = await api('/api/izuchit/' + id); } catch (e) { continue; }
      if (j.etap && $('#izet')) $('#izet').textContent = j.etap[0].toUpperCase() + j.etap.slice(1) + '…';
      if (j.status === 'idet') continue;
      if (typeof j.ostatok === 'number') spend(0, j.ostatok); else loadMe();
      if (j.status === 'oshibka') { $('#izres').innerHTML = `<p class="warn"><b>Не получилось:</b> ${esc(j.error || '')}. Кредиты вернулись.</p>`; return; }
      fajl = null; result(j);
      try { L = await api('/api/izuchit'); } catch (e) { /* список обновится в следующий раз */ }
      return;
    }
  }

  const blok = (t, html, copy) => `<section class="card iz-b"><div class="iz-bh"><span class="caps">${esc(t)}</span>${copy != null ? `<button class="chip" data-copy="${esc(copy)}">Скопировать</button>` : ''}</div>${html}</section>`;
  const kv = (o, pary) => `<dl class="iz-kv">${pary.filter(([k]) => o[k]).map(([k, t]) => `<dt>${t}</dt><dd>${esc(o[k])}</dd>`).join('')}</dl>`;

  function result(j) {
    const box = $('#izres'); if (!box) return;
    const src = /^https?:/.test(j.istochnik || '') ? `<a href="${esc(j.istochnik)}" target="_blank" rel="noopener noreferrer">${esc(short(j.istochnik))}</a>` : esc(j.istochnik || 'файл');
    let h = `<div class="iz-head"><b>${src}</b><span class="small muted">${j.avtor ? 'автор: ' + esc(j.avtor) + ' · ' : ''}${j.sek ? j.sek + ' с · ' : ''}${kr(j.kredity || 0)}</span></div>`;
    if (j.video) h += blok('Ваш ролик', `<video controls preload="metadata" src="${esc(API_BASE + j.video)}"></video><a class="btn sm" href="${esc(API_BASE + j.video)}" download="rolik.mp4">Скачать mp4</a><p class="small dim">Ссылка живёт 24 часа.</p>`);
    if (j.tekst) h += blok('Текст ролика', `${j.tekst.rech ? `<p class="iz-pre">${esc(j.tekst.rech)}</p>` : ''}${j.tekst.na_ekrane ? `<p class="small muted">На экране: ${esc(j.tekst.na_ekrane)}</p>` : ''}`, [j.tekst.rech, j.tekst.na_ekrane].filter(Boolean).join('\n\n'));
    if (j.smysl) h += blok('О чём и почему цепляет', kv(j.smysl, [['o_chyom', 'О чём'], ['kryuchok', 'Крючок'], ['prizyv', 'Призыв'], ['dlya_kogo', 'Для кого'], ['format', 'Формат']]));
    if (j.kak) h += blok('Разбор по кадрам', `<div class="iz-plany">${arr(j.kak.plany).map((p) => `<div><b>${esc(p.s)} с</b><span>${esc(p.kadr || '')}</span><small>${esc([p.krupnost, p.kamera, p.zvuk, p.montazh].filter(Boolean).join(' · '))}</small></div>`).join('')}</div>` +
      kv(j.kak, [['ritm', 'Ритм'], ['pochemu_rabotaet', 'Почему работает'], ['chem_snyato', 'Чем снято'], ['kak_povtorit', 'Как повторить']]));
    if (j.scenarij) {
      const sc = j.scenarij; const txt = [sc.ideya, ...arr(sc.plany).map((p) => `${p.s} с — ${p.kadr || ''}${p.tekst ? ' / «' + p.tekst + '»' : ''}`), sc.tekst_posta, sc.heshtegi].filter(Boolean).join('\n');
      h += blok('Такой же ролик про ваш бизнес', `${sc.ideya ? `<p><b>${esc(sc.ideya)}</b></p>` : ''}<div class="iz-plany">${arr(sc.plany).map((p) => `<div><b>${esc(p.s)} с</b><span>${esc(p.kadr || '')}</span>${p.tekst ? `<small>«${esc(p.tekst)}»</small>` : ''}</div>`).join('')}</div>${sc.tekst_posta ? `<p class="iz-pre" style="margin-top:10px">${esc(sc.tekst_posta)}${sc.heshtegi ? '\n' + esc(sc.heshtegi) : ''}</p>` : ''}
        <a class="btn sm accent" href="#/sozdat" id="izsd">Сделать такой пост</a>`, txt);
    }
    if (j.huki) h += blok('10 вариантов первой фразы', `${j.huki.ocenka_kryuchka ? `<p class="small muted">Крючок ролика: ${esc(j.huki.ocenka_kryuchka)}</p>` : ''}<ol class="iz-ol">${arr(j.huki.varianty).map((v) => `<li>${esc(v)}</li>`).join('')}</ol>`, arr(j.huki.varianty).join('\n'));
    if (j.perevod) h += blok('Перевод', [['ru', 'Русский'], ['kz', 'Қазақша'], ['en', 'English']].filter(([k]) => j.perevod[k]).map(([k, t]) => `<p class="small dim" style="margin-top:8px">${t}</p><p class="iz-pre">${esc(j.perevod[k])}</p>`).join(''), [j.perevod.ru, j.perevod.kz, j.perevod.en].filter(Boolean).join('\n\n'));
    if (j.depo != null) h += blok('В мои референсы', `<p>Добавлено кадров: <b>${j.depo}</b>. Они в «Библиотеке» → Депо — «Взять стиль» передаст их художникам.</p><a class="btn sm quiet" href="#/biblioteka">Открыть депо</a>`);
    h += `<p class="small dim" style="margin:6px 0 0">Разбор сделан с помощью ИИ · JASA. Источник: ${src}${j.avtor ? ', автор ' + esc(j.avtor) : ''}.</p>`;
    box.innerHTML = h;
    $$('[data-copy]', box).forEach((b) => { b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('Скопировано'); } catch (e) { toast('Не получилось скопировать'); } }; });
    const sd = $('#izsd'); if (sd) sd.onclick = () => { try { navigator.clipboard.writeText(arr(j.scenarij.plany).map((p) => p.tekst).filter(Boolean).join(' ')); } catch (e) { /* не страшно */ } toast('Текст сценария скопирован — вставьте в «Создать»'); };
  }

  function style() {
    if (document.getElementById('iz-style')) return;
    const s = document.createElement('style'); s.id = 'iz-style';
    s.textContent = `
.iz-form{max-width:760px}.iz-drop{display:flex;gap:10px;align-items:center;padding:6px;border:1.5px dashed var(--line);border-radius:var(--r-sm)}.iz-drop.over{border-color:var(--accent);background:var(--accent-soft)}
.iz-drop input:not([type=file]){flex:1 1 220px;min-width:0;border:0!important;background:transparent!important;padding:10px!important}
.iz-knopki{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin:14px 0}
.iz-k{display:grid;grid-template-columns:1fr auto;gap:2px 10px;text-align:left;padding:10px 12px;border-radius:var(--r-sm);border:1px solid var(--line);background:var(--surface)}
.iz-k small{grid-column:1;color:var(--dim);font-size:12px;line-height:1.3}.iz-k em{grid-column:2;grid-row:1;font-style:normal;color:var(--muted);font-size:13px}
.iz-k.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}.iz-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.iz-wait{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px;max-width:760px}
#izres{max-width:760px}.iz-head{display:flex;gap:10px;align-items:baseline;justify-content:space-between;margin:22px 0 10px}
.iz-b{margin-bottom:12px}.iz-bh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.iz-b video{width:100%;max-height:480px;border-radius:var(--r-sm);background:#000;margin-bottom:8px}
.iz-pre{white-space:pre-wrap}.iz-kv{display:grid;grid-template-columns:150px 1fr;gap:6px 14px;margin:8px 0 0;font-size:var(--fs-small)}.iz-kv dt{color:var(--dim)}.iz-kv dd{margin:0}
.iz-plany{display:flex;flex-direction:column;gap:6px}.iz-plany>div{display:grid;grid-template-columns:70px 1fr;gap:2px 12px;padding:8px 10px;border-radius:var(--r-sm);background:var(--surface-2)}
.iz-plany small{grid-column:2;color:var(--dim)}.iz-b .btn{margin-top:10px}
.iz-moj{display:flex;gap:8px;align-items:flex-start;font-size:var(--fs-small);margin:0 0 12px}.iz-moj input{width:auto!important;margin-top:3px}.iz-ol{margin:6px 0 0;padding-left:22px}.iz-ol li{margin:3px 0}
.iz-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;max-width:760px}.iz-old{display:flex;flex-direction:column;gap:4px;text-decoration:none;padding:14px 16px}
@media (max-width:640px){.iz-kv{grid-template-columns:1fr}.iz-drop{flex-wrap:wrap}}`;
    document.head.appendChild(s);
  }

  J.routes.izuchit = screen;
  if ((location.hash || '').startsWith('#/izuchit')) J.route();
})();
