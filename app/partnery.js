/* JASA · Партнёрам (28.10.2026). Своя ссылка и QR, два уровня (10 % и 5 % с оплат приглашённых), баланс в тенге:
   перевести в кредиты сразу или подать заявку на выплату деньгами. Регистрирует маршрут #/partnery. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, $, arr, topbar } = J;   // J.S — ниже, в блоке Кабинета
  const tg = (n) => (Math.round(+n || 0)).toLocaleString('ru-RU') + ' ₸';

  async function screen() {
    const main = $('#main');
    main.innerHTML = topbar('Партнёрам') + '<div id="pt"><div class="working"><span class="spin"></span><span>Открываю…</span></div></div>';
    let d;
    try { d = await api('/api/partner'); } catch (e) { $('#pt').innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    const box = $('#pt'); if (!box) return;
    const head = `<section style="max-width:720px;margin-bottom:22px"><h2>Приглашайте — и получайте с оплат</h2>
      <p class="muted" style="margin-top:10px">${esc(d.procent_1)} % с каждой оплаты тех, кого вы привели, и ${esc(d.procent_2)} % — с оплат тех, кого привели они. Считаем только реальные оплаты, не пробные кредиты.</p></section>`;
    if (d.guest) { box.innerHTML = head + '<a class="btn accent" href="#/kabinet">Войти через Telegram</a><p class="dim small" style="margin-top:10px">Ссылка и доход сохраняются за вами — поэтому нужен вход.</p>'; return; }
    const pravila = `<ol class="ptrules">${arr(d.pravila).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    if (!d.soglasie) {
      box.innerHTML = head + `<div class="card" style="max-width:720px"><span class="caps">Правила программы</span>${pravila}<button class="btn accent" id="pts" style="margin-top:14px">Принимаю правила — показать мою ссылку</button></div>`;
      $('#pts').onclick = async () => { try { await api('/api/partner/soglasie', {}); kabT = 0; screen(); } catch (e) { toast(e.message); } };
      return;
    }
    const bot = 'https://t.me/jasa_asia_bot?start=ref_' + d.kod;
    const app = 'https://t.me/jasa_asia_bot?startapp=ref_' + d.kod;
    const site = 'https://jasa.asia/?ref=' + d.kod;
    const u1 = arr(d.uroven_1);
    box.innerHTML = head + `<div class="ptgrid">
      <div class="card"><span class="caps">Ваша ссылка</span>
        <div class="ptlink"><input readonly value="${esc(bot)}" id="ptl"><button class="btn sm accent" id="ptc">Скопировать</button></div>
        <p class="dim small" style="margin-top:8px">Для телефона — сразу в приложение: <a href="${esc(app)}" target="_blank" rel="noopener">${esc(app.replace('https://', ''))}</a><br>Для сайта: <a href="${esc(site)}" target="_blank" rel="noopener">${esc(site.replace('https://', ''))}</a></p>
        <div id="ptqr" class="ptqr"></div><p class="dim small">QR-код для афиши, визитки или сторис.</p></div>
      <div class="card"><span class="caps">Доход</span>
        <div class="ptnum"><b>${tg(d.dostupno)}</b><small>доступно</small></div>
        <div class="ptrow"><span>Начислено всего</span><b>${tg(d.nachisleno)}</b></div>
        <div class="ptrow"><span>В холде ${esc(d.hold_dnej)} дней</span><b>${tg(d.v_holde)}</b></div>
        <div class="ptrow"><span>Переведено в кредиты</span><b>${tg(d.v_kredity)}</b></div>
        <div class="ptrow"><span>Выплачено деньгами</span><b>${tg(d.vyvedeno)}</b></div>
        ${d.zayavka && d.zayavka.status === 'zhdyot' ? `<p class="small" style="margin-top:10px">Заявка на ${tg(d.zayavka.tenge)} ждёт — ответим в Telegram.</p>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn sm accent" id="ptk" ${d.dostupno >= d.tenge_za_kr ? '' : 'disabled'}>В кредиты · ${Math.floor((+d.dostupno || 0) / d.tenge_za_kr)} кр</button><button class="btn sm quiet" id="ptv">Заявка на выплату деньгами</button></div>
        <p class="dim small" style="margin-top:8px">В кредиты — сразу, по цене пакета. Деньгами — от ${tg(d.min_vyplata)}, после оформления JASA как юрлица, по договору и с налогами по закону РК.</p></div>
      <div class="card"><span class="caps">Приглашённые</span>
        <div class="ptrow"><span>Пригласили вы · ${esc(d.procent_1)} %</span><b>${u1.length}</b></div>
        <div class="ptrow"><span>Бонус наставнику · ${esc(d.procent_2)} %</span><b>${esc(d.uroven_2)}</b></div>
        <ul class="ptlist">${u1.slice(0, 30).map((x) => `<li><span>${esc(x.imya)}</span><small>${esc(x.s || '')}${x.oplatil ? ' · оплатил' : ''}</small></li>`).join('') || '<li class="dim small">Пока никого. Отправьте ссылку первым трём знакомым, кто ведёт соцсети.</li>'}</ul></div>
      <div class="card"><span class="caps">Начисления</span>
        <ul class="ptlist">${arr(d.istoriya).map((h) => `<li><span>+${tg(h.tenge)} · ${h.uroven === 1 ? 'оплата приглашённого' : 'бонус наставнику'}</span><small>${esc(h.ts)} · ${esc(h.ot)}</small></li>`).join('') || '<li class="dim small">Начисления появятся, когда приглашённые оплатят пакет.</li>'}</ul></div>
    </div>
    <details class="card" style="margin-top:16px;max-width:720px"><summary><span class="caps">Правила программы</span></summary>${pravila}</details>`;
    try { if (window.QRCode) new window.QRCode($('#ptqr'), { text: bot, width: 148, height: 148, correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { /* QR не обязателен */ }
    $('#ptc').onclick = () => { const i = $('#ptl'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(bot) : Promise.reject()).then(() => toast('Ссылка скопирована')).catch(() => { document.execCommand('copy'); toast('Ссылка скопирована'); }); };
    $('#ptk').onclick = async () => { try { const r = await api('/api/partner/v-kredity', {}); kabT = 0; toast('+' + r.kredity + ' кр на баланс'); if (J.loadMe) J.loadMe(); screen(); } catch (e) { toast(e.message); } };
    $('#ptv').onclick = async () => { const rek = await J.prompt('Куда платить: Kaspi-номер или реквизиты (выплата — вручную, по договору)'); if (!rek) return; try { const r = await api('/api/partner/vyplata', { rekvizity: rek }); kabT = 0; toast('Заявка на ' + tg(r.tenge) + ' принята'); screen(); } catch (e) { toast(e.message); } };
  }

  // Код приглашения: из Mini App (start_param), из ссылки сайта (?ref=) или сохранённый на лендинге — закрепляем после входа
  function kodPriglasheniya() {
    try {
      const sp = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.start_param;
      if (sp && /^ref_/.test(sp)) return sp.slice(4);
      const q = new URLSearchParams(location.search).get('ref');
      if (q) { localStorage.setItem('jasa:ref', q); return q; }
      return localStorage.getItem('jasa:ref');
    } catch (e) { return null; }
  }
  const kod = kodPriglasheniya();
  if (kod && !localStorage.getItem('jasa:refDone')) {
    const poprobovat = () => api('/api/partner/privyazat', { kod }).then((r) => { if (r && r.ok !== undefined) { if (r.ok || (J.S.me && !J.S.me.guest)) localStorage.setItem('jasa:refDone', '1'); } }).catch(() => {});
    setTimeout(poprobovat, 1500);
  }


  // ---------- Блок «Приглашайте» в Кабинете (02.11.2026) ----------
  // Ссылка, QR, готовое сообщение и кнопки «в Telegram / WhatsApp» — прямо в Кабинете, чтобы ссылку не искать в «Ещё разделы».
  // Кабинет перерисовывается при каждом loadMe, поэтому блок вставляется наблюдателем, а данные /api/partner кэшируются на минуту.
  let kabD = null, kabT = 0, kabU = null, kabErr = 0, kabBusy = false;   // кэш ответа /api/partner на минуту, привязан к uid
  const S = J.S;
  const soobshchenie = (bot) => 'Привет! Я делаю посты, афиши и рилсы для бизнеса в JASA: пишет по-русски и по-казахски, картинку рисует сама, цена видна до запуска. Зайди по моей ссылке — первые кредиты бесплатно: ' + bot;
  const kopirovat = (text, msg) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(msg)).catch(() => { const i = document.createElement('textarea'); i.value = text; document.body.appendChild(i); i.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* нет доступа */ } i.remove(); toast(ok ? msg : 'Выделите текст и скопируйте вручную'); });
  // J.TG — мы внутри Telegram (как в app.js); в обычном браузере Telegram.WebApp тоже есть, но его openTelegramLink бросает WebAppTgUrlInvalid
  const otkryt = (u) => { const TG = J.TG && window.Telegram && Telegram.WebApp; if (TG && TG.openTelegramLink && /t\.me/.test(u)) TG.openTelegramLink(u); else if (TG && TG.openLink) TG.openLink(u); else window.open(u, '_blank', 'noopener'); };
  function kabHtml(d) {
    const head = `<span class="caps">Приглашайте — и получайте с оплат</span>`;
    if (!d.soglasie) {
      return `${head}<div class="ptkab-grid"><div><h3>${esc(d.procent_1)} % с каждой оплаты тех, кого вы привели</h3>
        <p class="small muted">И ещё ${esc(d.procent_2)} % — с оплат тех, кого привели они. Считаем только реальные оплаты, не пробные кредиты. Начисления в тенге: через ${esc(d.hold_dnej)} дней переводите в кредиты или выводите деньгами от ${tg(d.min_vyplata)}.</p>
        <details class="ptkab-rules"><summary>Правила программы</summary><ol class="ptrules">${arr(d.pravila).map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>
        <button class="btn accent" id="ptkabs" style="margin-top:14px">Принимаю правила — показать мою ссылку</button></div></div>`;
    }
    const bot = 'https://t.me/jasa_asia_bot?start=ref_' + d.kod, u1 = arr(d.uroven_1).length;
    return `${head}<div class="ptkab-grid"><div class="ptkab-qr"><div id="ptkabqr" class="ptqr"></div><p class="dim small">QR — на афишу, визитку или сторис</p></div>
      <div><h3>${esc(d.procent_1)} % с каждой оплаты тех, кого вы привели</h3>
        <p class="small muted">И ещё ${esc(d.procent_2)} % — с оплат тех, кого привели они. Считаем только реальные оплаты. Начисления в тенге: через ${esc(d.hold_dnej)} дней переводите в кредиты по цене пакета или выводите деньгами от ${tg(d.min_vyplata)}.</p>
        <div class="ptlink"><input readonly value="${esc(bot)}" id="ptkabl" aria-label="Ваша ссылка"><button class="btn sm accent" id="ptkabc" type="button">Скопировать</button></div>
        <span class="caps" style="display:block;margin-top:14px">Готовое сообщение · можно править</span>
        <textarea id="ptkabt" rows="4" maxlength="600">${esc(soobshchenie(bot))}</textarea>
        <div class="ptkab-row"><button class="btn sm accent" id="ptkabtg" type="button">Отправить в Telegram</button><button class="btn sm quiet" id="ptkabwa" type="button">В WhatsApp</button><button class="btn sm quiet" id="ptkabcp" type="button">Скопировать текст</button></div>
        <p class="small dim ptkab-stat">Приглашено: <b>${u1}</b> · доступно сейчас: <b>${tg(d.dostupno)}</b> · <a href="#/partnery">доход, начисления и выплата →</a></p></div></div>`;
  }
  function kabBind(card, d) {
    const s = card.querySelector('#ptkabs');
    if (s) { s.onclick = async () => { s.disabled = true; try { await api('/api/partner/soglasie', {}); kabT = 0; card.remove(); kabVstavit(); } catch (e) { toast(e.message); s.disabled = false; } }; return; }
    const bot = 'https://t.me/jasa_asia_bot?start=ref_' + d.kod;
    try { if (window.QRCode) new window.QRCode(card.querySelector('#ptkabqr'), { text: bot, width: 136, height: 136, correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { /* QR не обязателен */ }
    // текст всегда уходит со ссылкой: стёрли её из поля — допишем в конец
    const text = () => { const t = card.querySelector('#ptkabt').value.trim() || soobshchenie(bot); return t.includes(bot) ? t : t + '\n' + bot; };
    card.querySelector('#ptkabc').onclick = () => { card.querySelector('#ptkabl').select(); kopirovat(bot, 'Ссылка скопирована'); };
    card.querySelector('#ptkabcp').onclick = () => kopirovat(text(), 'Сообщение скопировано');
    // в share/url ссылка идёт параметром url — из текста убираем все её вхождения, иначе Telegram покажет её дважды
    card.querySelector('#ptkabtg').onclick = () => otkryt('https://t.me/share/url?url=' + encodeURIComponent(bot) + '&text=' + encodeURIComponent(text().split(bot).join('').replace(/\s{2,}/g, ' ').replace(/[:\s—-]+$/, '')));
    card.querySelector('#ptkabwa').onclick = () => otkryt('https://wa.me/?text=' + encodeURIComponent(text()));
  }
  async function kabVstavit() {
    const kab = $('#kab'); if (!kab || $('#ptkab') || kabBusy) return;
    if (!S.me || S.me.guest) return;
    if (Date.now() - kabErr < 30000) return;   // после ошибки не долбим сервер при каждой перерисовке
    const uid = S.me.uid || S.me.id || null;
    if (kabU !== uid) { kabD = null; kabU = uid; }   // другой аккаунт — чужую ссылку из кэша не показываем
    kabBusy = true;
    try {
      if (!kabD || Date.now() - kabT > 60000) { kabD = await Promise.race([api('/api/partner'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]); kabT = Date.now(); }
    } catch (e) { kabD = null; kabErr = Date.now(); return; } finally { kabBusy = false; }
    if (kabD.guest) { kabD = null; return; }   // гостевой ответ не кэшируем: после входа блок должен появиться сразу
    const k = $('#kab'); if (!k || $('#ptkab')) return;
    const two = k.querySelector('.two'); if (!two) return;   // Кабинет без профиля («сервер не отвечает») — блок не нужен
    const card = document.createElement('div'); card.className = 'card ptkab'; card.id = 'ptkab';
    card.innerHTML = kabHtml(kabD);
    two.after(card);
    kabBind(card, kabD);
  }
  stilKab();
  new MutationObserver(() => { if ($('#kab') && !$('#ptkab')) kabVstavit(); }).observe($('#main'), { childList: true, subtree: true });
  if ($('#kab')) kabVstavit();
  function stilKab() {
    if (document.getElementById('ptkab-style')) return;
    const s = document.createElement('style'); s.id = 'ptkab-style';
    s.textContent = `.ptkab{margin-top:22px}.ptkab h3{margin:8px 0 6px;font-size:1.15rem}.ptkab-grid{display:grid;grid-template-columns:168px minmax(0,1fr);gap:20px;align-items:start}.ptkab-grid>div:only-child{grid-column:1/-1;max-width:62ch}
.ptkab-qr{display:flex;flex-direction:column;align-items:center;text-align:center}.ptkab-qr .ptqr{margin:6px 0 8px}
.ptkab textarea{width:100%;margin-top:8px;min-height:0;border:1px solid var(--line);border-radius:var(--r-sm,12px);padding:10px 12px;font:inherit;font-size:var(--fs-small);background:var(--field);color:var(--ink);resize:vertical}
.ptkab-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ptkab-stat{margin-top:12px}.ptkab-stat b{color:var(--ink)}.ptkab-rules{margin-top:10px}.ptkab-rules summary{cursor:pointer;color:var(--muted);font-size:var(--fs-small)}
@media (max-width:640px){.ptkab-grid{grid-template-columns:1fr}.ptkab-qr{order:2}.ptkab-row .btn{flex:1 1 auto}}`;
    document.head.appendChild(s);
  }

  J.routes.partnery = screen;
  if ((location.hash || '').startsWith('#/partnery')) J.route();
})();
