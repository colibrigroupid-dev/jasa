/* JASA · «Идеи» (10.11.2026): настоящие работы JASA плитками — что написали и что получилось; «Сделать такой же» подставляет запрос.
   Данные — в idei.json (рядом), картинки — рядом же, файлы idei-<имя>.webp. Новая идея = строка в JSON и файл картинки, код не трогаем.
   Подключается после app.js, маршрут #/idei, виден гостю. Классы — с приставкой id-. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { esc, $, $$, arr, topbar, toast, bsheet, bsHead } = J;
  const VER = '2';
  const TIP = { post: 'Пост', afisha: 'Афиша', karusel: 'Карусель', rils: 'Рилс', plan: 'План' };
  let D = null, filtr = '', filtrPo = null;   // filtrPo — для какого дела фильтр уже выставлен сам

  function stil() {
    if ($('#id-style')) return;
    const s = document.createElement('style'); s.id = 'id-style';
    s.textContent = `.id-wrap{max-width:1080px}.id-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 16px}
.id-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.mob .id-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.id-card{display:flex;flex-direction:column;padding:0;text-align:left;border-radius:18px;background:var(--surface);border:1px solid var(--line-soft);box-shadow:var(--shadow);overflow:hidden;color:var(--text);transition:transform .18s var(--ease)}
.id-card:hover{transform:translateY(-2px)}
.id-card img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;background:var(--surface-2)}
.id-cap{display:flex;flex-direction:column;gap:4px;padding:10px 12px 12px;min-width:0}
.id-cap b{font-weight:600;color:var(--ink);font-size:var(--fs-small);line-height:1.25}
.id-cap small{color:var(--dim);font-size:12px;line-height:1.35}
.id-prim{display:inline-block;font:600 11px/1 var(--mono);letter-spacing:.04em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--surface-2);color:var(--muted);margin-right:6px}
.id-note{margin-top:18px;font-size:var(--fs-small);color:var(--dim);max-width:62ch}
.id-big{display:block;width:100%;max-width:340px;height:auto;margin:4px auto 0;border-radius:16px;aspect-ratio:4/5;object-fit:cover;background:var(--surface-2)}
.id-q{margin:0;padding:12px 14px;border-radius:14px;background:var(--surface-2);color:var(--ink);font-size:15px;line-height:1.4;max-width:none}
.id-go{display:flex;width:100%;margin-top:14px}
.id-sm{font-size:13px;color:var(--dim);margin-top:10px;line-height:1.4;max-width:none}
@media (min-width:901px){.id-two{display:grid;grid-template-columns:240px 1fr;gap:18px;align-items:start}.id-two .id-big{margin:0}}`;
    document.head.appendChild(s);
  }

  const nishaN = (kod) => ((arr(D && D.nishi).find((x) => x.kod === kod) || {}).n || '');
  const zagol = (i) => [TIP[i.tip] || 'Пост', nishaN(i.nisha)].filter(Boolean).join(' · ');   // «Пост · Кофейня»; без ниши — просто «Пост»
  const zagolHtml = (i) => [TIP[i.tip] || 'Пост', nishaN(i.nisha)].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join(' · ');   // части отдельными узлами — словарь переводит каждую
  const cena = (tip) => { const c = J.S && J.S.ceny && J.S.ceny.zadanie; return (c && c[tip]) || 21; };
  const imgUrl = (i) => (/^idei-[\w.\-]+\.(webp|jpg|png)$/.test(String(i.img || '')) ? i.img : '');   // только свои файлы рядом: idei-<имя>.webp

  function kartochka(i, n) {
    return `<button type="button" class="id-card rv" data-i="${n}"><img src="${esc(imgUrl(i))}" alt="${esc(i.podpis || i.na_kartinke || '')}" loading="${n < 4 ? 'eager' : 'lazy'}" decoding="async" width="800" height="1000">
      <span class="id-cap"><b>${zagolHtml(i)}</b><small><span class="id-prim">Пример</span><span data-no-i18n>${esc(i.na_kartinke || '')}</span></small></span></button>`;   // надпись на картинке — данные примера, её язык — язык картинки
  }

  function risovat() {
    const box = $('#idbox'); if (!box) return;
    const vse = arr(D && D.idei).filter((i) => imgUrl(i) && i.zapros);
    if (!vse.length) { box.innerHTML = '<p class="muted">Идеи скоро появятся. А пока — напишите, что нужно, в «Создать».</p><p style="margin-top:12px"><a class="btn accent sm" href="#/sozdat">Создать</a></p>'; return; }
    const nishi = arr(D.nishi).filter((n) => vse.some((i) => i.nisha === n.kod));
    const spisok = vse.filter((i) => !filtr || i.nisha === filtr);
    box.innerHTML = `${nishi.length > 1 ? `<div class="id-chips"><button type="button" class="chip ${filtr ? '' : 'on'}" data-n="" aria-pressed="${!filtr}">Все · ${vse.length}</button>${nishi.map((n) => `<button type="button" class="chip ${filtr === n.kod ? 'on' : ''}" data-n="${esc(n.kod)}" aria-pressed="${filtr === n.kod}">${esc(n.n)}</button>`).join('')}</div>` : ''}
      <div class="id-grid">${spisok.map((i) => kartochka(i, vse.indexOf(i))).join('')}</div>
      <p class="id-note">Это примеры: бизнесы вымышленные, совпадения случайны. Картинки и тексты созданы в JASA с помощью ИИ.</p>`;
    $$('.rv', box).forEach((n, k) => { n.style.animationDelay = Math.min(k * 60, 600) + 'ms'; });
    box.onclick = (e) => {
      const c = e.target.closest('[data-n]'); if (c) { filtr = c.dataset.n; risovat(); const f = $$('[data-n]', box).find((x) => x.dataset.n === filtr); if (f) f.focus(); return; }   // фокус остаётся на выбранном чипе
      const k = e.target.closest('[data-i]'); if (k) otkryt(vse[+k.dataset.i]);
    };
  }

  function otkryt(i) {
    if (!i) return;
    const tip = TIP[i.tip] ? i.tip : 'post';
    const b = bsheet(`${bsHead(esc(zagol(i)))}
      <div class="id-two"><img class="id-big" src="${esc(imgUrl(i))}" alt="${esc(i.podpis || '')}" width="800" height="1000">
      <div><div class="bs-lab">Что написали</div><p class="id-q">${esc(i.zapros)}</p>
      ${i.na_kartinke ? `<div class="bs-lab">Что на картинке</div><p class="id-q">${esc(i.na_kartinke)}</p>` : ''}
      <button type="button" class="btn accent id-go" id="idgo">Сделать такой же · до ${esc(cena(tip))} кр</button>
      <p class="id-sm">Запрос подставится в «Создать» — поменяйте название, цену и дату на свои. Кредиты спишем только после «Сделать».</p>
      <p class="id-sm"><span class="id-prim">Пример</span>Бизнес вымышленный. Создано с помощью ИИ · JASA.</p></div></div>`);
    $('#idgo', b.el).onclick = () => {
      try { sessionStorage.setItem('jasa:prefill', JSON.stringify({ tip, text: i.zapros })); } catch (e) { toast('Не получилось подставить запрос — скопируйте его вручную'); return; }
      b.close(); location.hash = '#/sozdat';
    };
  }

  async function screen() {
    stil();
    const main = $('#main');
    main.innerHTML = topbar('Идеи') + `<div class="id-wrap"><section style="max-width:680px;margin-bottom:18px"><h2>Посмотрите — и сделайте такой же</h2><p class="muted" style="margin-top:10px">Настоящие работы JASA. Откройте любую: увидите, что написали и что получилось.</p></section><div id="idbox"><div class="working"><span class="spin"></span><span>Открываю…</span></div></div></div>`;
    if (!D) {
      try { const r = await fetch('idei.json?v=' + VER, { cache: 'no-cache' }); /* всегда сверяемся с сервером: новая идея видна сразу */ if (!r.ok) throw new Error(String(r.status)); D = await r.json(); }
      catch (e) { const box = $('#idbox'); if (box) box.innerHTML = '<div class="warn"><b>Идеи не открылись.</b> Проверьте связь и обновите страницу.</div>'; return; }
    }
    /* 10.11: человек выбрал своё дело в «Сегодня» — открываем на его нише; выбор «Все» потом не сбиваем */
    const moya = J.nishaIdei ? J.nishaIdei() : '';
    if (moya !== filtrPo) { filtrPo = moya; if (moya && arr(D.idei).some((i) => i.nisha === moya && imgUrl(i) && i.zapros)) filtr = moya; }
    risovat();
  }

  J.routes.idei = screen;
  if (!J.store.get('ideiVMenu', 0)) { J.store.set('ideiVMenu', 1); J.openSec('idei'); }   // раздел сразу виден в меню у всех, как «Уроки»
  if ((location.hash || '').replace('#/', '').split('?')[0] === 'idei') J.route();
})();
