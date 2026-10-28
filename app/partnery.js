/* JASA · Партнёрам (28.10.2026). Своя ссылка и QR, два уровня (10 % и 5 % с оплат приглашённых), баланс в тенге:
   перевести в кредиты сразу или подать заявку на выплату деньгами. Регистрирует маршрут #/partnery. */
(function () {
  'use strict';
  const J = window.JASA; if (!J) return;
  const { api, esc, toast, $, arr, topbar } = J;
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
      $('#pts').onclick = async () => { try { await api('/api/partner/soglasie', {}); screen(); } catch (e) { toast(e.message); } };
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
    $('#ptk').onclick = async () => { try { const r = await api('/api/partner/v-kredity', {}); toast('+' + r.kredity + ' кр на баланс'); if (J.loadMe) J.loadMe(); screen(); } catch (e) { toast(e.message); } };
    $('#ptv').onclick = async () => { const rek = prompt('Куда платить: Kaspi-номер или реквизиты (выплата — вручную, по договору)'); if (!rek) return; try { const r = await api('/api/partner/vyplata', { rekvizity: rek }); toast('Заявка на ' + tg(r.tenge) + ' принята'); screen(); } catch (e) { toast(e.message); } };
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

  J.routes.partnery = screen;
  if ((location.hash || '').startsWith('#/partnery')) J.route();
})();
